import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  Canvas,
  Group,
  Rect,
  RoundedRect,
  Path,
  Skia,
  DashPathEffect,
} from '@shopify/react-native-skia';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import ItemPlacementSheet from '@/components/sheets/ItemPlacementSheet';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import {
  updateFurnitureItem,
  removeFurnitureItem,
  duplicateFurnitureItem,
  snap,
} from '@/domain/floorplan';
import { ROUTES } from '@/navigation/routes';

const TOOLS = [
  { id: 'select', icon: 'pencil' },
  { id: 'room', icon: 'square' },
  { id: 'door', icon: 'door' },
  { id: 'window', icon: 'window' },
  { id: 'measure', icon: 'ruler' },
];

export default function FloorPlanEditorScreen({ navigation }) {
  const { colors, radius, isDark, shadows } = useTheme();
  const project = useProjectsStore((s) => s.getActive());
  const updatePlan = useProjectsStore((s) => s.updatePlan);

  const [plan, setPlan] = useState(() => project?.plan);
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);
  const [canvas, setCanvas] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const sheetRef = useRef(null);
  const history = useRef({ past: [], future: [] });

  // Live refs so gesture handlers (runOnJS) read current values.
  const refs = useRef({});
  refs.current = { plan, zoom, offset, tool, selectedId, canvas };

  // Pixels-per-meter chosen to fit the room with margin.
  const ppm = useMemo(() => {
    if (!plan) return 46;
    const margin = 70;
    return Math.min((canvas.w - margin) / plan.width, (canvas.h - margin) / plan.length);
  }, [plan, canvas]);

  // Center the room once we know the canvas + ppm.
  useEffect(() => {
    if (!plan || canvas.w <= 1) return;
    setOffset({
      x: (canvas.w - plan.width * ppm) / 2,
      y: (canvas.h - plan.length * ppm) / 2,
    });
  }, [canvas.w, canvas.h, ppm, plan?.width, plan?.length]); // eslint-disable-line

  // Persist edits back to the store.
  useEffect(() => {
    if (project && plan) updatePlan(project.id, plan);
  }, [plan]); // eslint-disable-line

  const commit = useCallback((next) => {
    setPlan((prev) => {
      history.current.past.push(prev);
      history.current.future = [];
      return next;
    });
  }, []);

  const undo = () => {
    const h = history.current;
    if (!h.past.length) return;
    const prev = h.past.pop();
    setPlan((cur) => {
      h.future.push(cur);
      return prev;
    });
  };
  const redo = () => {
    const h = history.current;
    if (!h.future.length) return;
    const next = h.future.pop();
    setPlan((cur) => {
      h.past.push(cur);
      return next;
    });
  };

  // --- coordinate helpers ---
  const screenToPlan = (px, py) => {
    const { offset: o, zoom: z } = refs.current;
    return { x: (px - o.x) / z / ppm, y: (py - o.y) / z / ppm };
  };
  const hitTest = (pt) => {
    const items = refs.current.plan?.furniture || [];
    for (let i = items.length - 1; i >= 0; i--) {
      const f = items[i];
      const hw = (f.w * f.scale) / 2;
      const hd = (f.d * f.scale) / 2;
      if (Math.abs(pt.x - f.x) <= hw && Math.abs(pt.y - f.y) <= hd) return f;
    }
    return null;
  };

  // --- gestures (run on JS thread for simple state updates) ---
  const drag = useRef({ id: null, startOffset: null, startItem: null });

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((e) => {
          const pt = screenToPlan(e.x, e.y);
          const hit = refs.current.tool === 'select' ? hitTest(pt) : null;
          if (hit) {
            drag.current = { id: hit.id, startItem: { x: hit.x, y: hit.y } };
            setSelectedId(hit.id);
          } else {
            drag.current = { id: null, startOffset: { ...refs.current.offset } };
          }
        })
        .onUpdate((e) => {
          const d = drag.current;
          if (d.id) {
            const nx = snap(d.startItem.x + e.translationX / (ppm * refs.current.zoom));
            const ny = snap(d.startItem.y + e.translationY / (ppm * refs.current.zoom));
            setPlan((prev) => updateFurnitureItem(prev, d.id, { x: nx, y: ny }));
          } else if (d.startOffset) {
            setOffset({ x: d.startOffset.x + e.translationX, y: d.startOffset.y + e.translationY });
          }
        })
        .onEnd(() => {
          drag.current = { id: null, startOffset: null, startItem: null };
        }),
    [ppm]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDuration(250)
        .onEnd((e) => {
          const hit = hitTest(screenToPlan(e.x, e.y));
          setSelectedId(hit ? hit.id : null);
        }),
    [ppm]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onUpdate((e) => {
          setZoom((z) => Math.min(3, Math.max(0.5, z * (1 + (e.velocity || 0) * 0.02))));
        }),
    []
  );

  const gesture = Gesture.Simultaneous(pinch, Gesture.Race(pan, tap));

  const selected = plan?.furniture.find((f) => f.id === selectedId) || null;

  const openSheet = () => sheetRef.current?.present();
  const patchSelected = (patch) =>
    setPlan((prev) => updateFurnitureItem(prev, selectedId, patch));
  const deleteSelected = () => {
    commit(removeFurnitureItem(plan, selectedId));
    setSelectedId(null);
  };
  const duplicateSelected = () => commit(duplicateFurnitureItem(plan, selectedId));

  // --- grid path ---
  const gridPath = useMemo(() => {
    if (!plan) return null;
    const p = Skia.Path.Make();
    const step = 0.25;
    for (let x = -1; x <= plan.width + 1; x += step) {
      for (let y = -1; y <= plan.length + 1; y += step) {
        p.addCircle(x * ppm, y * ppm, 1);
      }
    }
    return p;
  }, [plan?.width, plan?.length, ppm]);

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text color="ink2">No active project.</Text>
      </SafeAreaView>
    );
  }

  const wallStroke = Math.max(4, plan.walls[0].thickness * ppm);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#161310' : '#F0EBE2' }} edges={['top']}>
      {/* Canvas */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <GestureDetector gesture={gesture}>
          <Canvas style={{ flex: 1 }}>
            <Group transform={[{ translateX: offset.x }, { translateY: offset.y }, { scale: zoom }]}>
              {gridPath ? <Path path={gridPath} color={isDark ? '#2E2A24' : '#D8CFC0'} /> : null}
              {/* room */}
              <Rect
                x={0}
                y={0}
                width={plan.width * ppm}
                height={plan.length * ppm}
                color={isDark ? '#1D1712' : '#FBF6F1'}
              />
              <Rect
                x={0}
                y={0}
                width={plan.width * ppm}
                height={plan.length * ppm}
                color={colors.accent}
                style="stroke"
                strokeWidth={wallStroke}
              />
              {/* furniture */}
              {plan.furniture.map((f) => {
                const w = f.w * f.scale * ppm;
                const d = f.d * f.scale * ppm;
                const isSel = f.id === selectedId;
                return (
                  <Group
                    key={f.id}
                    transform={[
                      { translateX: f.x * ppm },
                      { translateY: f.y * ppm },
                      { rotate: (f.rotation * Math.PI) / 180 },
                    ]}
                  >
                    <RoundedRect x={-w / 2} y={-d / 2} width={w} height={d} r={8} color={f.color} opacity={0.9} />
                    {isSel ? (
                      <RoundedRect
                        x={-w / 2 - 4}
                        y={-d / 2 - 4}
                        width={w + 8}
                        height={d + 8}
                        r={10}
                        color={isDark ? '#F4F1EA' : '#1B1A17'}
                        style="stroke"
                        strokeWidth={2}
                      >
                        <DashPathEffect intervals={[6, 5]} />
                      </RoundedRect>
                    ) : null}
                  </Group>
                );
              })}
            </Group>
          </Canvas>
        </GestureDetector>
      </View>

      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
      >
        <IconButton icon="chevron-left" onPress={() => navigation.goBack()} />
        <Text variant="titleSm">{project.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="undo" onPress={undo} tint={colors.ink3} />
          <IconButton icon="redo" onPress={redo} />
        </View>
      </View>

      {/* Left toolbar */}
      <View
        style={[
          {
            position: 'absolute',
            left: 16,
            top: 110,
            width: 52,
            backgroundColor: isDark ? '#0E0C0A' : colors.ink,
            borderRadius: radius.xl,
            paddingVertical: 10,
            alignItems: 'center',
            gap: 6,
          },
          shadows.e3,
        ]}
      >
        {TOOLS.map((t) => {
          const active = tool === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTool(t.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                backgroundColor: active ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={t.icon} size={17} color={active ? '#fff' : '#ADA79B'} strokeWidth={1.8} />
            </Pressable>
          );
        })}
        <View style={{ width: 28, height: 1, backgroundColor: '#332F28', marginVertical: 4 }} />
        <Pressable
          onPress={() => navigation.navigate(ROUTES.catalog)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={18} color="#fff" strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Properties panel */}
      <View
        style={[
          {
            position: 'absolute',
            top: 110,
            right: 16,
            width: 158,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 14,
          },
          shadows.e2,
        ]}
      >
        {selected ? (
          <>
            <Text variant="caption" color="ink3">
              {selected.name}
            </Text>
            <PropRow label="Width" value={`${(selected.w * selected.scale).toFixed(2)} m`} />
            <PropRow label="Depth" value={`${(selected.d * selected.scale).toFixed(2)} m`} />
            <PropRow label="Rotation" value={`${selected.rotation}°`} />
            <View style={{ height: 1, backgroundColor: colors.lineSoft, marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PanelBtn bg={colors.accentSoft} onPress={openSheet}>
                <Icon name="pencil" size={15} color={colors.accent} strokeWidth={2} />
              </PanelBtn>
              <PanelBtn bg={isDark ? '#3A2420' : '#FDECEA'} onPress={deleteSelected}>
                <Icon name="trash" size={14} color={colors.dangerDark} strokeWidth={2} />
              </PanelBtn>
            </View>
          </>
        ) : (
          <>
            <Text variant="caption" color="ink3">
              Wall
            </Text>
            <PropRow label="Length" value={`${plan.width.toFixed(1)} m`} />
            <PropRow label="Thickness" value={`${Math.round(plan.walls[0].thickness * 100)} cm`} />
            <Text variant="bodySm" color="ink3" style={{ marginTop: 10 }}>
              Tap furniture to edit it.
            </Text>
          </>
        )}
      </View>

      {/* Zoom control */}
      <View
        style={[
          {
            position: 'absolute',
            bottom: 40,
            left: 16,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.line,
          },
          shadows.e2,
        ]}
      >
        <Pressable onPress={() => setZoom((z) => Math.min(3, z + 0.2))} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
          <Text style={{ fontSize: 18, color: colors.ink, fontWeight: '700' }}>+</Text>
        </Pressable>
        <Pressable onPress={() => setZoom((z) => Math.max(0.5, z - 0.2))} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: colors.ink, fontWeight: '700' }}>−</Text>
        </Pressable>
      </View>

      {/* Switch to 3D */}
      <Pressable
        onPress={() => navigation.navigate(ROUTES.view3d)}
        style={[
          {
            position: 'absolute',
            bottom: 40,
            right: 16,
            height: 44,
            paddingHorizontal: 18,
            borderRadius: 22,
            backgroundColor: colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          shadows.accent,
        ]}
      >
        <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 }}>Switch to 3D</Text>
        <Icon name="arrow-right" size={15} color="#fff" strokeWidth={2.4} />
      </Pressable>

      <ItemPlacementSheet
        ref={sheetRef}
        item={selected}
        onChange={patchSelected}
        onDuplicate={duplicateSelected}
        onDone={() => sheetRef.current?.dismiss()}
      />
    </SafeAreaView>
  );
}

function IconButton({ icon, onPress, tint }) {
  const { colors, radius, shadows } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadows.e1,
      ]}
    >
      <Icon name={icon} size={18} color={tint || colors.ink} strokeWidth={2} />
    </Pressable>
  );
}

function PropRow({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <Text variant="bodySm" color="ink2">
        {label}
      </Text>
      <Text variant="bodySm" color="ink">
        {value}
      </Text>
    </View>
  );
}

function PanelBtn({ bg, onPress, children }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, height: 32, borderRadius: 9, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </Pressable>
  );
}
