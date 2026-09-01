import { useRef, useState } from 'react';
import { View, Image, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import ProgressDots from '@/components/ui/ProgressDots';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useKenBurns } from '@/hooks/useKenBurns';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ROUTES } from '@/navigation/routes';

const SLIDES = [
  {
    key: 'draw',
    titleLine1: 'Draw Your',
    titleLine2: 'Floor Plans',
    body: 'Sketch walls, rooms, doors and windows with snap-to-grid precision — no CAD skills needed.',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=900&fit=crop&q=80',
  },
  {
    key: '3d',
    titleLine1: 'See Your Space',
    titleLine2: 'In Real 3D',
    body: 'Flip any plan into a walkable 3D room. Adjust lighting and time of day to feel the space.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=900&fit=crop&q=80',
  },
  {
    key: 'furnish',
    titleLine1: 'Furnish With Real',
    titleLine2: 'Catalog Pieces',
    body: 'Drag sofas, tables and lighting from a curated catalog. Recolor and rescale to fit perfectly.',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=900&fit=crop&q=80',
  },
  {
    key: 'export',
    titleLine1: 'Export & Share',
    titleLine2: 'Your Design',
    body: 'Save high-res images or 3D files and share your rooms anywhere.',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=900&fit=crop&q=80',
  },
];

const SHEET_OVERLAP = 30;
const SHEET_RADIUS = 36;

function Slide({
  slide,
  index,
  total,
  width,
  height,
  imageHeight,
  scrollX,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onLogin,
  insetBottom,
}) {
  const { colors, fonts, shadows } = useTheme();
  const kenBurns = useKenBurns();

  const cardContentStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const rotate = interpolate(scrollX.value, inputRange, [9, 0, -9], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [42, 0, 42], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { rotate: `${rotate}deg` }],
    };
  });

  return (
    <View style={{ width, height }}>
      <View style={{ height: imageHeight, backgroundColor: colors.surface2, overflow: 'hidden' }}>
        <Animated.View
          style={[{ position: 'absolute', top: -14, left: -14, right: -14, bottom: -14 }, kenBurns]}
        >
          <Image source={{ uri: slide.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </Animated.View>
        <LinearGradient
          colors={['rgba(10,8,6,0.32)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }}
          pointerEvents="none"
        />
      </View>

      <View
        style={{
          flex: 1,
          marginTop: -SHEET_OVERLAP,
          backgroundColor: colors.bg,
          borderTopLeftRadius: SHEET_RADIUS,
          borderTopRightRadius: SHEET_RADIUS,
          overflow: 'hidden',
          paddingTop: 26,
          paddingHorizontal: 30,
          paddingBottom: insetBottom + 4,
        }}
      >
        <Animated.View style={[{ flex: 1 }, cardContentStyle]}>
          <ProgressDots total={total} index={index} style={{ alignSelf: 'center' }} />

          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 33, color: colors.ink }}>
              {slide.titleLine1}
            </Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 33, color: colors.accent }}>
              {slide.titleLine2}
            </Text>
          </View>

          <Text variant="body" color="ink2" align="center" style={{ marginTop: 12, paddingHorizontal: 4,marginBottom: 35 }}>
            {slide.body}
          </Text>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={onPrev}
              disabled={isFirst}
              style={({ pressed }) => ({
                height: 52,
                paddingHorizontal: 22,
                borderRadius: 26,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.line,
                opacity: isFirst ? 0.4 : pressed ? 0.85 : 1,
              })}
            >
              <Icon name="chevron-left" size={18} color={colors.ink} strokeWidth={2.4} />
              <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.ink }}>Previous</Text>
            </Pressable>

            <Pressable
              onPress={onNext}
              style={({ pressed }) => [
                {
                  height: 52,
                  paddingHorizontal: 26,
                  borderRadius: 26,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.9 : 1,
                },
                // shadows.accent,
              ]}
            >
              <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.onAccent }}>
                {isLast ? 'Get Started' : 'Next'}
              </Text>
              <Icon name="arrow-right" size={18} color={colors.onAccent} strokeWidth={2.4} />
            </Pressable>
          </View>

          {isLast && (
            <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 14 }}>
              Already have an account?{' '}
              <Text variant="bodySm" color="accent" onPress={onLogin}>
                Log in
              </Text>
            </Text>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, fonts } = useTheme();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const isLast = index === SLIDES.length - 1;
  const imageHeight = height * 0.65;

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const finish = () => {
    completeOnboarding();
    navigation.replace(ROUTES.login);
  };

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  const next = () => (index === SLIDES.length - 1 ? finish() : goTo(index + 1));
  const prev = () => goTo(index - 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <Slide
            key={slide.key}
            slide={slide}
            index={i}
            total={SLIDES.length}
            width={width}
            height={height}
            imageHeight={imageHeight}
            scrollX={scrollX}
            isFirst={i === 0}
            isLast={i === SLIDES.length - 1}
            onPrev={prev}
            onNext={next}
            onLogin={() => {
              completeOnboarding();
              navigation.replace(ROUTES.login);
            }}
            insetBottom={insets.bottom}
          />
        ))}
      </Animated.ScrollView>

      {!isLast && (
        <Pressable
          onPress={finish}
          hitSlop={10}
          style={{ position: 'absolute', top: insets.top + 14, right: 24 }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.26)',
            }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff' }}>Skip</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
