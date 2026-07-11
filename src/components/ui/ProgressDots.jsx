import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Onboarding progress dots; the active one is an elongated pill.
export default function ProgressDots({ total, index, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', gap: 7 }, style]}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === index;
        return (
          <View
            key={i}
            style={{
              width: active ? 26 : 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: active ? colors.accent : colors.line,
            }}
          />
        );
      })}
    </View>
  );
}
