import { useState } from 'react';
import { View, Pressable } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { roomTypesByCategory } from '@/data/roomTypes';
import { ROUTES } from '@/navigation/routes';

export default function RoomTypeScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  // The create flow now passes a rich category id (house, retail, cafe, ...).
  // The Custom room-type picker only has Home vs Shop fixtures, so map the
  // shop-like categories to 'shop' and everything else to 'home'.
  const SHOP_CATEGORIES = ['shop', 'retail', 'cafe', 'salon', 'warehouse', 'plaza'];
  const category = SHOP_CATEGORIES.includes(route.params?.category) ? 'shop' : 'home';
  const roomTypes = roomTypesByCategory(category);
  const [selected, setSelected] = useState(roomTypes[0].id);

  const onContinue = () => {
    const room = roomTypes.find((r) => r.id === selected) || roomTypes[0];
    navigation.navigate(ROUTES.dimensions, { roomTypeId: room.id });
  };

  return (
    <Screen>
      <HeaderBar title="Room type" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
        <Text variant="h2">What are you{'\n'}designing?</Text>
        <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
          {category === 'shop'
            ? 'Pick a store type — fixtures come pre-placed.'
            : 'Pick a starting room — add more later.'}
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
          {roomTypes.map((room) => {
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
