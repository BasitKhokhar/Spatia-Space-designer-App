import { useMemo } from 'react';
import { Box3, Vector3 } from 'three';

import { useGLTFModel } from './gltf';

// Renders a real .glb model, auto-fitted into the item's local frame:
//   origin at the floor, centered on X/Z, sitting on y = 0, facing +Z.
// This matches exactly how the procedural builders draw, so a modeled item
// drops into <PlacedItem> in place of the box version with no layout change.
//
// Fitting: we measure the loaded model's bounding box and scale it uniformly so
// it either fits fully inside the w×h×d item box ('contain') or fills the
// footprint ('cover'). Uniform scale keeps proportions — no stretching.
export function ModelItem({ entry, w, d, h }) {
  const gltf = useGLTFModel(entry.src);

  const object = useMemo(() => {
    // Clone so multiple placements of the same kind don't share one instance.
    const obj = gltf.scene.clone(true);

    const box = new Box3().setFromObject(obj);
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

    obj.scale.setScalar(s);
    // Recenter on X/Z and rest the model's lowest point on the floor.
    obj.position.set(-center.x * s, -box.min.y * s + (entry.yOffset || 0), -center.z * s);

    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return obj;
  }, [gltf, w, d, h, entry]);

  return (
    <group rotation={[0, entry.rotY || 0, 0]}>
      <primitive object={object} />
    </group>
  );
}
