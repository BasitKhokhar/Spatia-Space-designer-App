import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { getColors } from './colors';
import { type, fonts } from './typography';
import { spacing, radius } from './spacing';
import { shadows } from './shadows';
import { useSettingsStore } from '@/store/useSettingsStore';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.themePreference);

  const mode = preference === 'system' ? systemScheme || 'light' : preference;

  const value = useMemo(
    () => ({
      mode,
      colors: getColors(mode),
      type,
      fonts,
      spacing,
      radius,
      shadows,
      isDark: mode === 'dark',
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
