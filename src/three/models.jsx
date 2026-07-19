import { Suspense } from 'react';
import { Shape, DoubleSide } from 'three';

import { ModelItem } from './ModelItem';
import { modelFor } from './modelRegistry';
import { itemDims } from '@/domain/floorplan';
import { shapePolygon } from '@/data/structure';

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

function Box({ w, h, d, x = 0, y = 0, z = 0, color, rough = 0.85, metal = 0, ry = 0, transparent, opacity }) {
  return (
    <mesh position={[x, y, z]} rotation={[0, ry, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} transparent={transparent} opacity={opacity} />
    </mesh>
  );
}

function Cyl({ r, rTop, rBot, h, x = 0, y = 0, z = 0, color, rough = 0.7, metal = 0, seg = 20, rot = [0, 0, 0] }) {
  return (
    <mesh position={[x, y, z]} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, rBot ?? r, h, seg]} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  );
}

function Ball({ r, x = 0, y = 0, z = 0, color, rough = 0.9 }) {
  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <sphereGeometry args={[r, 18, 14]} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
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

function Sofa({ w, d, h, color }) {
  const seatH = h * 0.42;
  return (
    <>
      <Box w={w} h={seatH} d={d * 0.96} y={seatH / 2} color={shade(color, 0.9)} rough={0.95} />
      {/* seat cushions */}
      <Box w={w * 0.9} h={h * 0.14} d={d * 0.7} y={seatH + h * 0.06} z={d * 0.08} color={color} rough={0.95} />
      {/* backrest */}
      <Box w={w} h={h * 0.55} d={d * 0.2} y={h * 0.5} z={-d * 0.4} color={color} rough={0.95} />
      {/* arms */}
      <Box w={w * 0.12} h={h * 0.5} d={d * 0.96} x={w * 0.44} y={h * 0.3} color={color} rough={0.95} />
      <Box w={w * 0.12} h={h * 0.5} d={d * 0.96} x={-w * 0.44} y={h * 0.3} color={color} rough={0.95} />
    </>
  );
}

function Chair({ w, d, h, color }) {
  const seatH = h * 0.45;
  return (
    <>
      <Box w={w * 0.9} h={h * 0.09} d={d * 0.9} y={seatH} color={color} rough={0.8} />
      <Box w={w * 0.9} h={h * 0.48} d={d * 0.1} y={seatH + h * 0.26} z={-d * 0.4} color={color} rough={0.8} />
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
      <Box w={w} h={topH} d={d} y={h - topH / 2} color={color} rough={0.6} />
      <Legs w={w} d={d} top={h - topH} r={Math.min(w, d) * 0.04} color={shade(color, 0.7)} />
    </>
  );
}

function RoundTable({ w, d, h, color }) {
  const topH = h * 0.07;
  const r = Math.min(w, d) / 2;
  return (
    <>
      <Cyl r={r} h={topH} y={h - topH / 2} color={color} rough={0.6} />
      <Cyl r={r * 0.12} h={h - topH} y={(h - topH) / 2} color={shade(color, 0.7)} />
      <Cyl r={r * 0.35} h={h * 0.04} y={h * 0.02} color={shade(color, 0.6)} />
    </>
  );
}

function Desk({ w, d, h, color }) {
  const topH = h * 0.08;
  return (
    <>
      <Box w={w} h={topH} d={d} y={h - topH / 2} color={color} rough={0.6} />
      {/* drawer pedestal */}
      <Box w={w * 0.3} h={h * 0.8} d={d * 0.9} x={w * 0.3} y={h * 0.4} color={shade(color, 0.9)} />
      <Cyl r={0.03} h={h - topH} x={-w * 0.42} y={(h - topH) / 2} z={d * 0.4} color={shade(color, 0.7)} />
      <Cyl r={0.03} h={h - topH} x={-w * 0.42} y={(h - topH) / 2} z={-d * 0.4} color={shade(color, 0.7)} />
    </>
  );
}

function Bed({ w, d, h, color }) {
  const baseH = h * 0.3;
  return (
    <>
      {/* base / frame */}
      <Box w={w} h={baseH} d={d} y={baseH / 2} color={WOOD} />
      {/* mattress */}
      <Box w={w * 0.96} h={h * 0.16} d={d * 0.9} y={baseH + h * 0.08} z={d * 0.03} color={shade(color, 1.05)} rough={0.95} />
      {/* headboard */}
      <Box w={w} h={h * 0.55} d={d * 0.06} y={h * 0.42} z={-d * 0.47} color={color} />
      {/* pillows */}
      <Box w={w * 0.4} h={h * 0.1} d={d * 0.16} x={-w * 0.22} y={baseH + h * 0.2} z={-d * 0.32} color="#F4F1EA" rough={1} />
      <Box w={w * 0.4} h={h * 0.1} d={d * 0.16} x={w * 0.22} y={baseH + h * 0.2} z={-d * 0.32} color="#F4F1EA" rough={1} />
    </>
  );
}

function ShelfUnit({ w, d, h, color }) {
  const t = Math.min(0.04, h * 0.04);
  const shelves = Math.max(2, Math.round(h / 0.4));
  const parts = [];
  parts.push(<Box key="bk" w={w} h={h} d={t} y={h / 2} z={-d / 2 + t / 2} color={shade(color, 0.85)} />);
  parts.push(<Box key="l" w={t} h={h} d={d} x={-w / 2 + t / 2} y={h / 2} color={color} />);
  parts.push(<Box key="r" w={t} h={h} d={d} x={w / 2 - t / 2} y={h / 2} color={color} />);
  for (let i = 0; i <= shelves; i++) {
    parts.push(<Box key={`s${i}`} w={w} h={t} d={d} y={(i / shelves) * h} color={color} />);
  }
  return <>{parts}</>;
}

function Cabinet({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.7} />
      {/* door split + handles */}
      <Box w={0.01} h={h * 0.96} d={0.005} y={h / 2} z={d / 2} color={shade(color, 0.6)} />
      <Cyl r={0.012} h={h * 0.12} x={-w * 0.08} y={h * 0.5} z={d / 2} color={METAL_DK} rot={[0, 0, 0]} />
      <Cyl r={0.012} h={h * 0.12} x={w * 0.08} y={h * 0.5} z={d / 2} color={METAL_DK} />
    </>
  );
}

