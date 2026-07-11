import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Small stylized floor-plan diagram used on project/template cards.
// `variant` (0..3) picks a different wall layout for visual variety.
const LAYOUTS = [
  'M20 24 H145 M20 24 V80 H145 V24 M90 24 V80 M20 54 H90',
  'M24 20 H140 M24 20 V78 H140 V20 M24 50 H82 M82 20 V78',
  'M22 22 H142 M22 22 V76 H142 V76 M70 22 V76 M22 50 H70 M100 50 H142',
  'M26 24 H138 M26 24 V74 H138 V24 M26 50 H138',
];

export default function PlanThumbnail({ variant = 0, height = 96, style }) {
  const { colors, isDark } = useTheme();
  const stroke = isDark ? '#4A4238' : '#B79A82';
  const bgFrom = isDark ? '#2A2620' : '#EBDFD3';
  const bgTo = isDark ? '#201D18' : '#DCC9B8';

  return (
    <View
      style={[
        { height, backgroundColor: bgFrom, overflow: 'hidden', justifyContent: 'center' },
        style,
      ]}
    >
      <Svg width="100%" height={height} viewBox="0 0 165 96">
        <Rect x="0" y="0" width="165" height="96" fill={bgTo} opacity={0.4} />
        <Path d={LAYOUTS[variant % LAYOUTS.length]} stroke={stroke} strokeWidth={1.4} fill="none" />
        <Circle cx="130" cy="66" r="8" fill={colors.accent} opacity={0.35} />
      </Svg>
    </View>
  );
}
