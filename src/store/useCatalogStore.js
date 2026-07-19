import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { CATALOG, CATEGORIES as BUNDLED_CATEGORY_NAMES, itemCost } from '@/data/catalog';
import { isRemote } from '@/services/api/client';
import { fetchCatalog } from '@/services/api/catalogApi';
import { creditsApi } from '@/services/api/creditsApi';
import { useUnlocksStore } from './useUnlocksStore';

// Bundled fallback categories as objects (so online + offline share one shape).
// The bundled export is a string array led by the synthetic 'All' bucket.
const BUNDLED_CATEGORIES = BUNDLED_CATEGORY_NAMES
  .filter((n) => n !== 'All')
  .map((name, i) => ({ name, sortOrder: i, icon: null, group: null }));

// Normalize whatever /catalog returns (objects, or a legacy string array) into
// category objects, and ensure items are a plain array.
function normalize(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : CATALOG;
  let categories = payload?.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    categories = BUNDLED_CATEGORIES;
  } else if (typeof categories[0] === 'string') {
    categories = categories
      .filter((n) => n !== 'All')
      .map((name, i) => ({ name, sortOrder: i, icon: null, group: null }));
  }
  return { items, categories };
}

// Dynamic catalog. Online it mirrors the admin-managed backend catalog (fetched
// via GET /catalog) and is cached to MMKV so the app keeps working offline; the
// bundled src/data/catalog.js is the first-run / offline seed. `kind` is the
// universal render join-key and is preserved verbatim from either source.
export const useCatalogStore = create(
  persist(
    (set, get) => ({
      items: CATALOG,
      categories: BUNDLED_CATEGORIES,
      lastSyncedAt: null,

      // Pull the live catalog + this user's unlocks (no-op offline / local-first).
      // Cheap and idempotent — safe to call on every sign-in.
      hydrate: async () => {
        if (!isRemote()) return;
        try {
          const payload = await fetchCatalog();
          const { items, categories } = normalize(payload);
          if (items.length) set({ items, categories, lastSyncedAt: Date.now() });
        } catch {
          // keep the cached (or bundled) catalog on network error
        }
        // Merge the server's permanent unlock records into the local store so
        // previously-unlocked items stay unlocked across devices/reinstalls.
        useUnlocksStore.getState().hydrate();
      },

      byId: (id) => get().items.find((it) => it.id === id),
    }),
    {
      name: 'catalog',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (s) => ({ items: s.items, categories: s.categories, lastSyncedAt: s.lastSyncedAt }),
    }
  )
);

// ── Pure selectors (operate on store values passed in) ──────────────────────

// Category names that actually contain items, in the catalog's sort order.
export function categoryNamesWithItems(items, categories) {
  const present = new Set(items.map((it) => it.category));
  return [...categories]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((c) => c.name)
    .filter((name) => present.has(name));
}

// Items in a category, cheapest first (matches the old catalogByCategory()).
export function itemsInCategory(items, name) {
  return items
    .filter((it) => it.category === name)
    .sort((a, b) => itemCost(a) - itemCost(b));
}

// A representative glyph (kind + color) for a category rail tile. Prefers the
// category's own `icon` (a render kind), else the first free item's glyph.
export function glyphForCategory(items, categories, name) {
  const cat = categories.find((c) => c.name === name);
  const list = items.filter((it) => it.category === name);
  const rep = list.find((it) => !it.premium) || list[0];
  return { kind: cat?.icon || rep?.kind || 'sofa', color: rep?.colors?.[0] };
}
