# SUBSTRATA Security Specification

This document describes the deployed security model of the Cloudflare Pages + D1
build of SUBSTRATA (the live stack). It supersedes the prior Firebase/Firestore
spec that lived here, which referenced a previous product and is no longer
authoritative.

## 1. Threat Model

SUBSTRATA is a single-tenant-per-user web application. Every authenticated user
owns a private set of projects. The trust boundary is:

- **Trusted:** Cloudflare Pages Functions running in the worker isolate, D1
  bindings, and Cloudflare-managed environment secrets.
- **Untrusted:** The browser, all `fetch` bodies, all cookies presented by the
  browser, all query strings, all OAuth callback parameters.

The product does not currently have admin roles, multi-tenant projects, or
billing. Those expansions will require additional rules.

## 2. Data Invariants

- **Identity isolation** — Every row in `projects` carries `user_id` matching
  the authenticated `sub` claim. Reads and writes are scoped via `WHERE
  user_id = ?` in every query. No row is visible to a user other than its
  owner.
- **Server-authoritative timestamps** — `created_at` and `updated_at` are set
  server-side via `new Date().toISOString()` in every INSERT/UPDATE. Client
  values for these columns are ignored.
- **Server-authoritative ownership** — The `user_id` column is bound from the
  JWT `sub` claim, never from request bodies. A client cannot escalate to or
  spoof another user via field injection.
- **Shape validation** — `id` and `name` are required on POST; both are
  strings. Other fields (`originalImage`, `processedImage`,
  `laser_settings`, `proc_options`) are stored as nullable text/JSON.
- **Parameterised queries** — All D1 statements use `.bind()` placeholders;
  no string concatenation, no template interpolation into SQL. SQL injection
  is structurally unreachable on the current API surface.

## 3. Authentication

- **Provider:** Google OAuth 2.0 (Authorization Code, confidential client).
- **Scopes requested:** `openid email profile` (no offline scopes beyond
  `access_type=offline`).
- **CSRF defence:** The login route mints a 32-byte random `state` value
  using `crypto.getRandomValues`, sets it in an HttpOnly `SameSite=Lax`
  cookie (`substrata_oauth_state`, 10-minute TTL), and forwards the same
  value to Google. The callback verifies the returned `state` matches the
  cookie via constant-time comparison and rejects any mismatch with
  `?auth_error=state_mismatch`. The state cookie is cleared on both
  success and failure paths.
- **PKCE (RFC 7636):** The login route also generates a 32-byte random
  `code_verifier`, derives `code_challenge = base64url(SHA-256(verifier))`,
  sends the challenge to Google with `code_challenge_method=S256`, and
  stores the verifier server-side (Cloudflare KV preferred, HttpOnly cookie
  fallback) keyed by the state. The callback retrieves the verifier and
  passes it to `oauth2.googleapis.com/token` for exchange. If the verifier
  is missing or mismatched, Google rejects the token request — closing the
  authorization-code-injection attack.
- **Rate limiting:** `/api/auth/callback` is rate-limited to 20 requests per
  minute per client IP via the KV-backed rate limiter. Blocks code-spam
  attacks that would otherwise hammer Google's token endpoint + D1.
- **Email verification:** Tokens whose `userinfo` returns
  `email_verified=false` are rejected with `?auth_error=email_not_verified`.
- **User upsert:** Successful authentication upserts the user row keyed by
  Google `sub` claim. Display name and photo URL are updated on every login.

## 4. Sessions

- **Carrier:** JWT signed with HMAC-SHA-256 over `header.payload`. Signing key
  is the Cloudflare-managed secret `JWT_SECRET`; minimum 256-bit entropy is
  required (operational requirement, not enforced in code).
- **Lifetime:** 7 days. Every token carries `iss=substrata-by-gantasmo`,
  `aud=substrata-web`, `iat`, `nbf`, `exp`. The verifier rejects on
  signature mismatch, missing/incorrect `iss`/`aud`, or `exp`/`nbf`
  outside a 60-second leeway window.
- **Cookie:** `substrata_session`, attributes `HttpOnly; Secure;
  SameSite=Lax; Path=/; Max-Age=604800`. Not readable by JavaScript and not
  sent on cross-site `<form>` POSTs. Top-level navigations from Google
  (`SameSite=Lax`) still carry the cookie — required for the OAuth bounce.
- **Logout:** `/api/auth/logout` POST sets `substrata_session` with
  `Max-Age=0`, evicting the cookie from the browser. No server-side
  revocation list — by design, since the JWT is short-lived and bound to
  the cookie.

## 5. Authorisation

- **API gate:** All `/api/projects/*` routes are protected by
  `functions/api/projects/_middleware.ts`, which verifies the JWT, parses
  `sub`, and rejects with HTTP 401 if invalid or expired.
- **Per-record ownership:** Mutations (`POST /api/projects`,
  `PUT/DELETE /api/projects/[id]`) re-check `existing.user_id === userId`
  inside the handler and return HTTP 403 on mismatch, preventing IDOR via
  guessed or stolen IDs.
- **Listing:** `GET /api/projects` always filters by the JWT-derived
  `user_id`; the user cannot list projects owned by anyone else.

