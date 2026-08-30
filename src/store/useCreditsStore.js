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
      // Server-granted ad-free flag, independent of the subscription tier (the
      // backend exposes it as a per-user column so support can grant it). Kept
      // separate from `tier` so a refresh can't clobber one with the other.
      serverAdsDisabled: false,
      // Subscription entitlement: 'free' | 'basic' | 'premium'. Authoritative
      // value comes from the backend (/credits or /billing/my-status); defaults
      // to 'free' offline. 'premium' implies unlimited downloads (isUnlimited).
      tier: 'free',

      // Derived entitlement helpers (read the current tier).
      // Basic & Premium both remove ads and unlock the whole premium catalog.
      adsDisabled: () => get().serverAdsDisabled === true || get().tier !== 'free',
      premiumUnlocked: () => get().tier !== 'free',
      // Only Premium (or the legacy isUnlimited flag) grants unlimited downloads;
      // Basic still spends credits per download from its granted balance.
      unlimitedDownloads: () => get().tier === 'premium' || get().isUnlimited,

      // Dev/local helper to preview a tier without a real purchase.
      setTier: (tier) => set({ tier, isUnlimited: tier === 'premium' }),

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
            serverAdsDisabled: s.adsDisabled === true,
            tier: s.tier || (s.isUnlimited ? 'premium' : 'free'),
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
              serverAdsDisabled: s.adsDisabled === true,
              tier: s.tier || (s.isUnlimited ? 'premium' : 'free'),
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

      // Spend credits to place a catalog item. Local mode deducts `cost` from the
      // balance; remote mode lets the backend validate the item's price. Returns
      // true on success, false when short / on network error.
      spendItem: async (cost, itemId) => {
        if (get().premiumUnlocked()) return true; // subscribers place free
        if (isRemote()) {
          try {
            const s = await creditsApi.spendItem(itemId);
            set({
              balance: s.balance,
              isUnlimited: s.isUnlimited,
              tier: s.tier || (s.isUnlimited ? 'premium' : 'free'),
            });
            return true;
          } catch {
            return false;
          }
        }
        if ((cost || 0) <= 0) return true;
        if (get().balance < cost) return false;
        set((s) => ({ balance: s.balance - cost }));
        return true;
      },

      // Spend for an export. `kind` ('png'|'pdf'|'obj') is required for the
      // server; `amount` is used only in local mode. Returns true on success.
      spend: async (amount, kind) => {
        if (isRemote()) {
          try {
            const s = await creditsApi.spend(kind);
            set({
              balance: s.balance,
              isUnlimited: s.isUnlimited,
              tier: s.tier || (s.isUnlimited ? 'premium' : 'free'),
            });
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
