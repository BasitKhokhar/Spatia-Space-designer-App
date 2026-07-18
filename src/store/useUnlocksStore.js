import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';

// Tracks which premium catalog items the user has unlocked (by watching a
// rewarded ad). Unlocks are permanent and persisted across sessions.
export const useUnlocksStore = create(
  persist(
    (set, get) => ({
      // Map of catalogId -> true. An object (not a Set) so it survives JSON persist.
      unlocked: {},

      isUnlocked: (id) => !!get().unlocked[id],

      unlock: (id) => set((s) => ({ unlocked: { ...s.unlocked, [id]: true } })),

      reset: () => set({ unlocked: {} }),
    }),
    {
      name: 'unlocks',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
