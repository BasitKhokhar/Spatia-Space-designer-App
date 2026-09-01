import { isRemote, request } from './client';

// The furniture catalog is entirely backend-driven — the admin-managed DB is
// the only source, no bundled duplicate ships in the app.
// `since` (an ISO string) asks for a DELTA: only rows whose updatedAt is newer,
// plus `deleted` slugs to drop locally. Omit it for a full catalog. A launch
// where nothing changed then costs one small response instead of the whole
// catalog — and tombstones are the only way the app learns an item was removed.
export async function fetchCatalog(since) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  return request(`/catalog${qs}`, { auth: false });
}

// Aggregate-only: what a full offline download costs, without the catalog body.
// Drives the Settings screen's "full realism needs N MB" line, which must be
// answerable BEFORE anything has been downloaded.
export async function fetchAssetManifest() {
  if (!isRemote()) return null;
  return request('/catalog/manifest', { auth: false });
}
