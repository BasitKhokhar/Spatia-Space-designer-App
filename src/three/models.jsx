import { Component, Suspense, memo, useMemo } from 'react';
import { Shape, DoubleSide } from 'three';

import { ModelItem } from './ModelItem';
import { modelFor } from './modelRegistry';
import { SHADOW_GEO, SHADOW_MAT, SHADOW_SPREAD, castsContactShadow } from './contactShadow';
import { boxGeo, coneGeo, cylGeo, shapeGeo, sphereGeo, torusGeo } from './geometry';
import { getMaterial } from './materials/library';
import { tileOf } from './materials/manifest';
import { itemDims, wallHit, pointAlongWall } from '@/domain/floorplan';
import { shapePolygon } from '@/data/structure';
import { pc } from '@/data/itemEditor';

// ---------------------------------------------------------------------------
// Procedural 3D models for placed items. Every builder draws in the item's local
// frame: origin at the floor, +x = width, +z = depth, +y = up. The <PlacedItem>
// wrapper handles world placement + rotation, so builders only shape geometry.
// This replaces the old single-box render with realistic, multi-part meshes
// (car bodies + wheels, trees, sofas, beds, structural room shells, stairs,
// doors, windows…) for a construction-grade 3D view.
// ---------------------------------------------------------------------------

// Part-color helpers derived from a base tint.
const shade = (hex, f) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(Math.min(255, Math.max(0, ((n >> 16) & 255) * f)));
  const g = Math.round(Math.min(255, Math.max(0, ((n >> 8) & 255) * f)));
  const b = Math.round(Math.min(255, Math.max(0, (n & 255) * f)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const WOOD = '#8A6250';
const WOOD_DK = '#6E5240';
const METAL = '#9AA0A6';
const METAL_DK = '#5A5F64';
const GLASS = '#9fc4dc';
const TIRE = '#1A1A1D';
const LEAF = '#4E7C59';
const LEAF_DK = '#3E5B45';
const TRUNK = '#6E5240';

// ---- primitives -----------------------------------------------------------
//
// All three take an optional `mat` — a key into MATERIAL_DEFS (manifest.js) that
// supplies a texture, roughness and metalness. It defaults to 'paint' (flat, no
// texture), which reproduces the original untextured look, so a builder only
// needs updating where a real finish actually helps.
//
// RULE: no builder below may inline <boxGeometry> or <meshStandardMaterial> again.
// Both are now pulled from module-level caches — that is what keeps the scene at
// a few dozen shader programs instead of a few hundred, and it is the difference
// between the 3D view opening instantly and stalling for seconds.

function Box({
  w, h, d, x = 0, y = 0, z = 0,
  color, mat = 'paint', rough, metal, ry = 0, rot, transparent, opacity,
  emissive, emissiveIntensity, side,
  // Glass panes and similar opt out of shadow casting: a translucent pane throws
  // a fully opaque shadow, which reads as a dark smear on whatever is behind it.
  cast = true, receive = true,
}) {
  // Only fall back to the primitive's historical roughness for untextured paint;
  // a named material must be allowed to supply its own.
  const effRough = rough ?? (mat === 'paint' ? 0.85 : undefined);
  return (
    <mesh
      position={[x, y, z]}
      rotation={rot || [0, ry, 0]}
      castShadow={cast}
      receiveShadow={receive}
      geometry={boxGeo(w, h, d, tileOf(mat))}
      material={getMaterial({
        id: mat,
        color,
        rough: effRough,
        metal,
        opacity: transparent && opacity == null ? 0.5 : opacity,
        emissive,
        emissiveIntensity,
        side,
      })}
    />
  );
}

function Cyl({
  r, rTop, rBot, h, x = 0, y = 0, z = 0,
  color, mat = 'paint', rough, metal, seg = 20, rot = [0, 0, 0],
  transparent, opacity, emissive, emissiveIntensity,
  cast = true, receive = true,
}) {
  const effRough = rough ?? (mat === 'paint' ? 0.7 : undefined);
  return (
    <mesh
      position={[x, y, z]}
      rotation={rot}
      castShadow={cast}
      receiveShadow={receive}
      geometry={cylGeo(rTop ?? r, rBot ?? r, h, seg)}
      material={getMaterial({
        id: mat,
        color,
        rough: effRough,
        metal,
        opacity: transparent && opacity == null ? 0.5 : opacity,
        emissive,
        emissiveIntensity,
      })}
    />
  );
}

// Lampshades. `open` drops the end cap so you can see up inside the shade, which
// is why these need DoubleSide.
function Cone({
  r, h, x = 0, y = 0, z = 0, seg = 24, open = false, rot,
  color, mat = 'paint', rough, emissive, emissiveIntensity, side,
}) {
  const effRough = rough ?? (mat === 'paint' ? 0.6 : undefined);
  return (
    <mesh
      position={[x, y, z]}
      {...(rot ? { rotation: rot } : null)}
      castShadow
      geometry={coneGeo(r, h, seg, open)}
      material={getMaterial({
        id: mat,
        color,
        rough: effRough,
        emissive,
        emissiveIntensity,
        side: side ?? (open ? DoubleSide : undefined),
      })}
    />
  );
}

// Hanging rails and hoops. `arc` renders a partial ring (e.g. a basket handle).
function Torus({
  r, tube, x = 0, y = 0, z = 0, radialSeg = 8, tubularSeg = 24, arc, rot,
  color, mat = 'paint', rough, metal, cast = true, receive = false,
}) {
  const effRough = rough ?? (mat === 'paint' ? 0.4 : undefined);
  return (
    <mesh
      position={[x, y, z]}
      {...(rot ? { rotation: rot } : null)}
      castShadow={cast}
      receiveShadow={receive}
      geometry={torusGeo(r, tube, radialSeg, tubularSeg, arc)}
      material={getMaterial({ id: mat, color, rough: effRough, metal })}
    />
  );
}

function Ball({ r, x = 0, y = 0, z = 0, color, mat = 'paint', rough, emissive, emissiveIntensity }) {
  const effRough = rough ?? (mat === 'paint' ? 0.9 : undefined);
  return (
    <mesh
      position={[x, y, z]}
      castShadow
      receiveShadow
      geometry={sphereGeo(r, 18, 14)}
      material={getMaterial({ id: mat, color, rough: effRough, emissive, emissiveIntensity })}
    />
  );
}

// Four legs at the corners of a w×d top, from floor to `top`.
function Legs({ w, d, top, r = 0.03, color = WOOD_DK, inset = 0.12 }) {
  const ix = (w / 2) * (1 - inset);
  const iz = (d / 2) * (1 - inset);
  const y = top / 2;
  return (
    <>
      <Cyl r={r} h={top} x={ix} y={y} z={iz} color={color} />
      <Cyl r={r} h={top} x={-ix} y={y} z={iz} color={color} />
      <Cyl r={r} h={top} x={ix} y={y} z={-iz} color={color} />
      <Cyl r={r} h={top} x={-ix} y={y} z={-iz} color={color} />
    </>
  );
}

// ---- furniture builders ---------------------------------------------------

function Sofa({ w, d, h, color, parts }) {
  const seatH = h * 0.42;
  const body = pc(parts, 'body', color);
  const base = pc(parts, 'base', shade(color, 0.9));
  return (
    <>
      <Box w={w} h={seatH} d={d * 0.96} y={seatH / 2} mat="fabric" color={base} />
      {/* seat cushions */}
      <Box w={w * 0.9} h={h * 0.14} d={d * 0.7} y={seatH + h * 0.06} z={d * 0.08} mat="fabric" color={body} />
      {/* backrest */}
      <Box w={w} h={h * 0.55} d={d * 0.2} y={h * 0.5} z={-d * 0.4} mat="fabric" color={body} />
      {/* arms */}
      <Box w={w * 0.12} h={h * 0.5} d={d * 0.96} x={w * 0.44} y={h * 0.3} mat="fabric" color={body} />
      <Box w={w * 0.12} h={h * 0.5} d={d * 0.96} x={-w * 0.44} y={h * 0.3} mat="fabric" color={body} />
    </>
  );
}

function Chair({ w, d, h, color }) {
  const seatH = h * 0.45;
  return (
    <>
      <Box w={w * 0.9} h={h * 0.09} d={d * 0.9} y={seatH} mat="wood" color={color} />
      <Box w={w * 0.9} h={h * 0.48} d={d * 0.1} y={seatH + h * 0.26} z={-d * 0.4} mat="wood" color={color} />
      <Legs w={w * 0.9} d={d * 0.9} top={seatH} r={Math.min(w, d) * 0.05} color={shade(color, 0.7)} />
    </>
  );
}

function Stool({ w, d, h, color }) {
  const seatH = h * 0.9;
  return (
    <>
      <Cyl r={Math.min(w, d) * 0.45} h={h * 0.1} y={seatH} color={color} />
      <Legs w={w * 0.8} d={d * 0.8} top={seatH} r={0.02} color={METAL_DK} />
    </>
  );
}

function TableLike({ w, d, h, color }) {
  const topH = h * 0.08;
  return (
    <>
      <Box w={w} h={topH} d={d} y={h - topH / 2} mat="wood" color={color} />
      <Legs w={w} d={d} top={h - topH} r={Math.min(w, d) * 0.04} color={shade(color, 0.7)} />
    </>
  );
}

function RoundTable({ w, d, h, color }) {
  const topH = h * 0.07;
  const r = Math.min(w, d) / 2;
  return (
    <>
      <Cyl r={r} h={topH} y={h - topH / 2} mat="wood" color={color} />
      <Cyl r={r * 0.12} h={h - topH} y={(h - topH) / 2} color={shade(color, 0.7)} />
      <Cyl r={r * 0.35} h={h * 0.04} y={h * 0.02} color={shade(color, 0.6)} />
    </>
  );
}

function Desk({ w, d, h, color }) {
  const topH = h * 0.08;
  return (
    <>
      <Box w={w} h={topH} d={d} y={h - topH / 2} mat="wood" color={color} />
      {/* drawer pedestal */}
      <Box w={w * 0.3} h={h * 0.8} d={d * 0.9} x={w * 0.3} y={h * 0.4} mat="wood" color={shade(color, 0.9)} />
      <Cyl r={0.03} h={h - topH} x={-w * 0.42} y={(h - topH) / 2} z={d * 0.4} color={shade(color, 0.7)} />
      <Cyl r={0.03} h={h - topH} x={-w * 0.42} y={(h - topH) / 2} z={-d * 0.4} color={shade(color, 0.7)} />
    </>
  );
}

function Bed({ w, d, h, color, parts }) {
  const baseH = h * 0.3;
  const headboard = pc(parts, 'headboard', color);
  const base = pc(parts, 'base', WOOD);
  const mattress = pc(parts, 'bedding', shade(color, 1.05));
  const pillow = pc(parts, 'bedding', '#F4F1EA');
  return (
    <>
      {/* base / frame */}
      <Box w={w} h={baseH} d={d} y={baseH / 2} mat="wood" color={base} />
      {/* mattress */}
      <Box w={w * 0.96} h={h * 0.16} d={d * 0.9} y={baseH + h * 0.08} z={d * 0.03} mat="fabric" color={mattress} />
      {/* headboard */}
      <Box w={w} h={h * 0.55} d={d * 0.06} y={h * 0.42} z={-d * 0.47} mat="fabric" color={headboard} />
      {/* pillows */}
      <Box w={w * 0.4} h={h * 0.1} d={d * 0.16} x={-w * 0.22} y={baseH + h * 0.2} z={-d * 0.32} mat="fabric" color={pillow} rough={1} />
      <Box w={w * 0.4} h={h * 0.1} d={d * 0.16} x={w * 0.22} y={baseH + h * 0.2} z={-d * 0.32} mat="fabric" color={pillow} rough={1} />
    </>
  );
}

function ShelfUnit({ w, d, h, color }) {
  const t = Math.min(0.04, h * 0.04);
  const shelves = Math.max(2, Math.round(h / 0.4));
  const parts = [];
  parts.push(<Box key="bk" w={w} h={h} d={t} y={h / 2} z={-d / 2 + t / 2} mat="wood" color={shade(color, 0.85)} />);
  parts.push(<Box key="l" w={t} h={h} d={d} x={-w / 2 + t / 2} y={h / 2} mat="wood" color={color} />);
  parts.push(<Box key="r" w={t} h={h} d={d} x={w / 2 - t / 2} y={h / 2} mat="wood" color={color} />);
  for (let i = 0; i <= shelves; i++) {
    parts.push(<Box key={`s${i}`} w={w} h={t} d={d} y={(i / shelves) * h} mat="wood" color={color} />);
  }
  return <>{parts}</>;
}

function Cabinet({ w, d, h, color, parts }) {
  const body = pc(parts, 'body', color);
  const handle = pc(parts, 'handle', METAL_DK);
  return (
    <>
      <Box w={w} h={h} d={d} y={h / 2} mat="wood" color={body} />
      {/* door split + handles */}
      <Box w={0.01} h={h * 0.96} d={0.005} y={h / 2} z={d / 2} color={shade(body, 0.6)} />
      <Cyl r={0.012} h={h * 0.12} x={-w * 0.08} y={h * 0.5} z={d / 2} color={handle} rot={[0, 0, 0]} />
      <Cyl r={0.012} h={h * 0.12} x={w * 0.08} y={h * 0.5} z={d / 2} color={handle} />
    </>
  );
}

function Counter({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.92} d={d} y={h * 0.46} mat="wood" color={color} />
      <Box w={w * 1.02} h={h * 0.08} d={d * 1.04} y={h * 0.96} mat="marble" color={shade(color, 1.1)} rough={0.35} />
    </>
  );
}

function Island({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.9} d={d} y={h * 0.45} mat="wood" color={color} />
      {/* worktop reads as stone — the sharpest visual cue that this is a kitchen */}
      <Box w={w * 1.04} h={h * 0.1} d={d * 1.06} y={h * 0.95} mat="marble" color={shade(color, 1.15)} rough={0.3} />
    </>
  );
}

