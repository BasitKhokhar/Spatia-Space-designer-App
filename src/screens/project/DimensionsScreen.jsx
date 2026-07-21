import { useState } from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Rect, Defs, Pattern, Circle, Path } from 'react-native-svg';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Stepper from '@/components/ui/Stepper';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { roomTypeById, isShopRoom } from '@/data/roomTypes';
import { hasStarterLayout } from '@/data/starterLayouts';
import { areaM2, formatLength, formatArea } from '@/domain/units';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ROUTES } from '@/navigation/routes';

export default function DimensionsScreen({ navigation, route }) {
  const { colors, radius, isDark } = useTheme();
  const roomType = roomTypeById(route.params?.roomTypeId);
  const createProject = useProjectsStore((s) => s.createProject);

  const unit = useSettingsStore((s) => s.measurementUnit);
  const setUnit = useSettingsStore((s) => s.setMeasurementUnit);

  const [width, setWidth] = useState(roomType.defaults.width);
  const [length, setLength] = useState(roomType.defaults.length);
  const [seed, setSeed] = useState(isShopRoom(roomType.id));
  const canSeed = hasStarterLayout(roomType.id);

  const onCreate = () => {
    createProject({ name: `${roomType.label}`, roomType: roomType.id, width, length, seed });
    navigation.navigate(ROUTES.editor);
  };

  const dotColor = isDark ? '#3A342C' : '#CBB39F';
  const roomStroke = colors.accent;

  return (
    <Screen>
      <HeaderBar title="Room size" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
        <Text variant="h2">Set the dimensions</Text>
        <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
          {roomType.label} · you can resize later
        </Text>

        {/* Live preview */}
        <View
          style={{
            height: 236,
            borderRadius: radius.xl,
            overflow: 'hidden',
            marginTop: 24,
            backgroundColor: colors.surface2,
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 342 236">
            <Defs>
              <Pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <Circle cx="1.2" cy="1.2" r="1.2" fill={dotColor} />
              </Pattern>
            </Defs>
            <Rect width="342" height="236" fill="url(#dots)" />
            <Rect
              x="86"
              y="60"
              width="170"
              height="116"
              rx="4"
              fill={colors.accent}
              fillOpacity={isDark ? 0.08 : 0.12}
              stroke={roomStroke}
              strokeWidth={3}
            />
            <Path d="M86 44 H256 M86 40 V48 M256 40 V48" stroke={colors.accentPress} strokeWidth={1.6} />
            <Path d="M62 60 V176 M58 60 H66 M58 176 H66" stroke={colors.accentPress} strokeWidth={1.6} />
          </Svg>
          <View
            style={{
              position: 'absolute',
              top: 22,
              alignSelf: 'center',
              backgroundColor: colors.ink,
              paddingHorizontal: 11,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text variant="label" color="bg">
              {formatLength(width, unit)}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              top: '50%',
              left: 16,
              backgroundColor: colors.ink,
              paddingHorizontal: 11,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text variant="label" color="bg">
              {formatLength(length, unit)}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              backgroundColor: colors.accent,
              paddingHorizontal: 13,
              paddingVertical: 7,
              borderRadius: 10,
            }}
          >
            <Text variant="label" color="onAccent">
              {formatArea(areaM2(width, length), unit)}
            </Text>
          </View>
        </View>

        {/* Units */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 22,
          }}
        >
          <Text variant="bodySm" color="ink2" style={{ fontWeight: '700' }}>
            Units
          </Text>
          <SegmentedControl
            options={[
              { value: 'meters', label: 'Meters' },
              { value: 'feet', label: 'Feet' },
            ]}
            value={unit}
            onChange={setUnit}
            style={{ width: 200 }}
          />
        </View>

        {/* Steppers */}
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 18 }}>
          <Stepper label="WIDTH" value={width} onChange={setWidth} />
          <Stepper label="LENGTH" value={length} onChange={setLength} />
        </View>

        {/* Starter layout toggle */}
        {canSeed ? (
          <Pressable
            onPress={() => setSeed((s) => !s)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              marginTop: 20,
              padding: 16,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: seed ? colors.accent : colors.line,
              backgroundColor: seed ? colors.accentTintBg : colors.surface,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: seed ? colors.accent : colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="grid" size={20} color={seed ? '#fff' : colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleSm">Start with a layout</Text>
              <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>
                {isShopRoom(roomType.id)
                  ? 'Racks, shelves & a counter, pre-placed.'
                  : 'A few key pieces to get going.'}
              </Text>
            </View>
            <View
              style={{
                width: 46,
                height: 28,
                borderRadius: 14,
                padding: 3,
                backgroundColor: seed ? colors.accent : colors.line,
                alignItems: seed ? 'flex-end' : 'flex-start',
              }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
            </View>
          </Pressable>
        ) : null}
      </View>

      <View style={{ position: 'absolute', bottom: 34, left: 24, right: 24 }}>
        <Button title="Create Room" onPress={onCreate} />
      </View>
    </Screen>
  );
}
