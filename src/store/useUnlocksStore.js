import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { isRemote } from '@/services/api/client';
import { creditsApi } from '@/services/api/creditsApi';

// Tracks which premium catalog items the user has unlocked (with credits or by
// watching a rewarded ad). Unlocks are permanent and persisted across sessions.
// When a backend is configured the authoritative record lives server-side
// (ItemUnlock rows) and is mirrored here for offline reads.
export const useUnlocksStore = create(
  persist(
    (set, get) => ({
      // Map of catalogId -> true. An object (not a Set) so it survives JSON persist.
      unlocked: {},

      isUnlocked: (id) => !!get().unlocked[id],

      unlock: (id) => set((s) => ({ unlocked: { ...s.unlocked, [id]: true } })),

      // Pull the server's permanent unlock records and merge them in (no-op
      // local-first). Never removes local unlocks — server is additive here.
      // Covers both catalog items and premade design templates (their slugs are
      // distinct, so they share one map).
      hydrate: async () => {
        if (!isRemote()) return;
        try {
          const res = await creditsApi.unlocks();
          const list = [...(res?.unlocks || []), ...(res?.templateUnlocks || [])];
          if (list.length) {
            set((s) => {
              const unlocked = { ...s.unlocked };
              list.forEach((id) => { unlocked[id] = true; });
              return { unlocked };
            });
          }
        } catch {
          // keep cached unlocks on network error
        }
      },

      reset: () => set({ unlocked: {} }),
    }),
    {
      name: 'unlocks',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
