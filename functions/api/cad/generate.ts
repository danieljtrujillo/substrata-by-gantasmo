// POST /api/cad/generate — Server-side proxy to the Modal CAD worker.
//
// Engine routing:
//   - engine=openscad  → the browser handles this directly; this route is not
//     called. If hit anyway, returns 400 with `client_engine`.
//   - engine=cadquery  → forward to {CAD_WORKER_URL}/generate/cadquery
//   - engine=text2cad  → forward to {CAD_WORKER_URL}/generate/text2cad
//
// The worker is authenticated via a shared CAD_WORKER_SECRET header. The
// client's Gemini API key never reaches the worker — the worker calls Gemini
// itself using a server-side key configured in Modal env.

import type { Env, JWTPayload } from '../../types';
import { verifyJWT, getSessionToken } from '../../jwt';
import { rateLimit, clientIp, rateLimitedResponse } from '../../rateLimit';

const ANON_QUOTA_PER_HOUR = 10;
const USER_QUOTA_PER_HOUR = 60;

const ENGINE_PATHS: Record<string, string> = {
  cadquery: '/generate/cadquery',
  text2cad: '/generate/text2cad',
};

interface CadRequest {
  prompt: string;
  engine: 'openscad' | 'cadquery' | 'text2cad';
  mode: 'maker' | 'architecture' | 'hacker';
  units?: 'mm' | 'inch';
  designStyle?: string;
  printer?: string;
  referenceImage?: string;
  advisorContext?: string;
  constraints?: Record<string, unknown>;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let userId: string | null = null;
  const token = getSessionToken(ctx.request);
  if (token) {
    const payload = await verifyJWT<JWTPayload>(token, ctx.env.JWT_SECRET);
    if (payload?.sub) userId = payload.sub;
  }

  const identity = userId ? `u:${userId}` : `ip:${clientIp(ctx.request)}`;
  const limit = userId ? USER_QUOTA_PER_HOUR : ANON_QUOTA_PER_HOUR;
  const rl = await rateLimit(ctx.env, {
    bucket: 'cad-generate',
    identity,
    limit,
    windowSec: 60 * 60,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  let body: CadRequest;
  try {
    body = await ctx.request.json();
  } catch {
    return Response.json({ ok: false, code: 'invalid_json', message: 'request body is not JSON' }, { status: 400 });
  }
  if (!body || typeof body.prompt !== 'string' || typeof body.engine !== 'string') {
    return Response.json({ ok: false, code: 'missing_fields', message: 'prompt and engine are required' }, { status: 400 });
  }

  if (body.engine === 'openscad') {
    return Response.json(
      { ok: false, code: 'client_engine', message: 'openscad runs in the browser; this endpoint is for remote engines only' },
      { status: 400 },
    );
  }

  const path = ENGINE_PATHS[body.engine];
  if (!path) {
    return Response.json({ ok: false, code: 'unknown_engine', message: `engine '${body.engine}' is not supported` }, { status: 400 });
  }

  if (!ctx.env.CAD_WORKER_URL || !ctx.env.CAD_WORKER_SECRET) {
    return Response.json({
      ok: false,
      code: 'worker_not_configured',
      message: 'CAD worker is not deployed yet. Set CAD_WORKER_URL and CAD_WORKER_SECRET in the Pages env, or pick the OpenSCAD engine.',
      engine: body.engine,
    }, { status: 503 });
  }

  const workerUrl = ctx.env.CAD_WORKER_URL.replace(/\/$/, '') + path;
  let upstream: Response;
  try {
    upstream = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Substrata-Worker-Token': ctx.env.CAD_WORKER_SECRET,
        'X-Substrata-User-Id': userId ?? 'anon',
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, code: 'worker_unreachable', message: String(err?.message ?? err).slice(0, 240), engine: body.engine },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  const respBody = await upstream.text();
  return new Response(respBody, {
    status: upstream.status,
    headers: {
      'Content-Type': contentType,
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(rl.resetAt),
    },
  });
};
