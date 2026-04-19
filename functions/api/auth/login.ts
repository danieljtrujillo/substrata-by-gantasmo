// GET /api/auth/login — Redirect to Google OAuth consent screen
import type { Env } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GOOGLE_CLIENT_ID } = context.env;
  const url = new URL(context.request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
};
