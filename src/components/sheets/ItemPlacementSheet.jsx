import { forwardRef, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Slider from '@/components/ui/Slider';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';

const SWATCHES = ['#BC5B3A', '#4E7C59', '#8A6250', '#3E4A5C', '#D8D2C4'];

// Bottom sheet to edit a placed furniture item: color, rotation, scale.
const ItemPlacementSheet = forwardRef(function ItemPlacementSheet(
  { item, onChange, onDuplicate, onDone },
  ref
) {
  const { colors, radius } = useTheme();
  const snapPoints = useMemo(() => ['62%'], []);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetView style={{ paddingHorizontal: 22, paddingBottom: 34 }}>
        {item ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: radius.md,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FurnitureGlyph kind={item.kind} size={40} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleSm">{item.name}</Text>
                <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
                  {Math.round(item.w * 100)} × {Math.round(item.d * 100)} × {Math.round(item.h * 100)} cm
                </Text>
              </View>
              <Pressable
                onPress={onDone}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.sm,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" size={16} color={colors.ink2} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text variant="label" color="ink2" style={{ marginTop: 20 }}>
              Color
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {SWATCHES.map((c) => {
                const active = c === item.color;
                return (
                  <Pressable
                    key={c}
                    onPress={() => onChange({ color: c })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: c,
                      borderWidth: active ? 2.5 : 0,
                      borderColor: colors.ink,
                    }}
                  />
                );
              })}
            </View>

            <Text variant="label" color="ink2" style={{ marginTop: 18 }}>
              Rotation
            </Text>
            <Slider
              value={(item.rotation % 360) / 360}
              onChange={(f) => onChange({ rotation: Math.round(f * 360) })}
              style={{ marginTop: 10 }}
            />

            <Text variant="label" color="ink2" style={{ marginTop: 18 }}>
              Scale
            </Text>
            <Slider
              value={(item.scale - 0.5) / 1.5}
              onChange={(f) => onChange({ scale: 0.5 + f * 1.5 })}
              style={{ marginTop: 10 }}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
              <Pressable
                onPress={onDuplicate}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="bodySm" color="ink2" style={{ fontWeight: '700' }}>
                  Duplicate
                </Text>
              </Pressable>
              <Pressable
                onPress={onDone}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: radius.md,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="bodySm" color="onAccent" style={{ fontWeight: '700' }}>
                  Done
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ItemPlacementSheet;
