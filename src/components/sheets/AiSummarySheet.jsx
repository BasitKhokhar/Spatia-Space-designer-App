import { forwardRef, useMemo } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// Shown once, over the editor, right after an AI design lands.
//
// It replaces the result screen the flow deliberately doesn't have: the user is
// already looking at their finished plan, so this only has to explain what they
// got — the room breakdown and the reasoning behind the layout — and then get
// out of the way. Dismissing it leaves an ordinary editor.
const AiSummarySheet = forwardRef(function AiSummarySheet({ summary, onRegenerate, onDone }, ref) {
  const { colors, radius } = useTheme();
  const snapPoints = useMemo(() => ['62%'], []);

  const sheet = (children) => (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      {children}
    </BottomSheetModal>
  );

  if (!summary) return sheet(<View />);

  // Group by floor so a multi-storey design reads level by level rather than as
  // one long list of rooms.
  const byFloor = (summary.rooms || []).reduce((acc, r) => {
    (acc[r.floor] = acc[r.floor] || []).push(r);
    return acc;
  }, {});

  const Stat = ({ value, label }) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="title">{value}</Text>
      <Text variant="label" color="ink3" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );

  return sheet(
    <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 30 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 42, height: 42, borderRadius: radius.md,
            backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="star" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title">Your design is ready</Text>
          <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>
            Everything here is editable — move walls, swap furniture, change colours.
          </Text>
        </View>
      </View>

      {summary.rationale ? (
        <View
          style={{
            marginTop: 18, padding: 15, borderRadius: radius.lg,
            backgroundColor: colors.accentTintBg, borderLeftWidth: 3, borderLeftColor: colors.accent,
          }}
        >
          <Text variant="bodySm" color="ink2" style={{ fontStyle: 'italic' }}>
            "{summary.rationale}"
          </Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row', marginTop: 18, paddingVertical: 16,
          borderRadius: radius.lg, backgroundColor: colors.surface2,
        }}
      >
        <Stat value={`${summary.totalArea} m²`} label="TOTAL AREA" />
        <Stat value={summary.roomCount} label="ROOMS" />
        <Stat value={summary.itemCount} label="ITEMS" />
      </View>

      {Object.entries(byFloor).map(([floorName, rooms]) => (
        <View key={floorName} style={{ marginTop: 20 }}>
          <Text variant="label" color="ink3" style={{ marginBottom: 8 }}>
            {floorName.toUpperCase()}
          </Text>
          {rooms.map((r, i) => (
            <View
              key={`${r.label}-${i}`}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 10, borderBottomWidth: i === rooms.length - 1 ? 0 : 1,
                borderBottomColor: colors.lineSoft,
              }}
            >
              <Text variant="bodySm">{r.label}</Text>
              <Text variant="bodySm" color="ink3">
                {r.area} m²
              </Text>
            </View>
          ))}
        </View>
      ))}

      <View style={{ gap: 10, marginTop: 26 }}>
        <Button title="Start editing" onPress={onDone} />
        {onRegenerate ? (
          <Button title="Try a different layout" variant="secondary" onPress={onRegenerate} />
        ) : null}
      </View>
    </BottomSheetScrollView>
  );
});

export default AiSummarySheet;
