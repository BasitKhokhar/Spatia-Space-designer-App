import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { CREDITS } from '@/constants/config';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const useCreditsStore = create(
  persist(
    (set, get) => ({
      balance: CREDITS.starting,
      adsWatchedToday: 0,
      adDay: today(),

      _rollDay() {
        const d = today();
        if (get().adDay !== d) {
          set({ adDay: d, adsWatchedToday: 0 });
        }
      },

      canWatchAd: () => {
        get()._rollDay();
        return get().adsWatchedToday < CREDITS.dailyAdCap;
      },

      adsRemaining: () => {
        get()._rollDay();
        return Math.max(0, CREDITS.dailyAdCap - get().adsWatchedToday);
      },

      earnFromAd: () => {
        get()._rollDay();
        if (get().adsWatchedToday >= CREDITS.dailyAdCap) return false;
        set((s) => ({
          balance: s.balance + CREDITS.perAd,
          adsWatchedToday: s.adsWatchedToday + 1,
        }));
        return true;
      },

      addCredits: (n) => set((s) => ({ balance: s.balance + n })),

      spend: (n) => {
        if (get().balance < n) return false;
        set((s) => ({ balance: s.balance - n }));
        return true;
      },

      reset: () => set({ balance: CREDITS.starting, adsWatchedToday: 0, adDay: today() }),
    }),
    {
      name: 'credits',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
