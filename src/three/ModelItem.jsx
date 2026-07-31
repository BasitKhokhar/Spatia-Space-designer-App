import { useMemo } from 'react';
import { Box3, Vector3 } from 'three';

import { useGLTFModel } from './gltf';
import { prepareModel, projectedGeometry, materialFor, slotColor } from './prepareModel';

// Renders a real .glb model, auto-fitted into the item's local frame:
//   origin at the floor, centered on X/Z, sitting on y = 0, facing +Z.
// This matches exactly how the procedural builders draw, so a modeled item
// drops into <PlacedItem> in place of the box version with no layout change.
//
// Fitting: we measure the loaded model's bounding box and scale it uniformly so
// it either fits fully inside the w×h×d item box ('contain') or fills the
// footprint ('cover'). Uniform scale keeps proportions — no stretching.
//
// MATERIALS
// The .glb's own materials are never used. prepareModel() has already replaced
// them with shared library materials chosen by the GLB's material NAME (see
// materials/kenneyMap.js — the kit is authored unlit and untextured, so drawing
// it as-authored would look worse than the procedural fallback). Here we only
// override the one slot that responds to the item's colour swatch.
//
// GEOMETRY
// UVs are box-projected per placement, because tiling is defined in real-world
// metres and the fit scale is what turns model units into metres. Both the
// projected geometry and the materials come from module-level caches, so a room
// full of the same chair allocates nothing per instance.
export function ModelItem({ entry, w, d, h, color }) {
  const gltf = useGLTFModel(entry.src);

  const object = useMemo(() => {
    const { root } = prepareModel(gltf);

    // Measure the prepared source: transforms are baked, so this is the same box
    // the clone would give, without building the clone first.
    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    const sx = w / (size.x || 1);
    const sy = h / (size.y || 1);
    const sz = d / (size.z || 1);
    // 'contain' → largest scale that still fits every axis inside the box.
    // 'cover'   → fill the floor footprint (height may exceed the item box).
    const base = entry.fit === 'cover' ? Math.max(sx, sz) : Math.min(sx, sy, sz);
    const s = base * (entry.scale || 1);

    // Clone so multiple placements of the same kind don't share one instance.
    // Geometry and materials are still shared — only the node graph is copied.
    const obj = root.clone(true);

    // Pair source and clone by traversal order rather than reading the clone's
    // userData: Object3D.copy() round-trips userData through JSON, which is both
    // wasteful and lossy for anything that isn't plain data.
    const src = [];
    root.traverse((o) => {
      if (o.isMesh) src.push(o);
    });
    const dst = [];
    obj.traverse((o) => {
      if (o.isMesh) dst.push(o);
    });

    for (let i = 0; i < dst.length; i++) {
      const slots = src[i]?.userData?.slots;
      if (!slots?.length) continue;

      // GLTFLoader splits a multi-primitive mesh into one Mesh per primitive, so
      // in practice there is exactly one slot here; the array path is kept for
      // safety rather than because the kit uses it.
      const single = slots.length === 1;
      dst[i].geometry = projectedGeometry(src[i].geometry, slots[0].def.id, s);

      const built = slots.map((slot) => {
        const c = slotColor(slot, color);
        // No override → keep the prepared material, already in the shared cache.
        return c ? materialFor(slot.def, c) : null;
      });

      if (single) {
        if (built[0]) dst[i].material = built[0];
      } else if (built.some(Boolean)) {
        dst[i].material = built.map((m, k) => m || src[i].material[k]);
      }
    }

    obj.scale.setScalar(s);
    // Recenter on X/Z and rest the model's lowest point on the floor.
    obj.position.set(-center.x * s, -box.min.y * s + (entry.yOffset || 0), -center.z * s);

    return obj;
  }, [gltf, w, d, h, entry, color]);

  return (
    <group rotation={[0, entry.rotY || 0, 0]}>
      <primitive object={object} />
    </group>
  );
}
