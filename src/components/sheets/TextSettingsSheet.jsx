import { forwardRef, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Slider from '@/components/ui/Slider';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

const MIN_SIZE = 0.2;
const MAX_SIZE = 1.6;

// Bottom sheet to edit a placed text label: its content and glyph size. Fully
// controlled — the parent owns the text element.
const TextSettingsSheet = forwardRef(function TextSettingsSheet(
  { element, onChange, onDuplicate, onDelete, onDone },
  ref
) {
  const { colors, radius } = useTheme();
  const snapPoints = useMemo(() => ['46%'], []);

  const empty = (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetView />
    </BottomSheetModal>
  );
  if (!element) return empty;

  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, element.size ?? 0.5));

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetView style={{ paddingHorizontal: 22, paddingBottom: 30 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
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
            <Icon name="text" size={28} color={colors.accent} strokeWidth={2.2} />
          </View>
          <Text variant="titleSm" style={{ flex: 1 }}>
            Text label
          </Text>
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

        {/* Label text */}
        <Text variant="label" color="ink2" style={{ marginTop: 18, marginBottom: 8 }}>
          Label
        </Text>
        <BottomSheetTextInput
          value={element.text}
          onChangeText={(t) => onChange({ text: t })}
          placeholder="e.g. Hall"
          placeholderTextColor={colors.ink3}
          autoFocus
          style={{
            height: 48,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface2,
            paddingHorizontal: 14,
            fontSize: 16,
            color: colors.ink,
          }}
        />

        {/* Size */}
        <Text variant="label" color="ink2" style={{ marginTop: 18 }}>
          Size
        </Text>
        <Slider
          value={(size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)}
          onChange={(f) => onChange({ size: Math.round((MIN_SIZE + f * (MAX_SIZE - MIN_SIZE)) * 100) / 100 })}
          style={{ marginTop: 12 }}
        />

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
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default TextSettingsSheet;
