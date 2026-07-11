import { View, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';
import Icon from '@/components/icons/Icon';

// Settings/profile list row: icon tile + label + optional value + chevron.
export default function ListRow({ icon, label, value, onPress, danger = false, right, showChevron = true }) {
  const { colors, radius } = useTheme();
  const tint = danger ? colors.dangerDark : colors.accent;
  const tileBg = danger ? colors.dangerSoftLight : colors.accentSoft;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, paddingHorizontal: 16 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            backgroundColor: tileBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={16} color={tint} />
        </View>
      ) : null}
      <Text variant="bodySm" color={danger ? 'dangerDark' : 'ink'} style={{ flex: 1, fontWeight: '600' }}>
        {label}
      </Text>
      {value ? (
        <Text variant="bodySm" color="ink3">
          {value}
        </Text>
      ) : null}
      {right}
      {showChevron ? <Icon name="chevron-right" size={15} color={colors.ink3} strokeWidth={2} /> : null}
    </Pressable>
  );
}

export function RowDivider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.lineSoft, marginHorizontal: 16 }} />;
}
