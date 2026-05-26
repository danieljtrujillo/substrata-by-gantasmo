// GET /api/scraper/smithsonian/search — Smithsonian Open Access search proxy.
//
// The browser builds a query string with `q`, `kind`, `limit`, `cursor` and
// hits this endpoint. We call api.si.edu using the server-side
// SMITHSONIAN_API_KEY (no VITE_ prefix) and stream the JSON back. The key
// never enters the browser bundle and CORS is moot because the browser
// only talks to our own origin.

import type { Env } from '../../../types';
import { rateLimit, clientIp, rateLimitedResponse } from '../../../rateLimit';

const BASE = 'https://api.si.edu/openaccess/api/v1.0';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.SMITHSONIAN_API_KEY) {
    return Response.json({ error: 'scraper_disabled' }, { status: 503 });
  }

  // Modest cap — scraper searches are bursty (user types, panel re-queries).
  const rl = await rateLimit(ctx.env, {
    bucket: 'scraper-search',
    identity: clientIp(ctx.request),
    limit: 60,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const url = new URL(ctx.request.url);
  const userQuery = url.searchParams.get('q')?.trim();
  if (!userQuery) return Response.json({ error: 'missing_query' }, { status: 400 });
  const kind = url.searchParams.get('kind') ?? '';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 1), 100);
  const cursor = Math.max(parseInt(url.searchParams.get('cursor') ?? '0', 10) || 0, 0);

  // Bias query the same way the client used to — kept here so we never
  // forward an unfiltered query that would dredge up non-CC0 records.
  let q = userQuery;
  if (kind === '3d_model') q += ' AND online_media_type:"3D Images"';
  q += ' AND unit_code:* AND metadata_usage:CC0';

  const upstream = `${BASE}/search?api_key=${ctx.env.SMITHSONIAN_API_KEY}&q=${encodeURIComponent(q)}&start=${cursor}&rows=${limit}`;

  try {
    const r = await fetch(upstream, { headers: { 'User-Agent': 'SUBSTRATA/1.0 (+https://substrata.gantasmo) research scraper' } });
    if (!r.ok) {
      return Response.json({ error: 'upstream_error', status: r.status }, { status: r.status === 429 ? 429 : 502 });
    }
    const data = await r.json();
    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300',           // 5 min — search results are stable enough
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.resetAt),
      },
    });
  } catch (err: any) {
    return Response.json({ error: 'fetch_failed', message: String(err?.message ?? 'unknown').slice(0, 240) }, { status: 502 });
  }
};
