import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { CREDITS } from '@/constants/config';
import { isRemote } from '@/services/api/client';
import { creditsApi } from '@/services/api/creditsApi';

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Credits store. When a backend URL is configured the balance/ad-state is
// server-authoritative (fetched via /credits, driven by the backend's CREDITS_*
// env vars); otherwise it uses the original local-only economy.
export const useCreditsStore = create(
  persist(
    (set, get) => ({
      balance: CREDITS.starting,
      adsWatchedToday: 0,
      adDay: today(),
      dailyAdCap: CREDITS.dailyAdCap,
      perAd: CREDITS.perAd,
      isUnlimited: false,

      _rollDay() {
        const d = today();
        if (get().adDay !== d) {
          set({ adDay: d, adsWatchedToday: 0 });
        }
      },

      // Pull the authoritative state from the server (no-op when local-first).
      refresh: async () => {
        if (!isRemote()) return;
        try {
          const s = await creditsApi.get();
          set({
            balance: s.balance,
            adsWatchedToday: s.adsWatchedToday,
            dailyAdCap: s.dailyAdCap,
            perAd: s.perAd,
            isUnlimited: s.isUnlimited,
          });
        } catch {
          // keep cached values on network error
        }
      },

      canWatchAd: () => {
        get()._rollDay();
        if (get().isUnlimited) return true;
        return get().adsWatchedToday < get().dailyAdCap;
      },

      adsRemaining: () => {
        get()._rollDay();
        return Math.max(0, get().dailyAdCap - get().adsWatchedToday);
      },

      // Record a rewarded-ad view. Returns true when a credit was granted.
      earnFromAd: async () => {
        if (isRemote()) {
          try {
            const s = await creditsApi.earnFromAd();
            set({
              balance: s.balance,
              adsWatchedToday: s.adsWatchedToday,
              dailyAdCap: s.dailyAdCap,
              perAd: s.perAd,
              isUnlimited: s.isUnlimited,
            });
            return true;
          } catch {
            return false;
          }
        }
        get()._rollDay();
        if (get().adsWatchedToday >= get().dailyAdCap) return false;
        set((st) => ({ balance: st.balance + st.perAd, adsWatchedToday: st.adsWatchedToday + 1 }));
        return true;
      },

      addCredits: (n) => set((s) => ({ balance: s.balance + n })),

      // Spend for an export. `kind` ('png'|'pdf'|'obj') is required for the
      // server; `amount` is used only in local mode. Returns true on success.
      spend: async (amount, kind) => {
        if (isRemote()) {
          try {
            const s = await creditsApi.spend(kind);
            set({ balance: s.balance, isUnlimited: s.isUnlimited });
            return true;
          } catch {
            return false;
          }
        }
        if (get().balance < amount) return false;
        set((s) => ({ balance: s.balance - amount }));
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
