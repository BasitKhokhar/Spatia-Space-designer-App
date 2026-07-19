import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  Canvas,
  Group,
  Rect,
  RoundedRect,
  Path,
  Circle,
  Skia,
  DashPathEffect,
} from '@shopify/react-native-skia';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import ItemPlacementSheet from '@/components/sheets/ItemPlacementSheet';
import RoomStyleSheet from '@/components/sheets/RoomStyleSheet';
import CatalogDrawer from '@/components/editor/CatalogDrawer';
import FloorSwitcher from '@/components/editor/FloorSwitcher';
import FurnitureShape from '@/components/editor/FurnitureShape';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore, useActiveProject } from '@/store/useProjectsStore';
import { ensurePlaceable } from '@/domain/unlock';
import { isShopRoom } from '@/data/roomTypes';
import { shapePolygon } from '@/data/structure';
import {
  addFurnitureItem,
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
  snap,
  itemDims,
} from '@/domain/floorplan';
import { floorMaterialById } from '@/data/materials';
import { ROUTES } from '@/navigation/routes';

const TOOLS = [
  { id: 'select', icon: 'move', label: 'Select', hint: 'Drag to move. Tap an item to select it.' },
  { id: 'outline', icon: 'polygon', label: 'Outline', hint: 'Tap to trace the outer shape. Tap the first dot to close it.' },
  { id: 'wall', icon: 'wall', label: 'Wall', hint: 'Tap to drop wall points. Tap Finish to end.' },
  { id: 'room', icon: 'square', label: 'Room', hint: 'Tap two corners to add a room / partition.' },
  { id: 'door', icon: 'door', label: 'Door', hint: 'Tap a wall to cut a doorway.' },
  { id: 'window', icon: 'window', label: 'Window', hint: 'Tap a wall to place a window.' },
  { id: 'measure', icon: 'ruler', label: 'Measure', hint: 'Tap two points to measure the distance.' },
];

