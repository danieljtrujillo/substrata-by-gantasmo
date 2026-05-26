// GET /api/auth/login — Redirect to Google OAuth consent screen
//
// Mints a random `state` value, sets it in a short-lived HttpOnly cookie,
// and forwards it to Google. The callback rejects any response whose state
// does not match the cookie — standard OAuth CSRF defence.
import type { Env } from '../../types';
import { generateOAuthState, setOAuthStateCookie } from '../../jwt';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GOOGLE_CLIENT_ID } = context.env;
  const url = new URL(context.request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  const state = generateOAuthState();

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'Set-Cookie': setOAuthStateCookie(state),
    },
  });
};
