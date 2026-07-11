import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect, Defs, Pattern, Circle, Path } from 'react-native-svg';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Stepper from '@/components/ui/Stepper';
import { useTheme } from '@/theme/useTheme';
import { roomTypeById } from '@/data/roomTypes';
import { areaM2, formatLength } from '@/domain/units';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';

export default function DimensionsScreen({ navigation, route }) {
  const { colors, radius, isDark } = useTheme();
  const roomType = roomTypeById(route.params?.roomTypeId);
  const createProject = useProjectsStore((s) => s.createProject);

  const [width, setWidth] = useState(roomType.defaults.width);
  const [length, setLength] = useState(roomType.defaults.length);
  const [unit, setUnit] = useState('meters');

  const onCreate = () => {
    createProject({ name: `${roomType.label}`, roomType: roomType.id, width, length });
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
              {areaM2(width, length)} m²
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
      </View>

      <View style={{ position: 'absolute', bottom: 34, left: 24, right: 24 }}>
        <Button title="Create Room" onPress={onCreate} />
      </View>
    </Screen>
  );
}
