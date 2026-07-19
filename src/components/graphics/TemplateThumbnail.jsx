import Svg, { Rect, Line, Circle } from 'react-native-svg';
import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Renders a small floor-plan preview from a design template's real geometry —
// the ground floor's perimeter, its interior walls, and a dot per furniture
// item. Works for both backend designs and the bundled starter ideas because it
// reads the expanded plan (template.plan.floors[0].plan), not the compact idea
// shape (see IdeaThumbnail for that). Every design looks distinct and scales to
// its own aspect ratio.
const VB_W = 165;
const VB_H = 96;
const PAD = 12;

export default function TemplateThumbnail({ template, height = 100, style }) {
  const { colors, isDark } = useTheme();
  const stroke = isDark ? '#4A4238' : '#B79A82';
  const bg = isDark ? '#2A2620' : '#EBDFD3';
  const bgTo = isDark ? '#201D18' : '#DCC9B8';

  const ground = template?.plan?.floors?.[0]?.plan;
  const roomW = ground?.width || template?.dimensions?.width || 1;
  const roomL = ground?.length || template?.dimensions?.length || 1;

  const availW = VB_W - PAD * 2;
  const availH = VB_H - PAD * 2;
  const scale = Math.min(availW / roomW, availH / roomL);
  const drawnW = roomW * scale;
  const drawnH = roomL * scale;
  const ox = (VB_W - drawnW) / 2;
  const oy = (VB_H - drawnH) / 2;

  const toX = (mx) => ox + mx * scale;
  const toY = (my) => oy + my * scale;

  const interiorWalls = (ground?.walls || []).filter((w) => !w.perimeter);
  const furniture = ground?.furniture || [];

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

        {/* Interior walls */}
        {interiorWalls.map((w, i) => (
          <Line
            key={`w${i}`}
            x1={toX(w.x1)}
            y1={toY(w.y1)}
            x2={toX(w.x2)}
            y2={toY(w.y2)}
            stroke={stroke}
            strokeWidth={1.1}
            opacity={0.9}
          />
        ))}

        {/* Furniture dots */}
        {furniture.map((f, i) => (
          <Circle key={`f${i}`} cx={toX(f.x)} cy={toY(f.y)} r={2.1} fill={colors.accent} opacity={0.75} />
        ))}
      </Svg>
    </View>
  );
}