export default function FloorPlanEditorScreen({ navigation }) {
  const { colors, radius, isDark, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const project = useActiveProject();
  const updatePlan = useProjectsStore((s) => s.updatePlan);
  const addFloor = useProjectsStore((s) => s.addFloor);
  const cloneFloor = useProjectsStore((s) => s.cloneFloor);
  const deleteFloor = useProjectsStore((s) => s.deleteFloor);
  const renameFloor = useProjectsStore((s) => s.renameFloor);
  const setActiveFloor = useProjectsStore((s) => s.setActiveFloor);
  const moveFloor = useProjectsStore((s) => s.moveFloor);

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sheetRef = useRef(null);
  const styleSheetRef = useRef(null);
  const floorSheetRef = useRef(null);
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

  // Switching the active floor loads that floor's plan into the editor and
  // resets transient editing state + undo history.
  const activeFloorId = project?.activeFloorId;
  useEffect(() => {
    const p = project?.plan;
    if (!p) return;
    setPlan(p);
    setSelectedId(null);
    setPending(null);
    setMeasure(null);
    setOutline(null);
    history.current = { past: [], future: [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFloorId]);

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
  // Hit-test in the item's rotated local frame so rotated items select correctly.
  const hitTest = (pt) => {
    const items = refs.current.plan?.furniture || [];
    for (let i = items.length - 1; i >= 0; i--) {
      const f = items[i];
      const { w, d } = itemDims(f);
      const rad = -(f.rotation * Math.PI) / 180;
      const dx = pt.x - f.x;
      const dy = pt.y - f.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= d / 2) return f;
    }
    return null;
  };

  // The 8 resize handles (4 corners + 4 edge midpoints, each carrying a local
  // direction) plus the rotate handle — all in plan meters, in the item's
  // rotated frame. Edge handles resize one axis; corners resize both.
  const handlePositions = (f) => {
    const rad = (f.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const { w, d } = itemDims(f);
    const halfW = w / 2;
    const halfD = d / 2;
    const gap = 26 / (ppm * refs.current.zoom);
    const local = (lx, ly) => ({ x: f.x + lx * cos - ly * sin, y: f.y + lx * sin + ly * cos });
    const handle = (id, hx, hy) => ({ id, dx: hx, dy: hy, halfW, halfD, ...local(hx * halfW, hy * halfD) });
    return {
      handles: [
        handle('tl', -1, -1),
        handle('t', 0, -1),
        handle('tr', 1, -1),
        handle('r', 1, 0),
        handle('br', 1, 1),
        handle('b', 0, 1),
        handle('bl', -1, 1),
        handle('l', -1, 0),
      ],
      rotate: local(0, -(halfD + gap)),
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
              const thr = 26 / (ppm * r.zoom);
              if (Math.hypot(pt.x - h.rotate.x, pt.y - h.rotate.y) <= thr) {
                pushHistory();
                drag.current = { mode: 'rotate', id: sel.id, center: { x: sel.x, y: sel.y } };
                return;
              }
              // Nearest resize handle within the tap threshold.
              let best = null;
              for (const hd of h.handles) {
                const dist = Math.hypot(pt.x - hd.x, pt.y - hd.y);
                if (dist <= thr && (!best || dist < best.dist)) best = { hd, dist };
              }
              if (best) {
                pushHistory();
                const s = sel.scale ?? 1;
                drag.current = {
                  mode: 'resize',
                  id: sel.id,
                  dir: { x: best.hd.dx, y: best.hd.dy },
                  center: { x: sel.x, y: sel.y },
                  rot: sel.rotation,
                  baseW: sel.w * s,
                  baseD: sel.d * s,
                  oldHalfW: best.hd.halfW,
                  oldHalfD: best.hd.halfD,
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
            const rad = (d.rot * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            // Pointer in the item's local frame, relative to the start center.
            const dxp = pt.x - d.center.x;
            const dyp = pt.y - d.center.y;
            const lx = dxp * cos + dyp * sin;
            const ly = -dxp * sin + dyp * cos;
            const MIN = 0.3; // never smaller than 30 cm on an axis
            let halfW = d.oldHalfW;
            let halfD = d.oldHalfD;
            let ox = 0;
            let oy = 0;
            if (d.dir.x !== 0) {
              const ax = -d.dir.x * d.oldHalfW; // opposite edge stays put
              let newW = Math.max(MIN, Math.abs(lx - ax));
              if (r.snapOn) newW = Math.max(MIN, snap(newW));
              halfW = newW / 2;
              ox = ax + d.dir.x * halfW;
            }
            if (d.dir.y !== 0) {
              const ay = -d.dir.y * d.oldHalfD;
              let newD = Math.max(MIN, Math.abs(ly - ay));
              if (r.snapOn) newD = Math.max(MIN, snap(newD));
              halfD = newD / 2;
              oy = ay + d.dir.y * halfD;
            }
            const nx = d.center.x + (ox * cos - oy * sin);
            const ny = d.center.y + (ox * sin + oy * cos);
            const sx = (2 * halfW) / d.baseW;
            const sy = (2 * halfD) / d.baseD;
            setPlan((prev) => updateFurnitureItem(prev, d.id, { x: nx, y: ny, sx, sy }));
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

  // Drop a catalog item into the middle of the plan. Premium items route through
  // the rewarded-ad unlock first; the drawer stays open for rapid placement.
  const addItem = async (item) => {
    const ok = await ensurePlaceable(item);
    if (!ok) return;
    let newId = null;
    applyCommit((p) => {
      const next = addFurnitureItem(p, item, { x: p.width / 2, y: p.length / 2 });
      newId = next.furniture[next.furniture.length - 1].id;
      return next;
    });
    if (newId) {
      setTool('select');
      setSelectedId(newId);
    }
  };

  const drawerCategory = project && isShopRoom(project.roomType) ? 'Retail' : undefined;

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

  // Skia elements for a placed structure/opening shell, drawn in the item's local
  // frame (origin = center) at the given pixel footprint. Rooms fill grey + stroke
  // walls; stairs draw treads; columns/walls fill; doors/windows draw leaves/panes.
  const structureEls = (f, wPx, dPx) => {
    const shape = f.shape || {};
    const fill = f.color || '#B9B2A6';
    const stroke = wallStrokeColor;
    const strokeW = Math.max(2.5, Math.min(wPx, dPx) * 0.05);
    const hw = wPx / 2;
    const hd = dPx / 2;
    const els = [];
    const outline = (op = 0.5) => {
      els.push(<Rect key="of" x={-hw} y={-hd} width={wPx} height={dPx} color={fill} opacity={op} />);
      els.push(<Rect key="os" x={-hw} y={-hd} width={wPx} height={dPx} color={stroke} style="stroke" strokeWidth={strokeW} />);
    };

    if (shape.type === 'polygon') {
      const poly = shapePolygon(shape.kind) || [[0, 0], [1, 0], [1, 1], [0, 1]];
      const p = Skia.Path.Make();
      poly.forEach(([nx, ny], i) => {
        const x = (nx - 0.5) * wPx;
        const y = (ny - 0.5) * dPx;
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      });
      p.close();
      els.push(<Path key="fill" path={p} color={fill} opacity={0.55} />);
      els.push(<Path key="wall" path={p} color={stroke} style="stroke" strokeWidth={strokeW} strokeJoin="round" />);
    } else if (shape.type === 'wall') {
      els.push(<RoundedRect key="w" x={-hw} y={-hd} width={wPx} height={dPx} r={2} color={stroke} />);
    } else if (shape.type === 'column') {
      if (shape.round) {
        const r = Math.min(hw, hd);
        els.push(<Circle key="c" cx={0} cy={0} r={r} color={fill} />);
        els.push(<Circle key="cs" cx={0} cy={0} r={r} color={stroke} style="stroke" strokeWidth={strokeW} />);
      } else {
        els.push(<Rect key="r" x={-hw} y={-hd} width={wPx} height={dPx} color={fill} />);
        els.push(<Rect key="rs" x={-hw} y={-hd} width={wPx} height={dPx} color={stroke} style="stroke" strokeWidth={strokeW} />);
      }
    } else if (shape.type === 'stairs') {
      outline(0.5);
      const steps = shape.steps || 12;
      const tp = Skia.Path.Make();
      if (shape.turn === 'spiral') {
        const R = Math.min(hw, hd);
        els.push(<Circle key="sc" cx={0} cy={0} r={R} color={stroke} style="stroke" strokeWidth={strokeW} />);
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          tp.moveTo(0, 0);
          tp.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        }
      } else if (shape.turn === 'l') {
        const n = Math.max(2, Math.round(steps / 2));
        for (let i = 1; i < n; i++) {
          const x = -hw + (i / n) * wPx;
          tp.moveTo(x, -hd);
          tp.lineTo(x, 0);
        }
        for (let i = 1; i < n; i++) {
          const y = (i / n) * hd;
          tp.moveTo(-hw, y);
          tp.lineTo(hw, y);
        }
      } else {
        for (let i = 1; i < steps; i++) {
          const y = -hd + (i / steps) * dPx;
          tp.moveTo(-hw, y);
          tp.lineTo(hw, y);
        }
      }
      els.push(<Path key="t" path={tp} color={stroke} style="stroke" strokeWidth={Math.max(1, strokeW * 0.6)} />);
    } else if (shape.type === 'ramp') {
      outline(0.5);
      const ar = Skia.Path.Make();
      ar.moveTo(0, hd * 0.7);
      ar.lineTo(0, -hd * 0.7);
      ar.moveTo(-wPx * 0.16, -hd * 0.35);
      ar.lineTo(0, -hd * 0.7);
      ar.lineTo(wPx * 0.16, -hd * 0.35);
      els.push(<Path key="a" path={ar} color={stroke} style="stroke" strokeWidth={strokeW} />);
    } else if (shape.type === 'door') {
      els.push(<Rect key="frame" x={-hw} y={-hd} width={wPx} height={dPx} color={fill} />);
      const swing = (hingeX, sign) => {
        const R = shape.leaves === 2 ? wPx / 2 : wPx;
        const leaf = Skia.Path.Make();
        leaf.moveTo(hingeX, 0);
        leaf.lineTo(hingeX, -R);
        const arc = Skia.Path.Make();
        for (let i = 0; i <= 8; i++) {
          const a = (i / 8) * (Math.PI / 2);
          const x = hingeX + sign * Math.sin(a) * R;
          const y = -Math.cos(a) * R;
          if (i === 0) arc.moveTo(x, y);
          else arc.lineTo(x, y);
        }
        els.push(<Path key={`leaf${hingeX}`} path={leaf} color={colors.accent} style="stroke" strokeWidth={strokeW} />);
        els.push(<Path key={`arc${hingeX}`} path={arc} color={colors.accent} style="stroke" strokeWidth={1.5} opacity={0.7} />);
      };
      if (shape.slide) {
        const p = Skia.Path.Make();
        p.moveTo(-hw, -1.5);
        p.lineTo(1, -1.5);
        p.moveTo(-1, 1.5);
        p.lineTo(hw, 1.5);
        els.push(<Path key="slide" path={p} color={colors.accent} style="stroke" strokeWidth={Math.max(3, strokeW)} />);
      } else if (shape.leaves === 2) {
        swing(-hw, 1);
        swing(hw, -1);
      } else {
        swing(-hw, 1);
      }
    } else if (shape.type === 'window') {
      els.push(<Rect key="frame" x={-hw} y={-hd} width={wPx} height={dPx} color={fill} />);
      const pane = Skia.Path.Make();
      pane.moveTo(-hw, 0);
      pane.lineTo(hw, 0);
      els.push(<Path key="pane" path={pane} color={isDark ? '#7FA9C4' : '#5B87A6'} style="stroke" strokeWidth={Math.max(2, strokeW * 0.7)} />);
      if (shape.slide) {
        const t = Skia.Path.Make();
        t.moveTo(0, -hd);
        t.lineTo(0, hd);
        els.push(<Path key="mull" path={t} color={stroke} style="stroke" strokeWidth={1.5} />);
      }
    } else {
      // arch / fallback
      outline(0.7);
    }
    return els;
  };

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text color="ink2">No active project.</Text>
      </SafeAreaView>
    );
  }

  // Height reserved by the bottom tool footer, so floating controls clear it.
  const footerH = 60 + Math.max(insets.bottom, 10);

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

              {/* furniture & structure shells */}
              {plan.furniture.map((f) => {
                const dims = itemDims(f);
                const w = dims.w * ppm;
                const d = dims.d * ppm;
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
                    {f.structure ? structureEls(f, w, d) : <FurnitureShape f={f} w={w} d={d} />}
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
                    const rot = planToScreen(h.rotate.x, h.rotate.y);
                    const top = planToScreen(h.top.x, h.top.y);
                    const pts = h.handles.map((hd) => ({ id: hd.id, ...planToScreen(hd.x, hd.y) }));
                    const corners = ['tl', 'tr', 'br', 'bl'].map((id) => pts.find((p) => p.id === id));
                    const box = Skia.Path.Make();
                    corners.forEach((c, i) => (i === 0 ? box.moveTo(c.sx, c.sy) : box.lineTo(c.sx, c.sy)));
                    box.close();
                    const link = Skia.Path.Make();
                    link.moveTo(top.sx, top.sy);
                    link.lineTo(rot.sx, rot.sy);
                    return (
                      <Group>
                        <Path path={box} color={colors.accent} style="stroke" strokeWidth={1.5} />
                        <Path path={link} color={colors.accent} style="stroke" strokeWidth={1.5} />
                        <Circle cx={rot.sx} cy={rot.sy} r={10} color="#fff" />
                        <Circle cx={rot.sx} cy={rot.sy} r={10} color={colors.accent} style="stroke" strokeWidth={2} />
                        {pts.map((p) => (
                          <Group key={p.id}>
                            <RoundedRect x={p.sx - 6} y={p.sy - 6} width={12} height={12} r={3} color="#fff" />
                            <RoundedRect
                              x={p.sx - 6}
                              y={p.sy - 6}
                              width={12}
                              height={12}
                              r={3}
                              color={colors.accent}
                              style="stroke"
                              strokeWidth={2}
                            />
                          </Group>
                        ))}
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

      {/* Header — back · undo / redo · menu */}
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="undo" onPress={undo} tint={history.current.past.length ? colors.ink : colors.ink3} />
          <IconButton icon="redo" onPress={redo} tint={history.current.future.length ? colors.ink : colors.ink3} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <FloorsButton
            count={project?.floors?.length || 1}
            onPress={() => floorSheetRef.current?.present()}
          />
          <IconButton icon="menu" onPress={() => setDrawerOpen(true)} />
        </View>
      </View>

      {/* Contextual selection bar — sits above the footer when an item is picked */}
      {selected ? (
        <View
          style={[
            {
              position: 'absolute',
              bottom: footerH + 12,
              left: 16,
              right: 16,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            },
            shadows.e3,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="titleSm" numberOfLines={1}>
              {selected.name}
            </Text>
            <Text variant="caption" color="ink3">
              {`${itemDims(selected).w.toFixed(2)} × ${itemDims(selected).d.toFixed(2)} m · ${selected.rotation}°`}
            </Text>
          </View>
          <SelBtn bg={colors.accentSoft} onPress={openSheet}>
            <Icon name="pencil" size={16} color={colors.accent} strokeWidth={2} />
          </SelBtn>
          <SelBtn bg={colors.surface2} onPress={rotateSelected90}>
            <Icon name="rotate" size={16} color={colors.ink2} strokeWidth={2} />
          </SelBtn>
          <SelBtn bg={colors.surface2} onPress={duplicateSelected}>
            <Icon name="duplicate" size={16} color={colors.ink2} strokeWidth={2} />
          </SelBtn>
          <SelBtn bg={isDark ? '#3A2420' : '#FDECEA'} onPress={deleteSelected}>
            <Icon name="trash" size={15} color={colors.dangerDark} strokeWidth={2} />
          </SelBtn>
        </View>
      ) : null}

      {/* Finish draft button — clears the current draft, above the footer */}
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
              bottom: footerH + 16,
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

      {/* Footer — one horizontal scroll of tools, toggles & actions */}
      <View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 10),
          },
          shadows.e3,
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, alignItems: 'center' }}
        >
          {TOOLS.map((t) => (
            <FooterButton
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={tool === t.id}
              onPress={() => setTool(t.id)}
            />
          ))}
          <FooterDivider color={colors.line} />
          <FooterButton icon="magnet" label="Snap" active={snapOn} onPress={() => setSnapOn((s) => !s)} />
          <FooterButton icon="ruler" label="Dims" active={showDims} onPress={() => setShowDims((s) => !s)} />
          <FooterButton icon="palette" label="Style" onPress={() => styleSheetRef.current?.present()} />
          <FooterDivider color={colors.line} />
          <FooterButton icon="building" label="Estimate" onPress={() => navigation.navigate(ROUTES.estimate)} />
          <FooterButton icon="cube" label="3D" accent onPress={() => navigation.navigate(ROUTES.view3d)} />
        </ScrollView>
      </View>

      {/* Quick-add catalog drawer (opens from the header menu) */}
      <CatalogDrawer
        visible={drawerOpen}
        initialCategory={drawerCategory}
        onClose={() => setDrawerOpen(false)}
        onAdd={addItem}
        onViewDetails={(category) => {
          setDrawerOpen(false);
          navigation.navigate(ROUTES.catalog, { category });
        }}
      />

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
      <FloorSwitcher
        ref={floorSheetRef}
        project={project}
        onSwitch={(fid) => setActiveFloor(project.id, fid)}
        onAdd={() => addFloor(project.id)}
        onClone={(fid) => cloneFloor(project.id, fid)}
        onDelete={(fid) => deleteFloor(project.id, fid)}
        onRename={(fid, name) => renameFloor(project.id, fid, name)}
        onMove={(fid, dir) => moveFloor(project.id, fid, dir)}
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

// Header pill that opens the floor manager, showing the current floor count.
function FloorsButton({ count, onPress }) {
  const { colors, radius, shadows } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          height: 40,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        shadows.e1,
      ]}
    >
      <Icon name="layers" size={18} color={colors.ink} strokeWidth={2} />
      <Text style={{ fontSize: 13, fontFamily: 'Manrope_700Bold', color: colors.ink }}>{count}</Text>
    </Pressable>
  );
}

// A footer tool/action pill: icon over a tiny label, highlighted when active.
function FooterButton({ icon, label, active, accent, onPress }) {
  const { colors, radius } = useTheme();
  const bg = accent ? colors.accent : active ? colors.accentSoft : 'transparent';
  const fg = accent ? '#fff' : active ? colors.accent : colors.ink2;
  return (
    <Pressable
      onPress={onPress}
      style={{
        minWidth: 56,
        height: 48,
        paddingHorizontal: 10,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <Icon name={icon} size={19} color={fg} strokeWidth={1.9} />
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}

function FooterDivider({ color }) {
  return <View style={{ width: 1, height: 30, backgroundColor: color, marginHorizontal: 4 }} />;
}

// A compact square action button used by the contextual selection bar.
function SelBtn({ bg, onPress, children }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </Pressable>
  );
}
