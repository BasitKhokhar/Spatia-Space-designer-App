import { useState } from 'react';
import { View, Pressable } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { ROOM_TYPES } from '@/data/roomTypes';
import { ROUTES } from '@/navigation/routes';

export default function RoomTypeScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const [selected, setSelected] = useState('living');

  const onContinue = () => {
    const room = ROOM_TYPES.find((r) => r.id === selected) || ROOM_TYPES[0];
    navigation.navigate(ROUTES.dimensions, { roomTypeId: room.id });
  };

  return (
    <Screen>
      <HeaderBar title="Room type" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
        <Text variant="h2">What are you{'\n'}designing?</Text>
        <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
          Pick a starting room — add more later.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 14,
            marginTop: 24,
          }}
        >
          {ROOM_TYPES.map((room) => {
            const active = room.id === selected;
            return (
              <Pressable
                key={room.id}
                onPress={() => setSelected(room.id)}
                style={{
                  width: '47%',
                  backgroundColor: active ? colors.accentTintBg : colors.surface,
                  borderWidth: 1.5,
                  borderColor: active ? colors.accent : colors.line,
                  borderRadius: radius.lg,
                  padding: 18,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: active ? colors.accent : colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={room.icon} size={24} color={active ? '#fff' : colors.accent} />
                </View>
                <Text variant="titleSm" style={{ marginTop: 14 }}>
                  {room.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: 34, left: 24, right: 24 }}>
        <Button title="Continue" icon="arrow-right" onPress={onContinue} />
      </View>
    </Screen>
  );
}
