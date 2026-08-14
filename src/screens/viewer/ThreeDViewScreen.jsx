import { useRef, useState, useEffect, useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Canvas } from '@react-three/fiber/native';
import { ACESFilmicToneMapping } from 'three';
import PerfProbe from '@/three/PerfProbe';

// Dev-only renderer stats, logged rather than drawn so the UI is untouched.
// Watch `fps` fall to 0 when the scene is idle (frameloop="demand" working) and
// `programs` stay in the low teens (material cache working).
const logPerf = __DEV__
  ? (s) =>
      console.log(
        `[3D] fps=${s.fps} calls=${s.calls} tris=${s.tris} programs=${s.programs} ` +
          `geo=${s.geometries}/${s.geoCache} tex=${s.textures} mat=${s.matCache}`
      )
  : undefined;

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import Button from '@/components/ui/Button';
import { useTheme } from '@/theme/useTheme';
import { useActiveProject } from '@/store/useProjectsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import Room3D from '@/three/Room3D';
import ViewerControlsDrawer from '@/components/viewer/ViewerControlsDrawer';
import { LIGHTING, LIGHTING_ORDER } from '@/three/lighting';
import { ROUTES } from '@/navigation/routes';

// Vertical field of view of the 3D camera (must match the <Canvas camera fov>).
const FOV = 50;
const TAN_HALF_FOV = Math.tan((FOV * Math.PI) / 180 / 2);

// Gesture coach rows shown once on entry.
const HINTS = [
  { icon: 'move', label: 'Drag to orbit' },
  { icon: 'expand', label: 'Pinch to zoom' },
  { icon: 'rotate', label: 'Twist with two fingers to rotate' },
];

