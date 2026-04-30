// Scraper → validator → cache pipeline.
// Every fetched asset goes through meshValidator before it's added to the
// local index, so we never index a corrupt/mismatched file.

import type { AssetHit, FetchedAsset, SearchFilters, SpdxLicense } from './types';
import { isPermissive, PERMISSIVE_LICENSES } from './types';
import { getAdapter, searchAll } from './registry';
import { generateValidationReport, type ValidationReport } from '../meshValidator';

export interface IndexedAsset {
  hit: AssetHit;
  sha256: string;
  fetchedAt: string;
  /** Mesh validator report, only present for 3D formats. */
  validation?: ValidationReport;
  /** Cache key — `${source}/${sha256}.${ext}`. */
  cacheKey: string;
  /** Result of license/validation gates. */
  status: 'indexed' | 'rejected';
  rejectionReason?: string;
}

const MESH_FORMATS = new Set(['stl', 'glb', 'gltf', 'obj']);

function makeCacheKey(asset: FetchedAsset): string {
  return `${asset.hit.source}/${asset.sha256}.${asset.hit.format}`;
}

/** Filter a hit list to permissive-license items only (default behavior). */
export function filterByLicense(
  hits: AssetHit[],
  allowed: SpdxLicense[] = PERMISSIVE_LICENSES,
): AssetHit[] {
  const set = new Set(allowed);
  return hits.filter(h => set.has(h.licenseSPDX));
}

/** Top-level cross-source search, license-gated. */
export async function searchLibrary(filters: SearchFilters): Promise<AssetHit[]> {
  const allowed = filters.allowedLicenses ?? PERMISSIVE_LICENSES;
  const filteredFilters: SearchFilters = { ...filters, allowedLicenses: allowed };
  const hits = await searchAll(filteredFilters);
  return filterByLicense(hits, allowed);
}

/**
 * Fetch a single hit, validate, and produce an IndexedAsset suitable for
 * persisting in the local cache + similarity index. Caller is responsible
 * for actually writing the buffer to storage (browser: IndexedDB / OPFS;
 * server: filesystem).
 */
export async function ingestHit(hit: AssetHit): Promise<{ asset: IndexedAsset; buffer?: ArrayBuffer }> {
  if (!isPermissive(hit.licenseSPDX)) {
    return {
      asset: {
        hit, sha256: '', fetchedAt: new Date().toISOString(),
        cacheKey: '', status: 'rejected',
        rejectionReason: `License ${hit.licenseSPDX} is not in the permissive whitelist`,
      },
    };
  }

  const adapter = getAdapter(hit.source);
  if (!adapter) {
    return {
      asset: {
        hit, sha256: '', fetchedAt: new Date().toISOString(),
        cacheKey: '', status: 'rejected',
        rejectionReason: `No adapter registered for source "${hit.source}"`,
      },
    };
  }

  const fetched = await adapter.fetchAsset(hit);
  const cacheKey = makeCacheKey(fetched);

  let validation: ValidationReport | undefined;
  if (MESH_FORMATS.has(hit.format)) {
    validation = generateValidationReport(fetched.buffer, `${hit.title}.${hit.format}`);
    if (validation.overallScore === 'fail') {
      return {
        asset: {
          hit, sha256: fetched.sha256, fetchedAt: fetched.fetchedAt,
          cacheKey, validation, status: 'rejected',
          rejectionReason: `Mesh validation failed: ${validation.errors.join('; ')}`,
        },
        buffer: fetched.buffer,
      };
    }
  }

  return {
    asset: {
      hit, sha256: fetched.sha256, fetchedAt: fetched.fetchedAt,
      cacheKey, validation, status: 'indexed',
    },
    buffer: fetched.buffer,
  };
}

/**
 * Convenience: ingest many hits with a concurrency cap.
 * Returns one IndexedAsset per input; failures show up as `status: 'rejected'`.
 */
export async function ingestMany(
  hits: AssetHit[],
  opts: { concurrency?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<IndexedAsset[]> {
  const concurrency = opts.concurrency ?? 3;
  const out: IndexedAsset[] = new Array(hits.length);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= hits.length) return;
      try {
        const { asset } = await ingestHit(hits[i]);
        out[i] = asset;
      } catch (err: any) {
        out[i] = {
          hit: hits[i], sha256: '', fetchedAt: new Date().toISOString(),
          cacheKey: '', status: 'rejected',
          rejectionReason: err?.message ?? String(err),
        };
      }
      done++;
      opts.onProgress?.(done, hits.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

/**
 * Build a single LICENSES.md fragment from indexed assets. Append this to a
 * project export so attribution is preserved when scraped models are reused.
 */
export function buildLicensesManifest(assets: IndexedAsset[]): string {
  const indexed = assets.filter(a => a.status === 'indexed');
  if (!indexed.length) return '';
  const lines: string[] = ['# Third-party assets', ''];
  for (const a of indexed) {
    lines.push(`- **${a.hit.title}** — ${a.hit.attributionString}`);
    lines.push(`  Source: ${a.hit.sourceUrl}`);
    lines.push(`  License: \`${a.hit.licenseSPDX}\` · sha256:\`${a.sha256.slice(0, 12)}…\``);
    lines.push('');
  }
  return lines.join('\n');
}