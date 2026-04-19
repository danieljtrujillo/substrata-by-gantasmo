// JWT utilities using Web Crypto API (runs in Cloudflare Workers)

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encoder = new TextEncoder();
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const message = `${header}.${body}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));

  return `${message}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyJWT<T = Record<string, unknown>>(
  token: string,
  secret: string
): Promise<T | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const message = `${header}.${body}`;
  const encoder = new TextEncoder();

  const key = await getSigningKey(secret);
  const signatureBytes = base64UrlDecode(sig);
  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(message));
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as T & { exp?: number };
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

// Cookie helpers
const COOKIE_NAME = 'substrata_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getSessionToken(request: Request): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
