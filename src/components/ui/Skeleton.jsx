import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/useTheme';

// Placeholder block with a shimmer sweep — a soft highlight band travels
// left→right on loop, the same premium-loading language as LinkedIn/Airbnb.
// Sized/shaped by the caller via `style` so a skeleton layout can mirror its
// real content's dimensions exactly.
export default function Skeleton({ width, height = 16, radius: radiusOverride, style }) {
  const { colors, isDark, radius } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;
  const [boxWidth, setBoxWidth] = useState(typeof width === 'number' ? width : 120);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(sweep, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const bandWidth = Math.max(boxWidth * 0.7, 60);
  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandWidth, boxWidth],
  });

  return (
    <View
      onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radiusOverride ?? radius.sm,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: bandWidth,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={
            isDark
              ? ['transparent', 'rgba(244,241,234,0.09)', 'transparent']
              : ['transparent', 'rgba(255,255,255,0.85)', 'transparent']
          }
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

// Row of skeleton blocks, for building composite placeholders (e.g. a card's
// title + subtitle lines) without repeating the Skeleton import everywhere.
export function SkeletonGroup({ children, style }) {
  return <View style={style}>{children}</View>;
}
