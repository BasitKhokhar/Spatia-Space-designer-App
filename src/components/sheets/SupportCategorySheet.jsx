import { forwardRef, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { SUPPORT_CATEGORIES } from '@/services/api/supportApi';

// ---------------------------------------------------------------------------
// Category picker for the Contact Support form's Subject field. A plain
// picker, not a form — tapping a row selects it and closes immediately,
// following the same radio-row look as ReportContentSheet's reason list.
// ---------------------------------------------------------------------------
const SupportCategorySheet = forwardRef(function SupportCategorySheet({ value, onSelect }, ref) {
  const { colors, radius } = useTheme();
  const snapPoints = useMemo(() => ['85%'], []);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 34 }}>
        <Text variant="title" style={{ marginBottom: 4 }}>
          Select a category
        </Text>
        <Text variant="bodySm" color="ink2" style={{ marginBottom: 18 }}>
          Choose the option that best matches your request.
        </Text>

        {SUPPORT_CATEGORIES.map((group) => (
          <View key={group.group} style={{ marginBottom: 18 }}>
            <Text variant="label" color="ink3" style={{ marginBottom: 10 }}>
              {group.group.toUpperCase()}
            </Text>
            <View style={{ gap: 8 }}>
              {group.items.map((item) => {
                const active = value === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      onSelect?.(item.key);
                      ref?.current?.dismiss();
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 15,
                      borderRadius: radius.md,
                      backgroundColor: active ? colors.accentTintBg : colors.surface2,
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? colors.accent : colors.lineSoft,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: active ? 6 : 1.5,
                        borderColor: active ? colors.accent : colors.line,
                      }}
                    />
                    <Text variant="bodySm" style={{ flex: 1, fontWeight: active ? '700' : '400' }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default SupportCategorySheet;
