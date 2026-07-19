import { storage } from '@/store/storage';

// Single source of truth for the auth tokens, shared by the API client (which
// attaches / refreshes them) and the auth store (which sets them on login).
// Kept separate to avoid a circular import between client.js and useAuthStore.
const KEY = 'session';

let cache = load();

function load() {
  try {
    const raw = storage.getString(KEY);
    return raw ? JSON.parse(raw) : { accessToken: null, refreshToken: null };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function getAccessToken() {
  return cache.accessToken;
}

export function getRefreshToken() {
  return cache.refreshToken;
}

export function setTokens({ accessToken, refreshToken }) {
  cache = {
    accessToken: accessToken ?? cache.accessToken,
    refreshToken: refreshToken ?? cache.refreshToken,
  };
  storage.set(KEY, JSON.stringify(cache));
}

export function clearTokens() {
  cache = { accessToken: null, refreshToken: null };
  storage.delete(KEY);
}

// Session-expiry callback. The API client calls this when a request 401s and the
// refresh token is also dead, so the auth store can drop the session and let the
// navigator swap to the Login stack. Registered by useAuthStore to avoid a
// circular import between client.js and the store.
let onSessionExpired = null;

export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

export function notifySessionExpired() {
  if (onSessionExpired) onSessionExpired();
}
