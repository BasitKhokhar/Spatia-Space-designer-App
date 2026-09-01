import { isRemote, request } from './client';

// Admin-managed CMS content the app reads but never writes.

// Home-screen hero images — the photos that auto-scroll behind the fixed
// "AI Interior Designer" card. Unauthenticated on purpose: Home renders before
// sign-in. Local-first builds (no API_BASE_URL) get an empty list and the card
// falls back to its own blueprint artwork rather than showing a hole.
export async function fetchHomeBanners() {
  if (!isRemote()) return [];
  const data = await request('/content/banners', { auth: false });
  return data?.banners ?? (Array.isArray(data) ? data : []);
}

// Help-center FAQs, admin-managed from the dashboard. Requires sign-in
// (matches the backend's `verifyToken` gate on GET /content/faqs).
export async function fetchFaqs() {
  if (!isRemote()) return [];
  const data = await request('/content/faqs');
  return Array.isArray(data) ? data : (data?.faqs ?? []);
}
