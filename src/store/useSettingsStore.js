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

      setThemePreference: (themePreference) => set({ themePreference }),
      setLanguage: (language) => set({ language }),
      setMeasurementUnit: (measurementUnit) => set({ measurementUnit }),
      completeOnboarding: () => set({ onboardingComplete: true }),
      setNotifications: (notificationsEnabled) => set({ notificationsEnabled }),
      reset: () =>
        set({
          themePreference: 'system',
          language: 'English',
          measurementUnit: 'meters',
          onboardingComplete: false,
          notificationsEnabled: true,
        }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
