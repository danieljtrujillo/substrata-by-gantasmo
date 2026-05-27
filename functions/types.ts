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
  /**
   * Base URL of the Modal-hosted Python CAD worker (e.g.
   * https://<modal-account>--substrata-cad-app.modal.run). When unset, the
   * /api/cad/generate route returns 503 worker_not_configured for any engine
   * other than openscad (which runs entirely in the browser).
   */
  CAD_WORKER_URL?: string;
  /**
   * Shared secret sent to the CAD worker as the `X-Substrata-Worker-Token`
   * header. The worker rejects any request missing or mismatching this token.
   * Required whenever CAD_WORKER_URL is set.
   */
  CAD_WORKER_SECRET?: string;
  /**
   * Optional OpenRouter API key. When present, /api/ai/relay will accept
   * `provider: "openrouter"` in the request body and forward to OpenRouter
   * (used for alternative reasoning models e.g. Claude). When absent, any
   * non-Gemini provider request returns 400 provider_unavailable.
   */
  OPENROUTER_API_KEY?: string;
  /**
   * Optional Anthropic API key. When present, /api/ai/relay will accept
   * `provider: "anthropic"` in the request body and forward directly to
   * Anthropic's Messages API. When absent, Anthropic provider requests
   * return 400 provider_unavailable.
   */
  ANTHROPIC_API_KEY?: string;
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
