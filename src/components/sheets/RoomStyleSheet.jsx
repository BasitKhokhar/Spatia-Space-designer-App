import { forwardRef, useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import Stepper from '@/components/ui/Stepper';
import { useTheme } from '@/theme/useTheme';
import { FLOOR_MATERIALS, WALL_COLORS } from '@/data/materials';
import { estimateCost, itemCount, formatMoney } from '@/domain/cost';

// Room-level styling: floor finish, wall colour, size, height + a live budget.
const RoomStyleSheet = forwardRef(function RoomStyleSheet(
  { plan, onFloor, onWall, onResize, onHeight },
  ref
) {
  const { colors, radius, isDark } = useTheme();
  const snapPoints = useMemo(() => ['86%'], []);
  const materials = plan?.materials || {};
  const cost = plan ? estimateCost(plan) : 0;
  const count = plan ? itemCount(plan) : 0;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        >
          {plan ? (
            <>
              <Text variant="title" style={{ marginTop: 4 }}>
                Room style
              </Text>

              {/* Budget summary */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <SummaryTile label="Est. budget" value={formatMoney(cost)} accent />
                <SummaryTile label="Items" value={`${count}`} />
                <SummaryTile label="Area" value={`${(plan.width * plan.length).toFixed(1)} m²`} />
              </View>

              {/* Floor material */}
              <Text variant="label" color="ink2" style={{ marginTop: 24 }}>
                FLOOR FINISH
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {FLOOR_MATERIALS.map((m) => {
                  const active = (materials.floor || 'oak') === m.id;
                  return (
                    <Pressable key={m.id} onPress={() => onFloor?.(m.id)} style={{ width: '22%' }}>
                      <View
                        style={{
                          height: 46,
                          borderRadius: radius.md,
                          backgroundColor: m.c2d,
                          borderWidth: active ? 2.5 : 1,
                          borderColor: active ? colors.accent : colors.line,
                        }}
                      />
                      <Text
                        variant="caption"
                        color={active ? 'accent' : 'ink3'}
                        align="center"
                        style={{ marginTop: 5 }}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Wall colour */}
              <Text variant="label" color="ink2" style={{ marginTop: 20 }}>
                WALL COLOUR
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                {WALL_COLORS.map((hex) => {
                  const active = (materials.wall || '#EBE4D8').toLowerCase() === hex.toLowerCase();
                  return (
                    <Pressable
                      key={hex}
                      onPress={() => onWall?.(hex)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: hex,
                        borderWidth: active ? 3 : 1,
                        borderColor: active ? colors.accent : colors.line,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {active ? (
                        <Icon name="check" size={16} color={isDark ? '#111' : '#111'} strokeWidth={2.6} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Room size */}
              <Text variant="label" color="ink2" style={{ marginTop: 24 }}>
                ROOM SIZE
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Stepper
                  label="WIDTH"
                  value={plan.width}
                  unit="m"
                  max={60}
                  onChange={(v) => onResize?.(v, plan.length)}
                />
                <Stepper
                  label="LENGTH"
                  value={plan.length}
                  unit="m"
                  max={60}
                  onChange={(v) => onResize?.(plan.width, v)}
                />
              </View>

              {/* Wall height */}
              <Text variant="label" color="ink2" style={{ marginTop: 16 }}>
                WALL HEIGHT
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Stepper
                  label="HEIGHT"
                  value={plan.wallHeight}
                  unit="m"
                  min={2}
                  max={6}
                  onChange={(v) => onHeight?.(v)}
                />
                <View style={{ flex: 1 }} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

function SummaryTile({ label, value, accent }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent ? colors.accentSoft : colors.surface2,
        borderRadius: radius.md,
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}
    >
      <Text variant="caption" color="ink3">
        {label}
      </Text>
      <Text
        variant="titleSm"
        style={{ marginTop: 3 }}
        color={accent ? 'accent' : 'ink'}
      >
        {value}
      </Text>
    </View>
  );
}

export default RoomStyleSheet;
