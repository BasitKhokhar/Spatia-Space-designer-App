import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import { Shape, DoubleSide } from 'three';

import { LIGHTING } from './lighting';
import { floorMaterialById } from '@/data/materials';
import { wallLength } from '@/domain/floorplan';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Camera orbit rig. `cam` is a plain object mutated by gestures:
//   { azimuth, polar, radius, target: [x, y, z] }
// The rig damps the actual camera toward those values each frame so motion
// glides instead of snapping, and culls the two wall(s) nearest the camera so
// the interior stays visible from any orbit angle (architectural cutaway).
export function CameraRig({ cam, wallsRef }) {
  const { camera } = useThree();
  const sm = useRef(null);

  useFrame(() => {
    const target = cam.target;
    if (!sm.current) {
      sm.current = {
        azimuth: cam.azimuth,
        polar: cam.polar,
        radius: cam.radius,
        tx: target[0],
        ty: target[1],
        tz: target[2],
      };
    }
    const s = sm.current;
    const k = 0.18; // damping factor — higher = snappier, lower = floatier
    s.azimuth += (cam.azimuth - s.azimuth) * k;
    s.polar += (cam.polar - s.polar) * k;
    s.radius += (cam.radius - s.radius) * k;
    s.tx += (target[0] - s.tx) * k;
    s.ty += (target[1] - s.ty) * k;
    s.tz += (target[2] - s.tz) * k;

    const polar = clamp(s.polar, 0.04, Math.PI / 2 + 0.42);
    const x = s.tx + s.radius * Math.sin(polar) * Math.cos(s.azimuth);
    // Keep the eye above the floor even when tilted below the horizon, so a low
    // angle reads as a ground-level look-up instead of clipping underground.
    const y = Math.max(0.2, s.ty + s.radius * Math.cos(polar));
    const z = s.tz + s.radius * Math.sin(polar) * Math.sin(s.azimuth);
    camera.position.set(x, y, z);
    camera.lookAt(s.tx, s.ty, s.tz);
    camera.updateProjectionMatrix();

    // Hide the wall(s) sitting between the camera and the room so we can always
    // see inside. Each perimeter wall group carries an outward normal; hide it
    // when the camera is on its outward side (works for any polygon shape).
    const group = wallsRef?.current;
    if (group) {
      const dz = 0.02; // small deadzone to avoid flicker when near-orthogonal
      for (const wall of group.children) {
        const o = wall.userData.outward;
        if (!o) continue;
        const vx = camera.position.x - wall.position.x;
        const vz = camera.position.z - wall.position.z;
        wall.visible = vx * o[0] + vz * o[1] <= dz;
      }
    }
  });

  return null;
}

// Solid wall spans left after removing opening intervals from [0, L].
function solidSpans(L, intervals) {
  const spans = [];
  let cursor = 0;
  for (const [u0, u1] of intervals) {
    if (u0 > cursor) spans.push([cursor, u0]);
    cursor = Math.max(cursor, u1);
  }
  if (cursor < L) spans.push([cursor, L]);
  return spans;
}

