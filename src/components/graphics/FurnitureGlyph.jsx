import Svg, { Rect, Ellipse, Circle } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';

// Simple 2D glyphs standing in for catalog product photos, tinted by theme.
export default function FurnitureGlyph({ kind = 'sofa', size = 80, color }) {
  const { colors, isDark } = useTheme();
  const c = color || colors.accent;
  const wood = isDark ? '#6E5240' : '#8A6250';

  const glyphs = {
    sofa: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 80 50">
        <Rect x="6" y="18" width="68" height="24" rx="8" fill={c} />
        <Rect x="2" y="24" width="12" height="22" rx="5" fill={colors.accentPress} />
        <Rect x="66" y="24" width="12" height="22" rx="5" fill={colors.accentPress} />
      </Svg>
    ),
    lamp: (
      <Svg width={size * 0.85} height={size} viewBox="0 0 70 60">
        <Ellipse cx="35" cy="46" rx="30" ry="7" fill={wood} opacity={0.5} />
        <Rect x="30" y="8" width="10" height="38" rx="3" fill={wood} />
        <Ellipse cx="35" cy="8" rx="24" ry="8" fill={c} />
      </Svg>
    ),
    table: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 76 46">
        <Rect x="8" y="10" width="60" height="8" rx="3" fill={wood} />
        <Rect x="12" y="18" width="6" height="24" fill={wood} />
        <Rect x="58" y="18" width="6" height="24" fill={wood} />
      </Svg>
    ),
    plant: (
      <Svg width={size * 0.6} height={size} viewBox="0 0 46 60">
        <Rect x="6" y="6" width="34" height="42" rx="4" fill={colors.success} />
        <Rect x="6" y="48" width="34" height="8" rx="2" fill={colors.accentPress} />
      </Svg>
    ),
    bed: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 80 56">
        <Rect x="6" y="24" width="68" height="20" rx="5" fill={c} />
        <Rect x="10" y="14" width="26" height="14" rx="4" fill={colors.accentSoft} />
        <Circle cx="70" cy="20" r="6" fill={colors.accentSoft} />
      </Svg>
    ),
    chair: (
      <Svg width={size * 0.7} height={size} viewBox="0 0 56 60">
        <Rect x="14" y="8" width="28" height="26" rx="6" fill={c} />
        <Rect x="14" y="34" width="28" height="10" rx="3" fill={colors.accentPress} />
        <Rect x="16" y="44" width="4" height="12" fill={wood} />
        <Rect x="36" y="44" width="4" height="12" fill={wood} />
      </Svg>
    ),
  };

  return glyphs[kind] || glyphs.sofa;
}
