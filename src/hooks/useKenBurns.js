import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Slow zoom/pan loop for onboarding hero images.
export function useKenBurns(duration = 16000) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [duration, progress]);

  const style = useAnimatedStyle(() => {
    const scale = 1.04 + progress.value * 0.12;
    const translate = progress.value * -8;
    return { transform: [{ scale }, { translateX: translate }, { translateY: translate / 2 }] };
  });

  return style;
}
