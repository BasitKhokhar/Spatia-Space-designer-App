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
  Circle,
  Line,
  Skia,
  DashPathEffect,
} from '@shopify/react-native-skia';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import ItemPlacementSheet from '@/components/sheets/ItemPlacementSheet';
import RoomStyleSheet from '@/components/sheets/RoomStyleSheet';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import {
  updateFurnitureItem,
  removeFurnitureItem,
  duplicateFurnitureItem,
  addWall,
  addRoomRect,
  addOpening,
  nearestWallHit,
  wallLength,
  pointAlongWall,
  setMaterials,
  setFootprint,
  resizePlan,
  planArea,
  snap,
} from '@/domain/floorplan';
import { floorMaterialById } from '@/data/materials';
import { estimateCost, formatMoney } from '@/domain/cost';
import { ROUTES } from '@/navigation/routes';

const TOOLS = [
  { id: 'select', icon: 'move', hint: 'Drag to move. Tap an item to select it.' },
  { id: 'outline', icon: 'polygon', hint: 'Tap to trace the outer shape. Tap the first dot to close it.' },
  { id: 'wall', icon: 'wall', hint: 'Tap to drop wall points. Tap Finish to end.' },
  { id: 'room', icon: 'square', hint: 'Tap two corners to add a room / partition.' },
  { id: 'door', icon: 'door', hint: 'Tap a wall to cut a doorway.' },
  { id: 'window', icon: 'window', hint: 'Tap a wall to place a window.' },
  { id: 'measure', icon: 'ruler', hint: 'Tap two points to measure the distance.' },
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
  const [snapOn, setSnapOn] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [pending, setPending] = useState(null); // { type:'wall'|'room', x, y }
  const [measure, setMeasure] = useState(null); // { a:{x,y}, b:{x,y}|null }
  const [outline, setOutline] = useState(null); // freeform perimeter draft: [{x,y}...]

  const sheetRef = useRef(null);
  const styleSheetRef = useRef(null);
  const history = useRef({ past: [], future: [] });

  // Live refs so gesture handlers (runOnJS) read current values.
  const refs = useRef({});
  refs.current = { plan, zoom, offset, tool, selectedId, canvas, snapOn, pending, measure, outline };

  const floorMat = floorMaterialById(plan?.materials?.floor);
  const wallStrokeColor = isDark ? '#4A4034' : '#7C6A55';

  // Pixels-per-meter chosen to fit the room with margin.
  const ppm = useMemo(() => {
    if (!plan) return 46;
    const margin = 90;
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

  // Reset in-progress drafts when switching tools.
  useEffect(() => {
    setPending(null);
    setMeasure(null);
    setOutline(null);
    if (tool !== 'select') setSelectedId(null);
  }, [tool]);

  // ---- history ----
  const pushHistory = useCallback(() => {
    history.current.past.push(refs.current.plan);
    history.current.future = [];
  }, []);
  const applyCommit = useCallback((fn) => {
    setPlan((prev) => {
      history.current.past.push(prev);
      history.current.future = [];
      return fn(prev);
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
    setSelectedId(null);
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

  // ---- coordinate helpers ----
  const screenToPlan = (px, py) => {
    const { offset: o, zoom: z } = refs.current;
    return { x: (px - o.x) / z / ppm, y: (py - o.y) / z / ppm };
  };
  const planToScreen = (x, y) => ({
    sx: offset.x + x * ppm * zoom,
    sy: offset.y + y * ppm * zoom,
  });
  const snapPt = (pt) => {
    if (!refs.current.snapOn) return { x: Math.round(pt.x * 100) / 100, y: Math.round(pt.y * 100) / 100 };
    return { x: snap(pt.x), y: snap(pt.y) };
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

  // Rotate / resize handle positions (plan meters) for a furniture item.
  const handlePositions = (f) => {
    const rad = (f.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const halfW = (f.w * f.scale) / 2;
    const halfD = (f.d * f.scale) / 2;
    const gap = 26 / (ppm * refs.current.zoom);
    const local = (lx, ly) => ({ x: f.x + lx * cos - ly * sin, y: f.y + lx * sin + ly * cos });
    return {
      rotate: local(0, -(halfD + gap)),
      resize: local(halfW, halfD),
      top: local(0, -halfD),
    };
  };

  // ---- gestures ----
  const drag = useRef({ mode: null });

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((e) => {
          const pt = screenToPlan(e.x, e.y);
          const r = refs.current;
          if (r.tool === 'select') {
            const sel = r.plan?.furniture.find((f) => f.id === r.selectedId);
            if (sel) {
              const h = handlePositions(sel);
              const thr = 28 / (ppm * r.zoom);
              if (Math.hypot(pt.x - h.rotate.x, pt.y - h.rotate.y) <= thr) {
                pushHistory();
                drag.current = { mode: 'rotate', id: sel.id, center: { x: sel.x, y: sel.y } };
                return;
              }
              if (Math.hypot(pt.x - h.resize.x, pt.y - h.resize.y) <= thr) {
                pushHistory();
                drag.current = {
                  mode: 'resize',
                  id: sel.id,
                  center: { x: sel.x, y: sel.y },
                  startScale: sel.scale,
                  startDist: Math.max(0.05, Math.hypot(pt.x - sel.x, pt.y - sel.y)),
                };
                return;
              }
            }
            const hit = hitTest(pt);
            if (hit) {
              pushHistory();
              drag.current = { mode: 'drag', id: hit.id, startItem: { x: hit.x, y: hit.y } };
              setSelectedId(hit.id);
              return;
            }
          }
          drag.current = { mode: 'pan', startOffset: { ...r.offset } };
        })
        .onUpdate((e) => {
          const d = drag.current;
          const r = refs.current;
          if (d.mode === 'drag') {
            const nx = snapPt({ x: d.startItem.x + e.translationX / (ppm * r.zoom), y: 0 }).x;
            const ny = snapPt({ x: 0, y: d.startItem.y + e.translationY / (ppm * r.zoom) }).y;
            setPlan((prev) => updateFurnitureItem(prev, d.id, { x: nx, y: ny }));
          } else if (d.mode === 'rotate') {
            const pt = screenToPlan(e.x, e.y);
            let deg = Math.round((Math.atan2(pt.y - d.center.y, pt.x - d.center.x) * 180) / Math.PI + 90);
            if (r.snapOn) deg = Math.round(deg / 15) * 15;
            deg = ((deg % 360) + 360) % 360;
            setPlan((prev) => updateFurnitureItem(prev, d.id, { rotation: deg }));
          } else if (d.mode === 'resize') {
            const pt = screenToPlan(e.x, e.y);
            const dist = Math.hypot(pt.x - d.center.x, pt.y - d.center.y);
            let sc = Math.max(0.4, Math.min(4, d.startScale * (dist / d.startDist)));
            if (r.snapOn) sc = Math.round(sc * 20) / 20;
            setPlan((prev) => updateFurnitureItem(prev, d.id, { scale: sc }));
          } else if (d.mode === 'pan') {
            setOffset({ x: d.startOffset.x + e.translationX, y: d.startOffset.y + e.translationY });
          }
        })
        .onEnd(() => {
          drag.current = { mode: null };
        }),
    [ppm]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDuration(250)
        .onEnd((e) => {
          const r = refs.current;
          const pt = screenToPlan(e.x, e.y);
          if (r.tool === 'select') {
            const hit = hitTest(pt);
            setSelectedId(hit ? hit.id : null);
            return;
          }
          if (r.tool === 'door' || r.tool === 'window') {
            const hit = nearestWallHit(r.plan, pt, 0.8);
            if (hit) applyCommit((p) => addOpening(p, { wallId: hit.wall.id, kind: r.tool, t: hit.t }));
            return;
          }
          if (r.tool === 'outline') {
            const p = snapPt(pt);
            const pts = r.outline || [];
            if (pts.length >= 3) {
              const first = pts[0];
              const closeThr = 16 / (ppm * r.zoom);
              if (Math.hypot(p.x - first.x, p.y - first.y) <= closeThr) {
                applyCommit((pl) => setFootprint(pl, pts));
                setOutline(null);
                return;
              }
            }
            setOutline([...pts, p]);
            return;
          }
          if (r.tool === 'wall') {
            const p = snapPt(pt);
            if (!r.pending) setPending({ type: 'wall', ...p });
            else {
              applyCommit((pl) => addWall(pl, { x1: r.pending.x, y1: r.pending.y, x2: p.x, y2: p.y }));
              setPending({ type: 'wall', ...p });
            }
            return;
          }
          if (r.tool === 'room') {
            const p = snapPt(pt);
            if (!r.pending) setPending({ type: 'room', ...p });
            else {
              const x = Math.min(r.pending.x, p.x);
              const y = Math.min(r.pending.y, p.y);
              const w = Math.abs(p.x - r.pending.x);
              const h = Math.abs(p.y - r.pending.y);
              if (w > 0.2 && h > 0.2) applyCommit((pl) => addRoomRect(pl, x, y, w, h));
              setPending(null);
            }
            return;
          }
          if (r.tool === 'measure') {
            const p = snapPt(pt);
            if (!r.measure || (r.measure.a && r.measure.b)) setMeasure({ a: p, b: null });
            else setMeasure({ a: r.measure.a, b: p });
          }
        }),
    [ppm]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onUpdate((e) => {
          setZoom((z) => Math.min(3.5, Math.max(0.4, z * (1 + (e.velocity || 0) * 0.02))));
        }),
    []
  );

  const gesture = Gesture.Simultaneous(pinch, Gesture.Race(pan, tap));

  const selected = plan?.furniture.find((f) => f.id === selectedId) || null;

  const openSheet = () => sheetRef.current?.present();
  const patchSelected = (patch) => setPlan((prev) => updateFurnitureItem(prev, selectedId, patch));
  const deleteSelected = () => {
    applyCommit((p) => removeFurnitureItem(p, selectedId));
    setSelectedId(null);
  };
  const duplicateSelected = () => applyCommit((p) => duplicateFurnitureItem(p, selectedId));
  const rotateSelected90 = () =>
    applyCommit((p) => updateFurnitureItem(p, selectedId, { rotation: (selected.rotation + 90) % 360 }));

  // ---- grid path ----
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

  // Polygon floor path for freeform footprints (null for plain rectangles).
  const floorPath = useMemo(() => {
    if (!plan?.footprint || plan.footprint.length < 3) return null;
    const p = Skia.Path.Make();
    plan.footprint.forEach((pt, i) => {
      if (i === 0) p.moveTo(pt.x * ppm, pt.y * ppm);
      else p.lineTo(pt.x * ppm, pt.y * ppm);
    });
    p.close();
    return p;
  }, [plan?.footprint, ppm]);

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text color="ink2">No active project.</Text>
      </SafeAreaView>
    );
  }

  const cost = estimateCost(plan);
  const activeTool = TOOLS.find((t) => t.id === tool);

  // Precompute overlay label positions (dimensions + measurement).
  const dimLabels = showDims
    ? plan.walls.map((w) => {
        const mid = planToScreen((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2);
        return { id: w.id, ...mid, text: `${wallLength(w).toFixed(2)} m` };
      })
    : [];
  let measureLabel = null;
  if (measure?.a && measure?.b) {
    const dist = Math.hypot(measure.b.x - measure.a.x, measure.b.y - measure.a.y);
    const mid = planToScreen((measure.a.x + measure.b.x) / 2, (measure.a.y + measure.b.y) / 2);
    measureLabel = { ...mid, text: `${dist.toFixed(2)} m` };
  }

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
              {/* floor — polygon for freeform footprints, otherwise a rectangle */}
              {floorPath ? (
                <Path path={floorPath} color={floorMat.c2d} />
              ) : (
                <Rect x={0} y={0} width={plan.width * ppm} height={plan.length * ppm} color={floorMat.c2d} />
              )}
              {gridPath ? <Path path={gridPath} color={isDark ? '#2E2A24' : '#D8CFC0'} /> : null}

              {/* walls */}
              {plan.walls.map((w) => {
                const p = Skia.Path.Make();
                p.moveTo(w.x1 * ppm, w.y1 * ppm);
                p.lineTo(w.x2 * ppm, w.y2 * ppm);
                return (
                  <Path
                    key={w.id}
                    path={p}
                    color={wallStrokeColor}
                    style="stroke"
                    strokeWidth={Math.max(4, w.thickness * ppm)}
                    strokeCap="round"
                  />
                );
              })}

              {/* openings (gaps + door swing / window pane) */}
              {plan.openings.map((o) => {
                const wall = plan.walls.find((w) => w.id === o.wallId);
                if (!wall) return null;
                const L = wallLength(wall) || 1;
                const dir = { x: (wall.x2 - wall.x1) / L, y: (wall.y2 - wall.y1) / L };
                const c = pointAlongWall(wall, o.t);
                const half = o.width / 2;
                const a = { x: c.x - dir.x * half, y: c.y - dir.y * half };
                const b = { x: c.x + dir.x * half, y: c.y + dir.y * half };
                const gap = Skia.Path.Make();
                gap.moveTo(a.x * ppm, a.y * ppm);
                gap.lineTo(b.x * ppm, b.y * ppm);
                const els = [
                  <Path
                    key={`${o.id}-gap`}
                    path={gap}
                    color={floorMat.c2d}
                    style="stroke"
                    strokeWidth={Math.max(5, wall.thickness * ppm + 4)}
                    strokeCap="butt"
                  />,
                ];
                if (o.kind === 'door') {
                  const n = { x: -dir.y, y: dir.x };
                  const startRad = Math.atan2(n.y, n.x);
                  const dirRad = Math.atan2(dir.y, dir.x);
                  let sweep = dirRad - startRad;
                  sweep = Math.atan2(Math.sin(sweep), Math.cos(sweep));
                  const arc = Skia.Path.Make();
                  const steps = 12;
                  for (let i = 0; i <= steps; i++) {
                    const ang = startRad + sweep * (i / steps);
                    const px = (a.x + Math.cos(ang) * o.width) * ppm;
                    const py = (a.y + Math.sin(ang) * o.width) * ppm;
                    if (i === 0) arc.moveTo(px, py);
                    else arc.lineTo(px, py);
                  }
                  const leaf = Skia.Path.Make();
                  leaf.moveTo(a.x * ppm, a.y * ppm);
                  leaf.lineTo((a.x + n.x * o.width) * ppm, (a.y + n.y * o.width) * ppm);
                  els.push(
                    <Path key={`${o.id}-arc`} path={arc} color={colors.accent} style="stroke" strokeWidth={1.6} opacity={0.7} />,
                    <Path key={`${o.id}-leaf`} path={leaf} color={colors.accent} style="stroke" strokeWidth={2.4} />
                  );
                } else {
                  const pane = Skia.Path.Make();
                  pane.moveTo(a.x * ppm, a.y * ppm);
                  pane.lineTo(b.x * ppm, b.y * ppm);
                  els.push(
                    <Path
                      key={`${o.id}-pane`}
                      path={pane}
                      color={isDark ? '#7FA9C4' : '#5B87A6'}
                      style="stroke"
                      strokeWidth={Math.max(3, wall.thickness * ppm * 0.5)}
                    />
                  );
                }
                return <Group key={o.id}>{els}</Group>;
              })}

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
                    <RoundedRect x={-w / 2} y={-d / 2} width={w} height={d} r={8} color={f.color} opacity={0.92} />
                    {/* front indicator */}
                    <Line p1={{ x: 0, y: -d / 2 }} p2={{ x: 0, y: -d / 2 + Math.min(14, d * 0.3) }} color="#ffffff" strokeWidth={2} opacity={0.7} />
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

            {/* Screen-space overlays (constant size): handles, drafts, measure */}
            <Group>
              {selected
                ? (() => {
                    const h = handlePositions(selected);
                    const r = planToScreen(h.rotate.x, h.rotate.y);
                    const rz = planToScreen(h.resize.x, h.resize.y);
                    const top = planToScreen(h.top.x, h.top.y);
                    const link = Skia.Path.Make();
                    link.moveTo(top.sx, top.sy);
                    link.lineTo(r.sx, r.sy);
                    return (
                      <Group>
                        <Path path={link} color={colors.accent} style="stroke" strokeWidth={1.5} />
                        <Circle cx={r.sx} cy={r.sy} r={10} color="#fff" />
                        <Circle cx={r.sx} cy={r.sy} r={10} color={colors.accent} style="stroke" strokeWidth={2} />
                        <Circle cx={rz.sx} cy={rz.sy} r={9} color={colors.accent} />
                        <Circle cx={rz.sx} cy={rz.sy} r={9} color="#fff" style="stroke" strokeWidth={2} />
                      </Group>
                    );
                  })()
                : null}

              {/* freeform outline draft */}
              {outline && outline.length
                ? (() => {
                    const path = Skia.Path.Make();
                    outline.forEach((pt, i) => {
                      const s = planToScreen(pt.x, pt.y);
                      if (i === 0) path.moveTo(s.sx, s.sy);
                      else path.lineTo(s.sx, s.sy);
                    });
                    const first = planToScreen(outline[0].x, outline[0].y);
                    return (
                      <Group>
                        <Path path={path} color={colors.accent} style="stroke" strokeWidth={2}>
                          <DashPathEffect intervals={[7, 5]} />
                        </Path>
                        {outline.map((pt, i) => {
                          const s = planToScreen(pt.x, pt.y);
                          return <Circle key={i} cx={s.sx} cy={s.sy} r={i === 0 ? 7 : 5} color={colors.accent} />;
                        })}
                        <Circle cx={first.sx} cy={first.sy} r={7} color="#fff" style="stroke" strokeWidth={2} />
                      </Group>
                    );
                  })()
                : null}

              {/* pending wall/room node */}
              {pending
                ? (() => {
                    const s = planToScreen(pending.x, pending.y);
                    return (
                      <Group>
                        <Circle cx={s.sx} cy={s.sy} r={7} color={colors.accent} />
                        <Circle cx={s.sx} cy={s.sy} r={7} color="#fff" style="stroke" strokeWidth={2} />
                      </Group>
                    );
                  })()
                : null}

              {/* measurement */}
              {measure?.a
                ? (() => {
                    const a = planToScreen(measure.a.x, measure.a.y);
                    const b = measure.b ? planToScreen(measure.b.x, measure.b.y) : a;
                    const ln = Skia.Path.Make();
                    ln.moveTo(a.sx, a.sy);
                    ln.lineTo(b.sx, b.sy);
                    return (
                      <Group>
                        <Path path={ln} color={colors.accent} style="stroke" strokeWidth={2}>
                          <DashPathEffect intervals={[7, 5]} />
                        </Path>
                        <Circle cx={a.sx} cy={a.sy} r={5} color={colors.accent} />
                        <Circle cx={b.sx} cy={b.sy} r={5} color={colors.accent} />
                      </Group>
                    );
                  })()
                : null}
            </Group>
          </Canvas>
        </GestureDetector>
      </View>

      {/* Text overlays (dimensions + measurement) */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {dimLabels.map((l) => (
          <View
            key={l.id}
            style={{
              position: 'absolute',
              left: l.sx - 26,
              top: l.sy - 9,
              backgroundColor: isDark ? 'rgba(20,18,15,0.82)' : 'rgba(255,255,255,0.9)',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink2 }}>{l.text}</Text>
          </View>
        ))}
        {measureLabel ? (
          <View
            style={{
              position: 'absolute',
              left: measureLabel.sx - 30,
              top: measureLabel.sy - 12,
              backgroundColor: colors.accent,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{measureLabel.text}</Text>
          </View>
        ) : null}
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
        <Text variant="titleSm" numberOfLines={1} style={{ flex: 1, textAlign: 'center', marginHorizontal: 8 }}>
          {project.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="magnet" onPress={() => setSnapOn((s) => !s)} active={snapOn} />
          <IconButton icon="ruler" onPress={() => setShowDims((s) => !s)} active={showDims} />
          <IconButton icon="undo" onPress={undo} tint={history.current.past.length ? colors.ink : colors.ink3} />
          <IconButton icon="redo" onPress={redo} tint={history.current.future.length ? colors.ink : colors.ink3} />
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
          onPress={() => styleSheetRef.current?.present()}
          style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="palette" size={18} color="#ADA79B" strokeWidth={1.8} />
        </Pressable>
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

      {/* Right panel */}
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
              <PanelBtn bg={colors.surface2} onPress={rotateSelected90}>
                <Icon name="rotate" size={15} color={colors.ink2} strokeWidth={2} />
              </PanelBtn>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <PanelBtn bg={colors.surface2} onPress={duplicateSelected}>
                <Icon name="duplicate" size={15} color={colors.ink2} strokeWidth={2} />
              </PanelBtn>
              <PanelBtn bg={isDark ? '#3A2420' : '#FDECEA'} onPress={deleteSelected}>
                <Icon name="trash" size={14} color={colors.dangerDark} strokeWidth={2} />
              </PanelBtn>
            </View>
          </>
        ) : (
          <>
            <Text variant="caption" color="ink3">
              {tool === 'select' ? 'Room' : activeTool.id.toUpperCase()}
            </Text>
            {tool === 'select' ? (
              <>
                <PropRow label="Size" value={`${plan.width.toFixed(1)}×${plan.length.toFixed(1)} m`} />
                <PropRow label="Area" value={`${planArea(plan)} m²`} />
                <PropRow label={plan.footprint ? 'Shape' : 'Walls'} value={plan.footprint ? 'Custom' : `${plan.walls.length}`} />
                <PropRow label="Items" value={`${plan.furniture.length}`} />
              </>
            ) : null}
            <Text variant="bodySm" color="ink3" style={{ marginTop: 10 }}>
              {activeTool.hint}
            </Text>
          </>
        )}
      </View>

      {/* Finish draft button */}
      {pending || (measure && measure.b) || (outline && outline.length >= 3) ? (
        <Pressable
          onPress={() => {
            const o = refs.current.outline;
            if (o && o.length >= 3) applyCommit((pl) => setFootprint(pl, o));
            setPending(null);
            setMeasure(null);
            setOutline(null);
          }}
          style={[
            {
              position: 'absolute',
              bottom: 100,
              alignSelf: 'center',
              height: 42,
              paddingHorizontal: 22,
              borderRadius: 21,
              backgroundColor: colors.ink,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            },
            shadows.e3,
          ]}
        >
          <Icon name="check" size={16} color={colors.bg} strokeWidth={2.6} />
          <Text style={{ color: colors.bg, fontFamily: 'Manrope_700Bold', fontSize: 14 }}>Finish</Text>
        </Pressable>
      ) : null}

      {/* Zoom + cost */}
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
        <Pressable onPress={() => setZoom((z) => Math.min(3.5, z + 0.2))} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
          <Text style={{ fontSize: 18, color: colors.ink, fontWeight: '700' }}>+</Text>
        </Pressable>
        <Pressable onPress={() => setZoom((z) => Math.max(0.4, z - 0.2))} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: colors.ink, fontWeight: '700' }}>−</Text>
        </Pressable>
      </View>

      {cost > 0 ? (
        <Pressable
          onPress={() => styleSheetRef.current?.present()}
          style={[
            {
              position: 'absolute',
              bottom: 92,
              left: 16,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            },
            shadows.e2,
          ]}
        >
          <Text style={{ fontSize: 13 }}>💰</Text>
          <Text variant="bodySm" style={{ fontWeight: '800', color: colors.ink }}>
            {formatMoney(cost)}
          </Text>
        </Pressable>
      ) : null}

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
        <Icon name="cube" size={15} color="#fff" strokeWidth={2.4} />
      </Pressable>

      <ItemPlacementSheet
        ref={sheetRef}
        item={selected}
        onChange={patchSelected}
        onDuplicate={duplicateSelected}
        onDone={() => sheetRef.current?.dismiss()}
      />
      <RoomStyleSheet
        ref={styleSheetRef}
        plan={plan}
        onFloor={(id) => applyCommit((p) => setMaterials(p, { floor: id }))}
        onWall={(hex) => applyCommit((p) => setMaterials(p, { wall: hex }))}
        onResize={(w, l) => applyCommit((p) => resizePlan(p, w, l))}
        onHeight={(h) => applyCommit((p) => ({ ...p, wallHeight: h }))}
      />
    </SafeAreaView>
  );
}

function IconButton({ icon, onPress, tint, active }) {
  const { colors, radius, shadows } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: active ? colors.accent : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadows.e1,
      ]}
    >
      <Icon name={icon} size={18} color={active ? '#fff' : tint || colors.ink} strokeWidth={2} />
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
