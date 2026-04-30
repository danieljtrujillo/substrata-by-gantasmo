// Library of Congress — HABS / HAER / HALS adapter.
//
// API: loc.gov JSON API. Append `?fo=json` to most LOC pages to get JSON.
// Docs: https://www.loc.gov/apis/json-and-yaml/  &  libraryofcongress.github.io/data-exploration
//
// All HABS/HAER/HALS items are US federal works → public domain, no rights restrictions.
// We still record the rights string from each result for downstream attribution.

import type {
  ScraperAdapter, AssetHit, FetchedAsset, SearchFilters, FileFormat,
} from './types';
import { politeFetch } from './throttle';
import { sha256Hex } from './hash';
import { registerAdapter } from './registry';

const BASE = 'https://www.loc.gov';
const COLLECTION = 'historic-american-buildings-landscapes-and-engineering-records';

function detectFormat(url: string): FileFormat | null {
  const m = url.toLowerCase().match(/\.(jpg|jpeg|png|tiff?|pdf|svg)(\?|$)/);
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1] === 'tiff' ? 'tif' : m[1];
  return ext as FileFormat;
}

function pickImageUrl(item: any): string | null {
  // LOC items expose a `resources` array; each resource has `files` or `url`.
  // Prefer the largest image (last entry in `image_url` or highest in resources.files).
  if (Array.isArray(item.image_url) && item.image_url.length) {
    return item.image_url[item.image_url.length - 1];
  }
  const res = item.resources?.[0];
  if (res?.image) return res.image;
  if (Array.isArray(res?.files)) {
    const flat = res.files.flat();
    const tiff = flat.find((f: any) => /tif/i.test(f?.mimetype ?? '') || /\.tiff?$/i.test(f?.url ?? ''));
    const jpg  = flat.find((f: any) => /jpe?g/i.test(f?.mimetype ?? '') || /\.jpe?g$/i.test(f?.url ?? ''));
    return tiff?.url ?? jpg?.url ?? null;
  }
  return null;
}

export const locHabsAdapter: ScraperAdapter = {
  id: 'loc-habs',
  displayName: 'Library of Congress — HABS/HAER/HALS',
  defaultLicense: 'PD',

  async search(filters: SearchFilters): Promise<AssetHit[]> {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page  = filters.cursor ? parseInt(filters.cursor, 10) : 1;
    const params = new URLSearchParams({
      q: filters.query,
      fo: 'json',
      c: String(limit),
      sp: String(page),
    });
    // Restrict to measured drawings / blueprints when the caller asked for floor plans.
    if (filters.kind === 'floor_plan' || filters.kind === 'blueprint') {
      params.set('fa', 'original-format:architectural+drawing|architecture+drawing');
    }
    const url = `${BASE}/collections/${COLLECTION}/?${params.toString()}`;

    const res = await politeFetch(url);
    if (!res.ok) throw new Error(`LOC search failed: ${res.status} ${res.statusText}`);
    const data: any = await res.json();
    const items: any[] = data?.results ?? [];

    const hits: AssetHit[] = [];
    for (const it of items) {
      const dl = pickImageUrl(it);
      if (!dl) continue;
      const fmt = detectFormat(dl) ?? 'jpg';
      const title = (Array.isArray(it.title) ? it.title[0] : it.title) ?? 'Untitled';
      hits.push({
        source: 'loc-habs',
        sourceId: it.id ?? it.url,
        title,
        description: Array.isArray(it.description) ? it.description.join(' ') : it.description,
        author: Array.isArray(it.contributor) ? it.contributor[0] : it.contributor,
        kind: 'blueprint',
        format: fmt,
        thumbnailUrl: it.image_url?.[0],
        sourceUrl: it.url ?? '',
        downloadUrl: dl,
        licenseSPDX: 'PD',
        attributionString: `Library of Congress, ${title} (Public Domain)`,
        tags: [
          ...(it.subject ?? []),
          ...(it.location ?? []),
        ].filter(Boolean),
        extras: { rights: it.rights, dates: it.dates },
      });
    }
    return hits;
  },

  async fetchAsset(hit: AssetHit): Promise<FetchedAsset> {
    const res = await politeFetch(hit.downloadUrl);
    if (!res.ok) throw new Error(`LOC fetch failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    const sha256 = await sha256Hex(buffer);
    return {
      hit,
      buffer,
      sha256,
      fetchedAt: new Date().toISOString(),
      licenseProof: 'verified', // HABS/HAER are unambiguously public domain
    };
  },
};

registerAdapter(locHabsAdapter);