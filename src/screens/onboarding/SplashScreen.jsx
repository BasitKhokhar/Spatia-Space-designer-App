import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { LogoTile } from '@/components/graphics/Logo';
import { useTheme } from '@/theme/useTheme';

// Branded cold-start splash. Purely presentational — it does no navigation. The
// useAppBootstrap gate in RootNavigator keeps it mounted until the app is ready,
// then swaps in the correct stack (onboarding / login / home).
export default function SplashScreen() {
  const { isDark, colors } = useTheme();

  // Gentle breathing pulse on the logo while the app boots.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Animated.View entering={FadeIn.duration(600)} style={logoStyle}>
          <LogoTile size={96} tone={isDark ? 'accent' : 'ink'} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ alignItems: 'center' }}>
          <Text variant="display">HomePlanner</Text>
          <Text variant="body" color="ink3" style={{ marginTop: 10 }}>
            Draw. Visualize. Furnish.
          </Text>
        </Animated.View>
      </View>

      {/* Minimal boot indicator — three dots that fade in near the bottom. */}
      <Animated.View
        entering={FadeIn.delay(500).duration(600)}
        style={{ flexDirection: 'row', gap: 7, alignSelf: 'center', marginBottom: 44 }}
      >
        {[0, 1, 2].map((i) => (
          <BootDot key={i} index={i} color={colors.ink3} />
        ))}
      </Animated.View>
    </Screen>
  );
}

function BootDot({ index, color }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(
      index * 180,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
  }, [v, index]);

  const style = useAnimatedStyle(() => ({ opacity: v.value }));

  return (
    <Animated.View
      style={[
        { width: 7, height: 7, borderRadius: 4, backgroundColor: color },
        style,
      ]}
    />
  );
}
