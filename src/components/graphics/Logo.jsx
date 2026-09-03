import { View, Image } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';

const LOGO_IMAGE = require('../../../assets/logoo.png');

// The HomePlanner app mark glyph.
export function LogoMark({ size = 48, stroke = '#F4F1EA', accent = '#D6795A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="7" y="7" width="34" height="34" rx="9" stroke={accent} strokeWidth={2.6} />
      <Path
        d="M24 8 V24 M24 24 H41 M24 24 V40 M7 30 H16"
        stroke={stroke}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <Circle cx="24" cy="24" r="2.4" fill={accent} />
    </Svg>
  );
}

// Rounded tile containing the app logo image. `tone`: 'ink' (dark tile) or 'accent'.
// `bare`: no tile background/shadow — the logo image itself fills the rounded
// footprint directly (used by the splash screen).
export function LogoTile({ size = 64, tone = 'ink', style, bare = false }) {
  const { colors, shadows } = useTheme();
  const isAccent = tone === 'accent';
  const bg = isAccent ? colors.accent : colors.ink;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: bare ? 'transparent' : bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        bare ? null : shadows.e2,
        style,
      ]}
    >
      <Image
        source={LOGO_IMAGE}
        style={{ width: bare ? size : size * 0.7, height: bare ? size : size * 0.7 }}
        resizeMode="contain"
      />
    </View>
  );
}
