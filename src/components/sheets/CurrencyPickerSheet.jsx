import { forwardRef, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { CURRENCIES } from '@/data/currencies';

// Searchable currency picker used at the start of the estimate flow. Follows the
// forwardRef bottom-sheet convention (see RoomStyleSheet). Parent controls
// open/close via the ref; `onSelect(currency)` fires and the sheet dismisses.
const CurrencyPickerSheet = forwardRef(function CurrencyPickerSheet({ selected, onSelect }, ref) {
  const { colors, radius } = useTheme();
  const snapPoints = useMemo(() => ['70%'], []);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <View style={{ paddingHorizontal: 22, paddingBottom: 12 }}>
        <Text variant="title" style={{ marginTop: 4 }}>
          Choose currency
        </Text>
        <Text variant="bodySm" color="ink2" style={{ marginTop: 4 }}>
          Prices you enter and the final estimate use this.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
            height: 48,
            paddingHorizontal: 14,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface2,
          }}
        >
          <Icon name="search" size={18} color={colors.ink3} />
          <BottomSheetTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search currency"
            placeholderTextColor={colors.ink3}
            autoCapitalize="characters"
            style={{ flex: 1, fontSize: 15, color: colors.ink }}
          />
        </View>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {results.map((c) => {
          const active = selected?.code === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => onSelect?.(c)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 14,
                paddingHorizontal: 14,
                marginTop: 8,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: active ? colors.accent : colors.line,
                backgroundColor: active ? colors.accentTintBg : colors.surface,
              }}
            >
              <Text style={{ fontSize: 22 }}>{c.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="titleSm">
                  {c.code} · {c.symbol}
                </Text>
                <Text variant="bodySm" color="ink2" style={{ marginTop: 1 }}>
                  {c.name}
                </Text>
              </View>
              {active ? <Icon name="check" size={20} color={colors.accent} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
        {results.length === 0 ? (
          <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 24 }}>
            No currency matches “{query}”.
          </Text>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default CurrencyPickerSheet;
