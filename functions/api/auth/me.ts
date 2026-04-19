// GET /api/auth/me — Return current user from session cookie
import type { Env, JWTPayload } from '../../types';
import { getSessionToken, verifyJWT } from '../../jwt';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const token = getSessionToken(context.request);
  if (!token) {
    return Response.json({ user: null });
  }

  const payload = await verifyJWT<JWTPayload>(token, context.env.JWT_SECRET);
  if (!payload) {
    return Response.json({ user: null });
  }

  return Response.json({
    user: {
      uid: payload.sub,
      email: payload.email,
      displayName: payload.name,
      photoURL: payload.picture,
    },
  });
};
