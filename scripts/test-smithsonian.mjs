// End-to-end test: call the deployed proxy, run the client adapter on the
// response, see how many hits the new pickDownloadUrl actually keeps.
//
// Run with: npx tsx scripts/test-smithsonian.mjs
//
// Set BASE=https://substrata.pages.dev (default) or your preview domain.

import { smithsonianAdapter } from '../src/lib/scraper/smithsonian.ts';

const BASE = process.env.BASE ?? 'https://substrata.pages.dev';

// The adapter uses a relative fetch() URL ('/api/scraper/...'), so we have
// to shim fetch to prepend BASE for this node-side test.
const origFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const absolute = url.startsWith('/') ? BASE + url : url;
  return origFetch(absolute, init);
};

for (const q of ['horse', 'lincoln', 'plane', 'sculpture']) {
  const hits = await smithsonianAdapter.search({ query: q, limit: 10 });
  console.log(`q=${JSON.stringify(q)}  hits=${hits.length}`);
  for (const h of hits.slice(0, 3)) {
    console.log(`  - ${h.title.slice(0, 60)}  [${h.format}, ${h.licenseSPDX}]`);
    console.log(`    download: ${h.downloadUrl}`);
  }
}
