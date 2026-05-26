// GET /api/scraper/smithsonian/fetch?url=… — Asset download proxy.
//
// Streams a binary asset (STL/GLB/JPG/etc.) from a Smithsonian-owned host
// back to the browser. Two reasons we proxy instead of letting the browser
// hit the CDN directly:
//   1. CORS — Smithsonian CDNs don't all set Access-Control-Allow-Origin.
//   2. Open relay — restricting to a host whitelist means this endpoint
//      can't be abused to fetch arbitrary URLs through our edge.

import type { Env } from '../../../types';
import { rateLimit, clientIp, rateLimitedResponse } from '../../../rateLimit';

const ALLOWED_HOSTS = new Set([
  'api.si.edu',
  '3d-api.si.edu',
  'ids.si.edu',
  'collections.si.edu',
  'siris-archives.si.edu',
  'siris-libraries.si.edu',
  'edan.si.edu',
  'www.si.edu',
]);

const MAX_BYTES = 64 * 1024 * 1024; // 64 MiB upper bound on a single asset

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.SMITHSONIAN_API_KEY) {
    // The fetch path itself rarely needs the key but we gate on it as a
    // simple "scraper enabled?" flag so the deployment fails closed.
    return Response.json({ error: 'scraper_disabled' }, { status: 503 });
  }

  const rl = await rateLimit(ctx.env, {
    bucket: 'scraper-fetch',
    identity: clientIp(ctx.request),
    limit: 30,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const reqUrl = new URL(ctx.request.url);
  const target = reqUrl.searchParams.get('url');
  if (!target) return Response.json({ error: 'missing_url' }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(target); } catch { return Response.json({ error: 'invalid_url' }, { status: 400 }); }
  if (parsed.protocol !== 'https:') return Response.json({ error: 'https_required' }, { status: 400 });
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return Response.json({ error: 'host_not_allowed', host: parsed.hostname }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'SUBSTRATA/1.0 (+https://substrata.gantasmo) research scraper' },
    });
    if (!upstream.ok) {
      return Response.json({ error: 'upstream_error', status: upstream.status }, { status: upstream.status === 429 ? 429 : 502 });
    }
    const lengthHeader = upstream.headers.get('Content-Length');
    if (lengthHeader && parseInt(lengthHeader, 10) > MAX_BYTES) {
      return Response.json({ error: 'too_large' }, { status: 413 });
    }

    // Forward as a streaming response. Preserve the content-type so the
    // client knows whether it got an image, 3D model, or PDF.
    const headers = new Headers();
    const ct = upstream.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);
    if (lengthHeader) headers.set('Content-Length', lengthHeader);
    headers.set('Cache-Control', 'public, max-age=86400, immutable');
    headers.set('X-RateLimit-Remaining', String(rl.remaining));
    headers.set('X-RateLimit-Reset', String(rl.resetAt));
    return new Response(upstream.body, { status: 200, headers });
  } catch (err: any) {
    return Response.json({ error: 'fetch_failed', message: String(err?.message ?? 'unknown').slice(0, 240) }, { status: 502 });
  }
};
