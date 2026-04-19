// POST /api/auth/logout — Clear session cookie
import { clearSessionCookie } from '../../jwt';

export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
