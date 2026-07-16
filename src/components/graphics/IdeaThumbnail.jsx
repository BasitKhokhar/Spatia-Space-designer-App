import Svg, { Rect, Circle } from 'react-native-svg';
import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Renders a small floor-plan preview from a starter idea's real geometry
// (see data/starterIdeas.js): the perimeter, interior partition rects, and a
// dot per furniture item. Unlike PlanThumbnail's fixed art, every idea looks
// distinct, and the layout scales to the idea's own aspect ratio.
const VB_W = 165;
const VB_H = 96;
const PAD = 12;

export default function IdeaThumbnail({ idea, height = 100, style }) {
  const { colors, isDark } = useTheme();
  const stroke = isDark ? '#4A4238' : '#B79A82';
  const bg = isDark ? '#2A2620' : '#EBDFD3';
  const bgTo = isDark ? '#201D18' : '#DCC9B8';

  const [roomW, roomL] = idea?.dim || [1, 1];
  const availW = VB_W - PAD * 2;
  const availH = VB_H - PAD * 2;
  const scale = Math.min(availW / roomW, availH / roomL);
  const drawnW = roomW * scale;
  const drawnH = roomL * scale;
  const ox = (VB_W - drawnW) / 2;
  const oy = (VB_H - drawnH) / 2;

  const toX = (mx) => ox + mx * scale;
  const toY = (my) => oy + my * scale;

  return (
    <View
      style={[
        { height, backgroundColor: bg, overflow: 'hidden', justifyContent: 'center' },
        style,
      ]}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Rect x="0" y="0" width={VB_W} height={VB_H} fill={bgTo} opacity={0.4} />

        {/* Perimeter */}
        <Rect
          x={ox}
          y={oy}
          width={drawnW}
          height={drawnH}
          rx={2}
          fill={colors.accent}
          fillOpacity={isDark ? 0.06 : 0.09}
          stroke={stroke}
          strokeWidth={1.6}
        />

        {/* Interior partitions */}
        {(idea?.part || []).map(([x, y, w, h], i) => (
          <Rect
            key={`p${i}`}
            x={toX(x)}
            y={toY(y)}
            width={w * scale}
            height={h * scale}
            fill="none"
            stroke={stroke}
            strokeWidth={1.1}
            opacity={0.9}
          />
        ))}

        {/* Furniture dots */}
        {(idea?.items || []).map(([, fx, fy], i) => (
          <Circle
            key={`f${i}`}
            cx={ox + fx * drawnW}
            cy={oy + fy * drawnH}
            r={2.1}
            fill={colors.accent}
            opacity={0.75}
          />
        ))}
      </Svg>
    </View>
  );
}
