import { View, Text as RNText } from 'react-native';
import { Canvas, Group, Rect, Path, Skia } from '@shopify/react-native-skia';

import FurnitureShape from './FurnitureShape';
import { structureEls } from './structureShapes';
import { useTheme } from '@/theme/useTheme';
import {
  roomGroups,
  itemWallOpenings,
  wallLength,
  pointAlongWall,
  itemDims,
  isPolygonStructure,
  structureLocalPoints,
} from '@/domain/floorplan';
import { formatLength } from '@/domain/units';
import { floorMaterialById } from '@/data/materials';

// World-space AABB of a placed item's footprint.
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
// outline in the plan.
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

// Static, read-only rendering of a floor plan — the same Skia geometry (floor,
// grid, room tints, walls, openings, furniture/structure shells) and the same
// dimension-label overlay the live 2D editor (FloorPlanEditorScreen) draws,
// factored out so export (PNG/PDF capture) shows the exact same styled map
// instead of a separate, lower-fidelity reimplementation.
//
// No gestures, no selection, no drag/measure state — just the plan as it looks
// in the editor at rest.
export default function PlanRenderer({ plan, width, height, unit, showDims = true, showGrid = true, style }) {
  const { colors, isDark } = useTheme();
  if (!plan) return null;

  const floorMat = floorMaterialById(plan?.materials?.floor);
  const wallStrokeColor = isDark ? '#4A4034' : '#7C6A55';
  const bg = isDark ? '#161310' : '#F0EBE2';

  const margin = Math.max(28, Math.min(width, height) * 0.1);
  const ppm = Math.max(
    1,
    Math.min((width - margin * 2) / Math.max(plan.width, 0.1), (height - margin * 2) / Math.max(plan.length, 0.1))
  );
  const offset = {
    x: (width - plan.width * ppm) / 2,
    y: (height - plan.length * ppm) / 2,
  };
  // Scales fixed-pixel UI chrome (label font size, padding) up on a high-res
  // capture so text reads proportionally the same as it does in the editor.
  const scale = Math.max(0.9, Math.min(2.6, width / 380));

  const planToScreen = (x, y) => ({ sx: offset.x + x * ppm, sy: offset.y + y * ppm });

  const gridPath = (() => {
    if (!showGrid) return null;
    const p = Skia.Path.Make();
    const step = 0.25;
    for (let x = -1; x <= plan.width + 1; x += step) {
      for (let y = -1; y <= plan.length + 1; y += step) {
        p.addCircle(x * ppm, y * ppm, 1);
      }
    }
    return p;
  })();

  const floorPath = (() => {
    if (!plan.footprint || plan.footprint.length < 3) return null;
    const p = Skia.Path.Make();
    plan.footprint.forEach((pt, i) => {
      if (i === 0) p.moveTo(pt.x * ppm, pt.y * ppm);
      else p.lineTo(pt.x * ppm, pt.y * ppm);
    });
    p.close();
    return p;
  })();

  const rooms = roomGroups(plan);

  const openings = [
    ...(plan.openings || []),
    ...itemWallOpenings(plan).filter(
      (io) => !plan.openings?.some((o) => o.wallId === io.wallId && Math.abs(o.t - io.t) < 0.05)
    ),
  ];

  const overall = overallBounds(plan);
  let overallDims = null;
  if (overall && overall.w > 0.05 && overall.h > 0.05) {
    const OFF = 20 * scale;
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

  // Per-wall dimension labels, kept legible at any output size by (a) skipping
  // a wall too short on screen to hold its own label and (b) greedily dropping
  // any label that would overlap one already placed — the crowded stack of
  // numbers a dense floor plan produces otherwise. Longer walls (the ones a
  // reader actually cares about) claim space first.
  const DIM_FONT = 10 * scale;
  const labelBox = (cx, cy, text) => {
    const w = text.length * DIM_FONT * 0.62 + 12 * scale;
    const h = DIM_FONT + 8 * scale;
    return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, w, h };
  };
  const overlaps = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  const placedBoxes = [];
  if (overallDims) {
    placedBoxes.push(labelBox((overallDims.x1 + overallDims.x2) / 2, overallDims.topY, overallDims.widthText));
    placedBoxes.push(labelBox(overallDims.leftX, (overallDims.y1 + overallDims.y2) / 2, overallDims.heightText));
  }
  const dimLabels = [];
  if (showDims) {
    const candidates = plan.walls
      .map((w) => {
        const mid = planToScreen((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2);
        return { id: w.id, ...mid, text: formatLength(wallLength(w), unit), pxLen: wallLength(w) * ppm };
      })
      .sort((a, b) => b.pxLen - a.pxLen);
    for (const c of candidates) {
      const box = labelBox(c.sx, c.sy, c.text);
      if (box.w > c.pxLen * 1.1) continue; // wall too short on screen for its own label
      if (placedBoxes.some((p) => overlaps(p, box))) continue;
      placedBoxes.push(box);
      dimLabels.push(c);
    }
  }

  return (
    <View style={[{ width, height, backgroundColor: bg, overflow: 'hidden' }, style]}>
      <Canvas style={{ width, height }}>
        <Group transform={[{ translateX: offset.x }, { translateY: offset.y }]}>
          {floorPath ? (
            <Path path={floorPath} color={floorMat.c2d} />
          ) : plan.walls.some((w) => w.perimeter) ? (
            <Rect x={0} y={0} width={plan.width * ppm} height={plan.length * ppm} color={floorMat.c2d} />
          ) : null}
          {gridPath ? <Path path={gridPath} color={isDark ? '#2E2A24' : '#D8CFC0'} /> : null}

          {rooms.map((rm) => {
            const tint = rm.walls.find((w) => w.color)?.color;
            if (!tint) return null;
            return <Rect key={`room-${rm.id}`} x={rm.x * ppm} y={rm.y * ppm} width={rm.w * ppm} height={rm.h * ppm} color={tint} opacity={0.5} />;
          })}

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

          {openings.map((o) => {
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

          {plan.furniture.map((f) => {
            const dims = itemDims(f);
            const w = dims.w * ppm;
            const d = dims.d * ppm;
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
                {f.structure ? structureEls(f, w, d, { wallStrokeColor, colors, isDark, floorMat, ppm }) : <FurnitureShape f={f} w={w} d={d} />}
              </Group>
            );
          })}
        </Group>
      </Canvas>

      {/* Text overlays (labels + dimensions), matching the editor's overlay styling */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {(plan.texts || []).map((t) => {
          const s = planToScreen(t.x, t.y);
          const fontSize = Math.max(9, (t.size || 0.5) * ppm);
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
              <RNText numberOfLines={1} style={{ fontSize, fontWeight: '800', color: colors.ink }}>
                {t.text || ' '}
              </RNText>
            </View>
          );
        })}
        {dimLabels.map((l) => (
          <View
            key={l.id}
            style={{
              position: 'absolute',
              left: l.sx - 26 * scale,
              top: l.sy - 9 * scale,
              backgroundColor: isDark ? 'rgba(20,18,15,0.88)' : 'rgba(255,255,255,0.94)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.lineSoft,
              paddingHorizontal: 6 * scale,
              paddingVertical: 2 * scale,
              borderRadius: 6,
            }}
          >
            <RNText style={{ fontSize: DIM_FONT, fontWeight: '700', color: colors.ink2 }}>{l.text}</RNText>
          </View>
        ))}
        {overallDims ? (
          <>
            <View
              style={{
                position: 'absolute',
                left: (overallDims.x1 + overallDims.x2) / 2 - 40 * scale,
                top: overallDims.topY - 22 * scale,
                width: 80 * scale,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? '#221C16' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: colors.line,
                  paddingHorizontal: 8 * scale,
                  paddingVertical: 2 * scale,
                  borderRadius: 7,
                }}
              >
                <RNText style={{ fontSize: 11 * scale, fontWeight: '800', color: colors.ink }}>{overallDims.widthText}</RNText>
              </View>
            </View>
            <View
              style={{
                position: 'absolute',
                left: overallDims.leftX - 78 * scale,
                top: (overallDims.y1 + overallDims.y2) / 2 - 11 * scale,
                width: 72 * scale,
                alignItems: 'flex-end',
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? '#221C16' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: colors.line,
                  paddingHorizontal: 8 * scale,
                  paddingVertical: 2 * scale,
                  borderRadius: 7,
                }}
              >
                <RNText style={{ fontSize: 11 * scale, fontWeight: '800', color: colors.ink }}>{overallDims.heightText}</RNText>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
