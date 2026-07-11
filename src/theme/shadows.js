import { Platform } from 'react-native';

// Elevation presets e1/e2/e3 from the brand doc. Android uses `elevation`.
function make(ios, elevation) {
  return Platform.select({
    ios,
    android: { elevation },
    default: ios,
  });
}

export const shadows = {
  e1: make(
    {
      shadowColor: '#1B1817',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    2
  ),
  e2: make(
    {
      shadowColor: '#1B1817',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
    },
    6
  ),
  e3: make(
    {
      shadowColor: '#1B1817',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 36,
    },
    12
  ),
  accent: make(
    {
      shadowColor: '#BC5B3A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.32,
      shadowRadius: 26,
    },
    10
  ),
};
