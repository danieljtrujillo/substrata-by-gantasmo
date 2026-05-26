// GET /api/auth/login — Redirect to Google OAuth consent screen
//
// - Mints a random `state` value (CSRF defence) in an HttpOnly cookie.
// - Generates a PKCE `code_verifier`, stores it server-side (KV or cookie
//   fallback), and sends the SHA-256 `code_challenge` to Google.
// - Google's callback returns the same `state` and an authorization code;
//   the callback handler verifies state, retrieves the verifier, and exchanges
//   the code + verifier for tokens (RFC 7636).
import type { Env } from '../../types';
import { generateOAuthState, setOAuthStateCookie } from '../../jwt';
import { generateCodeVerifier, deriveCodeChallenge, storeVerifier } from '../../pkce';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GOOGLE_CLIENT_ID } = context.env;
  const url = new URL(context.request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  const state = generateOAuthState();
  const verifier = generateCodeVerifier();
  const challenge = await deriveCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  // The PKCE verifier prefers KV (no client storage). When KV is unbound it
  // falls back to a short-lived HttpOnly cookie keyed by the state.
  const pkceCookie = await storeVerifier(context.env, state, verifier);

  const headers = new Headers({
    Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  });
  headers.append('Set-Cookie', setOAuthStateCookie(state));
  if (pkceCookie) headers.append('Set-Cookie', pkceCookie);

  return new Response(null, { status: 302, headers });
};
