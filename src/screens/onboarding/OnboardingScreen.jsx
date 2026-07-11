import { useRef, useState } from 'react';
import { View, ScrollView, Image, Pressable, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import ProgressDots from '@/components/ui/ProgressDots';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useKenBurns } from '@/hooks/useKenBurns';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ROUTES } from '@/navigation/routes';

const SLIDES = [
  {
    key: 'draw',
    title: 'Draw floor plans\nin minutes',
    body: 'Sketch walls, rooms, doors and windows with snap-to-grid precision — no CAD skills needed.',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=900&fit=crop&q=80',
  },
  {
    key: '3d',
    title: 'See your space\nin real 3D',
    body: 'Flip any plan into a walkable 3D room. Adjust lighting and time of day to feel the space.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=900&fit=crop&q=80',
  },
  {
    key: 'furnish',
    title: 'Furnish with real\ncatalog pieces',
    body: 'Drag sofas, tables and lighting from a curated catalog. Recolor and rescale to fit perfectly.',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=900&fit=crop&q=80',
  },
  {
    key: 'export',
    title: 'Export & share your\nfinished design',
    body: 'Save high-res images or 3D files and share your rooms anywhere.',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=900&fit=crop&q=80',
  },
];

function Slide({ slide, width }) {
  const { colors, radius } = useTheme();
  const kenBurns = useKenBurns();

  return (
    <View style={{ width, paddingHorizontal: 28 }}>
      <View
        style={{
          height: 380,
          borderRadius: radius.xxl,
          overflow: 'hidden',
          backgroundColor: colors.surface2,
        }}
      >
        <Animated.View
          style={[{ position: 'absolute', top: -14, left: -14, right: -14, bottom: -14 }, kenBurns]}
        >
          <Image source={{ uri: slide.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </Animated.View>
      </View>
      <View style={{ paddingHorizontal: 6, paddingTop: 34 }}>
        <Text variant="h1">{slide.title}</Text>
        <Text variant="body" color="ink2" style={{ marginTop: 14 }}>
          {slide.body}
        </Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    completeOnboarding();
    navigation.replace(ROUTES.login);
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 28, paddingVertical: 8 }}>
        <Pressable onPress={finish} hitSlop={10}>
          <Text variant="label" color="ink3">
            Skip
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flexGrow: 0 }}
      >
        {SLIDES.map((slide) => (
          <Slide key={slide.key} slide={slide} width={width} />
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 34,
          marginTop: 24,
        }}
      >
        <ProgressDots total={SLIDES.length} index={index} />
        {isLast ? (
          <View style={{ flex: 1, marginLeft: 20 }}>
            <Button title="Get Started" onPress={finish} />
          </View>
        ) : (
          <Pressable
            onPress={next}
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="arrow-right" size={22} color={colors.onAccent} strokeWidth={2.4} />
          </Pressable>
        )}
      </View>

      {isLast ? (
        <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 14 }}>
          Already have an account?{' '}
          <Text variant="bodySm" color="accent" onPress={() => navigation.replace(ROUTES.login)}>
            Log in
          </Text>
        </Text>
      ) : (
        <View style={{ height: 20 }} />
      )}
    </SafeAreaView>
  );
}
