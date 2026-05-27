// POST /api/ai/relay — Server-side AI proxy.
//
// The browser never sees provider API keys. The client constructs the same
// `{ model, contents, config }` payload it used to pass to the SDK directly
// (or sends a `taskType` and lets the server pick the model), POSTs here,
// and we forward to the resolved provider using server-side keys.
//
// Model governance is enforced through `modelPolicy.ts`:
//   - Gemini ≥ 3.1 floor
//   - approved-model allowlist
//   - alias normalization (legacy strings like `gemini-3-flash-preview` get
//     transparently upgraded so a hardcoded fallback in the client cannot
//     silently downgrade output quality)
//   - task-type defaults (e.g. `advisor_chat` → `gemini-3.5-flash`)
//
// Optional providers (OpenRouter, Anthropic) are gated behind env keys.
//
// Rate-limited per-IP (and per-user when authenticated) via KV.

import { GoogleGenAI } from '@google/genai';
import type { Env, JWTPayload } from '../../types';
import { verifyJWT, getSessionToken } from '../../jwt';
import { rateLimit, clientIp, rateLimitedResponse } from '../../rateLimit';
import {
  resolveModel,
  type TaskType,
  type ProviderId,
} from './modelPolicy';

interface RelayRequest {
  /** Explicit model id (legacy callers). Either this or `taskType` is required. */
  model?: string;
  /** Semantic task hint — preferred path for new code. */
  taskType?: TaskType;
  /** Provider override. Defaults to `gemini`. */
  provider?: ProviderId;
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
  if (!body || body.contents === undefined) {
    return Response.json({ error: 'missing_fields', message: 'contents is required' }, { status: 400 });
  }
  if (typeof body.model !== 'string' && typeof body.taskType !== 'string') {
    return Response.json({ error: 'missing_fields', message: 'model or taskType is required' }, { status: 400 });
  }

  // ── Resolve model through policy. This is the single choke point that
  //    prevents silent downgrades and enforces the Gemini 3.1+ floor.
  const availableProviders = {
    gemini:     !!ctx.env.GEMINI_API_KEY,
    openrouter: !!ctx.env.OPENROUTER_API_KEY,
    anthropic:  !!ctx.env.ANTHROPIC_API_KEY,
  };
  const policy = resolveModel({
    model:    body.model,
    taskType: body.taskType,
    provider: body.provider,
    availableProviders,
  });
  if (!policy.ok) {
    return Response.json(
      { error: policy.code, message: policy.message },
      { status: 400 },
    );
  }
  const { provider, model: resolvedModel } = policy.resolved;

  const baseHeaders = {
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset':     String(rl.resetAt),
    'X-Resolved-Model':      resolvedModel,
    'X-Resolved-Provider':   provider,
  } as Record<string, string>;