function Fridge({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.35} metal={0.4} />
      <Box w={0.02} h={h * 0.98} d={0.02} y={h / 2} z={d / 2} color={METAL_DK} />
      <Cyl r={0.02} h={h * 0.3} x={w * 0.35} y={h * 0.7} z={d / 2 + 0.02} color={METAL_DK} />
      <Cyl r={0.02} h={h * 0.3} x={w * 0.35} y={h * 0.28} z={d / 2 + 0.02} color={METAL_DK} />
    </>
  );
}

function Stove({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.95} d={d} y={h * 0.475} color={color} rough={0.4} metal={0.3} />
      <Box w={w * 0.98} h={h * 0.04} d={d * 0.98} y={h * 0.97} color="#2A2A2D" rough={0.3} />
      <Cyl r={w * 0.13} h={0.01} x={-w * 0.22} y={h * 0.99} z={-d * 0.18} color="#3A3A3D" />
      <Cyl r={w * 0.13} h={0.01} x={w * 0.22} y={h * 0.99} z={-d * 0.18} color="#3A3A3D" />
      <Cyl r={w * 0.13} h={0.01} x={-w * 0.22} y={h * 0.99} z={d * 0.18} color="#3A3A3D" />
      <Cyl r={w * 0.13} h={0.01} x={w * 0.22} y={h * 0.99} z={d * 0.18} color="#3A3A3D" />
    </>
  );
}

function Toilet({ w, d, h, color }) {
  return (
    <>
      {/* tank */}
      <Box w={w * 0.9} h={h * 0.5} d={d * 0.22} y={h * 0.4} z={-d * 0.36} color={color} rough={0.35} />
      {/* bowl */}
      <Cyl rTop={w * 0.42} rBot={w * 0.3} h={h * 0.45} y={h * 0.22} z={d * 0.05} color={color} rough={0.3} seg={22} />
      <Cyl r={w * 0.44} h={h * 0.06} y={h * 0.45} z={d * 0.05} color={shade(color, 1.05)} seg={22} />
    </>
  );
}

