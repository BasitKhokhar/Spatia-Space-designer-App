import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { itemCost } from '@/data/catalog';
import { isRemote } from '@/services/api/client';
import { fetchCatalog } from '@/services/api/catalogApi';
import { creditsApi } from '@/services/api/creditsApi';
import { useUnlocksStore } from './useUnlocksStore';

// Normalize whatever /catalog returns (objects, or a legacy string array) into
// category objects, and ensure items are a plain array.
function normalize(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  let categories = payload?.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    categories = [];
  } else if (typeof categories[0] === 'string') {
    categories = categories
      .filter((n) => n !== 'All')
      .map((name, i) => ({ name, sortOrder: i, icon: null, group: null }));
  }
  return { items, categories };
}

// byId() is called from inside React selectors, once per placed item, on every
// render. A linear .find() over ~180 items made that O(n·m) per frame. The index
// is rebuilt only when the items array identity changes.
let _index = null;
let _indexedArray = null;
function indexOf(items) {
  if (_indexedArray !== items) {
    _index = new Map(items.map((it) => [it.id, it]));
    _indexedArray = items;
  }
  return _index;
}

// Apply a delta response onto the cached catalog: changed rows replace their
// previous version, `deleted` slugs are dropped. Order is preserved for rows
// that did not change, so the catalog UI does not reshuffle on every sync.
function mergeDelta(current, changed, deletedSlugs) {
  const dropped = new Set(deletedSlugs || []);
  const changedById = new Map((changed || []).map((it) => [it.id, it]));
  const merged = [];
  for (const item of current) {
    if (dropped.has(item.id)) continue;
    merged.push(changedById.get(item.id) || item);
    changedById.delete(item.id);
  }
  // Anything left is genuinely new — append so it surfaces without reordering.
  for (const item of changedById.values()) merged.push(item);
  return merged;
}

// Dynamic catalog. Mirrors the admin-managed backend catalog (fetched via
// GET /catalog) and is cached to MMKV so the app keeps working offline once it
// has synced at least once — there is no bundled duplicate of the catalog data
// itself. `kind` is the universal render join-key, preserved verbatim from the
// server.
export const useCatalogStore = create(
  persist(
    (set, get) => ({
      items: [],
      categories: [],
      lastSyncedAt: null,   // local wall clock, informational
      syncedAt: null,       // SERVER cursor for the next ?since= delta request
      // True while the first sync of this session is in flight — lets the
      // catalog UI show a loading state instead of "no items" before the very
      // first fetch (or MMKV rehydrate) has landed.
      loading: isRemote(),
      _inflight: null,      // dedupes concurrent hydrate() calls (not persisted)

      // Pull the live catalog + this user's unlocks (no-op offline / local-first).
      // Cheap and idempotent — safe to call on every sign-in.
      hydrate: async () => {
        if (!isRemote()) return undefined;
        // RootNavigator hydrates on cold start AND again after sign-in. Without
        // this memo those two fire concurrent, identical GET /catalog requests.
        const running = get()._inflight;
        if (running) return running;

        const run = (async () => {
          set({ loading: true });
          try {
            // syncedAt is the SERVER's clock, so a device with a skewed clock
            // cannot silently skip rows. Falls back to a full fetch when we've
            // never synced (or the cursor was lost).
            const cursor = get().syncedAt;
            const payload = await fetchCatalog(cursor || undefined);
            const isDelta = !!cursor && Array.isArray(payload?.deleted);

            if (isDelta) {
              const changed = Array.isArray(payload.items) ? payload.items : [];
              const deleted = payload.deleted || [];
              if (changed.length || deleted.length) {
                const { categories } = normalize(payload);
                set({
                  items: mergeDelta(get().items, changed, deleted),
                  categories,
                  lastSyncedAt: Date.now(),
                  syncedAt: payload.syncedAt || cursor,
                });
              } else {
                // Nothing changed — still advance the cursor so the next sync
                // window starts here rather than replaying the same rows.
                set({ lastSyncedAt: Date.now(), syncedAt: payload.syncedAt || cursor });
              }
            } else {
              const { items, categories } = normalize(payload);
              // Guard against an empty/failed body blanking a good cache.
              if (items.length) {
                set({ items, categories, lastSyncedAt: Date.now(), syncedAt: payload?.syncedAt || null });
              }
            }
          } catch (err) {
            // keep the cached catalog on network error
            console.warn('[catalog] hydrate failed, keeping cached catalog', err?.message || err);
          } finally {
            set({ _inflight: null, loading: false });
          }
          // Merge the server's permanent unlock records into the local store so
          // previously-unlocked items stay unlocked across devices/reinstalls.
          useUnlocksStore.getState().hydrate();
        })();

        set({ _inflight: run });
        return run;
      },

      byId: (id) => indexOf(get().items).get(id),
    }),
    {
      name: 'catalog',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (s) => ({
        items: s.items,
        categories: s.categories,
        lastSyncedAt: s.lastSyncedAt,
        syncedAt: s.syncedAt,
      }),
      // The item shape gained updatedAt/*Bytes/*Sha, which the asset manager
      // needs to key its cache. A pre-v1 cache has none of them, so drop the
      // cursor to force one full re-fetch rather than delta-ing onto stale rows.
      version: 1,
      migrate: (persisted, from) => {
        if (from < 1) return { ...persisted, syncedAt: null };
        return persisted;
      },
    }
  )
);

// ── Pure selectors (operate on store values passed in) ──────────────────────

// Category names in the catalog's sort order (includes all available categories).
export function categoryNamesWithItems(items, categories) {
  const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((c) => c.name);
  const categorySet = new Set(sorted);
  items.forEach((it) => {
    if (it.category && !categorySet.has(it.category)) {
      sorted.push(it.category);
      categorySet.add(it.category);
    }
  });
  return sorted;
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
