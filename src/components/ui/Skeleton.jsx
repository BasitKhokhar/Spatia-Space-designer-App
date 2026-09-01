import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Pulsing placeholder block. Sized/shaped by the caller via `style` so a
// skeleton layout can mirror its real content's dimensions exactly.
export default function Skeleton({ width, height = 16, radius: radiusOverride, style }) {
  const { colors, radius } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radiusOverride ?? radius.sm,
          backgroundColor: colors.surface2,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Row of skeleton blocks, for building composite placeholders (e.g. a card's
// title + subtitle lines) without repeating the Skeleton import everywhere.
export function SkeletonGroup({ children, style }) {
  return <View style={style}>{children}</View>;
}