function Bathtub({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.3} />
      <Box w={w * 0.86} h={h * 0.7} d={d * 0.78} y={h * 0.68} color={GLASS} rough={0.15} transparent opacity={0.5} />
    </>
  );
}

function SinkUnit({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.9} d={d} y={h * 0.45} color={shade(color, 0.95)} />
      <Box w={w} h={h * 0.1} d={d} y={h * 0.94} color={shade(color, 1.1)} rough={0.35} />
      <Cyl r={w * 0.22} h={h * 0.06} y={h * 0.95} color={GLASS} rough={0.2} />
      <Cyl r={0.015} h={h * 0.22} y={h * 1.02} z={-d * 0.28} color={METAL} metal={0.6} />
    </>
  );
}

function Shower({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={0.04} d={d} y={0.02} color={shade(color, 0.9)} />
      <Box w={w} h={h} d={d} y={h / 2} color={GLASS} rough={0.1} transparent opacity={0.24} />
      <Cyl r={0.03} h={h * 0.2} y={h * 0.9} z={-d * 0.4} color={METAL} metal={0.6} />
    </>
  );
}

function Lamp({ w, d, h, color }) {
  const r = Math.min(w, d);
  return (
    <>
      <Cyl r={r * 0.5} h={h * 0.03} y={h * 0.015} color={METAL_DK} />
      <Cyl r={r * 0.06} h={h * 0.8} y={h * 0.4} color={METAL} metal={0.4} />
      <Cone r={r * 0.7} h={h * 0.28} y={h * 0.86} open color={color} rough={0.6} emissive={color} emissiveIntensity={0.25} />
    </>
  );
}

function Pendant({ w, d, h, color }) {
  const r = Math.min(w, d);
  return (
    <>
      <Cyl r={0.006} h={h * 0.5} y={h * 0.75} color={METAL_DK} />
      <Cone r={r * 0.55} h={h * 0.4} y={h * 0.4} color={color} rough={0.5} emissive={color} emissiveIntensity={0.3} />
    </>
  );
}

// Ceiling fan — downrod, motor hub, four pitched blades and a light kit. Sits
// near the ceiling via its MOUNT elevation (itemEditor.js).
function CeilingFan({ w, d, h, color }) {
  const r = Math.min(w, d) / 2;
  const blade = color || WOOD_DK;
  return (
    <>
      <Cyl r={r * 0.05} h={h * 0.5} y={h * 0.75} color={METAL_DK} metal={0.5} />
      <Cyl r={r * 0.22} h={h * 0.38} y={h * 0.5} color={METAL} metal={0.4} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <Box
            key={i}
            w={r * 1.0}
            h={h * 0.05}
            d={r * 0.3}
            x={Math.cos(a) * r * 0.6}
            z={Math.sin(a) * r * 0.6}
            y={h * 0.5}
            ry={a}
            color={blade}
            rough={0.55}
          />
        );
      })}
      <Ball r={r * 0.14} y={h * 0.3} color="#F4ECCB" />
    </>
  );
}

// Pedestal (standing) fan — weighted base, pole, a circular guard and hub.
function PedestalFan({ w, d, h, color }) {
  const r = Math.min(w, d) / 2;
  const head = h * 0.26;
  return (
    <>
      <Cyl r={r * 0.95} h={h * 0.03} y={h * 0.015} color={METAL_DK} />
      <Cyl r={r * 0.12} h={h * 0.72} y={h * 0.4} color={METAL} metal={0.4} />
      <Cyl r={head} h={r * 0.5} y={h * 0.82} rot={[Math.PI / 2, 0, 0]} color={color} rough={0.5} seg={24} />
      <Ball r={head * 0.28} y={h * 0.82} color={METAL} />
    </>
  );
}

// Wall exhaust fan — square housing with a round vent and blade cross.
function ExhaustFan({ w, d, h, color }) {
  const s = Math.min(w, h);
  return (
    <>
      <Box w={w} h={h} d={d} color={color || '#E6E7E9'} rough={0.6} />
      <Cyl r={s * 0.36} h={d * 0.35} z={d * 0.4} rot={[Math.PI / 2, 0, 0]} color="#C7C9CC" />
      <Box w={s * 0.64} h={s * 0.08} d={d * 0.2} z={d * 0.55} color={METAL_DK} />
      <Box w={s * 0.08} h={s * 0.64} d={d * 0.2} z={d * 0.55} color={METAL_DK} />
    </>
  );
}

// Wall sconce — backplate + an up/down-lit glowing shade.
function WallSconce({ w, d, h, color }) {
  const r = Math.min(w, h);
  return (
    <>
      <Box w={w * 0.55} h={h * 0.5} d={d * 0.35} z={-d * 0.25} color={METAL_DK} />
      <Cone r={r * 0.42} h={h * 0.5} z={d * 0.2} seg={20} open color={color} rough={0.5} emissive={color} emissiveIntensity={0.4} />
    </>
  );
}

function Plant({ w, d, h, color }) {
  const r = Math.min(w, d);
  return (
    <>
      <Cyl rTop={r * 0.42} rBot={r * 0.3} h={h * 0.28} y={h * 0.14} color="#9A6A4A" rough={0.9} />
      <Ball r={r * 0.5} y={h * 0.55} color={LEAF} />
      <Ball r={r * 0.4} y={h * 0.75} x={r * 0.18} color={LEAF_DK} />
      <Ball r={r * 0.38} y={h * 0.72} x={-r * 0.2} color={LEAF} />
    </>
  );
}

function Planter({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.6} d={d} y={h * 0.3} color="#8A6250" rough={0.9} />
      <Ball r={Math.min(w, d) * 0.4} y={h * 0.75} color={LEAF} />
      <Ball r={Math.min(w, d) * 0.34} y={h * 0.8} x={w * 0.22} color={LEAF_DK} />
    </>
  );
}

function Tree({ w, d, h, color }) {
  const r = Math.min(w, d);
  return (
    <>
      <Cyl rTop={r * 0.08} rBot={r * 0.12} h={h * 0.42} y={h * 0.21} color={TRUNK} rough={0.95} />
      <Ball r={r * 0.42} y={h * 0.62} color={LEAF} />
      <Ball r={r * 0.34} y={h * 0.82} x={r * 0.2} color={LEAF_DK} />
      <Ball r={r * 0.32} y={h * 0.78} x={-r * 0.22} color={LEAF} />
      <Ball r={r * 0.3} y={h * 0.9} z={r * 0.18} color={LEAF_DK} />
    </>
  );
}

function Rug({ w, d, color }) {
  return <Box w={w} h={0.02} d={d} y={0.01} color={color} rough={1} />;
}

function Mirror({ w, d, h, color, parts }) {
  const frame = pc(parts, 'frame', shade(color, 0.7));
  const glass = pc(parts, 'glass', GLASS);
  return (
    <>
      <Box w={w} h={h} d={Math.max(d, 0.04)} y={h / 2} color={frame} />
      <Box w={w * 0.86} h={h * 0.9} d={0.01} y={h / 2} z={Math.max(d, 0.04) / 2} color={glass} rough={0.05} metal={0.5} />
    </>
  );
}

function Tv({ w, d, h, color, parts }) {
  const bezel = pc(parts, 'frame', '#1B1A17');
  const screen = pc(parts, 'screen', '#101418');
  const stand = pc(parts, 'stand', METAL_DK);
  return (
    <>
      <Box w={w} h={h * 0.82} d={Math.max(d, 0.05)} y={h * 0.55} color={bezel} rough={0.4} />
      <Box w={w * 0.94} h={h * 0.74} d={0.01} y={h * 0.55} z={Math.max(d, 0.05) / 2} color={screen} rough={0.2} metal={0.3} />
      <Box w={w * 0.16} h={h * 0.14} d={d * 0.6} y={h * 0.07} color={stand} />
    </>
  );
}

