import { View, Pressable } from 'react-native';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

function QuickStartCard({ icon, title, subtitle, onPress }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        borderRadius: radius.lg,
        padding: spacing.md,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radius.sm,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={17} color={colors.accent} strokeWidth={2} />
      </View>
      <Text variant="titleSm" style={{ marginTop: 10 }}>
        {title}
      </Text>
      <Text variant="bodySm" color="ink3" style={{ marginTop: 2 }}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

// Shortcuts sitting under the hero carousel — straight into a blank canvas or
// the template picker, without going through the full "how do you want to
// start" screen the carousel's own CTA opens.
export default function QuickStartRow({ onBlank, onTemplates, style }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 12 }, style]}>
      <QuickStartCard icon="square" title="Blank Project" subtitle="Start from scratch" onPress={onBlank} />
      <QuickStartCard icon="grid" title="Templates" subtitle="Explore designs" onPress={onTemplates} />
    </View>
  );
}
