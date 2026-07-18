import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import { Shape, DoubleSide } from 'three';

import { LIGHTING } from './lighting';
import { PlacedItem } from './models';
import { floorMaterialById } from '@/data/materials';
import { wallLength } from '@/domain/floorplan';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Ray-cast point-in-polygon on the XZ plane. `poly` is an array of [x, z] pairs
// in building-centered world coordinates. Used to decide whether the camera is
// standing inside a floor's footprint (so its ceiling should close over you).
function pointInPolyXZ(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

// Camera orbit rig. `cam` is a plain object mutated by gestures:
//   { azimuth, polar, radius, target: [x, y, z] }
// The rig damps the actual camera toward those values each frame so motion
// glides instead of snapping, and culls the two wall(s) nearest the camera so
// the interior stays visible from any orbit angle (architectural cutaway).
const POLAR_LO = 0.04;
const POLAR_HI = Math.PI / 2 + 0.42;
const AUTO_ROTATE_SPEED = 0.28; // rad/sec — slow turntable showcase spin

export function CameraRig({ cam, wallsRegistry, cutaway = true }) {
  const { camera } = useThree();
  const sm = useRef(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta || 0.016, 0.05); // clamp so a stutter can't jump
    const interacting = (cam.active || 0) > 0;

    // Idle turntable: keep spinning slowly while the user isn't touching.
    if (cam.autoRotate && !interacting) {
      cam.azimuth += AUTO_ROTATE_SPEED * dt;
    }

    // Inertia/fling: after releasing an orbit or twist, drift on and decay.
    if (!interacting && (cam.velAz || cam.velPolar)) {
      cam.azimuth += (cam.velAz || 0) * dt;
      cam.polar = clamp(cam.polar + (cam.velPolar || 0) * dt, POLAR_LO, POLAR_HI);
      const decay = Math.pow(0.94, dt * 60); // ~0.94 per 60fps frame
      cam.velAz = (cam.velAz || 0) * decay;
      cam.velPolar = (cam.velPolar || 0) * decay;
      if (Math.abs(cam.velAz) < 0.0004) cam.velAz = 0;
      if (Math.abs(cam.velPolar) < 0.0004) cam.velPolar = 0;
    }

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

    // Cutaway mode: hide the wall(s) between the camera and each floor so we can
    // always see inside. Every perimeter wall group carries an outward normal; hide
    // it when the camera is on its outward side (works for any polygon shape, on
    // every stacked floor). Solid mode keeps all walls visible for an exterior look.
    const registry = wallsRegistry;
    if (registry) {
      const dz = 0.02; // small deadzone to avoid flicker when near-orthogonal
      for (const group of registry) {
        if (!group) continue;
        for (const el of group.children) {
          const o = el.userData.outward;
          if (o) {
            // Perimeter wall. Solid mode keeps every wall so the building reads
            // as a complete exterior from any angle; cutaway hides the wall(s)
            // between the camera and the interior for a peek inside.
            if (!cutaway) {
              el.visible = true;
            } else {
              const vx = camera.position.x - el.position.x;
              const vz = camera.position.z - el.position.z;
              el.visible = vx * o[0] + vz * o[1] <= dz;
            }
          } else if (el.userData.horizontal) {
            // Ceiling / roof: shown ONLY when the camera is inside this floor's
            // room — within the footprint and between its floor and ceiling. So
            // every outside view (top, sides, below) sees straight in to the
            // walls, floor and items, and the ceiling closes over you only once
            // you move the camera inside. Independent of the cutaway toggle.
            const camY = camera.position.y;
            const insideXZ = pointInPolyXZ(camera.position.x, camera.position.z, el.userData.footprintXZ);
            el.visible = insideXZ && camY < el.userData.worldTopY + dz && camY > el.userData.worldBaseY - dz;
          }
        }
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
            <meshStandardMaterial color={color} roughness={0.92} />
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

// One floor level: floor slab + walls + furniture, drawn at `yOffset` above the
// ground and hidden as a whole when `visible` is false. Its perimeter wall group
// registers into `wallsRegistry` so the CameraRig can cutaway-cull it per frame.
function FloorLevel({ plan, yOffset = 0, visible = true, preset, wallsRegistry, isRoof = false }) {
  const cx = plan.width / 2;
  const cz = plan.length / 2;
  const h = plan.wallHeight || 2.6;
  const floorMat = floorMaterialById(plan.materials?.floor);
  const wallColor = plan.materials?.wall || preset.wall;
  // Top of the stack reads as a roof (darker); interior levels get a light
  // plaster ceiling that the level above sits on. Either way the slab is only
  // shown when the camera is inside this floor (see CameraRig culling).
  const ceilingColor = isRoof ? plan.materials?.roof || '#8C8378' : '#F1ECE3';
  const openingsFor = (id) => plan.openings.filter((o) => o.wallId === id);

  // Footprint as an [x, z] polygon in building-centered world coords — lets the
  // CameraRig test whether the camera is standing inside this floor's room.
  const footprintXZ = useMemo(() => {
    if (plan.footprint && plan.footprint.length >= 3) {
      return plan.footprint.map((p) => [p.x - cx, p.y - cz]);
    }
    return [[-cx, -cz], [cx, -cz], [cx, cz], [-cx, cz]];
  }, [plan.footprint, cx, cz]);

  const perimeter = plan.walls.filter((w) => w.perimeter);
  const interior = plan.walls.filter((w) => !w.perimeter);

  const outwardFor = (w) => {
    const mx = (w.x1 + w.x2) / 2 - cx;
    const mz = (w.y1 + w.y2) / 2 - cz;
    let nx = -(w.y2 - w.y1);
    let nz = w.x2 - w.x1;
    if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    const len = Math.hypot(nx, nz) || 1;
    return [nx / len, nz / len];
  };

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

  // Register / unregister this floor's perimeter wall group for cutaway culling.
  const wallsRef = useRef();
  useEffect(() => {
    const g = wallsRef.current;
    if (g && wallsRegistry) wallsRegistry.add(g);
    return () => { if (g && wallsRegistry) wallsRegistry.delete(g); };
  }, [wallsRegistry]);

  return (
    <group position={[0, yOffset, 0]} visible={visible}>
      {/* floor slab */}
      <mesh position={[0, -0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        {floorShape ? <shapeGeometry args={[floorShape]} /> : <planeGeometry args={[plan.width, plan.length]} />}
        <meshStandardMaterial color={floorMat.c3d} roughness={floorMat.rough} side={DoubleSide} />
      </mesh>

      {/* perimeter walls + ceiling/roof — the faces between the camera and the
          interior are auto-culled so you can always see inside (cutaway), yet a
          look from below reveals the roof. */}
      <group ref={wallsRef}>
        {perimeter.map((w) => (
          <WallMesh key={w.id} wall={w} cx={cx} cz={cz} height={h} color={wallColor} openings={openingsFor(w.id)} outward={outwardFor(w)} />
        ))}

        {/* ceiling / roof slab, capping the walls at their full height. Only
            rendered when the camera is inside this floor (culled per-frame). */}
        <mesh
          position={[0, h, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          userData={{ horizontal: true, worldBaseY: yOffset, worldTopY: yOffset + h, footprintXZ }}
        >
          {floorShape ? <shapeGeometry args={[floorShape]} /> : <planeGeometry args={[plan.width, plan.length]} />}
          <meshStandardMaterial color={ceilingColor} roughness={isRoof ? 0.85 : 0.95} side={DoubleSide} />
        </mesh>
      </group>

      {/* interior partitions (always visible) */}
      {interior.map((w) => (
        <WallMesh key={w.id} wall={w} cx={cx} cz={cz} height={h} color={wallColor} openings={openingsFor(w.id)} />
      ))}

      {/* furniture & placed structure — realistic procedural models */}
      {plan.furniture.map((f) => (
        <PlacedItem key={f.id} item={f} cx={cx} cz={cz} wallColor={wallColor} floorColor={floorMat.c3d} />
      ))}
    </group>
  );
}

// Builds a building from one or more stacked floors, centered at the origin.
// Pass `floors` (array of { id, plan }) for multi-floor; a single `plan` still
// works (rendered as one level). `visibleFloors` is an optional Set of floor ids.
export default function Room3D({ plan, floors, visibleFloors, lighting = 'golden', cam, cutaway = true }) {
  const preset = LIGHTING[lighting] || LIGHTING.golden;
  const wallsRegistry = useRef(new Set()).current;

  // Normalize to a floor list, then stack each by cumulative wall height.
  const list = floors && floors.length ? floors : [{ id: '__single', plan }];
  let acc = 0;
  const levels = list.map((f) => {
    const yOffset = acc;
    acc += (f.plan.wallHeight || 2.6);
    return { id: f.id, plan: f.plan, yOffset };
  });
  const totalH = acc;
  const span = Math.max(...list.map((f) => Math.max(f.plan.width, f.plan.length)));

  // Fallback camera state if the viewer didn't pass one.
  const fallback = useRef({
    azimuth: Math.PI * 0.75,
    polar: 0.9,
    radius: span * 1.6,
    target: [0, totalH * 0.35, 0],
  }).current;
  const camState = cam || fallback;
  const groundMat = floorMaterialById(levels[0].plan.materials?.floor);

  return (
    <>
      <color attach="background" args={[preset.background]} />
      <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity * 0.8} />
      {/* soft sky/ground fill so surfaces gradate instead of reading flat */}
      <hemisphereLight args={[preset.background, groundMat.c3d, 0.55]} />
      <directionalLight
        color={preset.directional.color}
        intensity={preset.directional.intensity}
        position={[preset.directional.position[0] * span * 0.5, preset.directional.position[1] * span * 0.5 + totalH, preset.directional.position[2] * span * 0.5]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={(span + totalH) * 4}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-bias={-0.0006}
      />
      {lighting === 'night' || lighting === 'evening' ? (
        <pointLight color="#FFD8A0" intensity={1.2} position={[0, totalH - 0.4, 0]} distance={span * 1.6} />
      ) : null}

      <CameraRig cam={camState} wallsRegistry={wallsRegistry} cutaway={cutaway} />

      {levels.map((l, i) => (
        <FloorLevel
          key={l.id}
          plan={l.plan}
          yOffset={l.yOffset}
          visible={!visibleFloors || visibleFloors.has(l.id)}
          preset={preset}
          wallsRegistry={wallsRegistry}
          isRoof={i === levels.length - 1}
        />
      ))}
    </>
  );
}
