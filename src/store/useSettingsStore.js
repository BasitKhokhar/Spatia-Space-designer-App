import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';

// App-wide preferences: theme mode + language + one-time flags.
export const useSettingsStore = create(
  persist(
    (set) => ({
      themePreference: 'system', // 'light' | 'dark' | 'system'
      language: 'English',
      measurementUnit: 'meters', // 'meters' | 'feet'
      onboardingComplete: false,
      notificationsEnabled: true,
      // How aggressively to pull catalog resources (.glb + images).
      // 'wifi' is the default: hundreds of MB must never land on a metered
      // connection without the user having said so.
      assetDownloadPolicy: 'wifi', // 'wifi' | 'always' | 'off'
      // One-time gate for the first-run download prompt.
      assetPromptSeen: false,

      setThemePreference: (themePreference) => set({ themePreference }),
      setLanguage: (language) => set({ language }),
      setMeasurementUnit: (measurementUnit) => set({ measurementUnit }),
      completeOnboarding: () => set({ onboardingComplete: true }),
      setNotifications: (notificationsEnabled) => set({ notificationsEnabled }),
      setAssetDownloadPolicy: (assetDownloadPolicy) => set({ assetDownloadPolicy }),
      markAssetPromptSeen: () => set({ assetPromptSeen: true }),
      reset: () =>
        set({
          themePreference: 'system',
          language: 'English',
          measurementUnit: 'meters',
          onboardingComplete: false,
          notificationsEnabled: true,
          assetDownloadPolicy: 'wifi',
          assetPromptSeen: false,
        }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
