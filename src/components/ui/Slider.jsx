import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useState } from 'react';

import { useTheme } from '@/theme/useTheme';

// Horizontal slider (rotation / scale). Emits a 0..1 fraction via onChange.
export default function Slider({ value = 0.5, onChange, style }) {
  const { colors, shadows } = useTheme();
  const [width, setWidth] = useState(1);
  const knob = 22;

  const frac = useSharedValue(value);
  const startFrac = useSharedValue(value);

  const emit = (v) => onChange && onChange(v);

  const pan = Gesture.Pan()
    .onStart(() => {
      startFrac.value = frac.value;
    })
    .onUpdate((e) => {
      const next = Math.min(1, Math.max(0, startFrac.value + e.translationX / Math.max(1, width)));
      frac.value = next;
      runOnJS(emit)(next);
    });

  const knobStyle = useAnimatedStyle(() => ({
    left: frac.value * Math.max(0, width - knob),
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: frac.value * width,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[{ height: knob, justifyContent: 'center' }, style]}
      >
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.lineSoft }} />
        <Animated.View
          style={[
            { position: 'absolute', height: 8, borderRadius: 4, backgroundColor: colors.accent },
            fillStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              backgroundColor: colors.accent,
            },
            shadows.accent,
            knobStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}
