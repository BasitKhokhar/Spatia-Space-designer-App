// HomePlanner color tokens — mirrors the brand design system exactly.

// Terracotta accent scale (shared across themes)
export const accent = {
  soft: '#F3E3DA',
  a300: '#E4A188',
  a400: '#D6795A',
  a500: '#BC5B3A', // base
  press: '#A44E30',
  a700: '#7E3A22',
};

// Semantic colors that don't flip between themes
export const fixed = {
  white: '#FFFFFF',
  danger: '#C0392B',
  dangerDark: '#D1453A',
  dangerSoftLight: '#FDECEA',
  dangerSoftDark: '#2B1712',
  dangerBorderLight: '#F5C6BE',
  dangerBorderDark: '#4A2A22',
  success: '#4E7C59',
  successDark: '#6FA57C',
  google: '#4285F4',
};

export const lightColors = {
  mode: 'light',
  bg: '#F6F3EE',
  bgGradientTop: '#F1ECE4',
  surface: '#FFFFFF',
  surface2: '#F6F3EE',
  ink: '#1B1A17',
  ink2: '#57534B',
  ink3: '#9A9488',
  line: '#E7E2D9',
  lineSoft: '#EFEBE3',
  accent: accent.a500,
  accentPress: accent.press,
  accentSoft: accent.soft,
  accentTintBg: '#FBF4F0',
  onAccent: '#FFFFFF',
  credit: '#C79A45',
  tabBar: 'rgba(252,250,246,0.94)',
  overlay: 'rgba(27,26,23,0.42)',
  ...fixed,
};

export const darkColors = {
  mode: 'dark',
  bg: '#131210',
  bgGradientTop: '#1A1713',
  surface: '#1C1A16',
  surface2: '#24211C',
  ink: '#F4F1EA',
  ink2: '#ADA79B',
  ink3: '#78736A',
  line: '#2E2A24',
  lineSoft: '#2A2620',
  accent: accent.a500,
  accentPress: accent.press,
  accentSoft: '#33241D',
  accentTintBg: '#231A15',
  onAccent: '#FFFFFF',
  credit: '#D8AC55',
  tabBar: 'rgba(21,19,16,0.92)',
  overlay: 'rgba(0,0,0,0.55)',
  ...fixed,
};

export function getColors(mode) {
  return mode === 'dark' ? darkColors : lightColors;
}
