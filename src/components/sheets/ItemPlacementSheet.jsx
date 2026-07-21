import { forwardRef, useMemo, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Slider from '@/components/ui/Slider';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';
import { itemDims } from '@/domain/floorplan';
import { metersToFeet, formatLength } from '@/domain/units';
import { useSettingsStore } from '@/store/useSettingsStore';
import { partsFor, isMountable } from '@/data/itemEditor';

// Palette used for parts that don't declare their own swatches (the implicit
// single-color "Color" part on un-curated items).
const FALLBACK_SWATCHES = ['#BC5B3A', '#4E7C59', '#8A6250', '#3E4A5C', '#D8D2C4', '#F4F1EA', '#1B1A17'];

// Bottom sheet to edit a placed item: per-part color, wall-mount height, and
// transform (rotation / scale). Compact + tabbed with horizontal option rows so
// it stays short on small screens. Fully controlled — the parent owns the item.
const ItemPlacementSheet = forwardRef(function ItemPlacementSheet(
  { item, onChange, onDuplicate, onDelete, onDone, wallHeight = 2.6, tab: tabProp, onTabChange },
  ref
) {
  const { colors, radius } = useTheme();
  const unit = useSettingsStore((s) => s.measurementUnit);
  const snapPoints = useMemo(() => ['52%'], []);
  const [tabState, setTabState] = useState('style');
  const tab = tabProp ?? tabState;
  const setTab = onTabChange ?? setTabState;
  const [partKey, setPartKey] = useState(null);

  if (!item) {
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        <BottomSheetView />
      </BottomSheetModal>
    );
  }

  const parts = partsFor(item.kind);
  const activePart = parts.find((p) => p.key === partKey) || parts[0];
  const swatches = activePart.swatches || FALLBACK_SWATCHES;
  const activeColor = activePart.primary ? item.color : item.parts?.[activePart.key];

  const mountable = isMountable(item.kind);
  const activeTab = tab === 'height' && !mountable ? 'style' : tab;

  const dims = itemDims(item);
  const maxEl = Math.max(0.1, wallHeight - dims.h);
  const elevation = Math.min(item.elevation ?? 0, maxEl);

  const pickColor = (c) => {
    if (activePart.primary) onChange({ color: c });
    else onChange({ parts: { ...(item.parts || {}), [activePart.key]: c } });
  };

  const setElevation = (m) => onChange({ elevation: Math.round(Math.min(maxEl, Math.max(0, m)) * 100) / 100 });

  const TABS = [
    { key: 'style', label: 'Style' },
    ...(mountable ? [{ key: 'height', label: 'Height' }] : []),
    { key: 'transform', label: 'Transform' },
    { key: 'measure', label: 'Measure' },
  ];

  // Height presets (meters), clamped into the valid range for this item.
  const PRESETS = [
    { label: 'Floor', m: 0 },
    { label: 'Low', m: 0.9 },
    { label: 'Eye', m: 1.4 },
    { label: 'High', m: maxEl },
  ];

  const rowStyle = { flexGrow: 0 };
  const rowContent = { gap: 10, paddingVertical: 4, alignItems: 'center' };

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
              width: 56,
              height: 56,
              borderRadius: radius.md,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FurnitureGlyph kind={item.kind} size={38} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSm" numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
              {formatLength(dims.w, unit)} × {formatLength(dims.d, unit)} × {formatLength(dims.h, unit)}
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

        {/* Tab strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rowStyle} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
          {TABS.map((t) => {
            const on = t.key === activeTab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  backgroundColor: on ? colors.accent : colors.surface2,
                }}
              >
                <Text variant="label" color={on ? 'onAccent' : 'ink2'}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab body — fixed min height keeps the sheet from jumping between tabs */}
        <View style={{ minHeight: 132 }}>
          {activeTab === 'style' && (
            <>
              {parts.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rowStyle} contentContainerStyle={rowContent}>
                  {parts.map((p) => {
                    const on = p.key === activePart.key;
                    return (
                      <Pressable
                        key={p.key}
                        onPress={() => setPartKey(p.key)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: radius.pill,
                          borderWidth: 1.5,
                          borderColor: on ? colors.accent : colors.line,
                          backgroundColor: on ? colors.accentSoft : 'transparent',
                        }}
                      >
                        <Text variant="bodySm" color={on ? 'accent' : 'ink2'} style={{ fontWeight: '600' }}>
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <Text variant="label" color="ink2" style={{ marginTop: parts.length > 1 ? 16 : 4 }}>
                {parts.length > 1 ? `${activePart.label} color` : 'Color'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[rowStyle, { marginTop: 10 }]} contentContainerStyle={rowContent}>
                {swatches.map((c) => {
                  const on = c === activeColor;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => pickColor(c)}
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
              </ScrollView>
            </>
          )}

          {activeTab === 'height' && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="label" color="ink2">
                  {item.shape?.type === 'window' ? 'Sill height' : 'Height off floor'}
                </Text>
                <Text variant="bodySm" color="ink3">
                  {unit === 'feet'
                    ? `${metersToFeet(elevation).toFixed(1)} ft`
                    : `${elevation.toFixed(2)} m`}
                </Text>
              </View>
              <Slider
                value={elevation / maxEl}
                onChange={(f) => setElevation(f * maxEl)}
                style={{ marginTop: 12 }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[rowStyle, { marginTop: 16 }]} contentContainerStyle={rowContent}>
                {PRESETS.map((p) => {
                  const on = Math.abs(elevation - p.m) < 0.03;
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => setElevation(p.m)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: radius.pill,
                        backgroundColor: on ? colors.accent : colors.surface2,
                      }}
                    >
                      <Text variant="label" color={on ? 'onAccent' : 'ink2'}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {activeTab === 'transform' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="label" color="ink2">
                  Rotation
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => onChange({ rotation: (item.rotation + 270) % 360 })}
                    style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="undo" size={16} color={colors.ink2} strokeWidth={2.2} />
                  </Pressable>
                  <Pressable
                    onPress={() => onChange({ rotation: (item.rotation + 90) % 360 })}
                    style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="redo" size={16} color={colors.ink2} strokeWidth={2.2} />
                  </Pressable>
                </View>
              </View>
              <Slider
                value={(item.rotation % 360) / 360}
                onChange={(f) => onChange({ rotation: Math.round(f * 360) })}
                style={{ marginTop: 12 }}
              />
              <Text variant="label" color="ink2" style={{ marginTop: 18 }}>
                Scale
              </Text>
              <Slider
                value={(item.scale - 0.5) / 1.5}
                onChange={(f) => onChange({ scale: 0.5 + f * 1.5 })}
                style={{ marginTop: 12 }}
              />
            </>
          )}

          {activeTab === 'measure' && (
            <View style={{ gap: 10 }}>
              {[
                { label: 'Width', v: dims.w },
                { label: 'Depth', v: dims.d },
                { label: 'Height', v: dims.h },
              ].map((row) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    height: 44,
                    paddingHorizontal: 14,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface2,
                  }}
                >
                  <Text variant="label" color="ink2">
                    {row.label}
                  </Text>
                  <Text variant="titleSm">{formatLength(row.v, unit)}</Text>
                </View>
              ))}
              <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                Resize on the canvas or use the Transform tab to change these.
              </Text>
            </View>
          )}
        </View>

        {/* Footer actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
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

export default ItemPlacementSheet;
