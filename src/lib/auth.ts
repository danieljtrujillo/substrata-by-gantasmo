// Cloudflare Auth — replaces Firebase Auth
// Uses Google OAuth2 via Cloudflare Pages Functions + JWT cookies

export interface CloudflareUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

let cachedUser: CloudflareUser | null = null;
let authListeners: Array<(user: CloudflareUser | null) => void> = [];

function notifyListeners(user: CloudflareUser | null) {
  cachedUser = user;
  authListeners.forEach(fn => fn(user));
}

// Check session on load
export async function checkSession(): Promise<CloudflareUser | null> {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    cachedUser = data.user || null;
    return cachedUser;
  } catch {
    cachedUser = null;
    return null;
  }
}

// Redirect to Google OAuth
export function loginWithGoogle() {
  window.location.href = '/api/auth/login';
}

// Clear session
export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Cookie will expire anyway
  }
  notifyListeners(null);
}

// Subscribe to auth state changes (mimics Firebase onAuthStateChanged)
export function onAuthStateChanged(callback: (user: CloudflareUser | null) => void): () => void {
  authListeners.push(callback);

  // Initialize: check session and notify
  checkSession().then(user => callback(user));

  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(fn => fn !== callback);
  };
}

// Get current user synchronously (may be null if session hasn't been checked yet)
export function getCurrentUser(): CloudflareUser | null {
  return cachedUser;
}

// Check if auth is available (always true with Cloudflare, since the API is on the same domain)
export const AUTH_AVAILABLE = true;
