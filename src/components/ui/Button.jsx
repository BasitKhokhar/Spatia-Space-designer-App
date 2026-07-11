import { Pressable, ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';
import Icon from '@/components/icons/Icon';

// Variants: primary (terracotta), secondary (surface), dark (ink), danger, ghost.
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'right',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) {
  const { colors, radius, shadows, fonts } = useTheme();

  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 40;
  const fontSize = size === 'lg' ? 17 : 15;

  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: 'transparent', shadow: shadows.accent },
    dark: { bg: colors.ink, fg: colors.bg, border: 'transparent', shadow: shadows.e2 },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.line, shadow: null },
    danger: { bg: colors.dangerDark, fg: '#fff', border: 'transparent', shadow: shadows.e2 },
    ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent', shadow: null },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.lg,
          backgroundColor: palette.bg,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 24,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        palette.shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon && iconPosition === 'left' && <Icon name={icon} size={18} color={palette.fg} strokeWidth={2.4} />}
          <Text style={{ fontFamily: fonts.display, fontSize, color: palette.fg }}>{title}</Text>
          {icon && iconPosition === 'right' && <Icon name={icon} size={18} color={palette.fg} strokeWidth={2.4} />}
        </View>
      )}
    </Pressable>
  );
}
