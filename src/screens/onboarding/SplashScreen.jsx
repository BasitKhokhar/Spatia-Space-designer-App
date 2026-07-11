import { useEffect } from 'react';
import { View } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import ProgressDots from '@/components/ui/ProgressDots';
import { LogoTile } from '@/components/graphics/Logo';
import { useTheme } from '@/theme/useTheme';
import { ROUTES } from '@/navigation/routes';

export default function SplashScreen({ navigation }) {
  const { isDark } = useTheme();

  useEffect(() => {
    const t = setTimeout(() => navigation.replace(ROUTES.onboarding), 1400);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <LogoTile size={88} tone={isDark ? 'accent' : 'ink'} />
        <View style={{ alignItems: 'center' }}>
          <Text variant="display">HomePlanner</Text>
          <Text variant="body" color="ink3" style={{ marginTop: 10 }}>
            Draw. Visualize. Furnish.
          </Text>
        </View>
      </View>
      <ProgressDots total={3} index={0} style={{ alignSelf: 'center', marginBottom: 40 }} />
    </Screen>
  );
}
