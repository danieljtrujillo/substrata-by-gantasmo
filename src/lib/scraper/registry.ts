// Adapter registry — central lookup so the ingestion pipeline and UI don't
// hard-code adapter imports. Adapters self-register on import.

import type { ScraperAdapter, SearchFilters, AssetHit } from './types';

const adapters = new Map<string, ScraperAdapter>();

export function registerAdapter(a: ScraperAdapter): void {
  adapters.set(a.id, a);
}

export function getAdapter(id: string): ScraperAdapter | undefined {
  return adapters.get(id);
}

export function listAdapters(): ScraperAdapter[] {
  return [...adapters.values()];
}

/** Fan-out search across every registered adapter; merge + interleave results. */
export async function searchAll(filters: SearchFilters): Promise<AssetHit[]> {
  const results = await Promise.allSettled(
    listAdapters().map(a => a.search(filters))
  );
  const hits: AssetHit[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') hits.push(...r.value);
  }
  // Round-robin interleave so no single source dominates the top of the list.
  const grouped = new Map<string, AssetHit[]>();
  for (const h of hits) {
    if (!grouped.has(h.source)) grouped.set(h.source, []);
    grouped.get(h.source)!.push(h);
  }
  const interleaved: AssetHit[] = [];
  let added = true;
  let i = 0;
  while (added) {
    added = false;
    for (const arr of grouped.values()) {
      if (arr[i]) { interleaved.push(arr[i]); added = true; }
    }
    i++;
  }
  return interleaved;
}