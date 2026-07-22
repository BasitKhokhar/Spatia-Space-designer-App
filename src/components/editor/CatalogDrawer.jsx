import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Animated, Easing, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';
import { useTheme } from '@/theme/useTheme';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useCatalogStore, categoryNamesWithItems, itemsInCategory } from '@/store/useCatalogStore';
import { itemCost } from '@/data/catalog';

// Compact right-side quick-add palette for the editor.
//   • A category dropdown at the top (names only) — Structure leads by default.
//   • The chosen category's items list vertically as glyph + name + credit badge.
//   • "All Tools" opens the full Catalog screen for search / details.
// Build tools (select / outline / text / measure) now live in the editor footer,
// so this drawer is purely about placing catalog items.
export default function CatalogDrawer({
  visible,
  initialCategory,
  onClose,
  onAdd,
  onViewDetails,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragActive = false,
}) {
  const { colors, radius, shadows, isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const unlocked = useUnlocksStore((s) => s.unlocked);
  const balance = useCreditsStore((s) => s.balance);
  const subscriber = useCreditsStore((s) => s.tier !== 'free');
  const allItems = useCatalogStore((s) => s.items);
  const categories = useCatalogStore((s) => s.categories);
  const itemCategories = useMemo(
    () => categoryNamesWithItems(allItems, categories),
    [allItems, categories]
  );

  // Comfortable ~33% sidebar, clamped so it stays usable on small phones / tablets.
  const panelW = Math.max(180, Math.min(300, screenW * 0.33));
  const [category, setCategory] = useState(initialCategory || 'Structure');
  const [menuOpen, setMenuOpen] = useState(false);

  // Slide animation. Mounted state keeps the panel in the tree during the exit
  // animation so it can slide out before unmounting. No dim backdrop — the panel
  // simply glides over the canvas so the plan stays fully visible while placing.
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(1)).current; // 0 = open, 1 = closed
  // While a drag is in flight the panel is slid away but must stay mounted, or the
  // row's pan gesture is destroyed mid-drag and the drop never lands.
  const dragActiveRef = useRef(dragActive);
  dragActiveRef.current = dragActive;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setMenuOpen(false);
      if (initialCategory) setCategory(initialCategory);
      // Open with a soft spring so the panel settles in naturally (no overshoot
      // wobble) — the premium "glide and rest" feel.
      Animated.spring(slide, {
        toValue: 0,
        stiffness: 190,
        damping: 24,
        mass: 1,
        useNativeDriver: true,
      }).start();
    } else {
      // Close with a quick, smooth ease-out — no fade, no stagger, just a clean exit.
      Animated.timing(slide, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && !dragActiveRef.current && setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Once a drag finishes, if the drawer was closed during it, complete the unmount
  // that was deferred to keep the gesture alive.
  useEffect(() => {
    if (!dragActive && !visible) setMounted(false);
  }, [dragActive, visible]);

  // Fall back to the first available category if the current one has no items.
  const activeCategory = itemCategories.includes(category) ? category : itemCategories[0];
  const items = useMemo(() => itemsInCategory(allItems, activeCategory), [allItems, activeCategory]);

  if (!mounted) return null;

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, panelW] });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {/* Transparent tap-catcher — closes the panel when the canvas is tapped, but
          adds no dim tint so the plan stays fully visible behind it. */}
      <Pressable style={StyleAbsolute} onPress={onClose} />

      {/* Sliding panel */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: panelW,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderBottomLeftRadius: radius.xxl,
            transform: [{ translateX }],
          },
          shadows.e3,
        ]}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          {/* Panel header — title + live balance + close */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingTop: 14,
              paddingBottom: 8,
              gap: 8,
            }}
          >
            <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
              Add
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.accentSoft,
              }}
            >
              <Icon name="star" size={12} color={colors.accent} strokeWidth={2} />
              <Text style={{ fontSize: 12, fontFamily: 'Manrope_700Bold', color: colors.accent }}>
                {subscriber ? '∞' : balance}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={15} color={colors.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Category dropdown — names only; Structure leads by default */}
          <View style={{ paddingHorizontal: 12, zIndex: 20 }}>
            <Pressable
              onPress={() => setMenuOpen((o) => !o)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 42,
                paddingHorizontal: 12,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: menuOpen ? colors.accent : colors.lineSoft,
                backgroundColor: colors.surface2,
                gap: 6,
              }}
            >
              <Text variant="titleSm" numberOfLines={1} style={{ flex: 1 }}>
                {activeCategory}
              </Text>
              <Icon
                name={menuOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.ink2}
                strokeWidth={2.2}
              />
            </Pressable>

            {/* Dropdown list overlay */}
            {menuOpen ? (
              <View
                style={[
                  {
                    position: 'absolute',
                    top: 46,
                    left: 12,
                    right: 12,
                    maxHeight: 320,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    overflow: 'hidden',
                    zIndex: 30,
                  },
                  shadows.e3,
                ]}
              >
                <ScrollView showsVerticalScrollIndicator={false}>
                  {itemCategories.map((cat) => {
                    const active = cat === activeCategory;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => {
                          setCategory(cat);
                          setMenuOpen(false);
                        }}
                        style={{
                          height: 42,
                          justifyContent: 'center',
                          paddingHorizontal: 14,
                          backgroundColor: active ? colors.accentSoft : 'transparent',
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 14,
                            fontFamily: active ? 'Manrope_700Bold' : 'Manrope_500Medium',
                            color: active ? colors.accent : colors.ink2,
                          }}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* Item list — shape tiles (tap to add · drag to place), vertical scroll */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 8 }}
          >
            {items.length === 0 ? (
              <Text variant="caption" color="ink3" style={{ padding: 16, textAlign: 'center' }}>
                No items in this category yet.
              </Text>
            ) : (
              items.map((item) => {
                const cost = itemCost(item);
                const owned = subscriber || !!unlocked[item.id];
                const paid = cost > 0 && !owned;
                return (
                  <DrawerItemRow
                    key={item.id}
                    item={item}
                    paid={paid}
                    cost={cost}
                    colors={colors}
                    radius={radius}
                    isDark={isDark}
                    onAdd={onAdd}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                  />
                );
              })
            )}
          </ScrollView>

          {/* All Tools → full catalog */}
          <Pressable
            onPress={() => onViewDetails?.(activeCategory)}
            style={{
              margin: 12,
              height: 48,
              borderRadius: radius.lg,
              backgroundColor: colors.ink,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="grid" size={16} color={colors.bg} strokeWidth={2} />
            <Text style={{ color: colors.bg, fontFamily: 'Manrope_700Bold', fontSize: 15 }}>All Tools</Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

// A single catalog tile — the tool's shape only, with a small free / paid tag in
// the corner (no name). Tapping drops the item at the plan center (fast repeat
// placement); dragging it out hands the item to the editor to drop precisely.
function DrawerItemRow({ item, paid, cost, colors, radius, isDark, onAdd, onDragStart, onDragMove, onDragEnd }) {
  const [dragging, setDragging] = useState(false);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activateAfterLongPress(140)
        .onStart((e) => {
          setDragging(true);
          onDragStart?.(item, e.absoluteX, e.absoluteY);
        })
        .onUpdate((e) => onDragMove?.(e.absoluteX, e.absoluteY))
        .onEnd((e) => onDragEnd?.(e.absoluteX, e.absoluteY))
        .onFinalize(() => setDragging(false)),
    [item] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <GestureDetector gesture={pan}>
      <Pressable
        onPress={() => onAdd(item)}
        style={{
          height: 86,
          borderRadius: radius.lg,
          backgroundColor: isDark ? '#211914' : '#F5EBE4',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: dragging ? 0.35 : 1,
        }}
      >
        {/* tool shape — larger, centered */}
        <FurnitureGlyph kind={item.kind} size={54} color={item.colors?.[0]} />

        {/* free / paid tag, tucked into the top-right corner */}
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 7,
            height: 18,
            borderRadius: 9,
            backgroundColor: paid ? colors.credit : isDark ? '#2C3A2E' : '#E7F0E7',
          }}
        >
          {paid ? (
            <>
              <Icon name="star" size={9} color="#fff" strokeWidth={2.4} />
              <Text style={{ fontSize: 10, fontFamily: 'Manrope_700Bold', color: '#fff' }}>{cost}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 9.5, fontFamily: 'Manrope_700Bold', color: colors.success }}>FREE</Text>
          )}
        </View>
      </Pressable>
    </GestureDetector>
  );
}

const StyleAbsolute = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
