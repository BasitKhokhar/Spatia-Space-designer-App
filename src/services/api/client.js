import { API_BASE_URL } from '@/constants/config';

// Thin fetch wrapper. When API_BASE_URL is empty the app runs fully local-first
// and these helpers are unused; set the URL to route through a real backend.
export const isRemote = () => Boolean(API_BASE_URL);

export async function request(path, { method = 'GET', body, token } = {}) {
  if (!API_BASE_URL) {
    throw new Error('No API_BASE_URL configured — running local-first.');
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json();
}