// Wall-mounted split AC unit: rounded body, vent flap, side control panel.
function Ac({ w, d, h, color, parts }) {
  const body = pc(parts, 'body', color);
  const vent = pc(parts, 'vent', shade(color, 0.94));
  const panel = pc(parts, 'panel', METAL);
  const t = Math.max(d, 0.14);
  return (
    <>
      {/* main body */}
      <Box w={w} h={h} d={t} y={h / 2} color={body} rough={0.5} />
      {/* front face inset */}
      <Box w={w * 0.96} h={h * 0.7} d={0.01} y={h * 0.55} z={t / 2} color={vent} rough={0.4} />
      {/* bottom vent flap, angled down */}
      <Box w={w * 0.9} h={h * 0.16} d={t * 0.5} y={h * 0.12} z={t * 0.34} color={vent} rough={0.4} />
      {/* small status panel */}
      <Box w={w * 0.14} h={h * 0.1} d={0.008} x={w * 0.36} y={h * 0.3} z={t / 2 + 0.004} color={panel} metal={0.4} />
    </>
  );
}

// Body-style profiles. All fractions are relative to the item's width (w),
// length/depth (d = front↔back), and height (h). One parametric builder draws
// every vehicle; the profile shapes the silhouette so a sedan, SUV, pickup,
// supercar, convertible and limousine each read as themselves in 3D instead of
// sharing one generic box. Fields:
//   wheel     tyre radius as a fraction of h (ride height)
//   body      lower body-mass height as a fraction of h
//   cabinH    raised cabin/greenhouse height as a fraction of h
//   cabinLen  cabin length as a fraction of d
//   cabinZ    cabin centre offset along d (+ = toward the nose)
//   bodyW     body width as a fraction of w
//   cabinW    cabin width as a fraction of w
//   roof      'glass' = closed greenhouse, 'open' = convertible (no roof)
//   rails     roof rails (SUV)
//   bed       open cargo bed behind the cabin (pickup)
//   limo      break the long greenhouse with body-colour pillars
const CAR_PROFILES = {
  sedan:    { wheel: 0.20, body: 0.34, cabinH: 0.30, cabinLen: 0.44, cabinZ: -0.05, bodyW: 0.90, cabinW: 0.80, roof: 'glass' },
  suv:      { wheel: 0.25, body: 0.42, cabinH: 0.44, cabinLen: 0.62, cabinZ: -0.04, bodyW: 0.94, cabinW: 0.88, roof: 'glass', rails: true },
  hatch:    { wheel: 0.21, body: 0.34, cabinH: 0.40, cabinLen: 0.54, cabinZ: -0.09, bodyW: 0.90, cabinW: 0.82, roof: 'glass' },
  pickup:   { wheel: 0.26, body: 0.42, cabinH: 0.40, cabinLen: 0.30, cabinZ:  0.22, bodyW: 0.94, cabinW: 0.86, roof: 'glass', bed: true },
  coupe:    { wheel: 0.19, body: 0.32, cabinH: 0.26, cabinLen: 0.40, cabinZ: -0.06, bodyW: 0.94, cabinW: 0.80, roof: 'glass' },
  supercar: { wheel: 0.18, body: 0.28, cabinH: 0.22, cabinLen: 0.32, cabinZ:  0.06, bodyW: 0.96, cabinW: 0.78, roof: 'glass' },
  muscle:   { wheel: 0.21, body: 0.36, cabinH: 0.28, cabinLen: 0.42, cabinZ: -0.11, bodyW: 0.94, cabinW: 0.82, roof: 'glass' },
  cabrio:   { wheel: 0.19, body: 0.34, cabinH: 0.18, cabinLen: 0.32, cabinZ: -0.08, bodyW: 0.92, cabinW: 0.80, roof: 'open' },
  limo:     { wheel: 0.18, body: 0.32, cabinH: 0.30, cabinLen: 0.80, cabinZ: -0.02, bodyW: 0.90, cabinW: 0.82, roof: 'glass', limo: true },
};

// Map a catalog id (the only per-vehicle data carried onto a placed item) to a
// body style. Unknown ids fall back to a sedan so any new car still renders.
const CAR_STYLE = {
  car: 'sedan',
  suv: 'suv',
  hatchback: 'hatch',
  'vigo-dala': 'pickup',
  'land-cruiser': 'suv',
  'sports-car': 'coupe',
  'gt-supercar': 'supercar',
  'roadster-cabrio': 'cabrio',
  'muscle-car': 'muscle',
  'stretch-limo': 'limo',
};

function Car({ w, d, h, color, catalogId }) {
  const p = CAR_PROFILES[CAR_STYLE[catalogId] || 'sedan'] || CAR_PROFILES.sedan;
  const glass = '#1E252C';
  const trim = shade(color, 0.7);

  const wheelR = h * p.wheel;
  const bodyH = h * p.body;
  const cabinH = h * p.cabinH;
  const sillY = wheelR + h * 0.04;    // body floor sits just above the tyres
  const bodyY = sillY + bodyH / 2;
  const cabinLen = d * p.cabinLen;
  const cabinZ = d * p.cabinZ;
  const cabinY = sillY + bodyH + cabinH / 2 - h * 0.02;
  const bw = w * p.bodyW;             // body width
  const cw = w * p.cabinW;            // cabin width
  const wx = w * 0.40;                // wheel offset from centre (X)
  const wz = d * 0.33;                // wheel offset front/back (Z)

  return (
    <>
      {/* main body mass — sits between the wheels along the full length */}
      <Box w={bw} h={bodyH} d={d * 0.98} y={bodyY} color={color} rough={0.3} metal={0.6} />
      {/* lower rocker/skirt for a grounded look */}
      <Box w={bw * 1.02} h={bodyH * 0.42} d={d * 0.9} y={sillY + bodyH * 0.2} color={trim} rough={0.5} metal={0.3} />

      {/* closed roof: solid cabin + wrapping tinted greenhouse */}
      {p.roof !== 'open' && (
        <>
          <Box w={cw} h={cabinH} d={cabinLen} y={cabinY} z={cabinZ} color={color} rough={0.3} metal={0.6} receive={false} />
          <Box
            w={cw * 1.01} h={cabinH * 0.66} d={cabinLen * 0.96}
            y={cabinY + cabinH * 0.04} z={cabinZ}
            color={glass} rough={0.06} metal={0.4} opacity={0.9} cast={false} receive={false}
          />
          {/* windshield (front) + rear window as sloped panes */}
          <Box
            w={cw * 0.92} h={cabinH * 0.9} d={0.02}
            y={cabinY - cabinH * 0.08} z={cabinZ + cabinLen * 0.5}
            rot={[0.6, 0, 0]}
            color={glass} rough={0.05} metal={0.4} opacity={0.85} cast={false} receive={false}
          />
          <Box
            w={cw * 0.92} h={cabinH * 0.9} d={0.02}
            y={cabinY - cabinH * 0.08} z={cabinZ - cabinLen * 0.5}
            rot={[-0.5, 0, 0]}
            color={glass} rough={0.05} metal={0.4} opacity={0.85} cast={false} receive={false}
          />
        </>
      )}

      {/* open roof (convertible): recessed cockpit + a single raked windshield */}
      {p.roof === 'open' && (
        <>
          <Box w={cw * 0.94} h={bodyH * 0.34} d={cabinLen} y={sillY + bodyH * 0.9} z={cabinZ} color={shade(color, 0.35)} rough={0.85} />
          <Box
            w={cw * 0.9} h={cabinH * 1.4} d={0.02}
            y={sillY + bodyH + cabinH * 0.5} z={cabinZ + cabinLen * 0.45}
            rot={[0.7, 0, 0]}
            color={glass} rough={0.05} metal={0.4} opacity={0.8} cast={false} receive={false}
          />
        </>
      )}

      {/* limousine: body-colour pillars breaking the long greenhouse into bays */}
      {p.limo && [0.3, 0.05, -0.2].map((f, i) => (
        <Box key={`pil${i}`} w={cw * 1.03} h={cabinH * 0.66} d={w * 0.04} y={cabinY + cabinH * 0.04} z={cabinZ + cabinLen * f} color={color} rough={0.3} metal={0.6} />
      ))}

      {/* SUV roof rails */}
      {p.rails && [wx * 0.95, -wx * 0.95].map((x, i) => (
        <Box key={`rail${i}`} w={w * 0.04} h={h * 0.03} d={cabinLen * 0.82} x={x} y={cabinY + cabinH * 0.52} z={cabinZ} color={METAL_DK} metal={0.5} />
      ))}

      {/* pickup cargo bed: open box (side + tail walls) behind the cabin */}
      {p.bed && (() => {
        const bedLen = d * 0.42;
        const bedZ = -d * 0.24;
        const wallT = w * 0.05;
        const wallH = bodyH * 0.55;
        const wallY = sillY + bodyH + wallH / 2;
        return (
          <>
            <Box w={wallT} h={wallH} d={bedLen} x={bw / 2 - wallT / 2} y={wallY} z={bedZ} color={color} rough={0.4} metal={0.5} />
            <Box w={wallT} h={wallH} d={bedLen} x={-bw / 2 + wallT / 2} y={wallY} z={bedZ} color={color} rough={0.4} metal={0.5} />
            <Box w={bw} h={wallH} d={wallT} y={wallY} z={bedZ - bedLen / 2} color={color} rough={0.4} metal={0.5} />
            <Box w={bw * 0.94} h={bodyH * 0.08} d={bedLen * 0.94} y={sillY + bodyH} z={bedZ} color={shade(color, 0.5)} rough={0.95} />
          </>
        );
      })()}

      {/* wheels — tyre + lighter rim */}
      {[[wx, wz], [-wx, wz], [wx, -wz], [-wx, -wz]].map(([x, z], i) => (
        <group key={i} position={[x, wheelR, z]} rotation={[0, 0, Math.PI / 2]}>
          <Cyl r={wheelR} h={w * 0.14} seg={20} color={TIRE} rough={0.85} receive={false} />
          <Cyl r={wheelR * 0.55} h={0.02} y={w * 0.075} seg={16} color={METAL} rough={0.35} metal={0.7} cast={false} receive={false} />
        </group>
      ))}
      {/* bumpers */}
      <Box w={bw * 0.96} h={bodyH * 0.32} d={d * 0.04} y={sillY + bodyH * 0.25} z={d * 0.49} color={trim} rough={0.6} />
      <Box w={bw * 0.96} h={bodyH * 0.32} d={d * 0.04} y={sillY + bodyH * 0.25} z={-d * 0.49} color={trim} rough={0.6} />
      {/* headlights (front, +z) */}
      <Box w={w * 0.16} h={h * 0.06} d={0.02} x={w * 0.28} y={bodyY} z={d * 0.49} color="#FFF4D6" rough={0.15} />
      <Box w={w * 0.16} h={h * 0.06} d={0.02} x={-w * 0.28} y={bodyY} z={d * 0.49} color="#FFF4D6" rough={0.15} />
      {/* taillights (rear, -z) */}
      <Box w={w * 0.14} h={h * 0.05} d={0.02} x={w * 0.29} y={bodyY} z={-d * 0.49} color="#C0392B" rough={0.2} />
      <Box w={w * 0.14} h={h * 0.05} d={0.02} x={-w * 0.29} y={bodyY} z={-d * 0.49} color="#C0392B" rough={0.2} />
    </>
  );
}

