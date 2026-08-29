import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Pressable, ScrollView, TextInput } from 'react-native';
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
import RoomSettingsSheet from '@/components/sheets/RoomSettingsSheet';
import TextSettingsSheet from '@/components/sheets/TextSettingsSheet';
import AiSummarySheet from '@/components/sheets/AiSummarySheet';
import CatalogDrawer from '@/components/editor/CatalogDrawer';
import { EDITOR_TOOLS } from '@/data/editorTools';
import FloorSwitcher from '@/components/editor/FloorSwitcher';
import FurnitureShape from '@/components/editor/FurnitureShape';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore, useActiveProject } from '@/store/useProjectsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ensurePlaceable } from '@/domain/unlock';
import * as assetManager from '@/services/assets/assetManager';
import { isShopRoom } from '@/data/roomTypes';
import { shapePolygon } from '@/data/structure';
import {
  addFurnitureItem,
  updateFurnitureItem,
  removeFurnitureItem,
  duplicateFurnitureItem,
  addWall,
  removeWall,
  addRoomRect,
  addOpening,
  itemWallOpenings,
  nearestWallHit,
  wallHit,
  wallLength,
  pointAlongWall,
  setMaterials,
  setFootprint,
  resizePlan,
  snap,
  itemDims,
  roomGroups,
  roomById,
  updateRoomRect,
  updateWall,
  removeRoom,
  duplicateRoom,
  mirrorRoom,
  setRoomColor,
  addText,
  updateText,
  removeText,
  duplicateText,
  isPolygonStructure,
  structureLocalPoints,
  structureLocalBounds,
  openStructureEdge,
  addCustomStructure,
  simplifyPolyline,
} from '@/domain/floorplan';
import { formatLength, formatArea } from '@/domain/units';
import { floorMaterialById } from '@/data/materials';
import { ROUTES } from '@/navigation/routes';

