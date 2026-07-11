import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

// Standard themed screen wrapper: safe-area + background. Set `scroll` for a
// scrollable body, or `edges` to control which safe-area edges are padded.
export default function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  padded = false,
  style,
  contentContainerStyle,
  backgroundColor,
}) {
  const { colors, spacing } = useTheme();
  const bg = backgroundColor || colors.bg;

  const innerStyle = [padded && { paddingHorizontal: spacing.xxl }, style];

  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: bg }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[innerStyle, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: bg }}>
      <View style={[{ flex: 1 }, innerStyle]}>{children}</View>
    </SafeAreaView>
  );
}