## 6. Cross-Site & Cross-Origin

- **Cookies:** `SameSite=Lax` blocks most CSRF on state-changing requests.
  No `Access-Control-Allow-Origin` header is set, so by default the API
  refuses cross-origin requests with credentials.
- **CSP:** Recommended Cloudflare `_headers` entry (not yet shipped):
  ```
  /*
    Content-Security-Policy: default-src 'self'; script-src 'self' https://ajax.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://generativelanguage.googleapis.com https://api.si.edu https://www.loc.gov; frame-ancestors 'none'
  ```
- **External script:** `index.html` loads `model-viewer` from
  `ajax.googleapis.com`. CSP must permit this origin or self-host the
  bundle.

## 7. Secrets Management

| Secret                     | Where stored                                | How read                       |
|----------------------------|---------------------------------------------|--------------------------------|
| `GEMINI_API_KEY`           | Cloudflare Pages env binding (secret)       | `context.env.GEMINI_API_KEY` — server-side only, read by [functions/api/ai/relay.ts](functions/api/ai/relay.ts). |
| `GOOGLE_CLIENT_ID`         | Cloudflare Pages env binding                | `context.env.GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET`     | Cloudflare Pages env binding (secret)       | `context.env.GOOGLE_CLIENT_SECRET` |
| `JWT_SECRET`               | Cloudflare Pages env binding (secret)       | `context.env.JWT_SECRET`       |
| `VITE_SMITHSONIAN_API_KEY` | GitHub Actions secret → Vite `define`       | `import.meta.env` — **public after build** |

The single `VITE_*` key is injected into the browser bundle at build time —
treat it as **public**. Restrict by Smithsonian referer policy.

### AI key handling (Gemini)

The Gemini API key (`GEMINI_API_KEY`) **never enters the browser bundle**.
Vite is no longer given a `VITE_GEMINI_API_KEY` `define`. All AI calls in
[src/services/geminiService.ts](src/services/geminiService.ts) and
[src/services/ttsService.ts](src/services/ttsService.ts) `fetch('/api/ai/relay', …)`;
the Pages Function reads `context.env.GEMINI_API_KEY` and forwards to Google.

The relay enforces per-identity rate limits (30 req/hour anonymous, 300
req/hour authenticated) via Cloudflare KV. When KV is unbound the limiter
fails open — useful for first-deploy but you should bind a KV namespace
before exposing the deploy publicly.

## 8. XSS

- React 19 escapes by default. No `dangerouslySetInnerHTML` on
  user-supplied content. The only `dangerouslySetInnerHTML` usage (community
  search results) consumes AI output — see Known Gaps.

## 9. Input Validation

Server-side validation is currently minimal: `id` and `name` are required
strings; everything else is JSON-serialised and stored opaquely. Future
work should formalise the `laserSettings` / `procOptions` schemas
(e.g. Zod) and enforce maximum payload sizes per row.

## 10. Known Gaps (Tracked)

| ID    | Gap                                                                | Severity | Status   |
|-------|--------------------------------------------------------------------|----------|----------|
| SEC-1 | No PKCE on the OAuth flow (confidential-client only)               | Medium   | **Fixed** — RFC 7636 PKCE with SHA-256, verifier in KV with cookie fallback |
| SEC-2 | No rate limiting on `/api/auth/callback` or `/api/ai/relay`        | Medium   | **Fixed** — KV-backed sliding-window limiter (20/min auth callback, 30/h anon / 300/h auth on AI relay). Fails open if KV unbound. |
| SEC-3 | JWT verifier does not check `iss`/`aud` claims                     | Low      | **Fixed** — `iss=substrata-by-gantasmo`, `aud=substrata-web`, `nbf`/`exp` with 60s leeway |
| SEC-4 | No formal schema for `laserSettings` / `procOptions`               | Low      | **Fixed** — Zod schemas in [functions/api/projects/schema.ts](functions/api/projects/schema.ts) with strict shape + 2 MiB row cap |
| SEC-5 | CSP header not shipped in `public/_headers`                        | Medium   | Backlog  |
| SEC-6 | AI-generated "community search" output rendered via dangerouslySetInnerHTML — sanitised: HTML-escape first, then re-allow `**bold**` and `\n` only | High | **Fixed** |
| SEC-7 | `wrangler.toml` carries the production `database_id`               | Low      | Backlog  |
| SEC-8 | Gemini API key bundled into browser via `VITE_GEMINI_API_KEY`      | **Critical** | **Fixed** — server-side relay; key never enters browser bundle |

## 11. Verified Properties (Manual Audit, 2026-05-26)

- [x] All D1 queries use `.bind()` placeholders (`grep -nE "DB\\.prepare\\(['\"]" functions/`)
- [x] No `dangerouslySetInnerHTML` on user-controlled input in the React tree
- [x] Logout clears `substrata_session` cookie
- [x] CSRF `state` is generated, set in HttpOnly cookie, and verified on
      callback with constant-time compare
- [x] Project mutations re-verify `user_id` ownership inside the handler
- [x] Session cookie attributes: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`,
      `Max-Age=604800`
