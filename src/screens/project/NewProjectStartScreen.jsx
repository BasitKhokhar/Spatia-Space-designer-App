import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { ROUTES } from '@/navigation/routes';

function ChoiceRow({ selected, icon, iconFill, title, subtitle, onPress }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.line,
        backgroundColor: selected ? colors.accentTintBg : colors.surface,
        borderRadius: radius.xl,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: iconFill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="titleSm">{title}</Text>
        <Text variant="bodySm" color="ink2" style={{ marginTop: 3 }}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.line,
          backgroundColor: selected ? colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Icon name="check" size={14} color={colors.onAccent} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}

export default function NewProjectStartScreen({ navigation }) {
  const { colors } = useTheme();
  const [mode, setMode] = useState('ideas');

  const onContinue = () => {
    if (mode === 'ideas') {
      navigation.navigate(ROUTES.category);
    } else {
      navigation.navigate(ROUTES.roomType, { category: 'house' });
    }
  };

  return (
    <Screen>
      <HeaderBar title="New Project" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Text variant="h2">How do you want{'\n'}to start?</Text>

          <View style={{ gap: 14, marginTop: 24 }}>
            <ChoiceRow
              selected={mode === 'ideas'}
              onPress={() => setMode('ideas')}
              iconFill={colors.accent}
              icon={<Icon name="grid" size={28} color="#fff" strokeWidth={2} />}
              title="Browse categories"
              subtitle="Houses, shops, offices & more — 100+ ready layouts."
            />
            <ChoiceRow
              selected={mode === 'blank'}
              onPress={() => setMode('blank')}
              iconFill={colors.accentSoft}
              icon={<Icon name="plus" size={28} color={colors.accent} strokeWidth={2} />}
              title="Quick blank room"
              subtitle="Pick a room, set the size, and draw from scratch."
            />
          </View>

          <View
            style={{
              marginTop: 28,
              padding: 18,
              borderRadius: 16,
              backgroundColor: colors.surface2,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <Icon name="wall" size={20} color={colors.accent} />
            <Text variant="bodySm" color="ink2" style={{ flex: 1 }}>
              Every category includes a <Text variant="bodySm" color="accent">Custom</Text> option so
              you can draw any shape — non-square rooms, custom walls and partitions.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 34, left: 24, right: 24 }}>
        <Button title="Continue" icon="arrow-right" onPress={onContinue} />
      </View>
    </Screen>
  );
}
