import { CATALOG, CATEGORIES } from '@/data/catalog';
import { ROOM_TYPES } from '@/data/roomTypes';
import { TEMPLATES } from '@/data/templates';
import { isRemote, request } from './client';

// Catalog / room-types / templates. Local-first returns the bundled seed data;
// when a backend URL is set it fetches the DB-backed, admin-managed versions
// (which are seeded from these same files, so shapes match exactly).
export async function fetchCatalog() {
  if (isRemote()) {
    return request('/catalog', { auth: false });
  }
  return { items: CATALOG, categories: CATEGORIES };
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