// ---- retail / parking / misc builders -------------------------------------

// Freestanding sign, post/bollard, EV charger: pole + board on top.
function Sign({ w, d, h, color }) {
  const poleR = Math.max(0.02, Math.min(w, d) * 0.14);
  return (
    <>
      <Cyl r={Math.min(w, d) * 0.34} h={h * 0.03} y={h * 0.015} color={METAL_DK} metal={0.5} />
      <Cyl r={poleR} h={h * 0.72} y={h * 0.36} color={METAL} metal={0.5} />
      <Box w={w} h={h * 0.3} d={Math.max(d * 0.4, 0.04)} y={h * 0.84} color={color} rough={0.55} />
    </>
  );
}

// Wooden shipping crate: solid box with darker corner posts + face rails.
function Crate({ w, d, h, color }) {
  const t = Math.max(0.03, Math.min(w, d, h) * 0.08);
  const px = w / 2 - t / 2;
  const pz = d / 2 - t / 2;
  return (
    <>
      <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.9} />
      <Box w={t} h={h} d={t} x={px} y={h / 2} z={pz} color={WOOD_DK} />
      <Box w={t} h={h} d={t} x={-px} y={h / 2} z={pz} color={WOOD_DK} />
      <Box w={t} h={h} d={t} x={px} y={h / 2} z={-pz} color={WOOD_DK} />
      <Box w={t} h={h} d={t} x={-px} y={h / 2} z={-pz} color={WOOD_DK} />
      <Box w={w} h={t} d={t * 0.5} y={h - t / 2} z={d / 2} color={WOOD_DK} />
      <Box w={w} h={t} d={t * 0.5} y={t / 2} z={d / 2} color={WOOD_DK} />
    </>
  );
}

// Tapered round bin / cart corral tub.
function Bin({ w, d, h, color }) {
  const rTop = Math.min(w, d) * 0.5;
  return (
    <>
      <Cyl rTop={rTop} rBot={rTop * 0.8} h={h} y={h / 2} color={color} rough={0.7} seg={24} />
      <Cyl r={rTop * 1.04} h={h * 0.06} y={h * 0.98} color={shade(color, 0.85)} seg={24} />
    </>
  );
}

// Retail mannequin: base + pole + tapered torso + head.
function Mannequin({ w, d, h, color }) {
  const r = Math.min(w, d);
  return (
    <>
      <Cyl r={r * 0.32} h={h * 0.02} y={h * 0.01} color={METAL_DK} />
      <Cyl r={r * 0.05} h={h * 0.55} y={h * 0.3} color={METAL} metal={0.5} />
      <Cyl rTop={r * 0.34} rBot={r * 0.16} h={h * 0.32} y={h * 0.68} color={color} rough={0.5} seg={20} />
      <Cyl r={r * 0.06} h={h * 0.06} y={h * 0.87} color={color} />
      <Ball r={r * 0.15} y={h * 0.95} color={color} />
    </>
  );
}

// Double-sided gondola shelving: base + center spine + shelves both faces.
function Gondola({ w, d, h, color }) {
  const t = Math.min(0.04, h * 0.03);
  const shelves = Math.max(2, Math.round(h / 0.45));
  const parts = [
    <Box key="base" w={w} h={h * 0.12} d={d} y={h * 0.06} color={shade(color, 0.7)} />,
    <Box key="spine" w={w} h={h} d={t} y={h / 2} color={shade(color, 0.82)} />,
  ];
  for (let i = 1; i <= shelves; i++) {
    const y = (i / (shelves + 1)) * h;
    parts.push(<Box key={`f${i}`} w={w} h={t} d={d * 0.42} y={y} z={d * 0.24} color={color} />);
    parts.push(<Box key={`b${i}`} w={w} h={t} d={d * 0.42} y={y} z={-d * 0.24} color={color} />);
  }
  return <>{parts}</>;
}

// Straight clothing rack: two posts, a top bar, hanging garments.
function Rack({ w, d, h, color }) {
  const barY = h * 0.9;
  const n = Math.max(3, Math.round(w / 0.18));
  const cols = [color, shade(color, 0.8), shade(color, 1.12)];
  const parts = [
    <Cyl key="l" r={0.02} h={h} x={-w / 2 + 0.03} y={h / 2} color={METAL} metal={0.6} />,
    <Cyl key="r" r={0.02} h={h} x={w / 2 - 0.03} y={h / 2} color={METAL} metal={0.6} />,
    <Cyl key="bar" r={0.02} h={w} y={barY} color={METAL} metal={0.6} rot={[0, 0, Math.PI / 2]} />,
  ];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * (w / n);
    parts.push(<Box key={`g${i}`} w={(w / n) * 0.8} h={h * 0.5} d={d * 0.5} x={x} y={barY - h * 0.26} color={cols[i % 3]} rough={0.85} />);
  }
  return <>{parts}</>;
}

