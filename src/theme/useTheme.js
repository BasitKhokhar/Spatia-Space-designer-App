import { useThemeContext } from './ThemeProvider';

// Convenience hook every component uses to read design tokens.
export function useTheme() {
  return useThemeContext();
}
