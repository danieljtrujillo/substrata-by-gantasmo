// PKCE (Proof Key for Code Exchange, RFC 7636) helpers for the Google OAuth flow.
//
// The login route generates a `code_verifier` (random 32 bytes, base64url),
// stores it server-side keyed by the `state` value, and sends `code_challenge`
// (SHA-256 of the verifier, base64url) to Google. On callback we look up the
// verifier by state and forward it to Google's /token endpoint. Google then
// verifies that SHA256(verifier) === challenge.
//
// Storage: prefers Cloudflare KV (5-minute TTL). Falls back to an HttpOnly
// cookie if KV is not bound — cookie-only mode is slightly less robust
// against state pinning but still satisfies the RFC.

import type { Env } from './types';

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a 32-byte random verifier, base64url encoded (~43 chars). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** SHA-256 → base64url. This is the `code_challenge` Google receives. */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

const PKCE_COOKIE = 'substrata_pkce';
const PKCE_TTL_SEC = 5 * 60; // 5 minutes — same order as the OAuth state cookie

/** Persist the verifier so the callback can recover it. Keyed by OAuth state. */
export async function storeVerifier(
  env: Env, state: string, verifier: string,
): Promise<string | null> {
  if (env.RATE_LIMIT) {
    await env.RATE_LIMIT.put(`pkce:${state}`, verifier, { expirationTtl: PKCE_TTL_SEC });
    return null; // KV path — no cookie needed
  }
  // Fallback: pack the verifier into a short-lived HttpOnly cookie. Tagged
  // with the state so a forged callback can't substitute a different verifier.
  return `${PKCE_COOKIE}=${state}.${verifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${PKCE_TTL_SEC}`;
}

/** Retrieve and consume (single-use) the verifier for a given state. */
export async function consumeVerifier(
  env: Env, request: Request, state: string,
): Promise<string | null> {
  if (env.RATE_LIMIT) {
    const v = await env.RATE_LIMIT.get(`pkce:${state}`);
    if (v) await env.RATE_LIMIT.delete(`pkce:${state}`);
    return v;
  }
  // Cookie fallback
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${PKCE_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [storedState, verifier] = match[1].split('.', 2);
  if (storedState !== state || !verifier) return null;
  return verifier;
}

/** Clear the PKCE cookie on the response — call after consuming the verifier. */
export function clearPkceCookie(): string {
  return `${PKCE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
