import { useEffect, useMemo, useRef } from 'react';
import {
  View, Pressable, Image, ScrollView, StyleSheet, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { FALLBACK_COVER } from '@/components/graphics/CoverImage';
import { useTheme } from '@/theme/useTheme';
import { accent } from '@/theme/colors';

// ---------------------------------------------------------------------------
// The home screen's top section.
//
// One rectangular card. The AI pitch and its CTA are FIXED — they never move,
// never swipe away, and are compiled into the app. Only the photography behind
// them is server-driven (admin-managed rows from /content/banners), auto-
// scrolling every few seconds so the card feels alive without the user having
// to discover a swipe.
//
// This replaced a swipeable two-page hero: a promo that scrolls itself out of
// view can't be the primary entry point to the app's headline feature.
// ---------------------------------------------------------------------------

const CARD_H = 210;
const GUTTER = 12; // matches QuickStartRow / SectionHeader / RecentProjectsRail
const INTERVAL = 4500;

// Drawn dark in both themes: the contrast against the warm paper background is
// what makes this read as the hero, and it keeps one identity everywhere.
const INK = '19,17,15';

// Shown instead of the image rail when there are no banners yet — a fresh
// install, a local-first build, or an empty DB. The same bundled house render
// the cards fall back to, so an empty backend still opens on a finished-looking
// hero rather than a placeholder sketch.
function FallbackBackdrop() {
  return (
    <Image
      source={FALLBACK_COVER}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      accessibilityLabel="Home design preview"
    />
  );
}

export default function AiHeroBanner({ images = [], onPress, inProgress = false, style }) {
  const { radius, shadows } = useTheme();
  const { width } = useWindowDimensions();
  const cardW = Math.max(1, width - GUTTER * 2);

  // A row with no usable image would auto-scroll to a blank page.
  const slides = useMemo(() => (images || []).filter((b) => b && b.imageUrl), [images]);
  const count = slides.length;

  const scrollRef = useRef(null);
  const timer = useRef(null);
  const indexRef = useRef(0);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const start = () => {
    stop();
    if (count < 2) return;
    timer.current = setInterval(() => {
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      scrollRef.current?.scrollTo({ x: next * cardW, animated: true });
    }, INTERVAL);
  };

  useEffect(() => {
    // Re-arm whenever the deck or the page width changes (rotation), and always
    // clear on unmount — a timer left running holds the screen in memory.
    indexRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, cardW]);

  const onMomentumScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / cardW);
    indexRef.current = i;
    start(); // resume after a manual swipe, timed from the user's last touch
  };

  return (
    <View style={[{ paddingHorizontal: GUTTER }, style]}>
      <View
        style={[
          {
            height: CARD_H,
            borderRadius: radius.xxl,
            overflow: 'hidden',
            backgroundColor: '#141210',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
          },
          shadows.e3,
        ]}
      >
        {/* ── Layer 1: the backdrop ─────────────────────────────────────── */}
        {count ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={stop}
            onMomentumScrollEnd={onMomentumScrollEnd}
            style={StyleSheet.absoluteFill}
          >
            {slides.map((b, i) => (
              <Image
                key={b.id ?? i}
                source={{ uri: b.imageUrl }}
                style={{ width: cardW, height: CARD_H }}
                resizeMode="cover"
                accessibilityLabel={b.title || undefined}
              />
            ))}
          </ScrollView>
        ) : (
          <FallbackBackdrop />
        )}

        {/* ── Layer 2: scrim ────────────────────────────────────────────── */}
        {/* Horizontal, so the copy on the left stays legible over ANY photo an
            admin uploads while the right side keeps showing the room. */}
        <LinearGradient
          pointerEvents="none"
          colors={[`rgba(${INK},0.94)`, `rgba(${INK},0.78)`, `rgba(${INK},0.20)`]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', `rgba(${INK},0.55)`]}
          style={[StyleSheet.absoluteFill, { top: '55%' }]}
        />

        {/* ── Layer 3: fixed foreground ─────────────────────────────────── */}
        {/* box-none lets swipes fall through to the image rail underneath —
            only the CTA itself is a hit target. */}
        <View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, { padding: 20, justifyContent: 'space-between' }]}
        >
          <View pointerEvents="box-none">
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
              }}
            >
              <Icon name="star" size={12} color={accent.a300} strokeWidth={2.4} />
              <Text variant="label" style={{ color: '#F2EAE4', fontSize: 11, letterSpacing: 0.6 }}>
                AI INTERIOR DESIGNER
              </Text>
            </View>

            <Text
              style={{
                color: '#FFFFFF',
                fontFamily: 'Sora_700Bold',
                fontSize: 24,
                lineHeight: 28,
                letterSpacing: -0.4,
                marginTop: 12,
                maxWidth: '74%',
              }}
            >
              Design Your{'\n'}Dream Space
            </Text>

            <Text variant="bodySm" style={{ color: '#B9B0A6', marginTop: 8 }}>
              2D Plan  ·  3D View  ·  Smart Layout
            </Text>
          </View>

          <View
            pointerEvents="box-none"
            style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}
          >
            {/* A generation already running outranks the pitch: it's the user's
                own work waiting for them, so the button goes back to it. */}
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              hitSlop={6}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: pressed ? '#E7DED6' : '#FFFFFF',
                paddingHorizontal: 18,
                paddingVertical: 6,
                borderRadius: radius.pill,
              })}
            >
              <Text style={{ color: '#1B1A17', fontFamily: 'Manrope_700Bold', fontSize: 14 }}>
                {inProgress ? 'Resume your design' : 'Design with AI'}
              </Text>
              <Icon name="arrow-right" size={15} color="#1B1A17" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