// Circular clothing rack: pole + ring + garments radiating around.
function RoundRack({ w, d, h, color }) {
  const R = Math.min(w, d) * 0.45;
  const cols = [color, shade(color, 0.8), shade(color, 1.12)];
  const parts = [
    <Cyl key="pole" r={0.025} h={h} y={h / 2} color={METAL} metal={0.6} />,
    <Cyl key="foot" r={R * 0.5} h={h * 0.02} y={h * 0.01} color={METAL_DK} />,
    <Torus key="ring" r={R} tube={0.02} tubularSeg={28} y={h * 0.9} rot={[Math.PI / 2, 0, 0]} color={METAL} metal={0.6} rough={0.4} />,
  ];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    parts.push(
      <Box key={`g${i}`} w={0.1} h={h * 0.42} d={0.14} x={Math.cos(a) * R} z={Math.sin(a) * R} y={h * 0.68} ry={a} color={cols[i % 3]} rough={0.85} />
    );
  }
  return <>{parts}</>;
}

// Wall-mounted shelf: board on two brackets.
function WallShelf({ w, d, h, color, parts }) {
  const y = h * 0.8;
  const board = pc(parts, 'board', color);
  const bracket = pc(parts, 'bracket', shade(color, 0.7));
  return (
    <>
      <Box w={w} h={Math.max(h * 0.08, 0.04)} d={d} y={y} color={board} rough={0.6} />
      <Box w={0.03} h={y} d={d * 0.8} x={-w * 0.4} y={y / 2} color={bracket} />
      <Box w={0.03} h={y} d={d * 0.8} x={w * 0.4} y={y / 2} color={bracket} />
    </>
  );
}

// Chest freezer: body + tinted glass sliding top.
function Freezer({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.9} d={d} y={h * 0.45} color={color} rough={0.4} metal={0.3} />
      <Box w={w * 0.98} h={h * 0.12} d={d * 0.98} y={h * 0.94} color={GLASS} rough={0.1} metal={0.2} transparent opacity={0.5} />
    </>
  );
}

// Fitting room cubicle: three walls + curtain rod & curtain on the open face.
function FittingRoom({ w, d, h, color }) {
  const t = 0.05;
  const wall = shade(color, 0.9);
  return (
    <>
      <Box w={w} h={h} d={t} y={h / 2} z={-d / 2 + t / 2} color={wall} />
      <Box w={t} h={h} d={d} x={-w / 2 + t / 2} y={h / 2} color={wall} />
      <Box w={t} h={h} d={d} x={w / 2 - t / 2} y={h / 2} color={wall} />
      <Cyl r={0.02} h={w} y={h * 0.98} z={d / 2} rot={[0, 0, Math.PI / 2]} color={METAL} metal={0.6} />
      <Box w={w * 0.9} h={h * 0.9} d={0.03} y={h * 0.48} z={d / 2 - 0.03} color={color} rough={0.9} />
    </>
  );
}

// Upright glass-door cooler: cabinet + glass door + interior shelves.
function CoolerUpright({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.4} metal={0.4} />
      <Box w={w * 0.86} h={h * 0.82} d={0.02} y={h * 0.52} z={d / 2} color={GLASS} rough={0.08} metal={0.3} transparent opacity={0.55} />
      <Box w={w * 0.8} h={0.02} d={d * 0.6} y={h * 0.32} color={METAL} />
      <Box w={w * 0.8} h={0.02} d={d * 0.6} y={h * 0.56} color={METAL} />
      <Box w={w * 0.8} h={0.02} d={d * 0.6} y={h * 0.8} color={METAL} />
    </>
  );
}

// Checkout counter: base + top + register terminal and screen.
function Checkout({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.8} d={d} y={h * 0.4} color={color} rough={0.7} />
      <Box w={w * 1.04} h={h * 0.08} d={d * 1.04} y={h * 0.83} color={shade(color, 1.1)} rough={0.4} />
      <Box w={w * 0.28} h={h * 0.2} d={d * 0.2} x={w * 0.25} y={h * 0.94} color={METAL_DK} />
      <Box w={w * 0.24} h={h * 0.15} d={0.02} x={w * 0.25} y={h * 0.96} z={d * 0.11} color={GLASS} rough={0.1} />
    </>
  );
}

// Shopping basket: tapered tub + arched handle.
function Basket({ w, d, h, color }) {
  const r = Math.min(w, d);
  return (
    <>
      <Cyl rTop={r * 0.55} rBot={r * 0.44} h={h * 0.7} y={h * 0.35} color={color} rough={0.6} seg={4} rot={[0, Math.PI / 4, 0]} />
      <Torus r={r * 0.3} tube={0.015} tubularSeg={20} arc={Math.PI} y={h * 0.82} rot={[Math.PI / 2, 0, 0]} color={shade(color, 0.8)} rough={0.6} />
    </>
  );
}

// Display table: table top on legs with a couple of products on top.
function DisplayTable({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.08} d={d} y={h - h * 0.04} color={color} rough={0.6} />
      <Legs w={w} d={d} top={h - h * 0.08} r={Math.min(w, d) * 0.04} color={shade(color, 0.7)} />
      <Box w={w * 0.2} h={h * 0.18} d={d * 0.2} x={-w * 0.22} y={h + h * 0.09} color={shade(color, 1.2)} rough={0.7} />
      <Box w={w * 0.16} h={h * 0.12} d={d * 0.16} x={w * 0.2} y={h + h * 0.06} color={shade(color, 0.8)} rough={0.7} />
    </>
  );
}

// Glass display case: solid base + glass top box + cap.
function DisplayCase({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.4} d={d} y={h * 0.2} color={color} rough={0.7} />
      <Box w={w * 0.96} h={h * 0.55} d={d * 0.96} y={h * 0.68} color={GLASS} rough={0.08} metal={0.2} transparent opacity={0.35} />
      <Box w={w} h={h * 0.04} d={d} y={h * 0.98} color={shade(color, 0.8)} />
    </>
  );
}

// Generic fallback: a softly-lit box, better material than the old flat one.
function GenericBox({ w, d, h, color }) {
  return <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.75} />;
}

// ---- structure builders ---------------------------------------------------

