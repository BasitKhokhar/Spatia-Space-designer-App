import { forwardRef, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { wallLength } from '@/domain/floorplan';
import { formatLength, formatWidth, inchesToMeters } from '@/domain/units';
import { useSettingsStore } from '@/store/useSettingsStore';

const SIDE_LABEL = { top: 'Top wall', right: 'Right wall', bottom: 'Bottom wall', left: 'Left wall' };
const SIDE_ORDER = { top: 0, right: 1, bottom: 2, left: 3 };
const FLOOR_TINTS = ['#EBE4D8', '#D8C7B0', '#C9D8CF', '#CBD5E4', '#E7CFC6', '#DcCCE4', '#E9E3B8', '#C7C2BA'];

// A compact +/- row that edits a meter value and shows it in the active unit.
function StepRow({ label, value, sub, onDec, onInc }) {
  const { colors, radius } = useTheme();
  const Btn = ({ icon, onPress, accent }) => (
    <Pressable
      onPress={onPress}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: accent ? colors.accent : colors.accentSoft,
      }}
    >
      <Icon name={icon} size={18} color={accent ? colors.onAccent : colors.accent} strokeWidth={2.4} />
    </Pressable>
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 54,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        backgroundColor: colors.surface2,
      }}
    >
      <View>
        <Text variant="label" color="ink2">
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" color="ink3" style={{ marginTop: 1 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Btn icon="minus" onPress={onDec} />
        <Text variant="titleSm" style={{ minWidth: 62, textAlign: 'center' }}>
          {value}
        </Text>
        <Btn icon="plus" onPress={onInc} accent />
      </View>
    </View>
  );
}

// Bottom sheet to edit a room "square": overall width / height, every wall's
// width (thickness) in the chosen unit, and a floor tint. Fully controlled —
// the parent owns the room and applies changes through the floorplan helpers.
const RoomSettingsSheet = forwardRef(function RoomSettingsSheet(
  { room, onResize, onWallThickness, onColor, onDuplicate, onDelete, onDone },
  ref
) {
  const { colors, radius } = useTheme();
  const unit = useSettingsStore((s) => s.measurementUnit);
  const snapPoints = useMemo(() => ['75%'], []);

  const empty = (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <View />
    </BottomSheetModal>
  );
  if (!room) return empty;

  const thickStep = unit === 'feet' ? inchesToMeters(1) : 0.01;
  const clampDim = (m) => Math.round(Math.min(30, Math.max(0.5, m)) * 10) / 10;
  const clampThick = (m) => Math.round(Math.min(0.5, Math.max(0.02, m)) * 1000) / 1000;

  const walls = [...room.walls].sort((a, b) => (SIDE_ORDER[a.side] ?? 9) - (SIDE_ORDER[b.side] ?? 9));
  const activeColor = room.walls.find((w) => w.color)?.color;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 34 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="square" size={30} color={colors.accent} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSm">Room</Text>
            <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
              {formatLength(room.w, unit)} × {formatLength(room.h, unit)}
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

        {/* Size */}
        <Text variant="label" color="ink3" style={{ marginTop: 14, marginBottom: 8 }}>
          SIZE
        </Text>
        <View style={{ gap: 8 }}>
          <StepRow
            label="Width"
            value={formatLength(room.w, unit)}
            onDec={() => onResize({ w: clampDim(room.w - 0.1), h: room.h })}
            onInc={() => onResize({ w: clampDim(room.w + 0.1), h: room.h })}
          />
          <StepRow
            label="Height"
            value={formatLength(room.h, unit)}
            onDec={() => onResize({ w: room.w, h: clampDim(room.h - 0.1) })}
            onInc={() => onResize({ w: room.w, h: clampDim(room.h + 0.1) })}
          />
        </View>

        {/* Per-wall widths */}
        <Text variant="label" color="ink3" style={{ marginTop: 20, marginBottom: 8 }}>
          WALL WIDTHS
        </Text>
        <View style={{ gap: 8 }}>
          {walls.map((w) => (
            <StepRow
              key={w.id}
              label={SIDE_LABEL[w.side] || 'Wall'}
              sub={`Length ${formatLength(wallLength(w), unit)}`}
              value={formatWidth(w.thickness, unit)}
              onDec={() => onWallThickness(w.id, clampThick(w.thickness - thickStep))}
              onInc={() => onWallThickness(w.id, clampThick(w.thickness + thickStep))}
            />
          ))}
        </View>

        {/* Floor tint */}
        <Text variant="label" color="ink3" style={{ marginTop: 20, marginBottom: 10 }}>
          FLOOR COLOR
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {FLOOR_TINTS.map((c) => {
            const on = c === activeColor;
            return (
              <Pressable
                key={c}
                onPress={() => onColor(c)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: c,
                  borderWidth: on ? 3 : 1,
                  borderColor: on ? colors.ink : colors.line,
                }}
              />
            );
          })}
        </View>

        {/* Footer actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          <Pressable
            onPress={onDuplicate}
            style={{ flex: 1, height: 50, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="bodySm" color="ink2" style={{ fontWeight: '700' }}>
              Duplicate
            </Text>
          </Pressable>
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              style={{ width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="trash" size={18} color={colors.danger || colors.ink2} strokeWidth={2.2} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onDone}
            style={{ flex: 1, height: 50, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="bodySm" color="onAccent" style={{ fontWeight: '700' }}>
              Done
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default RoomSettingsSheet;
