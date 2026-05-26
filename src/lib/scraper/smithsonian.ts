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
  const m = url.toLowerCase().match(/\.(stl|glb|gltf|obj|step|dxf|svg|jpg|jpeg|png|tiff?|pdf)(\?|$)/);
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1] === 'tiff' ? 'tif' : m[1];
  return ext as FileFormat;
}

function pickDownloadUrl(record: any): { url: string; format: FileFormat } | null {
  const media: any[] = record?.content?.descriptiveNonRepeating?.online_media?.media ?? [];
  // Prefer 3D, then high-res image
  const threeD = media.find(m => m?.type === '3d_package' || /\.(glb|gltf|stl|obj)/i.test(m?.content ?? ''));
  if (threeD?.content) {
    const fmt = detectFormat(threeD.content);
    if (fmt) return { url: threeD.content, format: fmt };
  }
  for (const m of media) {
    const url = m?.content;
    if (typeof url !== 'string') continue;
    const fmt = detectFormat(url);
    if (fmt) return { url, format: fmt };
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