// A room shell: polygon floor slab + wall around every edge with door/window openings cut out.
function RoomShell({ item, w, d, h, kind, points, wallThickness, wallColor, floorColor, plan }) {
  // Everything below is derived geometry, and it is expensive: the opening scan is
  // O(furniture x edges), so a 3-room plan with 200 items ran ~2,400 wallHit tests
  // PER RENDER on the JS thread — the reason dragging an item felt sticky. None of
  // it depends on anything but the inputs listed in the dependency array, so it is
  // computed once and reused until the plan actually changes.
  const geo = useMemo(() => {
    const pts =
      Array.isArray(points) && points.length >= 3
        ? points.map((p) => [p.x, p.y])
        : (shapePolygon(kind) || [[0, 0], [1, 0], [1, 1], [0, 1]]).map(([nx, ny]) => [(nx - 0.5) * w, (ny - 0.5) * d]);
    const t = wallThickness && wallThickness > 0 ? wallThickness : 0.11;

      const floorShape = new Shape();
    pts.forEach(([x, z], i) => (i === 0 ? floorShape.moveTo(x, -z) : floorShape.lineTo(x, -z)));
    floorShape.closePath();
    // A THREE.Shape has no stable identity, so the geometry cache needs an explicit
    // key derived from the outline. Rounded to 1mm to match the cache's quantising.
    const floorKey = pts.map(([x, z]) => `${Math.round(x * 1000)},${Math.round(z * 1000)}`).join(';');

    // Finish ids come straight from the plan — the same stable ids the 2D editor
    // and every saved project already use ('oak', 'tile', ...). wallMaterial is new
    // and optional, so existing plans fall through to plaster.
    const floorMat = plan?.materials?.floor || 'oak';
    const wallMat = plan?.materials?.wallMaterial || 'plaster';

    // Collect all doors and windows to cut openings in the room shell walls
    const allDoorsWindows = [];
    if (plan) {
      for (const f of plan.furniture || []) {
        if (f.id === item?.id) continue;
        const isDoor = f.shape?.type === 'door' || f.kind?.toLowerCase().includes('door') || f.catalogId?.includes('door');
        const isWin = f.shape?.type === 'window' || f.kind?.toLowerCase().includes('window') || f.catalogId?.includes('window');
        if (isDoor || isWin) {
          allDoorsWindows.push({
            x: f.x,
            y: f.y,
            width: itemDims(f).w || 0.9,
            height: itemDims(f).h || 2.05,
            kind: isWin ? 'window' : 'door',
            sill: isWin ? (f.elevation ?? 0.85) : 0,
          });
        }
      }
      for (const o of plan.openings || []) {
        const wall = plan.walls?.find((w) => w.id === o.wallId);
        if (wall) {
          const pt = pointAlongWall(wall, o.t);
          allDoorsWindows.push({
            x: pt.x,
            y: pt.y,
            width: o.width || 0.9,
            height: o.height || 2.05,
            kind: o.kind || 'door',
            sill: o.sill || 0,
          });
        }
      }
    }

    const itemX = item?.x ?? 0;
    const itemY = item?.y ?? 0;

    const edges = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.01;

      const worldWall = {
        x1: itemX + a[0],
        y1: itemY + a[1],
        x2: itemX + b[0],
        y2: itemY + b[1],
        thickness: t,
      };

      const edgeOps = [];
      for (const dw of allDoorsWindows) {
        const hit = wallHit(worldWall, { x: dw.x, y: dw.y });
        if (hit.dist <= t / 2 + 0.6) {
          const u = hit.t * len;
          const u0 = Math.max(0, Math.min(len, u - dw.width / 2));
          const u1 = Math.max(0, Math.min(len, u + dw.width / 2));
          if (u1 - u0 > 0.01) {
            edgeOps.push({ u0, u1, height: dw.height, sill: dw.sill, kind: dw.kind });
          }
        }
      }
      edgeOps.sort((p, q) => p.u0 - q.u0);

      const spans = [];
      let cursor = 0;
      for (const op of edgeOps) {
        if (op.u0 > cursor) spans.push([cursor, op.u0]);
        cursor = Math.max(cursor, op.u1);
      }
      if (cursor < len) spans.push([cursor, len]);

      edges.push({
        mx: (a[0] + b[0]) / 2,
        mz: (a[1] + b[1]) / 2,
        len,
        ang: Math.atan2(b[1] - a[1], b[0] - a[0]),
        spans,
        ops: edgeOps,
      });
    }

    return { pts, t, floorShape, floorKey, floorMat, wallMat, edges };
  }, [points, kind, w, d, wallThickness, plan, item]);

  const { pts, t, floorShape, floorKey, floorMat, wallMat, edges } = geo;

  return (
    <group>
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        geometry={shapeGeo(floorShape, floorKey, tileOf(floorMat))}
        material={getMaterial({ id: floorMat, color: floorColor, side: DoubleSide })}
      />
      {edges.map((e, i) => (
        <group key={i} position={[e.mx, 0, e.mz]} rotation={[0, -e.ang, 0]}>
          {e.spans.map(([u0, u1], j) => {
            const spanW = u1 - u0;
            if (spanW <= 0.001) return null;
            const posX = (u0 + u1) / 2 - e.len / 2;
            return <Box key={`s${j}`} w={spanW} h={h} d={t} x={posX} y={h / 2} mat={wallMat} color={wallColor} rough={0.9} />;
          })}
          {e.ops.map((op, j) => {
            const posX = (op.u0 + op.u1) / 2 - e.len / 2;
            const opW = op.u1 - op.u0;
            const top = op.sill + op.height;
            const lintelH = Math.max(0, h - top);
            return (
              <group key={`o${j}`}>
                {lintelH > 0.01 ? (
                  <Box w={opW} h={lintelH} d={t} x={posX} y={top + lintelH / 2} mat={wallMat} color={wallColor} rough={0.9} />
                ) : null}
                {op.sill > 0.01 ? (
                  <Box w={opW} h={op.sill} d={t} x={posX} y={op.sill / 2} mat={wallMat} color={wallColor} rough={0.9} />
                ) : null}
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Stairs({ w, d, shape, color }) {
  const steps = shape?.steps || 12;
  const rise = 2.6; // ascend one storey regardless of the flat plan thickness
  const parts = [];
  if (shape?.turn === 'spiral') {
    const R = Math.min(w, d) * 0.42;
    parts.push(<Cyl key="pole" r={R * 0.14} h={rise} y={rise / 2} color={shade(color, 0.7)} />);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 1.9;
      const sh = (rise * (i + 1)) / steps;
      parts.push(
        <Box
          key={i}
          w={R} h={rise / steps} d={R * 1.1}
          x={Math.cos(a) * R * 0.6} y={sh - rise / steps / 2} z={Math.sin(a) * R * 0.6}
          ry={-a}
          mat="wood" color={color} rough={0.85}
        />
      );
    }
    return <>{parts}</>;
  }
  const run = d / steps;
  for (let i = 0; i < steps; i++) {
    const sh = (rise * (i + 1)) / steps;
    parts.push(
      <Box key={i} w={w} h={sh} d={run} y={sh / 2} z={-d / 2 + (i + 0.5) * run} mat="wood" color={color} rough={0.85} />
    );
  }
  return <>{parts}</>;
}

function Ramp({ w, d, h, color }) {
  const rise = 1.0;
  const len = Math.hypot(d, rise);
  const ang = Math.atan2(rise, d);
  return (
    <Box w={w} h={Math.max(h, 0.06)} d={len} y={rise / 2} rot={[-ang, 0, 0]} mat="concrete" color={color} rough={0.9} />
  );
}

// A real door: frame (jambs + head) with a leaf swung ~30° open (or two panes).
export function Door({ w, d, h, shape, color, parts: colorParts }) {
  const jamb = Math.min(0.08, w * 0.08);
  const t = Math.max(d, 0.12);
  const frame = pc(colorParts, 'frame', color);
  const leafMat = pc(colorParts, 'leaf', shade(color, 0.85));
  const handleMat = pc(colorParts, 'handle', METAL);
  const parts = [];
  parts.push(<Box key="jl" w={jamb} h={h} d={t} x={-w / 2 + jamb / 2} y={h / 2} color={frame} />);
  parts.push(<Box key="jr" w={jamb} h={h} d={t} x={w / 2 - jamb / 2} y={h / 2} color={frame} />);
  parts.push(<Box key="hd" w={w} h={jamb} d={t} y={h - jamb / 2} color={frame} />);
  const clear = w - 2 * jamb;
  if (shape?.slide) {
    parts.push(<Box key="p1" w={clear * 0.52} h={h - jamb} d={t * 0.3} x={-clear * 0.24} y={(h - jamb) / 2} z={-t * 0.15} color={GLASS} rough={0.1} transparent opacity={0.6} />);
    parts.push(<Box key="p2" w={clear * 0.52} h={h - jamb} d={t * 0.3} x={clear * 0.24} y={(h - jamb) / 2} z={t * 0.15} color={GLASS} rough={0.1} transparent opacity={0.6} />);
  } else if (shape?.leaves === 2) {
    const lw = clear / 2;
    parts.push(
      <group key="ll" position={[-w / 2 + jamb, 0, 0]} rotation={[0, -0.5, 0]}>
        <Box w={lw} h={h - jamb} d={0.04} x={lw / 2} y={(h - jamb) / 2} color={leafMat} />
      </group>
    );
    parts.push(
      <group key="lr" position={[w / 2 - jamb, 0, 0]} rotation={[0, 0.5, 0]}>
        <Box w={lw} h={h - jamb} d={0.04} x={-lw / 2} y={(h - jamb) / 2} color={leafMat} />
      </group>
    );
  } else {
    parts.push(
      <group key="l" position={[-w / 2 + jamb, 0, 0]} rotation={[0, -0.6, 0]}>
        <Box w={clear} h={h - jamb} d={0.04} x={clear / 2} y={(h - jamb) / 2} color={leafMat} />
        <Cyl r={0.02} h={0.06} x={clear * 0.9} y={(h - jamb) * 0.5} z={0.04} rot={[Math.PI / 2, 0, 0]} color={handleMat} metal={0.6} />
      </group>
    );
  }
  return <>{parts}</>;
}

// A real window: frame + glass, raised on a sill.
function Window({ w, d, h, shape, color, parts: colorParts, sill: sillProp }) {
  // Sill height off the floor (item.elevation). Old windows without one keep the
  // original 0.85 m. Matches the gap carved by itemWallOpenings in floorplan.js.
  const sill = sillProp ?? 0.85;
  const t = Math.max(d, 0.12);
  const fr = Math.min(0.06, w * 0.08);
  const frame = pc(colorParts, 'frame', color);
  const glass = pc(colorParts, 'glass', GLASS);
  const parts = [];
  const yb = sill;
  parts.push(<Box key="b" w={w} h={fr} d={t} y={yb} color={frame} />);
  parts.push(<Box key="t" w={w} h={fr} d={t} y={yb + h} color={frame} />);
  parts.push(<Box key="l" w={fr} h={h} d={t} x={-w / 2 + fr / 2} y={yb + h / 2} color={frame} />);
  parts.push(<Box key="r" w={fr} h={h} d={t} x={w / 2 - fr / 2} y={yb + h / 2} color={frame} />);
  parts.push(<Box key="g" w={w - fr} h={h - fr} d={t * 0.25} y={yb + h / 2} color={glass} rough={0.08} metal={0.2} transparent opacity={0.45} />);
  if (shape?.slide || shape?.bay) {
    parts.push(<Box key="m" w={fr * 0.6} h={h - fr} d={t} y={yb + h / 2} color={frame} />);
  }
  return <>{parts}</>;
}

// ---- dispatch -------------------------------------------------------------

function StructureGeometry({ item, w, d, h, wallColor, floorColor, plan }) {
  const type = item.shape?.type;
  const color = item.color;
  if (type === 'polygon') {
    if (h <= 0.25) {
      // landing / low platform slab
      return <Box w={w} h={Math.max(h, 0.06)} d={d} y={Math.max(h, 0.06) / 2} color={color} rough={0.85} />;
    }
    return <RoomShell item={item} w={w} d={d} h={h} kind={item.kind} points={item.shape?.points} wallThickness={item.shape?.wallThickness} wallColor={wallColor || color} floorColor={floorColor || shade(color, 1.1)} plan={plan} />;
  }
  if (type === 'wall') return <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.9} />;
  if (type === 'column') return item.shape.round
    ? <Cyl r={Math.min(w, d) / 2} h={h} y={h / 2} color={color} rough={0.85} seg={22} />
    : <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.85} />;
  if (type === 'stairs') return <Stairs w={w} d={d} shape={item.shape} color={color} />;
  if (type === 'ramp') return <Ramp w={w} d={d} h={h} color={color} />;
  if (type === 'door') return <Door w={w} d={d} h={h} shape={item.shape} color={color} parts={item.parts} />;
  if (type === 'window') return <Window w={w} d={d} h={h} shape={item.shape} color={color} parts={item.parts} sill={item.elevation} />;
  // arch / fallback
  return <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.85} />;
}

const BUILDERS = {
  sofa: Sofa,
  sectional: Sofa,
  chair: Chair,
  stool: Stool,
  bench: Stool,
  table: TableLike,
  roundTable: RoundTable,
  nightstand: Cabinet,
  desk: Desk,
  bed: Bed,
  bookshelf: ShelfUnit,
  wardrobe: Cabinet,
  dresser: Cabinet,
  tvStand: Counter,
  cabinet: Cabinet,
  island: Island,
  counter: Counter,
  stove: Stove,
  fridge: Fridge,
  sink: SinkUnit,
  bathtub: Bathtub,
  shower: Shower,
  toilet: Toilet,
  lamp: Lamp,
  pendant: Pendant,
  ceilingFan: CeilingFan,
  pedestalFan: PedestalFan,
  exhaustFan: ExhaustFan,
  sconce: WallSconce,
  plant: Plant,
  planter: Planter,
  rug: Rug,
  mirror: Mirror,
  tv: Tv,
  ac: Ac,
  car: Car,
  tree: Tree,
  lawn: Rug,
  // retail / parking / misc
  sign: Sign,
  crate: Crate,
  bin: Bin,
  mannequin: Mannequin,
  gondola: Gondola,
  rack: Rack,
  roundRack: RoundRack,
  wallShelf: WallShelf,
  shelfUnit: ShelfUnit,
  freezer: Freezer,
  fittingRoom: FittingRoom,
  coolerUpright: CoolerUpright,
  checkout: Checkout,
  basket: Basket,
  displayTable: DisplayTable,
  displayCase: DisplayCase,
};

function FurnitureGeometry({ item, w, d, h }) {
  const Builder = BUILDERS[item.kind] || GenericBox;
  // `catalogId` lets one builder branch per product variant (e.g. the Car
  // builder draws a limo vs SUV vs pickup); other builders ignore it.
  return <Builder w={w} d={d} h={h} color={item.color} parts={item.parts} catalogId={item.catalogId} />;
}

// Falls back to the procedural build if the real .glb throws while loading or
// parsing on-device (bad file, unsupported texture, decoder error). Suspense
// covers the *loading* state; this class covers the *error* state — together
// they guarantee a placed item can never crash the whole 3D canvas.
class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // Handled by rendering the procedural fallback; swallow so the scene lives.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// Place one item (furniture or structure) in the world and render its model.
// If the item's `kind` has a real .glb registered, load and auto-fit it; while
// it streams in (or if it's missing/errors) we render the procedural build via
// the Suspense fallback, so the scene never blocks or goes blank.
function PlacedItemImpl({ item, cx, cz, wallColor, floorColor, plan }) {
  const { w, d, h } = itemDims(item);
  const rot = (-item.rotation * Math.PI) / 180;

  const procedural = item.structure ? (
    <StructureGeometry item={item} w={w} d={d} h={h} wallColor={wallColor} floorColor={floorColor} plan={plan} />
  ) : (
    <FurnitureGeometry item={item} w={w} d={d} h={h} />
  );

  const entry = modelFor(item.kind, item.catalogId);

  // Windows place themselves vertically via their sill (drawn in the builder +
  // carved into the wall), so they opt out of the generic elevation lift to
  // avoid a double offset. Everything else lifts by its elevation.
  const isWindow = item.structure && item.shape?.type === 'window';
  const elevY = isWindow ? 0 : item.elevation ?? 0;

  return (
    <group position={[item.x - cx, elevY, item.y - cz]} rotation={[0, rot, 0]}>
      {entry ? (
        <ModelBoundary fallback={procedural}>
          <Suspense fallback={procedural}>
            <ModelItem entry={entry} w={w} d={d} h={h} color={item.color} />
          </Suspense>
        </ModelBoundary>
      ) : (
        procedural
      )}
      {/* Soft occlusion where the item meets the floor. The real shadow map is far
          too coarse to resolve this, and it is the main cue that stops furniture
          from looking like it is hovering. See contactShadow.js. */}
      {castsContactShadow(item) && (
        <mesh
          geometry={SHADOW_GEO}
          material={SHADOW_MAT}
          renderOrder={1}
          scale={[w * SHADOW_SPREAD, 1, d * SHADOW_SPREAD]}
          position={[0, 0.004, 0]}
        />
      )}
    </group>
  );
}

// Every edit to the plan produces a new `plan` object and a new `furniture` array,
// but updateFurnitureItem() rebuilds only the item that actually changed — every
// other item keeps its object identity. So memoising here means moving one chair
// re-renders one chair's mesh tree instead of all of them.
//
// The subtlety is `plan`: its identity changes on every edit, which would defeat
// the memo entirely. Only structure shells read it (RoomShell scans the furniture
// list to carve door/window openings into its walls), so plain furniture is
// allowed to ignore it.
function placedItemsEqual(a, b) {
  if (
    a.item !== b.item ||
    a.cx !== b.cx ||
    a.cz !== b.cz ||
    a.wallColor !== b.wallColor ||
    a.floorColor !== b.floorColor
  ) {
    return false;
  }
  // Structure pieces depend on the whole plan; furniture does not.
  if (a.item?.structure || b.item?.structure) return a.plan === b.plan;
  return true;
}

export const PlacedItem = memo(PlacedItemImpl, placedItemsEqual);
