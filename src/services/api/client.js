import { API_BASE_URL } from '@/constants/config';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, notifySessionExpired } from './session';

// Thin fetch wrapper around the Home Designer backend. When API_BASE_URL is
// empty the app runs fully local-first and these helpers are unused; set the URL
// (EXPO_PUBLIC_API_BASE_URL) to route through the real backend.
export const isRemote = () => Boolean(API_BASE_URL);

// The backend uses a { status, data, message } envelope. Unwrap `data` for
// callers; throw an Error carrying the server code/message on failure.
function unwrap(json) {
  if (json && typeof json === 'object' && 'status' in json) {
    if (json.status === 'success') return json.data ?? json;
    const err = new Error(json.message || 'Request failed');
    err.code = json.code;
    throw err;
  }
  return json; // non-enveloped (shouldn't happen, but be tolerant)
}

async function rawRequest(path, { method, headers, body }) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // no/invalid JSON body
  }
  return { res, json };
}

// Attempt a one-time access-token refresh using the stored refresh token.
async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const { res, json } = await rawRequest('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { refreshToken },
    });
    if (res.ok && json?.status === 'success' && json.data?.accessToken) {
      setTokens({ accessToken: json.data.accessToken });
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

// Main request helper. Auto-attaches the bearer token, retries once on 401 after
// refreshing, and returns the unwrapped `data`.
export async function request(path, { method = 'GET', body, auth = true, _retry = false } = {}) {
  if (!API_BASE_URL) {
    // Tagged, because callers must be able to tell "this build has no backend"
    // apart from "the request failed" — they look identical otherwise (neither
    // carries an HTTP status) and get reported to the user as being offline.
    const err = new Error('No API_BASE_URL configured — running local-first.');
    err.code = 'NO_BACKEND';
    throw err;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const { res, json } = await rawRequest(path, { method, headers, body });

  if (res.status === 401 && auth && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, { method, body, auth, _retry: true });
    // Access token expired AND the refresh token is dead — end the session so
    // the navigator sends the user back to Login (instead of crashing the UX).
    clearTokens();
    notifySessionExpired();
  }

  if (!res.ok) {
    // Auth middleware answers with a bare { error } rather than the standard
    // envelope, so fall back to it before the generic "API 403: /path".
    const err = new Error((json && (json.message || json.error)) || `API ${res.status}: ${path}`);
    err.status = res.status;
    err.code = json && json.code;
    throw err;
  }

  return unwrap(json);
}
