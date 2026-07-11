import { View } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';

// Renders the actual plan (walls + furniture footprints) — used for PNG capture
// and export previews.
export default function RoomPreview({ plan, width = 300, style }) {
  const { colors, isDark } = useTheme();
  if (!plan) return null;

  const pad = 24;
  const ppm = Math.min((width - pad * 2) / plan.width, (width * 0.62 - pad * 2) / plan.length);
  const w = plan.width * ppm;
  const h = plan.length * ppm;
  const ox = (width - w) / 2;
  const oy = (width * 0.62 - h) / 2;

  return (
    <View style={[{ width, height: width * 0.62, backgroundColor: isDark ? '#1D1712' : '#FBF6F1' }, style]}>
      <Svg width={width} height={width * 0.62}>
        <Rect x={ox} y={oy} width={w} height={h} fill={isDark ? '#241C15' : '#F4ECE1'} stroke={colors.accent} strokeWidth={3} rx={4} />
        {plan.furniture.map((f) => {
          const fw = f.w * f.scale * ppm;
          const fd = f.d * f.scale * ppm;
          return (
            <G key={f.id}>
              <Rect
                x={ox + f.x * ppm - fw / 2}
                y={oy + f.y * ppm - fd / 2}
                width={fw}
                height={fd}
                fill={f.color}
                opacity={0.9}
                rx={4}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
