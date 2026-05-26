// Cloudflare Pages Functions environment bindings
export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  /** Server-side Gemini key — NEVER prefix VITE_, NEVER expose to browser. */
  GEMINI_API_KEY: string;
  /**
   * api.data.gov key for the Smithsonian Open Access scraper. Optional —
   * when absent, /api/scraper/smithsonian/* returns 503 with `scraper_disabled`.
   */
  SMITHSONIAN_API_KEY?: string;
  /**
   * Optional KV namespace for rate-limit counters and PKCE verifiers.
   * If unbound, rate limiting falls open (allow all) and PKCE storage falls
   * back to a short-lived cookie. Bind via:
   *   wrangler kv:namespace create RATE_LIMIT
   * then add the resulting id to wrangler.toml.
   */
  RATE_LIMIT?: KVNamespace;
}

export interface JWTPayload {
  sub: string;       // Google user ID
  email: string;
  name: string;
  picture: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedData extends Record<string, unknown> {
  user: JWTPayload;
}
