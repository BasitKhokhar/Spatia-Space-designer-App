import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';
import { useTheme } from '@/theme/useTheme';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import {
  ITEM_CATEGORIES,
  CATALOG,
  catalogByCategory,
  categoryGlyph,
  itemCost,
} from '@/data/catalog';

// Right-side quick-add palette for the editor.
//   • A labeled rail of categories — Structure & Doors/Windows lead, then furnishings.
//   • Each category shows its items as glyph tiles with a name + credit badge.
//   • A search box filters across the whole catalog by name / tag.
//   • Paid items route through the credit / earn-ad flow on tap; the header shows
//     the live balance. "View details" opens the full Catalog screen.
export default function CatalogDrawer({
  visible,
  initialCategory,
  onClose,
  onAdd,
  onViewDetails,
}) {
  const { colors, radius, shadows, isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const unlocked = useUnlocksStore((s) => s.unlocked);
  const balance = useCreditsStore((s) => s.balance);
  const subscriber = useCreditsStore((s) => s.tier !== 'free');

  const panelW = Math.min(380, screenW * 0.92);
  const [category, setCategory] = useState(initialCategory || ITEM_CATEGORIES[0]);
  const [query, setQuery] = useState('');

  // Slide + fade animation. Mounted state keeps the panel in the tree during the
  // exit animation so it can slide out before unmounting.
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(1)).current; // 0 = open, 1 = closed
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setQuery('');
      if (initialCategory) setCategory(initialCategory);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  // Search across the whole catalog; otherwise show the active category.
  const items = useMemo(() => {
    if (searching) {
      return CATALOG.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          (it.tags || []).some((t) => t.includes(q))
      )
        .sort((a, b) => itemCost(a) - itemCost(b))
        .slice(0, 60);
    }
    return catalogByCategory(category);
  }, [searching, q, category]);

  if (!mounted) return null;

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, panelW] });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {/* Dim backdrop */}
      <Animated.View style={{ ...StyleAbsolute, opacity: fade }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      </Animated.View>

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
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="ink3">
                Add to plan
              </Text>
              <Text variant="title" numberOfLines={1}>
                {searching ? 'Search' : category}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.accentSoft,
                marginRight: 10,
              }}
            >
              <Icon name="star" size={13} color={colors.accent} strokeWidth={2} />
              <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: colors.accent }}>
                {subscriber ? '∞' : balance}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={16} color={colors.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={{
              marginHorizontal: 14,
              marginBottom: 8,
              height: 40,
              borderRadius: radius.lg,
              backgroundColor: colors.surface2,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              gap: 8,
            }}
          >
            <Icon name="search" size={16} color={colors.ink3} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search all items…"
              placeholderTextColor={colors.ink3}
              style={{ flex: 1, color: colors.ink, fontFamily: 'Manrope_500Medium', fontSize: 14, padding: 0 }}
            />
            {searching ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon name="close" size={15} color={colors.ink3} strokeWidth={2.2} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ flex: 1, flexDirection: 'row' }}>
            {/* Category rail — glyph + label (hidden while searching) */}
            {!searching ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ width: 82, borderRightWidth: 1, borderRightColor: colors.lineSoft }}
                contentContainerStyle={{ paddingVertical: 8, alignItems: 'center', gap: 4 }}
              >
                {ITEM_CATEGORIES.map((cat) => {
                  const active = cat === category;
                  const g = categoryGlyph(cat);
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={{
                        width: 74,
                        paddingVertical: 7,
                        borderRadius: radius.lg,
                        backgroundColor: active ? colors.accentSoft : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        borderWidth: active ? 1 : 0,
                        borderColor: colors.accent,
                      }}
                    >
                      <FurnitureGlyph kind={g.kind} size={30} color={active ? colors.accent : g.color} />
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 9.5,
                          lineHeight: 11,
                          textAlign: 'center',
                          fontFamily: active ? 'Manrope_700Bold' : 'Manrope_500Medium',
                          color: active ? colors.accent : colors.ink3,
                        }}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Items grid — glyph tiles with name + credit badge */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
            >
              {items.length === 0 ? (
                <Text variant="caption" color="ink3" style={{ padding: 16, textAlign: 'center' }}>
                  No items match “{query}”.
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {items.map((item) => {
                    const cost = itemCost(item);
                    const owned = subscriber || !!unlocked[item.id];
                    const paid = cost > 0 && !owned;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => onAdd(item)}
                        style={{
                          width: 96,
                          borderRadius: radius.lg,
                          backgroundColor: isDark ? '#211914' : '#F5EBE4',
                          padding: 8,
                          alignItems: 'center',
                          gap: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View style={{ height: 52, justifyContent: 'center' }}>
                          <FurnitureGlyph kind={item.kind} size={48} color={item.colors?.[0]} />
                        </View>
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 10.5, fontFamily: 'Manrope_600SemiBold', color: colors.ink2, maxWidth: 80 }}
                        >
                          {item.name}
                        </Text>
                        {/* credit badge */}
                        <View
                          style={{
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
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>

          {/* View details → full catalog */}
          <Pressable
            onPress={() => onViewDetails?.(searching ? undefined : category)}
            style={{
              margin: 14,
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
            <Text style={{ color: colors.bg, fontFamily: 'Manrope_700Bold', fontSize: 15 }}>
              Browse full catalog
            </Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const StyleAbsolute = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
