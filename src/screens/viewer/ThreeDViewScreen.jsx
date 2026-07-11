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
  const baseRadius = plan ? Math.max(plan.width, plan.length) * 1.6 : 8;

  const angles = useRef({ azimuth: Math.PI * 0.75, polar: 0.9, radius: baseRadius });
  const start = useRef({ azimuth: 0, polar: 0, radius: 0 });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      start.current = { ...angles.current };
    })
    .onUpdate((e) => {
      angles.current.azimuth = start.current.azimuth + e.translationX * 0.008;
      angles.current.polar = start.current.polar - e.translationY * 0.006;
    });

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      start.current.radius = angles.current.radius;
    })
    .onUpdate((e) => {
      angles.current.radius = Math.max(2.5, Math.min(20, start.current.radius / (e.scale || 1)));
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const toggleLighting = () => {
    const idx = LIGHTING_ORDER.indexOf(lighting);
    setLighting(LIGHTING_ORDER[(idx + 1) % LIGHTING_ORDER.length]);
  };

  const toggleWalk = () => {
    setWalk((w) => {
      const next = !w;
      angles.current.polar = next ? 1.45 : 0.9;
      angles.current.radius = next ? baseRadius * 0.55 : baseRadius;
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
            <Room3D plan={plan} lighting={lighting} angles={angles} />
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

      <View
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
      </View>

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
