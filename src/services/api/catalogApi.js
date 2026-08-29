import { CATALOG, CATEGORIES } from '@/data/catalog';
import { ROOM_TYPES } from '@/data/roomTypes';
import { TEMPLATES } from '@/data/templates';
import { isRemote, request } from './client';

// Catalog / room-types / templates. Local-first returns the bundled seed data;
// when a backend URL is set it fetches the DB-backed, admin-managed versions
// (which are seeded from these same files, so shapes match exactly).
// `since` (an ISO string) asks for a DELTA: only rows whose updatedAt is newer,
// plus `deleted` slugs to drop locally. Omit it for a full catalog. A launch
// where nothing changed then costs one small response instead of the whole
// catalog — and tombstones are the only way the app learns an item was removed.
export async function fetchCatalog(since) {
  if (isRemote()) {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    return request(`/catalog${qs}`, { auth: false });
  }
  return { items: CATALOG, categories: CATEGORIES };
}

// Aggregate-only: what a full offline download costs, without the catalog body.
// Drives the Settings screen's "full realism needs N MB" line, which must be
// answerable BEFORE anything has been downloaded.
export async function fetchAssetManifest() {
  if (!isRemote()) return null;
  return request('/catalog/manifest', { auth: false });
}

export async function fetchRoomTypes() {
  if (isRemote()) {
    return request('/catalog/room-types', { auth: false });
  }
  return ROOM_TYPES;
}

export async function fetchTemplates() {
  if (isRemote()) {
    return request('/catalog/templates', { auth: false });
  }
  return TEMPLATES;
}
