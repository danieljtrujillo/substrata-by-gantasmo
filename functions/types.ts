// Cloudflare Pages Functions environment bindings
export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
}

export interface JWTPayload {
  sub: string;       // Google user ID
  email: string;
  name: string;
  picture: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedData extends Record<string, unknown> {
  user: JWTPayload;
}
