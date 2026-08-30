import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { AD_CONFIG } from '@/services/ads/config';

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Interstitial frequency capping.
//
// This is the difference between "shows ads at natural break points" and the
// pattern Google's Disruptive Ads policy suspends apps for. The daily counters
// persist (so uninstalling the session doesn't reset the ceiling); the session
// counters deliberately do not.
export const useAdFrequency = create(
  persist(
    (set, get) => ({
      // Persisted
      interstitialsToday: 0,
      adDay: today(),
      lastInterstitialAt: 0,
      lastRewardedAt: 0,

      // Session-only (see partialize)
      sessionCount: 0,
      sessionStartedAt: Date.now(),
      qualifyingActions: 0,

      _rollDay() {
        const d = today();
        if (get().adDay !== d) set({ adDay: d, interstitialsToday: 0 });
      },

      resetSession() {
        set({ sessionCount: 0, sessionStartedAt: Date.now(), qualifyingActions: 0 });
      },

      // Counts a moment that *could* have carried an ad, whether or not one was
      // shown. Used to make sure the first thing a user does in a session is
      // never interrupted.
      noteQualifyingAction() {
        set((s) => ({ qualifyingActions: s.qualifyingActions + 1 }));
      },

      // Returns the reason an interstitial is suppressed, or null to allow it.
      // Returning the reason rather than a bare boolean is what makes the caps
      // observable while testing.
      interstitialBlockReason() {
        get()._rollDay();
        const now = Date.now();
        const F = AD_CONFIG.freq;
        const s = get();
        if (now - s.sessionStartedAt < F.sessionGraceMs) return 'session-grace';
        if (s.qualifyingActions < F.minActionsBeforeFirst) return 'too-few-actions';
        if (s.sessionCount >= F.maxPerSession) return 'session-cap';
        if (s.interstitialsToday >= F.maxPerDay) return 'daily-cap';
        if (now - s.lastInterstitialAt < F.minGapMs) return 'min-gap';
        if (now - s.lastRewardedAt < F.minAfterRewardedMs) return 'after-rewarded';
        return null;
      },

      allowInterstitial() {
        return get().interstitialBlockReason() === null;
      },

      recordInterstitial() {
        get()._rollDay();
        set((s) => ({
          sessionCount: s.sessionCount + 1,
          interstitialsToday: s.interstitialsToday + 1,
          lastInterstitialAt: Date.now(),
        }));
      },

      // Recorded for every completed rewarded view, earned or not, so an
      // interstitial never lands on top of a video the user just sat through.
      recordRewarded() {
        set({ lastRewardedAt: Date.now() });
      },

      reset() {
        set({
          interstitialsToday: 0,
          adDay: today(),
          lastInterstitialAt: 0,
          lastRewardedAt: 0,
          sessionCount: 0,
          sessionStartedAt: Date.now(),
          qualifyingActions: 0,
        });
      },
    }),
    {
      name: 'adFrequency',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (s) => ({
        interstitialsToday: s.interstitialsToday,
        adDay: s.adDay,
        lastInterstitialAt: s.lastInterstitialAt,
        lastRewardedAt: s.lastRewardedAt,
      }),
      onRehydrateStorage: () => (state) => {
        // A relaunch is always a new session, whatever was persisted.
        if (state) state.resetSession();
      },
    }
  )
);
