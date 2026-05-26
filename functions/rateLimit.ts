// Per-key sliding-window rate limiter backed by Cloudflare KV.
//
// Fails open: if the KV binding is missing (e.g. before you've created the
// namespace), allow the request. This keeps the deploy unblocked while you
// wire up the binding. Once `RATE_LIMIT` is bound, every call is metered.
//
// Window is a fixed N-second bucket keyed by floor(now / windowSec). Simple,
// correct under contention because KV writes are atomic per-key. Sliding-log
// accuracy isn't worth the complexity for our use case.

import type { Env } from './types';

export interface RateLimitConfig {
  /** Logical identifier — e.g. "ai-relay", "auth-callback". */
  bucket: string;
  /** Discriminator inside the bucket — IP, user id, etc. */
  identity: string;
  /** Max requests inside one window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix seconds when the current window ends. */
  resetAt: number;
}

export async function rateLimit(env: Env, cfg: RateLimitConfig): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / cfg.windowSec) * cfg.windowSec;
  const resetAt = windowStart + cfg.windowSec;

  // KV not bound — fail open. Log loudly so this is visible in CF logs.
  if (!env.RATE_LIMIT) {
    console.warn(`rate limit fail-open: ${cfg.bucket} (no KV binding)`);
    return { allowed: true, remaining: cfg.limit, resetAt };
  }

  const key = `rl:${cfg.bucket}:${cfg.identity}:${windowStart}`;
  const current = Number((await env.RATE_LIMIT.get(key)) ?? '0');
  const next = current + 1;

  // Write the incremented counter with TTL = window length + 5s grace.
  // KV is eventually consistent, but for rate limits a few seconds of skew
  // across PoPs is acceptable.
  await env.RATE_LIMIT.put(key, String(next), { expirationTtl: cfg.windowSec + 5 });

  return {
    allowed: next <= cfg.limit,
    remaining: Math.max(0, cfg.limit - next),
    resetAt,
  };
}

/** Best-effort client IP, with sane fallback. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    'unknown'
  );
}

/** Standard 429 response with retry headers. */
export function rateLimitedResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'rate_limited', retryAt: result.resetAt }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    },
  );
}
