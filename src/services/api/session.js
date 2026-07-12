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
