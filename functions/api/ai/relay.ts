// POST /api/ai/relay — Server-side Gemini proxy.
//
// The browser never sees GEMINI_API_KEY. The client constructs the same
// `{ model, contents, config }` payload it used to pass to the SDK directly,
// POSTs it here, and we forward to Gemini using the server-side key.
//
// Rate-limited per-IP (and per-user when authenticated) via KV. Authenticated
// users get a higher quota.

import { GoogleGenAI } from '@google/genai';
import type { Env, JWTPayload } from '../../types';
import { verifyJWT, getSessionToken } from '../../jwt';
import { rateLimit, clientIp, rateLimitedResponse } from '../../rateLimit';

interface RelayRequest {
  model: string;
  contents: unknown;
  config?: Record<string, unknown>;
}

// Quotas — modest enough to absorb runaway loops, generous enough for normal
// session use. Tune via env var if needed.
const ANON_QUOTA_PER_HOUR = 30;
const USER_QUOTA_PER_HOUR = 300;

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  // ── Auth (optional — anonymous use is allowed but more strictly limited)
  let userId: string | null = null;
  const token = getSessionToken(ctx.request);
  if (token) {
    const payload = await verifyJWT<JWTPayload>(token, ctx.env.JWT_SECRET);
    if (payload?.sub) userId = payload.sub;
  }

  // ── Rate limit
  const identity = userId ? `u:${userId}` : `ip:${clientIp(ctx.request)}`;
  const limit = userId ? USER_QUOTA_PER_HOUR : ANON_QUOTA_PER_HOUR;
  const rl = await rateLimit(ctx.env, {
    bucket: 'ai-relay',
    identity,
    limit,
    windowSec: 60 * 60,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  // ── Parse request
  let body: RelayRequest;
  try {
    body = await ctx.request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body.model !== 'string' || body.contents === undefined) {
    return Response.json({ error: 'missing_fields' }, { status: 400 });
  }

  // ── Forward to Gemini using the server-side key. The SDK call shape mirrors
  //    the client's original `ai.models.generateContent(...)`.
  if (!ctx.env.GEMINI_API_KEY) {
    return Response.json({ error: 'server_missing_api_key' }, { status: 500 });
  }
  const ai = new GoogleGenAI({ apiKey: ctx.env.GEMINI_API_KEY });
  try {
    const r = await ai.models.generateContent({
      model: body.model,
      contents: body.contents as any,
      config: body.config as any,
    });
    // Return only the fields the client consumes. Avoid leaking unrelated SDK
    // internals (e.g. raw HTTP metadata) into the browser.
    return Response.json({
      text: r.text,
      candidates: r.candidates,
      functionCalls: r.functionCalls ?? [],
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.resetAt),
      },
    });
  } catch (err: any) {
    // Surface upstream status when we can — clients use this to decide whether
    // to retry. Keep the message generic; never echo the API key or stack.
    const status = err?.status ?? err?.httpStatusCode ?? 502;
    return Response.json(
      { error: 'upstream_error', status, message: String(err?.message ?? 'unknown').slice(0, 240) },
      { status },
    );
  }
};
