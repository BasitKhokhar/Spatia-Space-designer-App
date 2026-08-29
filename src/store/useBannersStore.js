import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { fetchHomeBanners } from '@/services/api/contentApi';

// Home-screen hero images (GET /content/banners), cached to MMKV so the top of
// Home keeps its photography offline and on a cold start. The card's copy and
// CTA are compiled into the app — only the backdrop is server-driven, so an
// empty/failed fetch is never fatal: AiHeroBanner draws its own artwork instead.
export const useBannersStore = create(
  persist(
    (set) => ({
      banners: [],
      lastSyncedAt: null,

      // Cheap + idempotent; safe to call on every Home mount.
      hydrate: async () => {
        try {
          const banners = await fetchHomeBanners();
          // Only overwrite on a non-empty result. A local-first build or a
          // half-configured backend answers [], and replacing a good cache with
          // that would blank the card the user just saw.
          if (Array.isArray(banners) && banners.length) {
            set({ banners, lastSyncedAt: Date.now() });
          }
        } catch {
          // keep the cached (or empty) list on network error
        }
      },
    }),
    {
      name: 'home-banners',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (s) => ({ banners: s.banners, lastSyncedAt: s.lastSyncedAt }),
    }
  )
);
