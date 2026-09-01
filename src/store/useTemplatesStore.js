import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { fetchDesignCatalog } from '@/services/api/templatesApi';

// Dynamic design-template catalog (the "Try Our Creative Designs" flow). Online
// it mirrors the admin-managed backend (GET /catalog/design-catalog) and is
// cached to MMKV so the browse flow keeps working offline; the bundled
// categories + starter ideas are the first-run / offline seed (assembled in
// templatesApi.localDesignCatalog). Each template carries its full multi-floor
// plan, so opening one needs no extra fetch and works offline.
export const useTemplatesStore = create(
  persist(
    (set, get) => ({
      categories: [],
      tabs: [],
      templates: [],
      lastSyncedAt: null,
      // True while the first fetch of this session is in flight — lets Explore
      // show a loading skeleton instead of its "couldn't load" dead end before
      // the first response has actually come back.
      loading: true,

      // Pull the live (or bundled) design catalog and cache it. Cheap + idempotent.
      hydrate: async () => {
        set({ loading: true });
        try {
          const payload = await fetchDesignCatalog();
          if (payload?.categories?.length) {
            set({
              categories: payload.categories,
              tabs: payload.tabs || [],
              templates: payload.templates || [],
              lastSyncedAt: Date.now(),
            });
          }
        } catch {
          // keep the cached (or empty) catalog on network error
        } finally {
          set({ loading: false });
        }
      },

      // ── Selectors ──────────────────────────────────────────────────────────
      tabsFor: (categoryKey) =>
        get().tabs
          .filter((t) => t.categoryKey === categoryKey)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),

      templatesFor: (categoryKey, tabKey) =>
        get().templates
          .filter((t) => t.categoryKey === categoryKey && (!tabKey || t.tabKey === tabKey))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),

      byId: (id) => get().templates.find((t) => t.id === id),
    }),
    {
      name: 'templates',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (s) => ({
        categories: s.categories,
        tabs: s.tabs,
        templates: s.templates,
        lastSyncedAt: s.lastSyncedAt,
      }),
    }
  )
);
