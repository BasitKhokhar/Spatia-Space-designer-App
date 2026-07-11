import { CATALOG, CATEGORIES } from '@/data/catalog';
import { isRemote, request } from './client';

// Catalog access point. Local-first returns seed data; if a backend URL is set
// it fetches instead. Screens can call this instead of importing data directly.
export async function fetchCatalog() {
  if (isRemote()) {
    return request('/catalog');
  }
  return { items: CATALOG, categories: CATEGORIES };
}