// A wall segment rendered as boxes, with door/window openings cut out.
// `outward` (optional [x,z] normal) tags a perimeter wall so the cutaway culling
// can hide it when the camera is on its outer side.
function WallMesh({ wall, cx, cz, height, color, openings, outward }) {
  const ax = wall.x1 - cx;
  const az = wall.y1 - cz;
  const bx = wall.x2 - cx;
  const bz = wall.y2 - cz;
  const L = wallLength(wall) || 0.01;
  const t = wall.thickness || 0.12;
  const angle = Math.atan2(bz - az, bx - ax);
  const mx = (ax + bx) / 2;
  const mz = (az + bz) / 2;

  const ops = openings
    .map((o) => {
      const u = o.t * L;
      return { ...o, u0: clamp(u - o.width / 2, 0, L), u1: clamp(u + o.width / 2, 0, L) };
    })
    .sort((p, q) => p.u0 - q.u0);

  const spans = solidSpans(L, ops.map((o) => [o.u0, o.u1]));

  return (
    <group position={[mx, 0, mz]} rotation={[0, -angle, 0]} userData={{ outward }}>
      {/* full-height solid spans between openings */}
      {spans.map(([u0, u1], i) => {
        const w = u1 - u0;
        if (w <= 0.001) return null;
        return (
          <mesh key={`s${i}`} position={[(u0 + u1) / 2 - L / 2, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, height, t]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}

      {/* per-opening: lintel above, sill below (windows), glass pane */}
      {ops.map((o, i) => {
        const localX = (o.u0 + o.u1) / 2 - L / 2;
        const w = o.u1 - o.u0;
        const topOfOpening = o.sill + o.height;
        const lintelH = Math.max(0, height - topOfOpening);
        return (
          <group key={`o${i}`}>
            {lintelH > 0.01 ? (
              <mesh position={[localX, topOfOpening + lintelH / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[w, lintelH, t]} />
                <meshStandardMaterial color={color} />
              </mesh>
            ) : null}
            {o.sill > 0.01 ? (
              <mesh position={[localX, o.sill / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[w, o.sill, t]} />
                <meshStandardMaterial color={color} />
              </mesh>
            ) : null}
            {o.kind === 'window' ? (
              <mesh position={[localX, o.sill + o.height / 2, 0]}>
                <boxGeometry args={[w * 0.94, o.height * 0.94, t * 0.3]} />
                <meshStandardMaterial color="#9fc4dc" transparent opacity={0.4} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function FurnitureBox({ item, cx, cz }) {
  const w = item.w * item.scale;
  const d = item.d * item.scale;
  const h = item.h * item.scale;
  return (
    <mesh
      position={[item.x - cx, h / 2, item.y - cz]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      castShadow
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={item.color} />
    </mesh>
  );
}

// Builds the room from a floor-plan model, centered at the origin.
export default function Room3D({ plan, lighting = 'golden', cam }) {
  const preset = LIGHTING[lighting] || LIGHTING.golden;
  const cx = plan.width / 2;
  const cz = plan.length / 2;
  const h = plan.wallHeight;
  const span = Math.max(plan.width, plan.length);
  const wallsRef = useRef();

  const floorMat = floorMaterialById(plan.materials?.floor);
  const wallColor = plan.materials?.wall || preset.wall;
  const openingsFor = (id) => plan.openings.filter((o) => o.wallId === id);

  const perimeter = plan.walls.filter((w) => w.perimeter);
  const interior = plan.walls.filter((w) => !w.perimeter);

  // Outward normal (world [x,z]) for each perimeter wall, oriented away from the
  // room center at the origin — drives the cutaway culling for any shape.
  const outwardFor = (w) => {
    const mx = (w.x1 + w.x2) / 2 - cx;
    const mz = (w.y1 + w.y2) / 2 - cz;
    let nx = -(w.y2 - w.y1);
    let nz = w.x2 - w.x1;
    if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    const len = Math.hypot(nx, nz) || 1;
    return [nx / len, nz / len];
  };

  // Polygon floor for freeform footprints (rectangles use a plane).
  const floorShape = useMemo(() => {
    if (!plan.footprint || plan.footprint.length < 3) return null;
    const s = new Shape();
    plan.footprint.forEach((p, i) => {
      const X = p.x - cx;
      const Y = cz - p.y; // shape Y -> world -Z after the -90° X rotation
      if (i === 0) s.moveTo(X, Y);
      else s.lineTo(X, Y);
    });
    s.closePath();
    return s;
  }, [plan.footprint, cx, cz]);

  // Fallback camera state if the viewer didn't pass one.
  const fallback = useRef({
    azimuth: Math.PI * 0.75,
    polar: 0.9,
    radius: span * 1.6,
    target: [0, h * 0.35, 0],
  }).current;
  const camState = cam || fallback;

  return (
    <>
      <color attach="background" args={[preset.background]} />
      <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity} />
      <directionalLight
        color={preset.directional.color}
        intensity={preset.directional.intensity}
        position={preset.directional.position}
        castShadow
      />
      {lighting === 'night' || lighting === 'evening' ? (
        <pointLight color="#FFD8A0" intensity={1.2} position={[0, h - 0.4, 0]} distance={span * 1.6} />
      ) : null}

      <CameraRig cam={camState} wallsRef={wallsRef} />

      {/* floor — polygon shape for freeform footprints, otherwise a plane */}
      <mesh position={[0, -0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        {floorShape ? <shapeGeometry args={[floorShape]} /> : <planeGeometry args={[plan.width, plan.length]} />}
        <meshStandardMaterial color={floorMat.c3d} roughness={floorMat.rough} side={DoubleSide} />
      </mesh>

      {/* perimeter walls — the ones facing the camera are auto-culled */}
      <group ref={wallsRef}>
        {perimeter.map((w) => (
          <WallMesh
            key={w.id}
            wall={w}
            cx={cx}
            cz={cz}
            height={h}
            color={wallColor}
            openings={openingsFor(w.id)}
            outward={outwardFor(w)}
          />
        ))}
      </group>

      {/* interior partitions (always visible) */}
      {interior.map((w) => (
        <WallMesh key={w.id} wall={w} cx={cx} cz={cz} height={h} color={wallColor} openings={openingsFor(w.id)} />
      ))}

      {/* furniture */}
      {plan.furniture.map((f) => (
        <FurnitureBox key={f.id} item={f} cx={cx} cz={cz} />
      ))}
    </>
  );
}
