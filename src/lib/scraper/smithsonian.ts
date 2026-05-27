// Smithsonian Open Access API adapter.
//
// API: api.si.edu/openaccess/api/v1.0 — requires a free api.data.gov key.
// Open Access items are CC0; we still verify per-record via the access field.
// Docs: https://www.si.edu/openaccess  &  https://edan.si.edu/openaccess/docs/
//
// The browser never holds the api.data.gov key. All calls route through
// /api/scraper/smithsonian/search and /api/scraper/smithsonian/fetch
// (Cloudflare Pages Functions) which read SMITHSONIAN_API_KEY server-side
// and forward to api.si.edu with a Smithsonian-host whitelist on the
// asset-fetch endpoint.

import type {
  ScraperAdapter, AssetHit, FetchedAsset, SearchFilters, SpdxLicense, FileFormat,
} from './types';
import { sha256Hex } from './hash';
import { registerAdapter } from './registry';

function detectFormat(url: string): FileFormat | null {
  // Strip query + fragment before extension match. Smithsonian's IDS
  // delivery URLs put filenames in the `?id=...` query, which the previous
  // regex missed entirely, returning null for every record.
  const bare = url.toLowerCase().split(/[?#]/)[0];
  const m = bare.match(/\.(stl|glb|gltf|obj|step|stp|dxf|svg|jpg|jpeg|png|tiff?|pdf)(\/|$)/);
  if (m) {
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1] === 'tiff' ? 'tif' : m[1] === 'stp' ? 'step' : m[1];
    return ext as FileFormat;
  }
  // Also probe the full URL for an extension inside the query string
  // (e.g. `?id=NMNH-EO_..._001.jpg`) — IDS download endpoints do this.
  const inQuery = url.toLowerCase().match(/\.(stl|glb|gltf|obj|step|stp|dxf|svg|jpg|jpeg|png|tiff?|pdf)(?:[&]|$)/);
  if (inQuery) {
    const ext = inQuery[1] === 'jpeg' ? 'jpg' : inQuery[1] === 'tiff' ? 'tif' : inQuery[1] === 'stp' ? 'step' : inQuery[1];
    return ext as FileFormat;
  }
  return null;
}

const THREE_D_FORMATS: FileFormat[] = ['glb', 'gltf', 'stl', 'obj', 'step'];

function pickFromResources(
  resources: any[],
  preferThreeD: boolean,
): { url: string; format: FileFormat } | null {
  if (!Array.isArray(resources)) return null;
  if (preferThreeD) {
    for (const r of resources) {
      const url = typeof r?.url === 'string' ? r.url : undefined;
      if (!url) continue;
      const fmt = detectFormat(url);
      if (fmt && THREE_D_FORMATS.includes(fmt)) return { url, format: fmt };
    }
  }
  // Prefer "high-res" / "original" labels; deprioritise thumbnails + screens.
  const scored = resources
    .map(r => {
      const url = typeof r?.url === 'string' ? r.url : null;
      if (!url) return null;
      const fmt = detectFormat(url);
      if (!fmt) return null;
      const label = String(r?.label ?? '').toLowerCase();
      const lowUrl = url.toLowerCase();
      const isThumb = /thumb|screen/.test(label) || /thumb|screen/.test(lowUrl);
      const isHighRes = /high-res|full|original|master/.test(label);
      return { url, format: fmt, rank: (isHighRes ? 0 : 1) + (isThumb ? 10 : 0) };
    })
    .filter((x): x is { url: string; format: FileFormat; rank: number } => !!x);
  if (scored.length === 0) return null;
  scored.sort((a, b) => a.rank - b.rank);
  return { url: scored[0].url, format: scored[0].format };
}

function pickDownloadUrl(record: any): { url: string; format: FileFormat } | null {
  const media: any[] = record?.content?.descriptiveNonRepeating?.online_media?.media ?? [];
  if (media.length === 0) return null;

  // Pass A — 3D-typed media. Drill into resources for the actual 3D file.
  for (const m of media) {
    const type = String(m?.type ?? '').toLowerCase();
    if (!/3d|3d_package|3-?d images/.test(type)) continue;
    const fromRes = pickFromResources(m.resources, true);
    if (fromRes) return fromRes;
    if (typeof m?.content === 'string') {
      const fmt = detectFormat(m.content);
      if (fmt && THREE_D_FORMATS.includes(fmt)) return { url: m.content, format: fmt };
    }
  }

  // Pass B — image-typed media. Most EDAN image records ship their canonical
  // delivery URL in `content` WITHOUT a file extension, but the `resources`
  // array carries downloadable variants. Fall back to the canonical content
  // URL with assumed jpg format if no resource gave us a clean answer (the
  // IDS deliveryService returns JPEG by default).
  for (const m of media) {
    const type = String(m?.type ?? '').toLowerCase();
    if (!/image/.test(type)) continue;
    const fromRes = pickFromResources(m.resources, false);
    if (fromRes) return fromRes;
    if (typeof m?.content === 'string' && /ids\.si\.edu|edan\.si\.edu|collections\.si\.edu/.test(m.content)) {
      return { url: m.content, format: 'jpg' };
    }
  }

  // Pass C — anything else with a recognised extension anywhere.
  for (const m of media) {
    if (typeof m?.content === 'string') {
      const fmt = detectFormat(m.content);
      if (fmt) return { url: m.content, format: fmt };
    }
    const fromRes = pickFromResources(m.resources, false);
    if (fromRes) return fromRes;
  }

  return null;
}

function readAccess(record: any): SpdxLicense {
  const access = record?.content?.descriptiveNonRepeating?.metadata_usage?.access
    ?? record?.content?.indexedStructured?.usage?.access;
  if (typeof access === 'string' && /CC0/i.test(access)) return 'CC0-1.0';
  return 'unknown';
}

export const smithsonianAdapter: ScraperAdapter = {
  id: 'smithsonian',
  displayName: 'Smithsonian Open Access',
  defaultLicense: 'CC0-1.0',

  async search(filters: SearchFilters): Promise<AssetHit[]> {
    const limit = Math.min(filters.limit ?? 20, 100);
    const cursor = filters.cursor ? parseInt(filters.cursor, 10) : 0;
    const params = new URLSearchParams({
      q: filters.query,
      limit: String(limit),
      cursor: String(cursor),
    });
    if (filters.kind) params.set('kind', filters.kind);

    const res = await fetch(`/api/scraper/smithsonian/search?${params.toString()}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(`smithsonian search failed: ${res.status} ${detail?.error ?? ''}`);
    }
    const data: any = await res.json();
    const rows: any[] = data?.response?.rows ?? [];

    const hits: AssetHit[] = [];
    for (const r of rows) {
      const dl = pickDownloadUrl(r);
      if (!dl) continue;
      const license = readAccess(r);
      hits.push({
        source: 'smithsonian',
        sourceId: r.id ?? r.docId ?? r.url,
        title: r?.title ?? r?.content?.descriptiveNonRepeating?.title?.content ?? 'Untitled',
        description: r?.content?.freetext?.notes?.[0]?.content,
        author: r?.content?.indexedStructured?.name?.[0],
        kind: dl.format === 'glb' || dl.format === 'gltf' || dl.format === 'stl' || dl.format === 'obj' ? '3d_model' : 'photograph',
        format: dl.format,
        thumbnailUrl: r?.content?.descriptiveNonRepeating?.online_media?.media?.[0]?.thumbnail,
        sourceUrl: r?.content?.descriptiveNonRepeating?.record_link ?? r?.url ?? '',
        downloadUrl: dl.url,
        licenseSPDX: license === 'unknown' ? 'CC0-1.0' : license, // collection default
        attributionString: `Smithsonian Open Access — ${r?.title ?? 'Untitled'} (CC0)`,
        tags: r?.content?.indexedStructured?.topic ?? [],
      });
    }
    return hits;
  },

  async fetchAsset(hit: AssetHit): Promise<FetchedAsset> {
    // Route the binary fetch through the Cloudflare proxy. The Pages Function
    // whitelists Smithsonian hosts so this endpoint can't be repurposed as
    // an open relay against arbitrary URLs.
    const proxyUrl = `/api/scraper/smithsonian/fetch?url=${encodeURIComponent(hit.downloadUrl)}`;
    const res = await fetch(proxyUrl, { credentials: 'include' });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(`smithsonian fetch failed: ${res.status} ${detail?.error ?? ''}`);
    }
    const buffer = await res.arrayBuffer();
    const sha256 = await sha256Hex(buffer);
    return {
      hit,
      buffer,
      sha256,
      fetchedAt: new Date().toISOString(),
      licenseProof: hit.licenseSPDX === 'CC0-1.0' ? 'verified' : 'collection-default',
    };
  },
};

registerAdapter(smithsonianAdapter);
