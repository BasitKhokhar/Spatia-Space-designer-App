import { useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Canvas } from '@react-three/fiber/native';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import Button from '@/components/ui/Button';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import Room3D from '@/three/Room3D';
import { LIGHTING, LIGHTING_ORDER } from '@/three/lighting';
import { ROUTES } from '@/navigation/routes';

export default function ThreeDViewScreen({ navigation }) {
  const { colors, radius, shadows } = useTheme();
  const project = useProjectsStore((s) => s.getActive());
  const balance = useCreditsStore((s) => s.balance);
  const [lighting, setLighting] = useState('golden');
  const [walk, setWalk] = useState(false);

  const plan = project?.plan;
  const span = plan ? Math.max(plan.width, plan.length) : 5;
  const baseRadius = span * 1.6;
  const minRadius = span * 0.35;
  const maxRadius = span * 4;

  // Shared camera state, mutated by gestures and damped toward by CameraRig.
  const cam = useRef({
    azimuth: Math.PI * 0.75,
    polar: 0.9,
    radius: baseRadius,
    target: [0, (plan?.wallHeight ?? 2.6) * 0.35, 0],
  }).current;
  const start = useRef({}).current;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Vertical orbit range: from almost straight-down (top-down plan view) past
  // the horizon so you can tilt low and look *up* at the structure. The rig
  // keeps the camera above the floor, so the lower range reads as a ground-level
  // look-up rather than the camera clipping underground.
  const POLAR_MIN = 0.04;
  const POLAR_MAX = Math.PI / 2 + 0.42;

  const resetView = () => {
    cam.azimuth = Math.PI * 0.75;
    cam.polar = 0.9;
    cam.radius = baseRadius;
    cam.target[0] = 0;
    cam.target[1] = (plan?.wallHeight ?? 2.6) * 0.35;
    cam.target[2] = 0;
    if (walk) setWalk(false);
  };

  // 1 finger → orbit freely (360° horizontal, top-down to below-horizon vertical)
  const orbit = Gesture.Pan()
    .maxPointers(1)
    .runOnJS(true)
    .onBegin(() => {
      start.azimuth = cam.azimuth;
      start.polar = cam.polar;
    })
    .onUpdate((e) => {
      cam.azimuth = start.azimuth + e.translationX * 0.008;
      cam.polar = clamp(start.polar - e.translationY * 0.006, POLAR_MIN, POLAR_MAX);
    });

  // 2 fingers drag → pan the model along the ground, relative to view direction
  const panMove = Gesture.Pan()
    .minPointers(2)
    .averageTouches(true)
    .runOnJS(true)
    .onBegin(() => {
      start.tx = cam.target[0];
      start.tz = cam.target[2];
      start.az = cam.azimuth;
    })
    .onUpdate((e) => {
      const az = start.az;
      const s = cam.radius * 0.0022;
      cam.target[0] = start.tx + (Math.sin(az) * e.translationX + Math.cos(az) * e.translationY) * s;
      cam.target[2] = start.tz + (-Math.cos(az) * e.translationX + Math.sin(az) * e.translationY) * s;
    });

  // pinch → zoom in/out, clamped to the room's size
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      start.radius = cam.radius;
    })
    .onUpdate((e) => {
      cam.radius = clamp(start.radius / (e.scale || 1), minRadius, maxRadius);
    });

  // double-tap → snap back to the default framing
  const doubleTap = Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd(resetView);

  const gesture = Gesture.Simultaneous(Gesture.Exclusive(doubleTap, orbit), panMove, pinch);

  const toggleLighting = () => {
    const idx = LIGHTING_ORDER.indexOf(lighting);
    setLighting(LIGHTING_ORDER[(idx + 1) % LIGHTING_ORDER.length]);
  };

  const toggleWalk = () => {
    setWalk((w) => {
      const next = !w;
      cam.polar = next ? 1.5 : 0.9;
      cam.radius = next ? baseRadius * 0.5 : baseRadius;
      return next;
    });
  };

  const preset = LIGHTING[lighting];

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text color="ink2">No active project.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: preset.background }}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas camera={{ position: [6, 5, 6], fov: 50 }}>
            <Room3D plan={plan} lighting={lighting} cam={cam} />
          </Canvas>
        </View>
      </GestureDetector>

      <SafeAreaView edges={['top']} pointerEvents="box-none">
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 8,
          }}
        >
          <GlassButton onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={18} color={colors.ink} strokeWidth={2.2} />
          </GlassButton>
          <Pressable
            onPress={toggleLighting}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: preset.dot }} />
            <Text variant="bodySm" style={{ color: '#1B1A17', fontWeight: '700' }}>
              {preset.label}
            </Text>
          </Pressable>
          <GlassButton onPress={toggleLighting}>
            <Icon name={lighting === 'night' ? 'moon' : 'sun'} size={17} color={colors.ink} strokeWidth={1.8} />
          </GlassButton>
        </View>
      </SafeAreaView>

      {/* Walk mode + orbit hint */}
      <Pressable
        onPress={toggleWalk}
        style={{
          position: 'absolute',
          left: 18,
          bottom: 230,
          height: 44,
          paddingHorizontal: 16,
          borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.92)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="walk" size={16} color={colors.accent} strokeWidth={1.8} />
        <Text variant="bodySm" style={{ color: '#1B1A17', fontWeight: '700' }}>
          {walk ? 'Orbit Mode' : 'Walk Mode'}
        </Text>
      </Pressable>

      <Pressable
        onPress={resetView}
        style={{
          position: 'absolute',
          right: 18,
          bottom: 230,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="rotate" size={28} color={colors.ink} strokeWidth={2} />
      </Pressable>

      {/* Bottom sheet */}
      <View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            paddingHorizontal: 22,
            paddingTop: 20,
            paddingBottom: 34,
          },
          shadows.e3,
        ]}
      >
        <View style={{ width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text variant="title">{project.name} · 3D</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13 }}>🪙</Text>
            <Text variant="bodySm" style={{ fontWeight: '700' }}>
              {balance}
            </Text>
          </View>
        </View>
        <Button title="Export 3D — 5 credits" icon="upload" onPress={() => navigation.navigate(ROUTES.export)} />
      </View>
    </View>
  );
}

function GlassButton({ children, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}
