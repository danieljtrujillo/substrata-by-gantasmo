// GET /api/auth/callback — Google OAuth callback, exchanges code for tokens, sets session cookie
import type { Env } from '../../types';
import {
  signJWT, setSessionCookie,
  getOAuthState, clearOAuthStateCookie,
} from '../../jwt';

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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, DB } = context.env;
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const stateFromGoogle = url.searchParams.get('state');

  if (error || !code) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/?auth_error=${error || 'no_code'}`,
        'Set-Cookie': clearOAuthStateCookie(),
      },
    });
  }

  // CSRF defence: the `state` returned by Google must match the value we set
  // in the HttpOnly cookie when starting the flow. Constant-time compare.
  const stateFromCookie = getOAuthState(context.request);
  if (!stateFromCookie || !stateFromGoogle || !timingSafeEqual(stateFromCookie, stateFromGoogle)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/?auth_error=state_mismatch`,
        'Set-Cookie': clearOAuthStateCookie(),
      },
    });
  }

  // Exchange authorization code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    return Response.redirect(`${url.origin}/?auth_error=token_exchange_failed`, 302);
  }

  const tokens: GoogleTokenResponse = await tokenResponse.json();

  // Get user info from Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    return Response.redirect(`${url.origin}/?auth_error=userinfo_failed`, 302);
  }

  const userInfo: GoogleUserInfo = await userInfoResponse.json();

  if (!userInfo.email_verified) {
    return Response.redirect(`${url.origin}/?auth_error=email_not_verified`, 302);
  }

  // Upsert user in D1
  await DB.prepare(
    `INSERT INTO users (id, email, display_name, photo_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       photo_url = excluded.photo_url`
  )
    .bind(userInfo.sub, userInfo.email, userInfo.name, userInfo.picture)
    .run();

  // Create JWT session
  const jwt = await signJWT(
    {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    },
    JWT_SECRET
  );

  // Set the session cookie and clear the now-spent OAuth state cookie.
  // Headers.append is the only way to emit two Set-Cookie values on one response.
  const headers = new Headers({ Location: `${url.origin}/` });
  headers.append('Set-Cookie', setSessionCookie(jwt));
  headers.append('Set-Cookie', clearOAuthStateCookie());
  return new Response(null, { status: 302, headers });
};
