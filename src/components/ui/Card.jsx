import { View, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Surface card with hairline border + optional elevation. Pressable when onPress.
export default function Card({ children, onPress, style, padded = true, elevation = 'e1', selected = false }) {
  const { colors, radius, spacing, shadows } = useTheme();

  const base = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: selected ? colors.accent : colors.lineSoft,
    padding: padded ? spacing.lg : 0,
  };

  const merged = [base, elevation ? shadows[elevation] : null, style];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [merged, pressed && { opacity: 0.92 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={merged}>{children}</View>;
}