  try {
    if (provider === 'gemini') {
      if (!ctx.env.GEMINI_API_KEY) {
        return Response.json({ error: 'server_missing_api_key' }, { status: 500 });
      }
      const ai = new GoogleGenAI({ apiKey: ctx.env.GEMINI_API_KEY });
      const r = await ai.models.generateContent({
        model:    resolvedModel,
        contents: body.contents as any,
        config:   body.config as any,
      });
      // Return only the fields the client consumes. Avoid leaking unrelated
      // SDK internals (e.g. raw HTTP metadata) into the browser.
      return Response.json({
        text:           r.text,
        candidates:     r.candidates,
        functionCalls:  r.functionCalls ?? [],
        resolvedModel,
        resolvedProvider: provider,
        policyReason:   policy.resolved.reason,
      }, { headers: baseHeaders });
    }

    if (provider === 'openrouter') {
      // OpenRouter exposes an OpenAI-compatible chat-completions API. We
      // accept the same `contents` shape the Gemini path uses (parts/role
      // arrays) and flatten them into OpenAI chat messages. Image parts are
      // intentionally not yet supported on this path — callers wanting
      // vision should stay on the Gemini route.
      const messages = geminiContentsToOpenAIMessages(body.contents);
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${ctx.env.OPENROUTER_API_KEY}`,
          // OpenRouter recommends an app-identifying referer + title:
          'HTTP-Referer':  'https://gantasmo.ai',
          'X-Title':       'SUBSTRATA by GANTASMO',
        },
        body: JSON.stringify({ model: resolvedModel, messages }),
      });
      if (!orRes.ok) {
        const text = await orRes.text().catch(() => '');
        return Response.json(
          { error: 'upstream_error', status: orRes.status, message: text.slice(0, 240) },
          { status: orRes.status, headers: baseHeaders },
        );
      }
      const data = await orRes.json() as any;
      const text = data?.choices?.[0]?.message?.content ?? '';
      return Response.json({
        text,
        candidates: [{ content: { parts: [{ text }] } }],
        functionCalls: [],
        resolvedModel,
        resolvedProvider: provider,
        policyReason: policy.resolved.reason,
      }, { headers: baseHeaders });
    }

    if (provider === 'anthropic') {
      const messages = geminiContentsToAnthropicMessages(body.contents);
      const anRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ctx.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      resolvedModel,
          max_tokens: 4096,
          messages,
        }),
      });
      if (!anRes.ok) {
        const text = await anRes.text().catch(() => '');
        return Response.json(
          { error: 'upstream_error', status: anRes.status, message: text.slice(0, 240) },
          { status: anRes.status, headers: baseHeaders },
        );
      }
      const data = await anRes.json() as any;
      const text = (data?.content ?? [])
        .filter((b: any) => b?.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
      return Response.json({
        text,
        candidates: [{ content: { parts: [{ text }] } }],
        functionCalls: [],
        resolvedModel,
        resolvedProvider: provider,
        policyReason: policy.resolved.reason,
      }, { headers: baseHeaders });
    }

    // Unreachable — policy already validated provider.
    return Response.json({ error: 'unsupported_provider' }, { status: 500 });
  } catch (err: any) {
    // Surface upstream status when we can — clients use this to decide
    // whether to retry. Keep the message generic; never echo the API key.
    const status = err?.status ?? err?.httpStatusCode ?? 502;
    return Response.json(
      { error: 'upstream_error', status, message: String(err?.message ?? 'unknown').slice(0, 240) },
      { status, headers: baseHeaders },
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Content shape adapters — translate the Gemini-style `contents` we already
// use everywhere into the shape each alternate provider expects. These are
// intentionally minimal: text-only, role-aware. Anything more exotic (tool
// calls, inline images) stays on the Gemini path.
// ─────────────────────────────────────────────────────────────────────────────
function geminiContentsToOpenAIMessages(contents: unknown): { role: 'user' | 'assistant' | 'system'; content: string }[] {
  const out: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
  const push = (role: 'user' | 'assistant' | 'system', text: string) => {
    if (text) out.push({ role, content: text });
  };
  const harvestParts = (parts: any[]): string => {
    return (parts ?? [])
      .filter((p: any) => typeof p?.text === 'string')
      .map((p: any) => p.text)
      .join('\n');
  };
  if (typeof contents === 'string') {
    push('user', contents);
  } else if (Array.isArray(contents)) {
    for (const turn of contents) {
      if (typeof turn?.text === 'string') {
        push('user', turn.text);
        continue;
      }
      const role: 'user' | 'assistant' = turn?.role === 'model' ? 'assistant' : 'user';
      push(role, harvestParts(turn?.parts));
    }
  } else if (contents && typeof contents === 'object') {
    const obj = contents as any;
    if (Array.isArray(obj.parts)) push('user', harvestParts(obj.parts));
    else if (typeof obj.text === 'string') push('user', obj.text);
  }
  return out;
}

function geminiContentsToAnthropicMessages(contents: unknown): { role: 'user' | 'assistant'; content: string }[] {
  // Anthropic uses the same role taxonomy minus `system` (system is a
  // top-level field, not a message). We let the caller move any system
  // instruction into the first user message for now — the reasoning paths
  // that route here aren't using systemInstruction yet.
  return geminiContentsToOpenAIMessages(contents)
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content }));
}
