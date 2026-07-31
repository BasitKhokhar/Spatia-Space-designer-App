import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import { Shape, DoubleSide } from 'three';

import { LIGHTING } from './lighting';
import Environment from './Environment';
import { boxGeo, planeGeo, shapeGeo } from './geometry';
import { getMaterial } from './materials/library';
import { tileOf } from './materials/manifest';
import { PlacedItem, Door } from './models';
import { floorMaterialById } from '@/data/materials';
import { wallLength, itemWallOpenings } from '@/domain/floorplan';

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
  const invalidate = useThree((s) => s.invalidate);
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
    // NOTE: no updateProjectionMatrix() here. Only the camera's *position* and
    // orientation change; fov/near/far/aspect never do (r3f updates the
    // projection itself on resize). Calling it every frame was pure waste.

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

    // --- keep the loop alive while anything is still moving -----------------
    //
    // The canvas runs frameloop="demand", so a frame is only drawn when someone
    // calls invalidate(). Gesture handlers invalidate on touch, but this rig also
    // animates on its own — damping toward the target, fling inertia, auto-rotate
    // — and none of that goes through React. So it has to re-arm itself.
    //
    // The damping is geometric (k = 0.18), so once the user lets go this converges
    // and stops re-arming after ~40 frames. That is what lets a parked 3D view
    // drop to *zero* rendered frames instead of burning 60fps and cooking the
    // phone until it thermally throttles.
    const settling =
      Math.abs(cam.azimuth - s.azimuth) > 1e-4 ||
      Math.abs(cam.polar - s.polar) > 1e-4 ||
      Math.abs(cam.radius - s.radius) > 1e-3 ||
      Math.abs(target[0] - s.tx) > 1e-3 ||
      Math.abs(target[1] - s.ty) > 1e-3 ||
      Math.abs(target[2] - s.tz) > 1e-3;

    if (settling || cam.velAz || cam.velPolar || interacting || cam.autoRotate) {
      invalidate();
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

// ---------------------------------------------------------------------------
// Trim
// ---------------------------------------------------------------------------
//
// Skirting boards and door/window casings. These are the cheapest realism win
// in the whole renderer: a flat plane meeting a flat plane at a hard right angle
// is the single strongest "this is a diagram" cue, and every real room breaks
// that line with trim. Each piece is one shared-cache box with an existing
// material, so this adds draw calls bounded by WALL count, not furniture count,
// and not one new shader program.
//
// Trim is painted, not papered — real interiors run white trim against a
// coloured wall, and it also gives the eye a reference tone that makes the wall
// colour read correctly.
const TRIM_MAT = 'paint';
const TRIM_COLOR = '#F4F1EA';

const BASEBOARD_H = 0.1; // skirting height
const BASEBOARD_PROUD = 0.015; // how far it stands off the wall face, per side
const CASING_W = 0.06; // door/window architrave width
const CASING_PROUD = 0.02;

// Architrave around one opening, in the wall's local frame (x along the wall,
// y up from the floor, z through the wall's thickness).
function Casing({ localX, w, t, sill, height, window: isWindow }) {
  const d = t + CASING_PROUD * 2;
  const top = sill + height;
  const outerW = w + CASING_W * 2;
  const trim = getMaterial({ id: TRIM_MAT, color: TRIM_COLOR, rough: 0.7 });
  // The jambs run from the sill (windows) or the floor (doors) up to the head.
  const jambH = height + CASING_W;
  return (
    <group position={[localX, 0, 0]}>
      <mesh
        position={[-(w + CASING_W) / 2, sill + jambH / 2, 0]}
        receiveShadow
        geometry={boxGeo(CASING_W, jambH, d)}
        material={trim}
      />
      <mesh
        position={[(w + CASING_W) / 2, sill + jambH / 2, 0]}
        receiveShadow
        geometry={boxGeo(CASING_W, jambH, d)}
        material={trim}
      />
      <mesh
        position={[0, top + CASING_W / 2, 0]}
        receiveShadow
        geometry={boxGeo(outerW, CASING_W, d)}
        material={trim}
      />
      {/* Window board — the shelf a window sits on. Doors meet the floor, so
          they get no bottom piece. */}
      {isWindow && sill > 0.01 ? (
        <mesh
          position={[0, sill - CASING_W / 2, 0]}
          receiveShadow
          geometry={boxGeo(outerW, CASING_W, d + CASING_PROUD * 2)}
          material={trim}
        />
      ) : null}
    </group>
  );
}

// A wall segment rendered as boxes, with door/window openings cut out.
// `outward` (optional [x,z] normal) tags a perimeter wall so the cutaway culling
// can hide it when the camera is on its outer side.
function WallMesh({ wall, cx, cz, height, color, openings, outward, mat = 'plaster' }) {
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
          <mesh
            key={`s${i}`}
            position={[(u0 + u1) / 2 - L / 2, height / 2, 0]}
            castShadow
            receiveShadow
            geometry={boxGeo(w, height, t, tileOf(mat))}
            material={getMaterial({ id: mat, color, rough: 0.92 })}
          />
        );
      })}

      {/* skirting, on the solid spans only — it must not run across a doorway.
          One box per span covers BOTH wall faces (it is proud on each side), and
          it deliberately does not cast: a 10cm strip contributes nothing but
          noise to the shadow map. */}
      {spans.map(([u0, u1], i) => {
        const w = u1 - u0;
        if (w <= 0.001) return null;
        return (
          <mesh
            key={`bb${i}`}
            position={[(u0 + u1) / 2 - L / 2, BASEBOARD_H / 2, 0]}
            receiveShadow
            geometry={boxGeo(w, BASEBOARD_H, t + BASEBOARD_PROUD * 2)}
            material={getMaterial({ id: TRIM_MAT, color: TRIM_COLOR, rough: 0.7 })}
          />
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
              <mesh
                position={[localX, topOfOpening + lintelH / 2, 0]}
                castShadow
                receiveShadow
                geometry={boxGeo(w, lintelH, t, tileOf(mat))}
                material={getMaterial({ id: mat, color })}
              />
            ) : null}
            {o.sill > 0.01 ? (
              <mesh
                position={[localX, o.sill / 2, 0]}
                castShadow
                receiveShadow
                geometry={boxGeo(w, o.sill, t, tileOf(mat))}
                material={getMaterial({ id: mat, color })}
              />
            ) : null}
            {/* architrave: two jambs + a head, each proud of both wall faces.
                Windows get a fourth piece at the sill, which is what makes an
                opening read as a fitted window rather than a hole. */}
            <Casing localX={localX} w={w} t={t} sill={o.sill} height={o.height} window={o.kind === 'window'} />

            {o.kind === 'window' ? (
              <mesh
                position={[localX, o.sill + o.height / 2, 0]}
                geometry={boxGeo(w * 0.94, o.height * 0.94, t * 0.3)}
                material={getMaterial({ id: 'glass', color: '#9fc4dc', opacity: 0.4 })}
              />
            ) : o.kind === 'door' && !o.id?.startsWith('item-open-') ? (
              <group position={[localX, 0, 0]}>
                <Door w={w} d={t} h={o.height} color={color} />
              </group>
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
  // The finish id doubles as the material-library key — the ids in FLOOR_MATERIALS
  // ('oak', 'tile', ...) are intentionally the same ones in MATERIAL_DEFS, so
  // every project saved before textures existed picks up the right one for free.
  const floorMatId = plan.materials?.floor || 'oak';
  const wallColor = plan.materials?.wall || preset.wall;
  const wallMatId = plan.materials?.wallMaterial || 'plaster';
  // Top of the stack reads as a roof (darker); interior levels get a light
  // plaster ceiling that the level above sits on. Either way the slab is only
  // shown when the camera is inside this floor (see CameraRig culling).
  // `materials.roof` is historically a hex string; accept an object too so a real
  // roof type can be introduced later without breaking saved plans.
  const roofSetting = plan.materials?.roof;
  const ceilingColor = isRoof
    ? (typeof roofSetting === 'string' ? roofSetting : roofSetting?.color) || '#8C8378'
    : '#F1ECE3';
  const ceilingMatId = isRoof ? 'concrete' : 'plaster';
  // Real wall openings, plus see-through gaps derived from door/window items that
  // were dropped onto a wall (so an open door reveals the next room, not wall).
  const itemOpenings = useMemo(() => itemWallOpenings(plan), [plan.furniture, plan.walls]);
  // Bucket openings by wall once, rather than re-filtering both lists for every
  // wall on every render. Was O(walls x openings) and allocated two throwaway
  // arrays per wall per render.
  const openingsByWall = useMemo(() => {
    const map = new Map();
    const add = (o) => {
      const list = map.get(o.wallId);
      if (list) list.push(o);
      else map.set(o.wallId, [o]);
    };
    (plan.openings || []).forEach(add);
    itemOpenings.forEach(add);
    return map;
  }, [plan.openings, itemOpenings]);

  const EMPTY = useMemo(() => [], []);
  const openingsFor = (id) => openingsByWall.get(id) || EMPTY;

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

  // Stable cache key for the polygon slab geometry — a THREE.Shape has no identity
  // of its own, so the geometry cache needs the outline spelled out.
  const floorShapeKey = useMemo(
    () =>
      plan.footprint && plan.footprint.length >= 3
        ? plan.footprint.map((p) => `${Math.round((p.x - cx) * 1000)},${Math.round((cz - p.y) * 1000)}`).join(';')
        : `rect:${Math.round(plan.width * 1000)}x${Math.round(plan.length * 1000)}`,
    [plan.footprint, plan.width, plan.length, cx, cz]
  );

  // A blank plan (no footprint and no perimeter walls) renders no floor slab or
  // ceiling — it reads as empty space. Placed structures bring their own floor +
  // walls (see RoomShell), so a room only appears once the user adds one.
  const hasShell = floorShape != null || perimeter.length > 0;

  // Register / unregister this floor's perimeter wall group for cutaway culling.
  const wallsRef = useRef();
  useEffect(() => {
    const g = wallsRef.current;
    if (g && wallsRegistry) wallsRegistry.add(g);
    return () => { if (g && wallsRegistry) wallsRegistry.delete(g); };
  }, [wallsRegistry]);

  return (
    <group position={[0, yOffset, 0]} visible={visible}>
      {/* floor slab — only when the plan has a shell (footprint / perimeter). */}
      {hasShell ? (
        <mesh
          position={[0, -0.02, 0]}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={
            floorShape
              ? shapeGeo(floorShape, floorShapeKey, tileOf(floorMatId))
              : planeGeo(plan.width, plan.length, tileOf(floorMatId))
          }
          material={getMaterial({
            id: floorMatId,
            color: floorMat.c3d,
            rough: floorMat.rough,
            side: DoubleSide,
          })}
        />
      ) : null}

      {/* perimeter walls + ceiling/roof — the faces between the camera and the
          interior are auto-culled so you can always see inside (cutaway), yet a
          look from below reveals the roof. Skipped entirely for a blank plan. */}
      {hasShell ? (
        <group ref={wallsRef}>
          {perimeter.map((w) => (
            <WallMesh key={w.id} wall={w} cx={cx} cz={cz} height={h} color={wallColor} mat={wallMatId} openings={openingsFor(w.id)} outward={outwardFor(w)} />
          ))}

          {/* ceiling / roof slab, capping the walls at their full height. Only
              rendered when the camera is inside this floor (culled per-frame). */}
          <mesh
            position={[0, h, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            userData={{ horizontal: true, worldBaseY: yOffset, worldTopY: yOffset + h, footprintXZ }}
            geometry={
              floorShape
                ? shapeGeo(floorShape, floorShapeKey, tileOf(ceilingMatId))
                : planeGeo(plan.width, plan.length, tileOf(ceilingMatId))
            }
            material={getMaterial({
              id: ceilingMatId,
              color: ceilingColor,
              rough: isRoof ? 0.85 : 0.95,
              side: DoubleSide,
            })}
          />
        </group>
      ) : null}

      {/* interior partitions (always visible) */}
      {interior.map((w) => (
        <WallMesh key={w.id} wall={w} cx={cx} cz={cz} height={h} color={wallColor} mat={wallMatId} openings={openingsFor(w.id)} />
      ))}

      {/* furniture & placed structure — realistic procedural models */}
      {plan.furniture.map((f) => (
        <PlacedItem key={f.id} item={f} cx={cx} cz={cz} wallColor={wallColor} floorColor={floorMat.c3d} plan={plan} />
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
  const { levels, totalH, span, list } = useMemo(() => {
    const l = floors && floors.length ? floors : [{ id: '__single', plan }];
    let acc = 0;
    const lv = l.map((f) => {
      const yOffset = acc;
      acc += f.plan.wallHeight || 2.6;
      return { id: f.id, plan: f.plan, yOffset };
    });
    return {
      list: l,
      levels: lv,
      totalH: acc,
      span: Math.max(...l.map((f) => Math.max(f.plan.width, f.plan.length))),
    };
  }, [floors, plan]);

  // Fallback camera state if the viewer didn't pass one.
  const fallback = useRef({
    azimuth: Math.PI * 0.75,
    polar: 0.9,
    radius: span * 1.6,
    target: [0, totalH * 0.35, 0],
  }).current;
  const camState = cam || fallback;
  const groundMat = floorMaterialById(levels[0].plan.materials?.floor);

  // Shadow-camera fitting.
  //
  // The old frustum was a fixed ±span box, which is twice the building's own
  // half-extent on each axis — four times the area, so three quarters of the
  // shadow map covered empty space. The bounding SPHERE of the building is the
  // tightest bound that stays correct for every light direction (an axis-aligned
  // box would clip as the sun moves), and it is a one-line computation.
  const shadow = useMemo(() => {
    const d = preset.directional.position;
    const len = Math.hypot(d[0], d[1], d[2]) || 1;
    // Where the sun sits. Kept at the previous distance so shadow direction and
    // softness are unchanged — only the frustum tightens.
    const pos = [d[0] * span * 0.5, d[1] * span * 0.5 + totalH, d[2] * span * 0.5];
    const dist = Math.hypot(pos[0], pos[1], pos[2]) || 1;
    // Half-diagonal of the width x length x height box, centered on the origin.
    const radius = 0.5 * Math.hypot(span, span, totalH);
    return {
      pos,
      radius,
      // Clamp the near plane above zero — a near of 0 destroys depth precision
      // across the whole map, which shows up as shadow acne on flat floors.
      near: Math.max(0.5, dist - radius),
      far: dist + radius * 2,
      len,
    };
  }, [preset, span, totalH]);

  return (
    <>
      <color attach="background" args={[preset.background]} />
      {/* No distance fog. There is no ground plane in this scene, so fog has
          nothing to haze except the building — and since the fog color matches
          the background, zooming out past ~2.5x span dissolved the model into
          the backdrop. Zoom goes to span * 7, so any fog near plane inside that
          range washes out the subject. */}
      {/* Indirect light for every meshStandardMaterial in the scene. Everything
          below is only the *direct* term — without this the PBR shader has no
          ambient specular at all, which is what made the old render read flat. */}
      <Environment preset={preset} intensity={preset.envIntensity ?? 1} />
      {/* The analytic lights are deliberately weak now: the environment supplies
          ambient and fill, so keeping the old intensities here would blow out. */}
      <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity} />
      {/* Floor-bounce cheat — tints upward-facing surfaces with the floor color,
          which IBL alone can't know about since it has no scene geometry. */}
      <hemisphereLight args={[preset.background, groundMat.c3d, 0.15]} />
      {/* Sun / key light. shadow-normalBias offsets along the surface normal, which
          is the correct fix for peter-panning on box geometry — a large constant
          bias (the old -0.0006) detaches contact shadows and makes furniture read
          as unglued from the floor. */}
      <directionalLight
        color={preset.directional.color}
        intensity={preset.directional.intensity}
        position={shadow.pos}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={shadow.near}
        shadow-camera-far={shadow.far}
        shadow-camera-left={-shadow.radius}
        shadow-camera-right={shadow.radius}
        shadow-camera-top={shadow.radius}
        shadow-camera-bottom={-shadow.radius}
        shadow-normalBias={0.02}
        shadow-bias={-0.0001}
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
