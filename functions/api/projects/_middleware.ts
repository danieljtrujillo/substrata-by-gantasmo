// Auth middleware for /api/projects/* routes
// Verifies JWT and attaches user to context.data
import type { Env, JWTPayload, AuthenticatedData } from '../../types';
import { getSessionToken, verifyJWT } from '../../jwt';

const authMiddleware: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const token = getSessionToken(context.request);
  if (!token) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const payload = await verifyJWT<JWTPayload>(token, context.env.JWT_SECRET);
  if (!payload) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  context.data = { user: payload };
  return context.next();
};

export const onRequest = [authMiddleware];