// Quick-snap camera angles offered on the view rail.
const VIEW_PRESETS = [
  { key: 'iso', label: '3D' },
  { key: 'top', label: 'Top' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
];

export default function ThreeDViewScreen({ navigation }) {
  const { colors, radius, shadows } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const project = useActiveProject();
  const balance = useCreditsStore((s) => s.balance);
  const [lighting, setLighting] = useState('golden');
  const [walk, setWalk] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  // Default to a solid, fully-closed building (all walls + roof visible from
  // every angle) — the complete look. Cutaway is a toggle to peek inside.
  const [cutaway, setCutaway] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hiddenFloors, setHiddenFloors] = useState(() => new Set());

  const plan = project?.plan;
  const floors = useMemo(
    () => (project?.floors?.length ? project.floors : plan ? [{ id: '__single', name: 'Ground floor', plan }] : []),
    [project?.floors, plan]
  );
  const totalHeight = floors.reduce((s, f) => s + (f.plan.wallHeight || 2.6), 0) || 2.6;
  const visibleFloors = useMemo(
    () => new Set(floors.filter((f) => !hiddenFloors.has(f.id)).map((f) => f.id)),
    [floors, hiddenFloors]
  );
  const toggleFloor = (id) =>
    setHiddenFloors((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const span = floors.length ? Math.max(...floors.map((f) => Math.max(f.plan.width, f.plan.length))) : 5;
  const baseRadius = Math.max(span * 1.6, totalHeight * 1.9);
  const minRadius = span * 0.3;
  // Allow zooming far out so the whole structure reads as a small object in
  // space, the way premium plan viewers let you pull back for context.
  const maxRadius = span * 7;

  // World units covered by one screen pixel on the plane through the orbit
  // target, at a given camera distance. Used to keep the touched point pinned
  // under the fingers while pinch-zooming (focal-anchored zoom).
  const worldPerPx = (r) => (2 * r * TAN_HALF_FOV) / screenH;

  // Shared camera state, mutated by gestures and damped toward by CameraRig.
  //   velAz/velPolar — angular momentum applied by the rig after a fling
  //   active        — number of in-flight touch gestures (0 = idle)
  //   autoRotate    — turntable spin when idle
  const cam = useRef({
    azimuth: Math.PI * 0.75,
    polar: 0.9,
    radius: baseRadius,
    target: [0, totalHeight * 0.4, 0],
    velAz: 0,
    velPolar: 0,
    active: 0,
    autoRotate: false,
  }).current;
  const start = useRef({}).current;

  // Fade-in gesture hint overlay, dismissed on first touch (or after a timeout).
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintDone = useRef(false);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const dismissHints = () => {
    if (hintDone.current) return;
    hintDone.current = true;
    Animated.timing(hintOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();
  };

  // Re-show the gesture coach (from the drawer's "Camera controls").
  const showHints = () => {
    hintDone.current = false;
    Animated.timing(hintOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(dismissHints, 4200);
  };

  useEffect(() => {
    Animated.timing(hintOpacity, {
      toValue: 1,
      duration: 450,
      delay: 350,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(dismissHints, 5200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The canvas runs frameloop="demand" (see <Canvas> below), so a frame is drawn
  // only when something asks for one. kick() is that ask.
  //
  // It deliberately does NOT need to be called from every gesture onUpdate. All
  // three gestures bracket themselves with beginTouch/endTouch, and CameraRig
  // re-arms itself on every frame while `cam.active > 0` or while it is still
  // settling. So kicking at the two brackets covers the entire gesture, and the
  // "one missed invalidate silently freezes the camera" failure mode can't happen.
  // Only camera mutations made *outside* a gesture need their own kick.
  const invalidateRef = useRef(null);
  const kick = () => invalidateRef.current?.();

  // Gesture lifecycle helpers: track how many touch gestures are live so the rig
  // pauses momentum/turntable while the user is actively driving the camera.
  const beginTouch = () => {
    cam.active = (cam.active || 0) + 1;
    dismissHints();
    kick();
  };
  const endTouch = () => {
    cam.active = Math.max(0, (cam.active || 0) - 1);
    kick(); // let the fling / damping settle out
  };

  // Vertical orbit range: from almost straight-down (top-down plan view) past
  // the horizon so you can tilt low and look *up* at the structure. The rig
  // keeps the camera above the floor, so the lower range reads as a ground-level
  // look-up rather than the camera clipping underground.
  const POLAR_MIN = 0.04;
  const POLAR_MAX = Math.PI / 2 + 0.42;

  const eyeY = totalHeight * 0.4;

  // Re-frame the camera to a named angle. The rig damps toward these, so each
  // press glides the camera into place instead of snapping.
  const applyView = (view) => {
    cam.velAz = 0;
    cam.velPolar = 0;
    cam.target[0] = 0;
    cam.target[1] = eyeY;
    cam.target[2] = 0;
    if (walk) setWalk(false);
    switch (view) {
      case 'top': // straight-down floor-plan look
        cam.polar = POLAR_MIN + 0.02;
        cam.radius = baseRadius * 1.15;
        break;
      case 'front':
        cam.azimuth = Math.PI / 2;
        cam.polar = 1.3;
        cam.radius = baseRadius * 1.05;
        break;
      case 'side':
        cam.azimuth = 0;
        cam.polar = 1.3;
        cam.radius = baseRadius * 1.05;
        break;
      case 'iso':
      default:
        cam.azimuth = Math.PI * 0.75;
        cam.polar = 0.9;
        cam.radius = baseRadius;
        break;
    }
    kick();
  };

  const resetView = () => applyView('iso');

  const toggleAutoRotate = () => {
    setAutoRotate((on) => {
      const next = !on;
      cam.autoRotate = next;
      if (next) {
        cam.velAz = 0;
        cam.velPolar = 0;
      }
      kick();
      return next;
    });
  };

  // 1 finger → orbit freely (360° horizontal, top-down to below-horizon vertical)
  const orbit = Gesture.Pan()
    .maxPointers(1)
    .runOnJS(true)
    .onBegin(() => {
      start.azimuth = cam.azimuth;
      start.polar = cam.polar;
      cam.velAz = 0;
      cam.velPolar = 0;
      beginTouch();
    })
    .onUpdate((e) => {
      cam.azimuth = start.azimuth + e.translationX * 0.008;
      cam.polar = clamp(start.polar - e.translationY * 0.006, POLAR_MIN, POLAR_MAX);
    })
    .onEnd((e) => {
      // Fling: convert release velocity (px/s) into angular momentum (rad/s)
      // using the same sensitivity as the drag, so the model keeps spinning.
      cam.velAz = e.velocityX * 0.008;
      cam.velPolar = -e.velocityY * 0.006;
    })
    .onFinalize(endTouch);

  // 2 fingers → combined pan + focal-anchored zoom (Google-Maps style). Spread
  // the fingers to zoom *into* the point between them, pinch to pull back, and
  // slide both fingers to drag the model — the world point under the fingers
  // stays glued to them the whole time, which is the premium touch feel.
  const twoFinger = Gesture.Pinch()
    .runOnJS(true)
    .onBegin((e) => {
      start.radius = cam.radius;
      start.tx = cam.target[0];
      start.tz = cam.target[2];
      start.az = cam.azimuth;
      start.fx = e.focalX;
      start.fy = e.focalY;
      beginTouch();
    })
    .onUpdate((e) => {
      const r0 = start.radius;
      const r1 = clamp(r0 / (e.scale || 1), minRadius, maxRadius);
      cam.radius = r1;

      const a = start.az;
      const sinA = Math.sin(a);
      const cosA = Math.cos(a);
      const w0 = worldPerPx(r0);
      const w1 = worldPerPx(r1);

      // Screen offsets (from centre) of the finger centroid at gesture start vs.
      // now. Solving "keep the start-focal world point under the current focal,
      // at the new distance" gives both the drag and the zoom-toward-touch in a
      // single expression.
      const o0x = start.fx - screenW / 2;
      const o0y = start.fy - screenH / 2;
      const o1x = e.focalX - screenW / 2;
      const o1y = e.focalY - screenH / 2;

      cam.target[0] =
        start.tx + w0 * (o0x * sinA + o0y * cosA) - w1 * (o1x * sinA + o1y * cosA);
      cam.target[2] =
        start.tz + w0 * (-o0x * cosA + o0y * sinA) - w1 * (-o1x * cosA + o1y * sinA);
    })
    .onFinalize(endTouch);

  // 2 fingers twist → spin the model horizontally (azimuth), the way premium
  // model viewers let you rotate with a two-finger turn. Runs simultaneously
  // with the pan/zoom gesture, so you can turn, pan and zoom in one motion.
  const twist = Gesture.Rotation()
    .runOnJS(true)
    .onBegin(() => {
      start.rotAz = cam.azimuth;
      cam.velAz = 0;
      cam.velPolar = 0;
      beginTouch();
    })
    .onUpdate((e) => {
      cam.azimuth = start.rotAz - e.rotation;
    })
    .onEnd((e) => {
      // Carry the twist's release velocity into the spin momentum.
      cam.velAz = -e.velocity;
    })
    .onFinalize(endTouch);

  // double-tap → snap back to the default framing
  const doubleTap = Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd(resetView);

  const gesture = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, orbit),
    twoFinger,
    twist,
  );

  const toggleLighting = () => {
    const idx = LIGHTING_ORDER.indexOf(lighting);
    setLighting(LIGHTING_ORDER[(idx + 1) % LIGHTING_ORDER.length]);
  };

  const toggleWalk = () => {
    setWalk((w) => {
      const next = !w;
      cam.polar = next ? 1.5 : 0.9;
      cam.radius = next ? baseRadius * 0.5 : baseRadius;
      kick();
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
      <Canvas
        shadows
        style={StyleSheet.absoluteFill}
        camera={{ position: [6, 5, 6], fov: FOV }}
        gl={{ antialias: true }}
        // Cap the render resolution at 2x. With no dpr the canvas renders at the
        // device's native ratio — 2.75-3x on a modern phone, which is 2x the
        // fragments of a 2x buffer for detail nobody can resolve at arm's
        // length. The freed GPU budget pays for the 2048 shadow map, 8x
        // anisotropy and the real furniture models.
        dpr={[1, 2]}
        // Render on demand instead of a permanent 60fps loop. A parked 3D view
        // previously kept the GPU at full tilt forever, which heats the device
        // until it thermally throttles — the usual cause of "it was smooth at
        // first, then got choppy". Scene edits invalidate automatically through
        // the r3f reconciler; camera motion re-arms itself in CameraRig; and
        // kick() covers mutations made outside both.
        frameloop="demand"
        onCreated={(state) => {
          invalidateRef.current = state.invalidate;
          // ACES rolls off highlights instead of clipping them — flat/blown-out
          // without it, especially once PBR models with real specular hit the scene.
          state.gl.toneMapping = ACESFilmicToneMapping;
          state.invalidate();
        }}
      >
        <Room3D floors={floors} visibleFloors={visibleFloors} lighting={lighting} cam={cam} cutaway={cutaway} />
        {__DEV__ ? <PerfProbe onSample={logPerf} /> : null}
      </Canvas>

      {/* Transparent touch layer sitting on top of the GL surface. R3F/native
          installs its own touch responder on the Canvas, which swallows drags
          before react-native-gesture-handler can see them; capturing gestures on
          this overlay instead makes orbit / pan / pinch reliable on-device. The
          header, side buttons and bottom sheet are rendered after this view, so
          they stay above it and remain tappable. */}
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false} />
      </GestureDetector>

      {/* One-time gesture coach — fades out on first touch (or after ~5s). */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: hintOpacity }]}
      >
        <View
          style={{
            backgroundColor: 'rgba(20,19,17,0.78)',
            borderRadius: radius.xl,
            paddingVertical: 16,
            paddingHorizontal: 20,
            gap: 12,
          }}
        >
          {HINTS.map((h) => (
            <View key={h.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name={h.icon} size={18} color="#FFFFFF" strokeWidth={1.9} />
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>{h.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <GlassButton onPress={toggleLighting}>
              <Icon name={lighting === 'night' ? 'moon' : 'sun'} size={17} color={colors.ink} strokeWidth={1.8} />
            </GlassButton>
            <GlassButton onPress={() => setDrawerOpen(true)}>
              <Icon name="layers" size={18} color={colors.ink} strokeWidth={1.9} />
            </GlassButton>
          </View>
        </View>
      </SafeAreaView>

      {/* Footer — every control lives in one compact bar so the 3D view keeps
          the whole screen above it. A horizontal scroll holds the camera
          presets + toggles; the Export CTA sits beneath as the primary action. */}
      <SafeAreaView
        edges={['bottom']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        pointerEvents="box-none"
      >
        <View
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              paddingTop: 14,
              paddingBottom: 14,
            },
            shadows.e3,
          ]}
        >
          {/* Title + credit balance */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              marginBottom: 12,
            }}
          >
            <Text variant="bodySm" style={{ fontWeight: '700', color: colors.ink }}>
              {project.name} · 3D
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13 }}>🪙</Text>
              <Text variant="bodySm" style={{ fontWeight: '700' }}>
                {balance}
              </Text>
            </View>
          </View>

          {/* Scrollable control rail — presets, walk toggle, auto-spin, recenter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
            style={{ marginBottom: 14 }}
          >
            {VIEW_PRESETS.map((v) => (
              <Chip key={v.key} label={v.label} onPress={() => applyView(v.key)} radius={radius} bg={colors.surface2} />
            ))}
            <View style={{ width: 1, height: 22, backgroundColor: colors.line, marginHorizontal: 2 }} />
            <Chip
              label={walk ? 'Orbit' : 'Walk'}
              icon="walk"
              active={walk}
              onPress={toggleWalk}
              radius={radius}
              accent={colors.accent}
              bg={colors.surface2}
            />
            <Chip
              label={cutaway ? 'Cutaway' : 'Solid walls'}
              icon="wall"
              active={!cutaway}
              onPress={() => setCutaway((c) => !c)}
              radius={radius}
              accent={colors.accent}
              bg={colors.surface2}
            />
            <Chip
              label="Auto-spin"
              icon="rotate"
              active={autoRotate}
              onPress={toggleAutoRotate}
              radius={radius}
              accent={colors.accent}
              bg={colors.surface2}
            />
            <Chip label="Recenter" icon="expand" onPress={resetView} radius={radius} bg={colors.surface2} />
          </ScrollView>

          {/* Primary action — advances to the export screen */}
          <View style={{ paddingHorizontal: 20 }}>
            <Button title="Export 3D — 5 credits" icon="upload" onPress={() => navigation.navigate(ROUTES.export)} />
          </View>
        </View>
      </SafeAreaView>

      <ViewerControlsDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        floors={floors}
        activeFloorId={project.activeFloorId}
        isFloorVisible={(id) => !hiddenFloors.has(id)}
        onToggleFloor={toggleFloor}
        onShare={() => { setDrawerOpen(false); navigation.navigate(ROUTES.export); }}
        onExport={() => { setDrawerOpen(false); navigation.navigate(ROUTES.export); }}
        onReset={() => { setDrawerOpen(false); resetView(); }}
        onCameraControls={() => { setDrawerOpen(false); showHints(); }}
      />
    </View>
  );
}

function Chip({ label, icon, active, accent = '#1B1A17', onPress, radius, bg = 'rgba(255,255,255,0.92)' }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 38,
        paddingHorizontal: 14,
        borderRadius: radius?.md ?? 12,
        backgroundColor: active ? accent : bg,
      }}
    >
      {icon ? (
        <Icon name={icon} size={15} color={active ? '#FFFFFF' : accent} strokeWidth={1.9} />
      ) : null}
      <Text variant="bodySm" style={{ color: active ? '#FFFFFF' : '#1B1A17', fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
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