function Counter({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.92} d={d} y={h * 0.46} color={color} rough={0.7} />
      <Box w={w * 1.02} h={h * 0.08} d={d * 1.04} y={h * 0.96} color={shade(color, 1.1)} rough={0.35} />
    </>
  );
}

function Island({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.9} d={d} y={h * 0.45} color={color} rough={0.7} />
      <Box w={w * 1.04} h={h * 0.1} d={d * 1.06} y={h * 0.95} color={shade(color, 1.15)} rough={0.3} />
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
      <mesh position={[0, h * 0.86, 0]} castShadow>
        <coneGeometry args={[r * 0.7, h * 0.28, 24, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.6} side={DoubleSide} emissive={color} emissiveIntensity={0.25} />
      </mesh>
    </>
  );
}

function Pendant({ w, d, h, color }) {
  const r = Math.min(w, d);
  return (
    <>
      <Cyl r={0.006} h={h * 0.5} y={h * 0.75} color={METAL_DK} />
      <mesh position={[0, h * 0.4, 0]} castShadow>
        <coneGeometry args={[r * 0.55, h * 0.4, 24]} />
        <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={0.3} />
      </mesh>
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

function Mirror({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h} d={Math.max(d, 0.04)} y={h / 2} color={shade(color, 0.7)} />
      <Box w={w * 0.86} h={h * 0.9} d={0.01} y={h / 2} z={Math.max(d, 0.04) / 2} color={GLASS} rough={0.05} metal={0.5} />
    </>
  );
}

function Tv({ w, d, h, color }) {
  return (
    <>
      <Box w={w} h={h * 0.82} d={Math.max(d, 0.05)} y={h * 0.55} color="#1B1A17" rough={0.4} />
      <Box w={w * 0.94} h={h * 0.74} d={0.01} y={h * 0.55} z={Math.max(d, 0.05) / 2} color="#101418" rough={0.2} metal={0.3} />
      <Box w={w * 0.16} h={h * 0.14} d={d * 0.6} y={h * 0.07} color={METAL_DK} />
    </>
  );
}

function Car({ w, d, h, color }) {
  const bodyH = h * 0.42;
  const cabinH = h * 0.34;
  const wheelR = h * 0.22;
  const wx = w * 0.42;
  const wz = d * 0.3;
  return (
    <>
      {/* lower body */}
      <mesh position={[0, wheelR + bodyH * 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.94, bodyH, d * 0.98]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* cabin */}
      <mesh position={[0, wheelR + bodyH * 0.75 + cabinH * 0.5, -d * 0.02]} castShadow>
        <boxGeometry args={[w * 0.82, cabinH, d * 0.5]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* greenhouse / glass */}
      <mesh position={[0, wheelR + bodyH * 0.78 + cabinH * 0.5, -d * 0.02]}>
        <boxGeometry args={[w * 0.84, cabinH * 0.7, d * 0.46]} />
        <meshStandardMaterial color="#20252B" roughness={0.1} metalness={0.2} transparent opacity={0.85} />
      </mesh>
      {/* wheels */}
      {[[wx, wz], [-wx, wz], [wx, -wz], [-wx, -wz]].map(([x, z], i) => (
        <mesh key={i} position={[x, wheelR, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[wheelR, wheelR, w * 0.16, 18]} />
          <meshStandardMaterial color={TIRE} roughness={0.8} />
        </mesh>
      ))}
      {/* headlights */}
      <Box w={w * 0.16} h={h * 0.08} d={0.02} x={w * 0.28} y={wheelR + bodyH * 0.5} z={d * 0.49} color="#FFF4D6" rough={0.2} />
      <Box w={w * 0.16} h={h * 0.08} d={0.02} x={-w * 0.28} y={wheelR + bodyH * 0.5} z={d * 0.49} color="#FFF4D6" rough={0.2} />
    </>
  );
}

// Generic fallback: a softly-lit box, better material than the old flat one.
function GenericBox({ w, d, h, color }) {
  return <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.75} />;
}

// ---- structure builders ---------------------------------------------------

// A room shell: polygon floor slab + a wall around every edge (all sides shown).
function RoomShell({ w, d, h, kind, wallColor, floorColor }) {
  const poly = shapePolygon(kind) || [[0, 0], [1, 0], [1, 1], [0, 1]];
  const pts = poly.map(([nx, ny]) => [(nx - 0.5) * w, (ny - 0.5) * d]);
  const t = 0.11;

  const floorShape = new Shape();
  pts.forEach(([x, z], i) => (i === 0 ? floorShape.moveTo(x, -z) : floorShape.lineTo(x, -z)));
  floorShape.closePath();

  const edges = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    edges.push({
      mx: (a[0] + b[0]) / 2,
      mz: (a[1] + b[1]) / 2,
      len: Math.hypot(b[0] - a[0], b[1] - a[1]),
      ang: Math.atan2(b[1] - a[1], b[0] - a[0]),
    });
  }

  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} side={DoubleSide} />
      </mesh>
      {edges.map((e, i) => (
        <mesh key={i} position={[e.mx, h / 2, e.mz]} rotation={[0, -e.ang, 0]} castShadow receiveShadow>
          <boxGeometry args={[e.len + t, h, t]} />
          <meshStandardMaterial color={wallColor} roughness={0.9} />
        </mesh>
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
        <mesh key={i} position={[Math.cos(a) * R * 0.6, sh - rise / steps / 2, Math.sin(a) * R * 0.6]} rotation={[0, -a, 0]} castShadow receiveShadow>
          <boxGeometry args={[R, rise / steps, R * 1.1]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      );
    }
    return <>{parts}</>;
  }
  const run = d / steps;
  for (let i = 0; i < steps; i++) {
    const sh = (rise * (i + 1)) / steps;
    parts.push(
      <mesh key={i} position={[0, sh / 2, -d / 2 + (i + 0.5) * run]} castShadow receiveShadow>
        <boxGeometry args={[w, sh, run]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    );
  }
  return <>{parts}</>;
}

function Ramp({ w, d, h, color }) {
  const rise = 1.0;
  const len = Math.hypot(d, rise);
  const ang = Math.atan2(rise, d);
  return (
    <mesh position={[0, rise / 2, 0]} rotation={[-ang, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, Math.max(h, 0.06), len]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

// A real door: frame (jambs + head) with a leaf swung ~30° open (or two panes).
function Door({ w, d, h, shape, color }) {
  const jamb = Math.min(0.08, w * 0.08);
  const t = Math.max(d, 0.12);
  const parts = [];
  parts.push(<Box key="jl" w={jamb} h={h} d={t} x={-w / 2 + jamb / 2} y={h / 2} color={color} />);
  parts.push(<Box key="jr" w={jamb} h={h} d={t} x={w / 2 - jamb / 2} y={h / 2} color={color} />);
  parts.push(<Box key="hd" w={w} h={jamb} d={t} y={h - jamb / 2} color={color} />);
  const clear = w - 2 * jamb;
  const leafMat = shade(color, 0.85);
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
        <Cyl r={0.02} h={0.06} x={clear * 0.9} y={(h - jamb) * 0.5} z={0.04} rot={[Math.PI / 2, 0, 0]} color={METAL} metal={0.6} />
      </group>
    );
  }
  return <>{parts}</>;
}

// A real window: frame + glass, raised on a sill.
function Window({ w, d, h, shape, color }) {
  const sill = 0.85;
  const t = Math.max(d, 0.12);
  const fr = Math.min(0.06, w * 0.08);
  const parts = [];
  const yb = sill;
  parts.push(<Box key="b" w={w} h={fr} d={t} y={yb} color={color} />);
  parts.push(<Box key="t" w={w} h={fr} d={t} y={yb + h} color={color} />);
  parts.push(<Box key="l" w={fr} h={h} d={t} x={-w / 2 + fr / 2} y={yb + h / 2} color={color} />);
  parts.push(<Box key="r" w={fr} h={h} d={t} x={w / 2 - fr / 2} y={yb + h / 2} color={color} />);
  parts.push(<Box key="g" w={w - fr} h={h - fr} d={t * 0.25} y={yb + h / 2} color={GLASS} rough={0.08} metal={0.2} transparent opacity={0.45} />);
  if (shape?.slide || shape?.bay) {
    parts.push(<Box key="m" w={fr * 0.6} h={h - fr} d={t} y={yb + h / 2} color={color} />);
  }
  return <>{parts}</>;
}

// ---- dispatch -------------------------------------------------------------

function StructureGeometry({ item, w, d, h, wallColor, floorColor }) {
  const type = item.shape?.type;
  const color = item.color;
  if (type === 'polygon') {
    if (h <= 0.25) {
      // landing / low platform slab
      return <Box w={w} h={Math.max(h, 0.06)} d={d} y={Math.max(h, 0.06) / 2} color={color} rough={0.85} />;
    }
    return <RoomShell w={w} d={d} h={h} kind={item.kind} wallColor={wallColor || color} floorColor={floorColor || shade(color, 1.1)} />;
  }
  if (type === 'wall') return <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.9} />;
  if (type === 'column') return item.shape.round
    ? <Cyl r={Math.min(w, d) / 2} h={h} y={h / 2} color={color} rough={0.85} seg={22} />
    : <Box w={w} h={h} d={d} y={h / 2} color={color} rough={0.85} />;
  if (type === 'stairs') return <Stairs w={w} d={d} shape={item.shape} color={color} />;
  if (type === 'ramp') return <Ramp w={w} d={d} h={h} color={color} />;
  if (type === 'door') return <Door w={w} d={d} h={h} shape={item.shape} color={color} />;
  if (type === 'window') return <Window w={w} d={d} h={h} shape={item.shape} color={color} />;
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
  plant: Plant,
  planter: Planter,
  rug: Rug,
  mirror: Mirror,
  tv: Tv,
  car: Car,
  tree: Tree,
  lawn: Rug,
};

function FurnitureGeometry({ item, w, d, h }) {
  const Builder = BUILDERS[item.kind] || GenericBox;
  return <Builder w={w} d={d} h={h} color={item.color} />;
}

// Place one item (furniture or structure) in the world and render its model.
// If the item's `kind` has a real .glb registered, load and auto-fit it; while
// it streams in (or if it's missing/errors) we render the procedural build via
// the Suspense fallback, so the scene never blocks or goes blank.
export function PlacedItem({ item, cx, cz, wallColor, floorColor }) {
  const { w, d, h } = itemDims(item);
  const rot = (-item.rotation * Math.PI) / 180;

  const procedural = item.structure ? (
    <StructureGeometry item={item} w={w} d={d} h={h} wallColor={wallColor} floorColor={floorColor} />
  ) : (
    <FurnitureGeometry item={item} w={w} d={d} h={h} />
  );

  const entry = modelFor(item.kind);

  return (
    <group position={[item.x - cx, 0, item.y - cz]} rotation={[0, rot, 0]}>
      {entry ? (
        <Suspense fallback={procedural}>
          <ModelItem entry={entry} w={w} d={d} h={h} />
        </Suspense>
      ) : (
        procedural
      )}
    </group>
  );
}