// Shoelace formula: signed area of a polygon (local meter coords).
// Always returns a positive value (absolute area in m²).
function polygonAreaM2(pts) {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

// Area of a placed structure item in m².
// Polygon shells (L, U, T, etc.) use the Shoelace formula on their exact
// outline; rectangular items fall back to w × d.
function structureAreaM2(f) {
  if (isPolygonStructure(f)) {
    const pts = structureLocalPoints(f);
    if (pts && pts.length >= 3) return polygonAreaM2(pts);
  }
  const { w, d } = itemDims(f);
  return w * d;
}

// World-space AABB of a placed item's footprint (polygon shells use their edited
// vertices; everything else uses its rotated w×d box). Feeds the overall boundary.
function itemWorldBounds(f) {
  const rad = (f.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const mirror = f.mirrored ? -1 : 1;
  const toWorld = (lx, ly) => ({ x: f.x + mirror * lx * cos - ly * sin, y: f.y + mirror * lx * sin + ly * cos });
  let pts;
  if (isPolygonStructure(f)) {
    pts = structureLocalPoints(f) || [];
  } else {
    const { w, d } = itemDims(f);
    pts = [
      { x: -w / 2, y: -d / 2 },
      { x: w / 2, y: -d / 2 },
      { x: w / 2, y: d / 2 },
      { x: -w / 2, y: d / 2 },
    ];
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    const wp = toWorld(p.x, p.y);
    minX = Math.min(minX, wp.x);
    minY = Math.min(minY, wp.y);
    maxX = Math.max(maxX, wp.x);
    maxY = Math.max(maxY, wp.y);
  }
  return { minX, minY, maxX, maxY };
}

// The overall footprint boundary spanning every wall, structure and freeform
// outline in the plan — the running "total width × length" the user sees grow
// and shrink as pieces are added / removed / reshaped. Null when the plan is bare.
function overallBounds(plan) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let has = false;
  const grow = (x, y) => {
    has = true;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const w of plan.walls || []) {
    grow(w.x1, w.y1);
    grow(w.x2, w.y2);
  }
  for (const f of plan.furniture || []) {
    if (!f.structure) continue;
    const b = itemWorldBounds(f);
    grow(b.minX, b.minY);
    grow(b.maxX, b.maxY);
  }
  for (const p of plan.footprint || []) grow(p.x, p.y);
  if (!has) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export default function FloorPlanEditorScreen({ navigation, route }) {
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
  const renameProject = useProjectsStore((s) => s.renameProject);

  const unit = useSettingsStore((s) => s.measurementUnit);

  const [plan, setPlan] = useState(() => project?.plan);
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedTextId, setSelectedTextId] = useState(null);
  // A single wall/side picked out of a structure by double-tap — either one
  // edge of a polygon shell ({ kind:'polygon', itemId, edgeIndex }) or a plain
  // wall segment ({ kind:'wall', wallId }). Independent of selectedId/RoomId so
  // the parent item's own selection UI (handles, sheet) still applies too.
  const [selectedSide, setSelectedSide] = useState(null);
  const [freeDraw, setFreeDraw] = useState(null); // live custom-shape draft: [{x,y}...] | null
  const [itemTab, setItemTab] = useState('style');
  const [canvas, setCanvas] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [snapOn, setSnapOn] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [pending, setPending] = useState(null); // { type:'wall'|'room', x, y }
  const [measure, setMeasure] = useState(null); // { a:{x,y}, b:{x,y}|null }
  const [outline, setOutline] = useState(null); // freeform perimeter draft: [{x,y}...]
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Inline project-name editing: tapping the header title swaps it for a field.
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  // Drag-to-place: a catalog item being dragged out of the sidebar. `ghost` holds
  // the item + live finger position (window coords) so we can render a preview
  // that follows the touch and drop it onto the plan where the user releases.
  const [dragGhost, setDragGhost] = useState(null); // { item, x, y } | null
  const dragItemRef = useRef(null);
  const canvasFrameRef = useRef({ x: 0, y: 0 }); // canvas position in window coords
  const canvasRef = useRef(null);

  const sheetRef = useRef(null);
  const styleSheetRef = useRef(null);
  const roomSheetRef = useRef(null);
  const textSheetRef = useRef(null);
  const floorSheetRef = useRef(null);
  const aiSummarySheetRef = useRef(null);
  const history = useRef({ past: [], future: [] });

  // An AI-generated plan arrives here with a summary in tow. Present it once so
  // the user gets the room breakdown and the reasoning without a separate result
  // screen standing between them and their design.
  const aiSummary = route?.params?.aiSummary || null;
  const aiSummaryShown = useRef(false);
  useEffect(() => {
    if (!aiSummary || aiSummaryShown.current) return;
    aiSummaryShown.current = true;
    const t = setTimeout(() => aiSummarySheetRef.current?.present(), 450);
    return () => clearTimeout(t);
  }, [aiSummary]);

  // Live refs so gesture handlers (runOnJS) read current values.
  const refs = useRef({});
  refs.current = {
    plan,
    zoom,
    offset,
    tool,
    selectedId,
    selectedRoomId,
    selectedTextId,
    canvas,
    snapOn,
    pending,
    measure,
    outline,
  };

  // Clear any current selection (all kinds).
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedRoomId(null);
    setSelectedTextId(null);
    setSelectedSide(null);
  }, []);

  // Begin / commit inline renaming of the active project from the header.
  const startNameEdit = () => {
    setNameDraft(project?.name || '');
    setEditingName(true);
  };
  const commitNameEdit = () => {
    const n = nameDraft.trim();
    if (n && project && n !== project.name) renameProject(project.id, n);
    setEditingName(false);
  };

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
    clearSelection();
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
    setFreeDraw(null);
    if (tool !== 'select') clearSelection();
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Approx bounding box of a text label (its content width isn't measured, so
  // estimate from length × glyph size). Returns the hit element or null.
  const hitTextEl = (pt) => {
    const texts = refs.current.plan?.texts || [];
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      const halfW = Math.max(0.3, (t.text?.length || 1) * 0.3 * (t.size || 0.5));
      const halfH = Math.max(0.25, 0.6 * (t.size || 0.5));
      if (Math.abs(pt.x - t.x) <= halfW && Math.abs(pt.y - t.y) <= halfH) return t;
    }
    return null;
  };

  // Room hit-test: a point inside a room group's bounding rectangle.
  const hitRoom = (pt) => {
    const rooms = roomGroups(refs.current.plan || { walls: [] });
    for (let i = rooms.length - 1; i >= 0; i--) {
      const r = rooms[i];
      if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return r;
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
        handle('c', 0, 0), // center — whole-item move
      ],
      rotate: local(0, -(halfD + gap)),
      top: local(0, -halfD),
    };
  };

  // ---- polygon structure corner editing ----
  // Map a point in a structure's local frame (meters, centered on its origin) to
  // world plan coords, honoring its rotation + horizontal mirror.
  const structureWorld = (f, lx, ly) => {
    const rad = (f.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const mx = (f.mirrored ? -1 : 1) * lx;
    return { x: f.x + mx * cos - ly * sin, y: f.y + mx * sin + ly * cos };
  };
  // Inverse of structureWorld: world plan point → the structure's local frame.
  const structureLocal = (f, pt) => {
    const rad = (f.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = pt.x - f.x;
    const dy = pt.y - f.y;
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    return { x: (f.mirrored ? -1 : 1) * lx, y: ly };
  };

  // Double-tap wall hit-test: perpendicular distance from a point to every edge
  // of every polygon-shell structure (front-to-back), so a double-tap anywhere
  // along a wall's length — not just its midpoint handle — targets it.
  const hitStructureEdge = (pt, maxDist = 0.28) => {
    const items = refs.current.plan?.furniture || [];
    for (let i = items.length - 1; i >= 0; i--) {
      const f = items[i];
      if (!isPolygonStructure(f)) continue;
      const pts = structureLocalPoints(f) || [];
      let best = null;
      for (let e = 0; e < pts.length; e++) {
        const a = structureWorld(f, pts[e].x, pts[e].y);
        const b = structureWorld(f, pts[(e + 1) % pts.length].x, pts[(e + 1) % pts.length].y);
        const { dist } = wallHit({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, pt);
        if (dist <= maxDist && (!best || dist < best.dist)) best = { edgeIndex: e, dist };
      }
      if (best) return { itemId: f.id, edgeIndex: best.edgeIndex };
    }
    return null;
  };

  // Editable handles for a polygon shell: one draggable arrow per corner, a dot at
  // every edge midpoint (moves the whole wall), plus center-move and rotate.
  const polygonHandles = (f) => {
    const pts = structureLocalPoints(f) || [];
    const b = structureLocalBounds(f) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const gap = 30 / (ppm * refs.current.zoom);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const verts = pts.map((pt, i) => ({ id: `v${i}`, index: i, ...structureWorld(f, pt.x, pt.y) }));
    const edges = pts.map((pt, i) => {
      const n = pts[(i + 1) % pts.length];
      return { id: `e${i}`, index: i, ...structureWorld(f, (pt.x + n.x) / 2, (pt.y + n.y) / 2) };
    });
    return {
      verts,
      edges,
      center: structureWorld(f, cx, cy),
      rotate: structureWorld(f, cx, b.minY - gap),
      top: structureWorld(f, cx, b.minY),
    };
  };

  // ---- gestures ----
  const drag = useRef({ mode: null });
  const twoFinger = useRef(null); // two-finger pan session (canvas translate)
  // Last single-tap's time+position, for manual double-tap detection (see the
  // `tap` gesture below). Deliberately not RNGH's numberOfTaps(2): that would
  // make every single tap wait to see if a second one follows, adding latency
  // to door/window/wall/text placement too.
  const lastTap = useRef({ time: 0, x: 0, y: 0 });

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        // Single finger only: a second finger means the user is pinching to
        // zoom, so the pan (and any item selection/drag it would trigger) must
        // never activate. This keeps two-finger zoom from grabbing a structure.
        .maxPointers(1)
        .onBegin((e) => {
          const pt = screenToPlan(e.x, e.y);
          const r = refs.current;
          if (r.tool === 'freedraw') {
            drag.current = { mode: 'freedraw', points: [pt] };
            return;
          }
          if (r.tool === 'select') {
            const sel = r.plan?.furniture.find((f) => f.id === r.selectedId);
            // Polygon shells edit per-corner: arrow handles drag one vertex; edge
            // dots move a whole wall; center moves the item; a handle above rotates.
            if (sel && isPolygonStructure(sel)) {
              const ph = polygonHandles(sel);
              const thr = 24 / (ppm * r.zoom);
              const base = { x: sel.x, y: sel.y, rotation: sel.rotation, mirrored: sel.mirrored };
              const startPoints = (structureLocalPoints(sel) || []).map((p) => ({ ...p }));
              if (Math.hypot(pt.x - ph.rotate.x, pt.y - ph.rotate.y) <= thr) {
                drag.current = { mode: 'rotate', id: sel.id, center: { x: sel.x, y: sel.y }, hist: true };
                return;
              }
              // Corners take priority over edges when both are near the finger.
              let vBest = null;
              for (const v of ph.verts) {
                const dist = Math.hypot(pt.x - v.x, pt.y - v.y);
                if (dist <= thr && (!vBest || dist < vBest.dist)) vBest = { v, dist };
              }
              if (vBest) {
                drag.current = { mode: 'vertex', id: sel.id, index: vBest.v.index, base, startShape: sel.shape, startPoints, hist: true };
                return;
              }
              let eBest = null;
              for (const eh of ph.edges) {
                const dist = Math.hypot(pt.x - eh.x, pt.y - eh.y);
                if (dist <= thr && (!eBest || dist < eBest.dist)) eBest = { eh, dist };
              }
              if (eBest) {
                drag.current = { mode: 'edgeMove', id: sel.id, index: eBest.eh.index, base, startShape: sel.shape, startPoints, startLocal: structureLocal(base, pt), hist: true };
                return;
              }
              if (Math.hypot(pt.x - ph.center.x, pt.y - ph.center.y) <= thr) {
                drag.current = { mode: 'drag', id: sel.id, startItem: { x: sel.x, y: sel.y }, hist: true };
                return;
              }
            } else if (sel) {
              const h = handlePositions(sel);
              const thr = 26 / (ppm * r.zoom);
              if (Math.hypot(pt.x - h.rotate.x, pt.y - h.rotate.y) <= thr) {
                drag.current = { mode: 'rotate', id: sel.id, center: { x: sel.x, y: sel.y }, hist: true };
                return;
              }
              // Nearest resize handle within the tap threshold.
              let best = null;
              for (const hd of h.handles) {
                const dist = Math.hypot(pt.x - hd.x, pt.y - hd.y);
                if (dist <= thr && (!best || dist < best.dist)) best = { hd, dist };
              }
              if (best) {
                // Center handle drags the whole item; corner/edge handles resize.
                if (best.hd.id === 'c') {
                  drag.current = { mode: 'drag', id: sel.id, startItem: { x: sel.x, y: sel.y }, hist: true };
                  return;
                }
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
                  hist: true,
                };
                return;
              }
            }
            const hit = hitTest(pt);
            if (hit) {
              drag.current = { mode: 'drag', id: hit.id, startItem: { x: hit.x, y: hit.y }, hist: true, sel: { id: hit.id } };
              return;
            }
            const textHit = hitTextEl(pt);
            if (textHit) {
              drag.current = { mode: 'dragText', id: textHit.id, startItem: { x: textHit.x, y: textHit.y }, hist: true, sel: { textId: textHit.id } };
              return;
            }
            const roomHit = hitRoom(pt);
            if (roomHit) {
              drag.current = { mode: 'dragRoom', id: roomHit.id, startRoom: { x: roomHit.x, y: roomHit.y, w: roomHit.w, h: roomHit.h }, hist: true, sel: { roomId: roomHit.id } };
              return;
            }
          }
          drag.current = { mode: 'pan', startOffset: { ...r.offset } };
        })
        // Side-effects (history snapshot + selection) are deferred to activation
        // so a two-finger pinch — which fires onBegin but never activates the
        // single-finger pan — leaves selection and undo history untouched.
        .onStart(() => {
          const d = drag.current;
          if (d.hist) pushHistory();
          if (d.sel) {
            setSelectedId(d.sel.id ?? null);
            setSelectedRoomId(d.sel.roomId ?? null);
            setSelectedTextId(d.sel.textId ?? null);
          }
        })
        .onUpdate((e) => {
          const d = drag.current;
          const r = refs.current;
          if (d.mode === 'drag') {
            const nx = snapPt({ x: d.startItem.x + e.translationX / (ppm * r.zoom), y: 0 }).x;
            const ny = snapPt({ x: 0, y: d.startItem.y + e.translationY / (ppm * r.zoom) }).y;
            setPlan((prev) => updateFurnitureItem(prev, d.id, { x: nx, y: ny }));
          } else if (d.mode === 'dragText') {
            const nx = snapPt({ x: d.startItem.x + e.translationX / (ppm * r.zoom), y: 0 }).x;
            const ny = snapPt({ x: 0, y: d.startItem.y + e.translationY / (ppm * r.zoom) }).y;
            setPlan((prev) => updateText(prev, d.id, { x: nx, y: ny }));
          } else if (d.mode === 'dragRoom') {
            const nx = snapPt({ x: d.startRoom.x + e.translationX / (ppm * r.zoom), y: 0 }).x;
            const ny = snapPt({ x: 0, y: d.startRoom.y + e.translationY / (ppm * r.zoom) }).y;
            setPlan((prev) => updateRoomRect(prev, d.id, { x: nx, y: ny, w: d.startRoom.w, h: d.startRoom.h }));
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
          } else if (d.mode === 'vertex') {
            // Move one corner freely in the shell's local frame (grid-snapped when
            // Snap is on). The footprint + measurements follow the bounding box.
            const pt = screenToPlan(e.x, e.y);
            let loc = structureLocal(d.base, pt);
            if (r.snapOn) loc = { x: snap(loc.x), y: snap(loc.y) };
            const rnd = (v) => Math.round(v * 1000) / 1000;
            const points = d.startPoints.map((p, i) => (i === d.index ? { x: rnd(loc.x), y: rnd(loc.y) } : p));
            setPlan((prev) => updateFurnitureItem(prev, d.id, { shape: { ...d.startShape, points } }));
          } else if (d.mode === 'edgeMove') {
            // Slide a whole wall by translating both endpoints of the edge equally.
            const pt = screenToPlan(e.x, e.y);
            const loc = structureLocal(d.base, pt);
            let dx = loc.x - d.startLocal.x;
            let dy = loc.y - d.startLocal.y;
            if (r.snapOn) {
              dx = snap(dx);
              dy = snap(dy);
            }
            const j = (d.index + 1) % d.startPoints.length;
            const rnd = (v) => Math.round(v * 1000) / 1000;
            const points = d.startPoints.map((p, k) =>
              k === d.index || k === j ? { x: rnd(p.x + dx), y: rnd(p.y + dy) } : p
            );
            setPlan((prev) => updateFurnitureItem(prev, d.id, { shape: { ...d.startShape, points } }));
          } else if (d.mode === 'pan') {
            setOffset({ x: d.startOffset.x + e.translationX, y: d.startOffset.y + e.translationY });
          } else if (d.mode === 'freedraw') {
            const pt = screenToPlan(e.x, e.y);
            const last = d.points[d.points.length - 1];
            // Throttle by distance so a slow drag doesn't flood the point list.
            if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) >= 0.05) {
              d.points.push(pt);
              setFreeDraw([...d.points]);
            }
          }
        })
        .onEnd(() => {
          const d = drag.current;
          if (d.mode === 'freedraw') {
            const r = refs.current;
            const pts = d.points;
            const xs = pts.map((p) => p.x);
            const ys = pts.map((p) => p.y);
            const w = Math.max(...xs) - Math.min(...xs);
            const h = Math.max(...ys) - Math.min(...ys);
            // Ignore an accidental tap/jitter — require a real sketch.
            if (w >= 0.4 && h >= 0.4) {
              let simplified = simplifyPolyline(pts, 0.12);
              // A naturally-closed loop leaves a near-duplicate last point —
              // drop it so we don't get a sliver wall back to the start.
              const first = simplified[0];
              const last = simplified[simplified.length - 1];
              if (simplified.length > 3 && Math.hypot(last.x - first.x, last.y - first.y) < 0.15) {
                simplified = simplified.slice(0, -1);
              }
              if (r.snapOn) simplified = simplified.map((p) => ({ x: snap(p.x), y: snap(p.y) }));
              if (simplified.length >= 3) {
                let newId = null;
                applyCommit((pl) => {
                  const next = addCustomStructure(pl, simplified);
                  newId = next.furniture[next.furniture.length - 1].id;
                  return next;
                });
                setTool('select');
                if (newId) setSelectedId(newId);
              }
            }
            setFreeDraw(null);
          }
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
            // Manual double-tap: two taps landing close in time + position.
            const now = Date.now();
            const lt = lastTap.current;
            const isDouble = now - lt.time < 320 && Math.hypot(e.x - lt.x, e.y - lt.y) < 24;
            lastTap.current = { time: now, x: e.x, y: e.y };
            if (isDouble) {
              const edgeHit = hitStructureEdge(pt);
              if (edgeHit) {
                setSelectedId(edgeHit.itemId);
                setSelectedRoomId(null);
                setSelectedTextId(null);
                setSelectedSide({ kind: 'polygon', itemId: edgeHit.itemId, edgeIndex: edgeHit.edgeIndex });
                return;
              }
              const wallHitRes = nearestWallHit(r.plan, pt, 0.28);
              if (wallHitRes) {
                setSelectedId(null);
                setSelectedRoomId(wallHitRes.wall.group || null);
                setSelectedTextId(null);
                setSelectedSide({ kind: 'wall', wallId: wallHitRes.wall.id });
                return;
              }
            }
            const hit = hitTest(pt);
            if (hit) {
              setSelectedId(hit.id);
              setSelectedRoomId(null);
              setSelectedTextId(null);
              setSelectedSide(null);
              return;
            }
            const textHit = hitTextEl(pt);
            if (textHit) {
              setSelectedTextId(textHit.id);
              setSelectedId(null);
              setSelectedRoomId(null);
              setSelectedSide(null);
              return;
            }
            const roomHit = hitRoom(pt);
            if (roomHit) {
              setSelectedRoomId(roomHit.id);
              setSelectedId(null);
              setSelectedTextId(null);
              setSelectedSide(null);
              return;
            }
            clearSelection();
            return;
          }
          if (r.tool === 'text') {
            const p = snapPt(pt);
            let newId = null;
            applyCommit((pl) => {
              const next = addText(pl, { x: p.x, y: p.y, text: 'Label' });
              newId = next.texts[next.texts.length - 1].id;
              return next;
            });
            setTool('select');
            if (newId) {
              setSelectedTextId(newId);
              setSelectedId(null);
              setSelectedRoomId(null);
              setTimeout(() => textSheetRef.current?.present(), 60);
            }
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

  // Two-finger drag pans the canvas in any direction. It runs simultaneously
  // with the pinch, so the user can zoom and move the view at the same time.
  const twoFingerPan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minPointers(2)
        .maxPointers(2)
        .onStart(() => {
          twoFinger.current = { startOffset: { ...refs.current.offset } };
        })
        .onUpdate((e) => {
          const s = twoFinger.current;
          if (!s) return;
          setOffset({ x: s.startOffset.x + e.translationX, y: s.startOffset.y + e.translationY });
        })
        .onEnd(() => {
          twoFinger.current = null;
        }),
    []
  );

  const gesture = Gesture.Simultaneous(pinch, twoFingerPan, Gesture.Race(pan, tap));

  const selected = plan?.furniture.find((f) => f.id === selectedId) || null;
  const selectedRoom = selectedRoomId ? roomById(plan, selectedRoomId) : null;
  const selectedText = plan?.texts?.find((t) => t.id === selectedTextId) || null;

  // ---- furniture actions ----
  const openSheet = (focusTab) => {
    if (focusTab) setItemTab(focusTab);
    sheetRef.current?.present();
  };
  const patchSelected = (patch) => setPlan((prev) => updateFurnitureItem(prev, selectedId, patch));
  const deleteSelected = () => {
    applyCommit((p) => removeFurnitureItem(p, selectedId));
    setSelectedId(null);
  };
  const duplicateSelected = () => applyCommit((p) => duplicateFurnitureItem(p, selectedId));
  const rotateSelected90 = () =>
    applyCommit((p) => updateFurnitureItem(p, selectedId, { rotation: (selected.rotation + 90) % 360 }));
  const mirrorSelected = () =>
    applyCommit((p) => updateFurnitureItem(p, selectedId, { mirrored: !selected.mirrored }));

  // ---- room actions ----
  const resizeSelectedRoom = ({ w, h }) =>
    setPlan((prev) => updateRoomRect(prev, selectedRoomId, { x: selectedRoom.x, y: selectedRoom.y, w, h }));
  const setSelectedWallThickness = (wallId, thickness) =>
    setPlan((prev) => updateWall(prev, wallId, { thickness }));
  const setSelectedRoomColor = (hex) => applyCommit((p) => setRoomColor(p, selectedRoomId, hex));
  const deleteSelectedRoom = () => {
    applyCommit((p) => removeRoom(p, selectedRoomId));
    setSelectedRoomId(null);
  };
  const duplicateSelectedRoom = () => applyCommit((p) => duplicateRoom(p, selectedRoomId));
  const mirrorSelectedRoom = () => applyCommit((p) => mirrorRoom(p, selectedRoomId));

  // ---- text actions ----
  const patchSelectedText = (patch) => setPlan((prev) => updateText(prev, selectedTextId, patch));
  const rotateSelectedText90 = () =>
    applyCommit((p) => updateText(p, selectedTextId, { rotation: ((selectedText.rotation || 0) + 90) % 360 }));
  const deleteSelectedText = () => {
    applyCommit((p) => removeText(p, selectedTextId));
    setSelectedTextId(null);
  };
  const duplicateSelectedText = () => applyCommit((p) => duplicateText(p, selectedTextId));

  // ---- single-wall actions (double-tap selection) ----
  const deleteSelectedSide = () => {
    if (!selectedSide) return;
    if (selectedSide.kind === 'polygon') {
      applyCommit((p) => openStructureEdge(p, selectedSide.itemId, selectedSide.edgeIndex));
    } else if (selectedSide.kind === 'wall') {
      applyCommit((p) => removeWall(p, selectedSide.wallId));
    }
    setSelectedSide(null);
  };

  // Drop a catalog item onto the plan. Tapping a row places it at plan center;
  // dragging a row places it exactly where the finger was released (`position`).
  // Premium items route through the rewarded-ad unlock first. The freshly placed
  // item is selected so its edit handles show immediately.
  const addItem = async (item, position) => {
    const ok = await ensurePlaceable(item);
    if (!ok) return;
    // Fetch this item's real artwork at USER priority so it jumps ahead of any
    // bulk prefetch. Deliberately NOT awaited: placement stays instant, the
    // bundled fallback renders immediately, and the real art swaps in when it
    // lands. planTop first — it is small and it is what the user is looking at.
    assetManager.ensureItemAssets(item, ['planTop', 'model', 'thumb']);
    let newId = null;
    applyCommit((p) => {
      const pos = position || { x: p.width / 2, y: p.length / 2 };
      const next = addFurnitureItem(p, item, pos);
      newId = next.furniture[next.furniture.length - 1].id;
      return next;
    });
    if (newId) {
      setTool('select');
      setSelectedId(newId);
      setSelectedRoomId(null);
      setSelectedTextId(null);
      // Auto-open the placement sheet on the Measure tab so the user can
      // immediately see and edit the item's dimensions after placing it.
      setItemTab('measure');
      setTimeout(() => sheetRef.current?.present(), 80);
    }
  };

  // ---- drag-to-place from the sidebar ----
  // The drawer's rows own the pan gesture; these callbacks receive window-space
  // finger coordinates. We close the drawer, follow the finger with a ghost, then
  // convert the release point into plan meters (via the measured canvas frame).
  const handleDragStart = (item, x, y) => {
    dragItemRef.current = item;
    setDragGhost({ item, x, y });
    setDrawerOpen(false);
    clearSelection();
  };
  const handleDragMove = (x, y) => {
    setDragGhost((g) => (g ? { ...g, x, y } : { item: dragItemRef.current, x, y }));
  };
  const handleDragEnd = (x, y) => {
    const item = dragItemRef.current;
    setDragGhost(null);
    dragItemRef.current = null;
    if (!item) return;
    const frame = canvasFrameRef.current;
    const pt = screenToPlan(x - frame.x, y - frame.y);
    addItem(item, snapPt(pt));
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
      // Editable vertices (local meters, centered) drive the outline so a dragged
      // corner reshapes the room. Fall back to the kind's normalized outline.
      const localPts = structureLocalPoints(f);
      let ptsPx;
      if (localPts && localPts.length >= 3) {
        ptsPx = localPts.map((pt) => ({ x: pt.x * ppm, y: pt.y * ppm }));
      } else {
        const poly = shapePolygon(shape.kind) || [[0, 0], [1, 0], [1, 1], [0, 1]];
        ptsPx = poly.map(([nx, ny]) => ({ x: (nx - 0.5) * wPx, y: (ny - 0.5) * dPx }));
      }
      const p = Skia.Path.Make();
      ptsPx.forEach((pt, i) => (i === 0 ? p.moveTo(pt.x, pt.y) : p.lineTo(pt.x, pt.y)));
      p.close();
      // Wall stroke honors an editable thickness (meters) so shells can have thick
      // or thin walls; falls back to a size-relative default.
      const wallPx = shape.wallThickness ? Math.max(2.5, shape.wallThickness * ppm) : strokeW;
      els.push(<Path key="fill" path={p} color={fill} opacity={0.55} />);
      // Deleted walls (double-tap → Delete Wall) leave a gap: walk the edges and
      // break the stroke path at any index in shape.openEdges, chaining the rest
      // so untouched corners still get a mitered join.
      const openEdges = new Set(shape.openEdges || []);
      const wallPath = Skia.Path.Make();
      let started = false;
      ptsPx.forEach((pt, i) => {
        if (openEdges.has(i)) {
          started = false;
          return;
        }
        const n = ptsPx[(i + 1) % ptsPx.length];
        if (!started) {
          wallPath.moveTo(pt.x, pt.y);
          started = true;
        }
        wallPath.lineTo(n.x, n.y);
      });
      els.push(<Path key="wall" path={wallPath} color={stroke} style="stroke" strokeWidth={wallPx} strokeJoin="round" />);
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
      // Open doorway gap so both sides of the opened door are see-through
      els.push(<Rect key="gap" x={-hw} y={-hd} width={wPx} height={dPx} color={floorMat.c2d} />);
      const jambW = Math.max(2.5, wPx * 0.05);
      els.push(<Rect key="jambL" x={-hw} y={-hd} width={jambW} height={dPx} color={stroke} />);
      els.push(<Rect key="jambR" x={hw - jambW} y={-hd} width={jambW} height={dPx} color={stroke} />);
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
        swing(-hw + jambW, 1);
        swing(hw - jambW, -1);
      } else {
        swing(-hw + jambW, 1);
      }
    } else if (shape.type === 'window') {
      els.push(<Rect key="gap" x={-hw} y={-hd} width={wPx} height={dPx} color={floorMat.c2d} />);
      const frameW = Math.max(2, wPx * 0.05);
      els.push(<Rect key="frame" x={-hw} y={-hd} width={wPx} height={dPx} color={stroke} style="stroke" strokeWidth={frameW} />);
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
        return { id: w.id, ...mid, text: formatLength(wallLength(w), unit) };
      })
    : [];
  let measureLabel = null;
  if (measure?.a && measure?.b) {
    const dist = Math.hypot(measure.b.x - measure.a.x, measure.b.y - measure.a.y);
    const mid = planToScreen((measure.a.x + measure.b.x) / 2, (measure.a.y + measure.b.y) / 2);
    measureLabel = { ...mid, text: formatLength(dist, unit) };
  }

  // Room groups (selectable rectangles derived from grouped walls).
  const rooms = roomGroups(plan);

  // Overall footprint boundary — always visible (independent of showDims toggle).
  // showDims controls wall-segment labels only; the boundary totals are permanent.
  const overall = overallBounds(plan);
  let overallDims = null;
  if (overall && overall.w > 0.05 && overall.h > 0.05) {
    const OFF = 20; // px outside the boundary
    const tl = planToScreen(overall.minX, overall.minY);
    const tr = planToScreen(overall.maxX, overall.minY);
    const bl = planToScreen(overall.minX, overall.maxY);
    overallDims = {
      topY: tl.sy - OFF,
      leftX: tl.sx - OFF,
      x1: tl.sx,
      x2: tr.sx,
      y1: tl.sy,
      y2: bl.sy,
      widthText: formatLength(overall.w, unit),
      heightText: formatLength(overall.h, unit),
    };
  }

  // Per-structure area labels — shown only while the Measure tool is active.
  // Each label is positioned at the world-center of the item.
  const structureAreaLabels = tool === 'measure'
    ? (plan.furniture || []).filter((f) => f.structure).map((f) => {
        const areaM2 = structureAreaM2(f);
        const areaText = formatArea(Math.round(areaM2 * 10) / 10, unit);
        // Center: for polygon structures use centroid of points; otherwise item origin.
        let cx = f.x;
        let cy = f.y;
        if (isPolygonStructure(f)) {
          const pts = structureLocalPoints(f);
          if (pts && pts.length >= 3) {
            // Centroid in local frame, then transform to world.
            const lx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const ly = pts.reduce((s, p) => s + p.y, 0) / pts.length;
            const rad = (f.rotation * Math.PI) / 180;
            const mirror = f.mirrored ? -1 : 1;
            cx = f.x + mirror * lx * Math.cos(rad) - ly * Math.sin(rad);
            cy = f.y + mirror * lx * Math.sin(rad) + ly * Math.cos(rad);
          }
        }
        const screen = planToScreen(cx, cy);
        return { id: f.id, sx: screen.sx, sy: screen.sy, text: areaText };
      })
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#161310' : '#F0EBE2' }} edges={['top']}>
      {/* Canvas */}
      <View
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onLayout={(e) => {
          setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
          // Cache the canvas position in window coords so sidebar drops (which give
          // window-space finger coords) can be mapped into plan space.
          canvasRef.current?.measureInWindow?.((wx, wy) => {
            canvasFrameRef.current = { x: wx, y: wy };
          });
        }}
      >
        <GestureDetector gesture={gesture}>
          <Canvas style={{ flex: 1 }}>
            <Group transform={[{ translateX: offset.x }, { translateY: offset.y }, { scale: zoom }]}>
              {/* floor — only when the plan has a shell (footprint or perimeter
                  walls). A blank plan draws no floor: the canvas is empty until
                  the user adds a structure, which brings its own floor + walls. */}
              {floorPath ? (
                <Path path={floorPath} color={floorMat.c2d} />
              ) : plan.walls.some((w) => w.perimeter) ? (
                <Rect x={0} y={0} width={plan.width * ppm} height={plan.length * ppm} color={floorMat.c2d} />
              ) : null}
              {gridPath ? <Path path={gridPath} color={isDark ? '#2E2A24' : '#D8CFC0'} /> : null}

              {/* room floor tints + selection highlight (grouped-wall rects) */}
              {rooms.map((rm) => {
                const tint = rm.walls.find((w) => w.color)?.color;
                const isSel = rm.id === selectedRoomId;
                if (!tint && !isSel) return null;
                return (
                  <Group key={`room-${rm.id}`}>
                    {tint ? (
                      <Rect x={rm.x * ppm} y={rm.y * ppm} width={rm.w * ppm} height={rm.h * ppm} color={tint} opacity={0.5} />
                    ) : null}
                    {isSel ? (
                      <Rect
                        x={rm.x * ppm}
                        y={rm.y * ppm}
                        width={rm.w * ppm}
                        height={rm.h * ppm}
                        color={colors.accent}
                        style="stroke"
                        strokeWidth={2.5}
                      >
                        <DashPathEffect intervals={[8, 6]} />
                      </Rect>
                    ) : null}
                  </Group>
                );
              })}

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
              {[
                ...(plan.openings || []),
                ...itemWallOpenings(plan).filter(
                  (io) => !plan.openings?.some((o) => o.wallId === io.wallId && Math.abs(o.t - io.t) < 0.05)
                ),
              ].map((o) => {
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
                      { scaleX: f.mirrored ? -1 : 1 },
                    ]}
                  >
                    {f.structure ? structureEls(f, w, d) : <FurnitureShape f={f} w={w} d={d} />}
                    {isSel && !isPolygonStructure(f) ? (
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
              {/* Overall boundary dimension lines (top = width, left = length) */}
              {overallDims
                ? (() => {
                    const c = colors.ink3;
                    const cap = 5;
                    const top = Skia.Path.Make();
                    top.moveTo(overallDims.x1, overallDims.topY);
                    top.lineTo(overallDims.x2, overallDims.topY);
                    top.moveTo(overallDims.x1, overallDims.topY - cap);
                    top.lineTo(overallDims.x1, overallDims.topY + cap);
                    top.moveTo(overallDims.x2, overallDims.topY - cap);
                    top.lineTo(overallDims.x2, overallDims.topY + cap);
                    const left = Skia.Path.Make();
                    left.moveTo(overallDims.leftX, overallDims.y1);
                    left.lineTo(overallDims.leftX, overallDims.y2);
                    left.moveTo(overallDims.leftX - cap, overallDims.y1);
                    left.lineTo(overallDims.leftX + cap, overallDims.y1);
                    left.moveTo(overallDims.leftX - cap, overallDims.y2);
                    left.lineTo(overallDims.leftX + cap, overallDims.y2);
                    return (
                      <Group>
                        <Path path={top} color={c} style="stroke" strokeWidth={1.5} />
                        <Path path={left} color={c} style="stroke" strokeWidth={1.5} />
                      </Group>
                    );
                  })()
                : null}

              {/* Polygon shells: an arrow handle per corner + edge-wall dots. */}
              {selected && isPolygonStructure(selected)
                ? (() => {
                    const ph = polygonHandles(selected);
                    const rot = planToScreen(ph.rotate.x, ph.rotate.y);
                    const top = planToScreen(ph.top.x, ph.top.y);
                    const center = planToScreen(ph.center.x, ph.center.y);
                    const link = Skia.Path.Make();
                    link.moveTo(top.sx, top.sy);
                    link.lineTo(rot.sx, rot.sy);
                    return (
                      <Group>
                        <Path path={link} color={colors.accent} style="stroke" strokeWidth={1.5} />
                        <Circle cx={rot.sx} cy={rot.sy} r={10} color="#fff" />
                        <Circle cx={rot.sx} cy={rot.sy} r={10} color={colors.accent} style="stroke" strokeWidth={2} />
                        {/* edge-midpoint handles — drag to move a whole wall */}
                        {ph.edges.map((eh) => {
                          const s = planToScreen(eh.x, eh.y);
                          return (
                            <Group key={eh.id}>
                              <Circle cx={s.sx} cy={s.sy} r={5.5} color="#fff" />
                              <Circle cx={s.sx} cy={s.sy} r={5.5} color={colors.accent} style="stroke" strokeWidth={2} />
                            </Group>
                          );
                        })}
                        {/* center move handle */}
                        <Circle cx={center.sx} cy={center.sy} r={6} color="#fff" />
                        <Circle cx={center.sx} cy={center.sy} r={6} color={colors.accent} style="stroke" strokeWidth={2} />
                        <Circle cx={center.sx} cy={center.sy} r={2.4} color={colors.accent} />
                        {/* corner handles — 4-way arrow, drag to reshape one corner */}
                        {ph.verts.map((v) => {
                          const s = planToScreen(v.x, v.y);
                          return (
                            <Group key={v.id}>
                              <Circle cx={s.sx} cy={s.sy} r={11} color="#fff" />
                              <Circle cx={s.sx} cy={s.sy} r={11} color={colors.accent} style="stroke" strokeWidth={2} />
                              <Path path={fourArrowPath(s.sx, s.sy, 6)} color={colors.accent} style="stroke" strokeWidth={1.6} strokeCap="round" strokeJoin="round" />
                            </Group>
                          );
                        })}
                      </Group>
                    );
                  })()
                : null}

              {/* Double-tapped wall/side highlight — a single stroke over just that
                  segment, so "Delete Wall" is obviously scoped to one side. */}
              {selectedSide
                ? (() => {
                    let a = null;
                    let b = null;
                    if (selectedSide.kind === 'polygon' && selected) {
                      const pts = structureLocalPoints(selected) || [];
                      const p0 = pts[selectedSide.edgeIndex];
                      const p1 = pts[(selectedSide.edgeIndex + 1) % pts.length];
                      if (p0 && p1) {
                        a = structureWorld(selected, p0.x, p0.y);
                        b = structureWorld(selected, p1.x, p1.y);
                      }
                    } else if (selectedSide.kind === 'wall') {
                      const w = plan.walls.find((x) => x.id === selectedSide.wallId);
                      if (w) {
                        a = { x: w.x1, y: w.y1 };
                        b = { x: w.x2, y: w.y2 };
                      }
                    }
                    if (!a || !b) return null;
                    const sa = planToScreen(a.x, a.y);
                    const sb = planToScreen(b.x, b.y);
                    const hl = Skia.Path.Make();
                    hl.moveTo(sa.sx, sa.sy);
                    hl.lineTo(sb.sx, sb.sy);
                    return <Path path={hl} color={colors.danger} style="stroke" strokeWidth={6} strokeCap="round" />;
                  })()
                : null}

              {selected && !isPolygonStructure(selected)
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
                        <Path path={box} color={colors.accent} style="stroke" strokeWidth={1.5}>
                          <DashPathEffect intervals={[2, 4]} />
                        </Path>
                        <Path path={link} color={colors.accent} style="stroke" strokeWidth={1.5} />
                        <Circle cx={rot.sx} cy={rot.sy} r={10} color="#fff" />
                        <Circle cx={rot.sx} cy={rot.sy} r={10} color={colors.accent} style="stroke" strokeWidth={2} />
                        {/* 9 dotted handles: 4 corners + 4 edge mids (resize) + center (move) */}
                        {pts.map((p) => (
                          <Group key={p.id}>
                            <Circle cx={p.sx} cy={p.sy} r={5.5} color="#fff" />
                            <Circle cx={p.sx} cy={p.sy} r={5.5} color={colors.accent} style="stroke" strokeWidth={2} />
                            {p.id === 'c' ? <Circle cx={p.sx} cy={p.sy} r={2.4} color={colors.accent} /> : null}
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

              {/* freehand custom-shape draft (live, drawn while dragging) */}
              {freeDraw && freeDraw.length > 1
                ? (() => {
                    const path = Skia.Path.Make();
                    freeDraw.forEach((pt, i) => {
                      const s = planToScreen(pt.x, pt.y);
                      if (i === 0) path.moveTo(s.sx, s.sy);
                      else path.lineTo(s.sx, s.sy);
                    });
                    return (
                      <Path path={path} color={colors.accent} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
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

      {/* Text overlays (labels + dimensions + measurement) */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {(plan.texts || []).map((t) => {
          const s = planToScreen(t.x, t.y);
          const fontSize = Math.max(9, (t.size || 0.5) * ppm * zoom);
          const isSel = t.id === selectedTextId;
          return (
            <View
              key={t.id}
              style={{
                position: 'absolute',
                left: s.sx - 150,
                top: s.sy - fontSize * 0.75,
                width: 300,
                alignItems: 'center',
                transform: [{ rotate: `${t.rotation || 0}deg` }],
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize,
                  fontWeight: '800',
                  color: colors.ink,
                  ...(isSel
                    ? {
                        paddingHorizontal: 6,
                        borderRadius: 6,
                        borderWidth: 1.5,
                        borderColor: colors.accent,
                        backgroundColor: isDark ? 'rgba(188,91,58,0.18)' : 'rgba(188,91,58,0.12)',
                      }
                    : null),
                }}
              >
                {t.text || ' '}
              </Text>
            </View>
          );
        })}
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

        {/* Overall boundary totals — width centered on the top line, length on
            the left line, so the running plan size is always visible. */}
        {overallDims ? (
          <>
            <View
              style={{
                position: 'absolute',
                left: (overallDims.x1 + overallDims.x2) / 2 - 40,
                top: overallDims.topY - 22,
                width: 80,
                alignItems: 'center',
              }}
            >
              <View style={{ backgroundColor: isDark ? '#221C16' : '#FFFFFF', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink }}>{overallDims.widthText}</Text>
              </View>
            </View>
            <View
              style={{
                position: 'absolute',
                left: overallDims.leftX - 78,
                top: (overallDims.y1 + overallDims.y2) / 2 - 11,
                width: 72,
                alignItems: 'flex-end',
              }}
            >
              <View style={{ backgroundColor: isDark ? '#221C16' : '#FFFFFF', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink }}>{overallDims.heightText}</Text>
              </View>
            </View>
          </>
        ) : null}
        {/* Structure area labels — centered on each structure item, visible only
            while the Measure tool is active so they don't clutter the canvas
            during normal editing. */}
        {structureAreaLabels.map((lbl) => (
          <View
            key={lbl.id}
            style={{
              position: 'absolute',
              left: lbl.sx - 52,
              top: lbl.sy - 14,
              width: 104,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? 'rgba(20,14,10,0.88)' : 'rgba(255,255,255,0.93)',
                borderWidth: 1.5,
                borderColor: colors.accent,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 9,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accent }}>{lbl.text}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Header — back · editable project name · floors / all-tools menu */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 8,
          gap: 8,
        }}
      >
        <IconButton icon="chevron-left" onPress={() => navigation.goBack()} />
        {/* Project name — tap to edit inline */}
        <View style={{ flex: 1 }}>
          {editingName ? (
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onBlur={commitNameEdit}
              onSubmitEditing={commitNameEdit}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              placeholder="Project name"
              placeholderTextColor={colors.ink3}
              style={{
                fontSize: 16,
                fontFamily: 'Manrope_700Bold',
                color: colors.ink,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.accent,
                backgroundColor: colors.surface,
              }}
            />
          ) : (
            <Pressable
              onPress={startNameEdit}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
            >
              <Text variant="titleSm" numberOfLines={1} style={{ flexShrink: 1 }}>
                {project?.name || 'Untitled'}
              </Text>
              <Icon name="pencil" size={13} color={colors.ink3} strokeWidth={2} />
            </Pressable>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <FloorsButton
            count={project?.floors?.length || 1}
            onPress={() => floorSheetRef.current?.present()}
          />
          <IconButton icon="menu" onPress={() => setDrawerOpen(true)} />
        </View>
      </View>

      {/* Contextual action bar — the upper of the two footer lists. Appears when
          any element is selected; its actions adapt to the selection type. */}
      {(() => {
        if (!selected && !selectedRoom && !selectedText && !selectedSide) return null;

        let title = '';
        let caption = '';
        let actions = [];

        if (selectedSide) {
          title = 'Wall';
          let len = 0;
          if (selectedSide.kind === 'polygon' && selected) {
            const pts = structureLocalPoints(selected) || [];
            const a = pts[selectedSide.edgeIndex];
            const b = pts[(selectedSide.edgeIndex + 1) % pts.length];
            if (a && b) len = Math.hypot(b.x - a.x, b.y - a.y);
          } else if (selectedSide.kind === 'wall') {
            const w = plan.walls.find((x) => x.id === selectedSide.wallId);
            if (w) len = wallLength(w);
          }
          caption = `${formatLength(len, unit)} · double-tapped side`;
          actions = [
            { icon: 'trash', label: 'Delete Wall', onPress: deleteSelectedSide, danger: true },
            { icon: 'close', label: 'Deselect', onPress: () => setSelectedSide(null) },
          ];
        } else if (selected) {
          const d = itemDims(selected);
          title = selected.name;
          caption = `${formatLength(d.w, unit)} × ${formatLength(d.d, unit)} · ${selected.rotation}°`;
          actions = [
            { icon: 'ruler', label: 'Measure', onPress: () => openSheet('measure') },
            { icon: 'palette', label: 'Colors', onPress: () => openSheet('style') },
            { icon: 'rotate', label: 'Rotate', onPress: rotateSelected90 },
            { icon: 'duplicate', label: 'Clone', onPress: duplicateSelected },
            { icon: 'mirror', label: 'Mirror', onPress: mirrorSelected },
            { icon: 'trash', label: 'Delete', onPress: deleteSelected, danger: true },
          ];
        } else if (selectedRoom) {
          title = 'Room';
          caption = `${formatLength(selectedRoom.w, unit)} × ${formatLength(selectedRoom.h, unit)}`;
          actions = [
            { icon: 'ruler', label: 'Measures', onPress: () => roomSheetRef.current?.present() },
            { icon: 'palette', label: 'Colors', onPress: () => roomSheetRef.current?.present() },
            { icon: 'duplicate', label: 'Clone', onPress: duplicateSelectedRoom },
            { icon: 'mirror', label: 'Mirror', onPress: mirrorSelectedRoom },
            { icon: 'trash', label: 'Delete', onPress: deleteSelectedRoom, danger: true },
          ];
        } else if (selectedText) {
          title = selectedText.text || 'Text label';
          caption = 'Text label';
          actions = [
            { icon: 'pencil', label: 'Edit', onPress: () => textSheetRef.current?.present() },
            { icon: 'rotate', label: 'Rotate', onPress: rotateSelectedText90 },
            { icon: 'duplicate', label: 'Clone', onPress: duplicateSelectedText },
            { icon: 'trash', label: 'Delete', onPress: deleteSelectedText, danger: true },
          ];
        }

        return (
          <View
            style={[
              {
                position: 'absolute',
                bottom: footerH + 12,
                left: 12,
                right: 12,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.line,
                paddingVertical: 8,
              },
              shadows.e3,
            ]}
          >
            <View style={{ paddingHorizontal: 14, paddingBottom: 6 }}>
              <Text variant="titleSm" numberOfLines={1}>
                {title}
              </Text>
              <Text variant="caption" color="ink3" numberOfLines={1}>
                {caption}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10, gap: 8, alignItems: 'center' }}
            >
              {actions.map((a) => (
                <ActionPill key={a.label} icon={a.icon} label={a.label} danger={a.danger} onPress={a.onPress} />
              ))}
            </ScrollView>
          </View>
        );
      })()}

      {/* Freehand custom-shape instruction banner — Select tool in the footer
          cancels back out at any point before a drag starts. */}
      {tool === 'freedraw' ? (
        <View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: insets.top + 8,
              alignSelf: 'center',
              paddingHorizontal: 14,
              height: 34,
              borderRadius: 17,
              backgroundColor: colors.ink,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            },
            shadows.e3,
          ]}
        >
          <Icon name="pencil" size={13} color={colors.bg} strokeWidth={2.2} />
          <Text style={{ color: colors.bg, fontFamily: 'Manrope_600SemiBold', fontSize: 12.5 }}>
            Drag to sketch a room outline
          </Text>
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

      {/* Footer — 3D pinned right (always visible); tools, toggles & actions scroll */}
      <View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
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
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 6, gap: 6, alignItems: 'center' }}
        >
          {/* Undo / redo lead the footer (dimmed when nothing to step through) */}
          <FooterButton icon="undo" label="Undo" disabled={!history.current.past.length} onPress={undo} />
          <FooterButton icon="redo" label="Redo" disabled={!history.current.future.length} onPress={redo} />
          <FooterDivider color={colors.line} />
          {EDITOR_TOOLS.map((t) => (
            <FooterButton
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={tool === t.id}
              onPress={() => setTool(t.id)}
            />
          ))}
          <FooterButton icon="settings" label="Settings" onPress={() => navigation.navigate(ROUTES.settings)} />
          <FooterDivider color={colors.line} />
          <FooterButton icon="magnet" label="Snap" active={snapOn} onPress={() => setSnapOn((s) => !s)} />
          <FooterButton icon="ruler" label="Dims" active={showDims} onPress={() => setShowDims((s) => !s)} />
          <FooterButton icon="palette" label="Style" onPress={() => styleSheetRef.current?.present()} />
          <FooterButton icon="building" label="Estimate" onPress={() => navigation.navigate(ROUTES.estimate)} />
        </ScrollView>
        {/* Fixed 3D button — one of the primary features, never scrolls away */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 12 }}>
          <FooterDivider color={colors.line} />
          <FooterButton icon="cube" label="3D" accent onPress={() => navigation.navigate(ROUTES.view3d)} />
        </View>
      </View>

      {/* Sidebar — compact quick-add catalog (opens from header menu / Add).
          Rows can be tapped (drop at center) or dragged onto the canvas. */}
      <CatalogDrawer
        visible={drawerOpen}
        initialCategory={drawerCategory}
        onClose={() => setDrawerOpen(false)}
        onAdd={addItem}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        dragActive={!!dragGhost}
        onActivateFreeDraw={() => {
          setDrawerOpen(false);
          setTool('freedraw');
        }}
        onViewDetails={(category) => {
          setDrawerOpen(false);
          navigation.navigate(ROUTES.catalog, { category });
        }}
      />

      {/* Drag-to-place ghost — just the tool shape following the finger (no card
          or border). Non-interactive so it never eats the underlying gesture. */}
      {dragGhost ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: dragGhost.x - canvasFrameRef.current.x - 33,
            top: dragGhost.y - canvasFrameRef.current.y - 33,
            width: 66,
            height: 66,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FurnitureGlyph kind={dragGhost.item.kind} catalogId={dragGhost.item.id} size={62} color={dragGhost.item.colors?.[0]} />
        </View>
      ) : null}

      <ItemPlacementSheet
        ref={sheetRef}
        item={selected}
        tab={itemTab}
        onTabChange={setItemTab}
        wallHeight={plan?.wallHeight ?? 2.6}
        onChange={patchSelected}
        onDuplicate={duplicateSelected}
        onDelete={() => {
          deleteSelected();
          sheetRef.current?.dismiss();
        }}
        onDone={() => sheetRef.current?.dismiss()}
      />
      <RoomSettingsSheet
        ref={roomSheetRef}
        room={selectedRoom}
        onResize={resizeSelectedRoom}
        onWallThickness={setSelectedWallThickness}
        onColor={setSelectedRoomColor}
        onDuplicate={() => {
          duplicateSelectedRoom();
          roomSheetRef.current?.dismiss();
        }}
        onDelete={() => {
          deleteSelectedRoom();
          roomSheetRef.current?.dismiss();
        }}
        onDone={() => roomSheetRef.current?.dismiss()}
      />
      <TextSettingsSheet
        ref={textSheetRef}
        element={selectedText}
        onChange={patchSelectedText}
        onDuplicate={() => {
          duplicateSelectedText();
          textSheetRef.current?.dismiss();
        }}
        onDelete={() => {
          deleteSelectedText();
          textSheetRef.current?.dismiss();
        }}
        onDone={() => textSheetRef.current?.dismiss()}
      />
      <AiSummarySheet
        ref={aiSummarySheetRef}
        summary={aiSummary}
        onRegenerate={() => {
          aiSummarySheetRef.current?.dismiss();
          navigation.navigate(ROUTES.aiWizard);
        }}
        onDone={() => aiSummarySheetRef.current?.dismiss()}
      />
      <RoomStyleSheet
        ref={styleSheetRef}
        plan={plan}
        onFloor={(id) => applyCommit((p) => setMaterials(p, { floor: id }))}
        onWall={(hex) => applyCommit((p) => setMaterials(p, { wall: hex }))}
        onWallMaterial={(id) => applyCommit((p) => setMaterials(p, { wallMaterial: id }))}
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

// A compact 4-directional arrow glyph (screen space) drawn inside a corner
// handle so it reads as "drag me in any direction to reshape this corner".
function fourArrowPath(cx, cy, a) {
  const p = Skia.Path.Make();
  const hd = a * 0.5; // arrowhead size
  p.moveTo(cx - a, cy);
  p.lineTo(cx + a, cy);
  p.moveTo(cx, cy - a);
  p.lineTo(cx, cy + a);
  // heads: left, right, up, down
  p.moveTo(cx - a + hd, cy - hd);
  p.lineTo(cx - a, cy);
  p.lineTo(cx - a + hd, cy + hd);
  p.moveTo(cx + a - hd, cy - hd);
  p.lineTo(cx + a, cy);
  p.lineTo(cx + a - hd, cy + hd);
  p.moveTo(cx - hd, cy - a + hd);
  p.lineTo(cx, cy - a);
  p.lineTo(cx + hd, cy - a + hd);
  p.moveTo(cx - hd, cy + a - hd);
  p.lineTo(cx, cy + a);
  p.lineTo(cx + hd, cy + a - hd);
  return p;
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

// A footer tool/action pill: icon over a tiny label, highlighted when active,
// dimmed and unpressable when disabled.
function FooterButton({ icon, label, active, accent, disabled, onPress }) {
  const { colors, radius } = useTheme();
  const bg = accent ? colors.accent : active ? colors.accentSoft : 'transparent';
  const fg = disabled ? colors.ink3 : accent ? '#fff' : active ? colors.accent : colors.ink2;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        minWidth: 56,
        height: 48,
        paddingHorizontal: 10,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        opacity: disabled ? 0.4 : 1,
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

// A pill in the contextual action bar: icon over a small label.
function ActionPill({ icon, label, danger, onPress }) {
  const { colors, radius, isDark } = useTheme();
  const bg = danger ? (isDark ? '#3A2420' : '#FDECEA') : colors.surface2;
  const fg = danger ? colors.dangerDark : colors.ink2;
  return (
    <Pressable
      onPress={onPress}
      style={{
        minWidth: 62,
        height: 52,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <Icon name={icon} size={18} color={fg} strokeWidth={2} />
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}
