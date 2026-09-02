import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import AdBanner from '@/components/ads/AdBanner';
import { useAdLayout } from '@/store/useAdLayout';

import { ROUTES } from './routes';

const TAB_ICONS = {
  [ROUTES.home]: 'home',
  [ROUTES.explore]: 'explore',
  [ROUTES.projects]: 'grid',
  [ROUTES.settingsTab]: 'settings',
};

const TAB_LABELS = {
  [ROUTES.home]: 'Home',
  [ROUTES.explore]: 'Explore',
  [ROUTES.projects]: 'Projects',
  [ROUTES.settingsTab]: 'Settings',
};

function TabButton({ route, isFocused, onPress }) {
  const { colors } = useTheme();
  const color = isFocused ? colors.accent : colors.ink3;
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 5, flex: 1 }}>
      <Icon name={TAB_ICONS[route.name]} size={24} color={color} strokeWidth={1.8} />
      <Text variant="caption" color={isFocused ? 'accent' : 'ink3'} style={{ letterSpacing: 0, textTransform: 'none', fontSize: 11 }}>
        {TAB_LABELS[route.name]}
      </Text>
    </Pressable>
  );
}

// Custom bottom tab bar with a raised center "New Project" FAB.
export default function TabBar({ state, navigation }) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const setTabBarContentHeight = useAdLayout((s) => s.setTabBarContentHeight);

  const routes = state.routes;
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const onPressTab = (route, index) => {
    const focused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  // The banner is anchored inside this wrapper rather than inside the row, so
  // it sits above the tab buttons and the raised FAB. AdBanner collapses to
  // nothing when there is no ad, which leaves the bar exactly as it was.
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <AdBanner />
      <View
        onLayout={(e) => setTabBarContentHeight(e.nativeEvent.layout.height - insets.bottom)}
        style={{
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.lineSoft,
          paddingTop: 14,
          paddingBottom: insets.bottom + 10,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        {left.map((route) => (
          <TabButton key={route.key} route={route} isFocused={state.index === routes.indexOf(route)} onPress={() => onPressTab(route, routes.indexOf(route))} />
        ))}

        <View style={{ width: 64, alignItems: 'center' }}>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.newProject)}
            style={[
              {
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -14,
              },
              shadows.accent,
            ]}
          >
            <Icon name="plus" size={26} color="#fff" strokeWidth={2.6} />
          </Pressable>
        </View>

        {right.map((route) => (
          <TabButton key={route.key} route={route} isFocused={state.index === routes.indexOf(route)} onPress={() => onPressTab(route, routes.indexOf(route))} />
        ))}
      </View>
    </View>
  );
}
