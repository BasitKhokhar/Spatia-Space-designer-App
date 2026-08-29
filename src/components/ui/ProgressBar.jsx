import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Determinate progress bar. Extracted from the one-off in AiGeneratingScreen so
// downloads and AI generation share a single implementation.
//
// `monotonic` (default) never lets the bar move backwards. That matters more
// here than it did there: a download job that fails and retries legitimately
// reduces the completed byte count, and a bar that jumps back reads as a bug
// even though the underlying number is honest.
export default function ProgressBar({
  value = 0,
  height = 6,
  monotonic = true,
  tone,
  track,
  style,
}) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const highest = useRef(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, value || 0));
    const next = monotonic ? Math.max(highest.current, clamped) : clamped;
    // Allow an explicit reset to 0 (a new run) to move backwards.
    if (monotonic && clamped === 0) highest.current = 0;
    else highest.current = next;

    Animated.timing(progress, {
      toValue: next,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      // Width cannot be driven natively.
      useNativeDriver: false,
    }).start();
  }, [value, monotonic, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        { height, borderRadius: height / 2, backgroundColor: track || colors.lineSoft, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={{ width, height, borderRadius: height / 2, backgroundColor: tone || colors.accent }}
      />
    </View>
  );
}
