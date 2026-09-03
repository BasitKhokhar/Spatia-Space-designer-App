import { Rect, RoundedRect, Path, Circle, Skia } from '@shopify/react-native-skia';

import { shapePolygon } from '@/data/structure';
import { structureLocalPoints } from '@/domain/floorplan';

// Skia elements for a placed structure/opening shell, drawn in the item's local
// frame (origin = center) at the given pixel footprint. Rooms fill grey + stroke
// walls; stairs draw treads; columns/walls fill; doors/windows draw leaves/panes.
//
// Shared between the live 2D editor (FloorPlanEditorScreen) and the static
// export renderer (PlanRenderer) so both draw structures identically — the ctx
// carries the small bits of surrounding state (theme, floor color, scale) that
// used to come from component closure.
export function structureEls(f, wPx, dPx, ctx) {
  const { wallStrokeColor: stroke, colors, isDark, floorMat, ppm } = ctx;
  const shape = f.shape || {};
  const fill = f.color || '#B9B2A6';
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
}
