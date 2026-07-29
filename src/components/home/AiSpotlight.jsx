import { useEffect, useRef } from 'react';
import { View, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs, RadialGradient, Stop, Rect, Line, Path, Pattern, G,
} from 'react-native-svg';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { accent } from '@/theme/colors';

// ---------------------------------------------------------------------------
// The AI feature on the home screen.
//
// Deliberately the loudest thing on the page: AI generation is the fastest path
// from nothing to a finished plan, and people won't find it if it only lives
// three taps deep in the New Project sheet.
//
// It's drawn dark in both themes rather than following the surface token — the
// contrast against the warm paper background is what makes it read as the hero
// instead of one more card, and it keeps one identity wherever it appears.
// ---------------------------------------------------------------------------

const CARD_W = 340; // viewBox reference for the decorations; they scale to fit

const HIGHLIGHTS = [
  { icon: 'ruler', label: 'Any plot size' },
  { icon: 'layers', label: 'Multi-storey' },
  { icon: 'hanger', label: 'Auto-furnished' },
];

// Four-point sparkle, the one mark that reads as "AI" at 10px.
function Sparkle({ x, y, size, opacity }) {
  const r = size / 2;
  return (
    <Path
      d={`M ${x} ${y - r} Q ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}
          Q ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}
          Q ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}
          Q ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`}
      fill="#fff"
      opacity={opacity}
    />
  );
}

export default function AiSpotlight({ onPress, inProgress = false, style }) {
  const { radius, shadows } = useTheme();

  // A slow breath on the warm glow. Only opacity moves, so it stays on the
  // native driver and costs nothing while the user scrolls past it.
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View style={style}>
      <LinearGradient
        colors={['#2B211B', '#191512', '#100E0C']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius: radius.xxl,
            padding: 22,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
          },
          shadows.e3,
        ]}
      >
        {/* Blueprint grid — quietly says "floor plan" without a picture of one. */}
        <Svg
          viewBox={`0 0 ${CARD_W} 240`}
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <Pattern id="aiGrid" width="26" height="26" patternUnits="userSpaceOnUse">
              <Line x1="0" y1="0" x2="26" y2="0" stroke="#fff" strokeWidth="0.5" opacity={0.055} />
              <Line x1="0" y1="0" x2="0" y2="26" stroke="#fff" strokeWidth="0.5" opacity={0.055} />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width={CARD_W} height="240" fill="url(#aiGrid)" />
          {/* A room outline drifting off the right edge, half-drawn. */}
          <G opacity={0.16}>
            <Rect x="226" y="128" width="128" height="96" rx="6" stroke="#fff" strokeWidth="1.4" fill="none" />
            <Line x1="226" y1="176" x2="290" y2="176" stroke="#fff" strokeWidth="1.4" />
            <Line x1="290" y1="176" x2="290" y2="224" stroke="#fff" strokeWidth="1.4" />
          </G>
        </Svg>

        {/* Warm glow behind the badge, breathing. */}
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', right: -70, top: -90, opacity: glowOpacity }}
        >
          <Svg width={260} height={260} viewBox="0 0 260 260">
            <Defs>
              <RadialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={accent.a400} stopOpacity={0.55} />
                <Stop offset="55%" stopColor={accent.a500} stopOpacity={0.18} />
                <Stop offset="100%" stopColor={accent.a700} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="260" height="260" fill="url(#aiGlow)" />
            <Sparkle x={92} y={168} size={13} opacity={0.5} />
            <Sparkle x={128} y={196} size={8} opacity={0.32} />
          </Svg>
        </Animated.View>

        {/* ── Badge row ─────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
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
            <Text
              variant="label"
              style={{ color: '#F2EAE4', fontSize: 11, letterSpacing: 0.6 }}
            >
              AI DESIGNER
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: radius.pill,
              backgroundColor: accent.a500,
            }}
          >
            <Text variant="label" style={{ color: '#fff', fontSize: 10, letterSpacing: 0.6 }}>
              NEW
            </Text>
          </View>
        </View>

        {/* ── Pitch ─────────────────────────────────────────────────────── */}
        <Text
          style={{
            color: '#FFFFFF',
            fontFamily: 'Sora_700Bold',
            fontSize: 24,
            lineHeight: 30,
            letterSpacing: -0.4,
            marginTop: 14,
          }}
        >
          Your whole home,{'\n'}designed in a minute
        </Text>
        <Text variant="bodySm" style={{ color: '#B9B0A6', marginTop: 8, maxWidth: 250 }}>
          Answer a few quick questions — get a fully furnished plan built around
          your plot, ready to edit.
        </Text>

        {/* ── What it handles ───────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {HIGHLIGHTS.map((h) => (
            <View
              key={h.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: radius.md,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.09)',
              }}
            >
              <Icon name={h.icon} size={13} color="#D9CFC6" strokeWidth={2} />
              <Text style={{ color: '#D9CFC6', fontFamily: 'Manrope_600SemiBold', fontSize: 12 }}>
                {h.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        {/* Only this pill is tappable — the card around it is a poster, and a
            whole-card hit target makes every idle scroll-stop feel like a
            misfire. A generation already running outranks the pitch: it's the
            user's own work waiting for them, so the button goes back to it. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
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
              paddingVertical: 12,
              borderRadius: radius.pill,
            })}
          >
            <Text style={{ color: '#1B1A17', fontFamily: 'Manrope_700Bold', fontSize: 14 }}>
              {inProgress ? 'Resume your design' : 'Design with AI'}
            </Text>
            <Icon name="arrow-right" size={15} color="#1B1A17" strokeWidth={2.4} />
          </Pressable>
          {inProgress ? (
            <Text variant="bodySm" style={{ color: accent.a300, marginLeft: 12, flex: 1 }}>
              Still generating…
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}
