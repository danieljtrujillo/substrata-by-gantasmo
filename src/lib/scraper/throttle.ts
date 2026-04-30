// Token-bucket throttle, per-host. Keep us a polite client.
// One bucket per hostname; default 2 req/sec, burst 4.

interface Bucket {
  tokens: number;
  capacity: number;
  refillPerSec: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

function getBucket(host: string, capacity = 4, refillPerSec = 2): Bucket {
  let b = buckets.get(host);
  if (!b) {
    b = { tokens: capacity, capacity, refillPerSec, lastRefill: Date.now() };
    buckets.set(host, b);
  }
  return b;
}

function refill(b: Bucket) {
  const now = Date.now();
  const dt = (now - b.lastRefill) / 1000;
  b.tokens = Math.min(b.capacity, b.tokens + dt * b.refillPerSec);
  b.lastRefill = now;
}

/** Wait for one token from the host's bucket. */
export async function acquire(url: string): Promise<void> {
  const host = new URL(url).host;
  const b = getBucket(host);
  while (true) {
    refill(b);
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return;
    }
    const need = 1 - b.tokens;
    const waitMs = Math.ceil((need / b.refillPerSec) * 1000) + 50;
    await new Promise(r => setTimeout(r, waitMs));
  }
}

/** Configure a non-default rate for a specific host (call once at startup). */
export function setHostRate(host: string, capacity: number, refillPerSec: number) {
  buckets.set(host, { tokens: capacity, capacity, refillPerSec, lastRefill: Date.now() });
}

/** Polite fetch wrapper: acquires a token, sets a UA, returns the Response. */
export async function politeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  await acquire(url);
  const headers = new Headers(init.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'SUBSTRATA/1.0 (+https://substrata.gantasmo) research scraper');
  }
  return fetch(url, { ...init, headers });
}