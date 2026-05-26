// GET /api/auth/callback — Google OAuth callback.
//
// Verifies state (CSRF), retrieves the PKCE verifier, exchanges the code +
// verifier for tokens, and issues the session JWT. Rate-limited per-IP to
// blunt callback-spam attacks that would otherwise hammer Google + D1.
import type { Env } from '../../types';
import {
  signJWT, setSessionCookie,
  getOAuthState, clearOAuthStateCookie,
} from '../../jwt';
import { consumeVerifier, clearPkceCookie } from '../../pkce';
import { rateLimit, clientIp, rateLimitedResponse } from '../../rateLimit';

/** Constant-time string compare so state validation does not leak timing info. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

/** Redirect with a generic auth_error and clean up the OAuth cookies. */
function authError(origin: string, code: string): Response {
  const headers = new Headers({ Location: `${origin}/?auth_error=${code}` });
  headers.append('Set-Cookie', clearOAuthStateCookie());
  headers.append('Set-Cookie', clearPkceCookie());
  return new Response(null, { status: 302, headers });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, DB } = context.env;
  const url = new URL(context.request.url);

  // Rate limit BEFORE doing any I/O — blunts code-spam attacks.
  const rl = await rateLimit(context.env, {
    bucket: 'auth-callback',
    identity: clientIp(context.request),
    limit: 20,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitedResponse(rl);

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const stateFromGoogle = url.searchParams.get('state');

  if (error || !code) return authError(url.origin, error || 'no_code');

  // CSRF defence — state cookie must match Google's returned state.
  const stateFromCookie = getOAuthState(context.request);
  if (!stateFromCookie || !stateFromGoogle || !timingSafeEqual(stateFromCookie, stateFromGoogle)) {
    return authError(url.origin, 'state_mismatch');
  }

  // PKCE — recover the verifier we stashed at login. Single-use: consume()
  // deletes the KV entry / the cookie is cleared on the way out.
  const verifier = await consumeVerifier(context.env, context.request, stateFromGoogle);
  if (!verifier) return authError(url.origin, 'pkce_missing');

  // Exchange authorization code + verifier for tokens. Google verifies that
  // SHA256(verifier) === code_challenge sent at /authorize. Mismatch → 400.
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });

  if (!tokenResponse.ok) return authError(url.origin, 'token_exchange_failed');

  const tokens: GoogleTokenResponse = await tokenResponse.json();

  // Get user info from Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoResponse.ok) return authError(url.origin, 'userinfo_failed');

  const userInfo: GoogleUserInfo = await userInfoResponse.json();
  if (!userInfo.email_verified) return authError(url.origin, 'email_not_verified');

  // Upsert user in D1. Fail closed: if the DB write fails, do NOT issue a
  // session — the user would otherwise be authenticated with no row.
  try {
    await DB.prepare(
      `INSERT INTO users (id, email, display_name, photo_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         photo_url = excluded.photo_url`,
    )
      .bind(userInfo.sub, userInfo.email, userInfo.name, userInfo.picture)
      .run();
  } catch (e) {
    console.error('user upsert failed', e);
    return authError(url.origin, 'db_unavailable');
  }

  // Mint the session JWT (carries iss/aud/iat/nbf/exp claims — see jwt.ts).
  const jwt = await signJWT(
    { sub: userInfo.sub, email: userInfo.email, name: userInfo.name, picture: userInfo.picture },
    JWT_SECRET,
  );

  // Clear the OAuth cookies and ship the session cookie on the final redirect.
  const headers = new Headers({ Location: `${url.origin}/` });
  headers.append('Set-Cookie', setSessionCookie(jwt));
  headers.append('Set-Cookie', clearOAuthStateCookie());
  headers.append('Set-Cookie', clearPkceCookie());
  return new Response(null, { status: 302, headers });
};
