// Dev-only renderer statistics probe.
//
// There is no Spector.js or browser devtools on React Native, so without this the
// only way to judge a 3D optimisation is by feel — which is exactly how people end
// up "optimising" things that were never the bottleneck. This samples the numbers
// that actually matter once a second and hands them to the caller to display.
//
// Renders nothing. Compiled out of release builds by the __DEV__ guard at the
// call site.
//
// WHAT THE NUMBERS MEAN
//   calls      draw calls per frame. Each one is CPU overhead; this is the number
//              instancing/merging would reduce. Target <= 150.
//   tris       triangles per frame. Rarely the mobile bottleneck at our scale.
//   programs   compiled shader programs. THE number to watch: every unique
//              material combination compiles one, and that compile burst is the
//              stall when opening the 3D view. Target <= 12.
//   geo / tex  live GPU resources. Should plateau, not climb — a climbing count
//              means the caches are missing and something is leaking.
//   matCache   entries in the material cache (see materials/library.js).
//   fps        frames actually rendered in the last second. Under
//              frameloop="demand" this should fall to 0 when nothing is moving —
//              if it sits at 60 on a static scene, an invalidate() loop is stuck on.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import { geometryCacheSize } from './geometry';
import { materialCacheSize } from './materials/library';

export default function PerfProbe({ onSample, intervalMs = 1000 }) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const last = useRef(Date.now());

  useFrame(() => {
    frames.current += 1;
  });

  useEffect(() => {
    if (!onSample) return undefined;
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - last.current) / 1000;
      last.current = now;
      const info = gl?.info;
      onSample({
        fps: dt > 0 ? Math.round(frames.current / dt) : 0,
        calls: info?.render?.calls ?? 0,
        tris: info?.render?.triangles ?? 0,
        programs: info?.programs?.length ?? 0,
        geometries: info?.memory?.geometries ?? 0,
        textures: info?.memory?.textures ?? 0,
        geoCache: geometryCacheSize(),
        matCache: materialCacheSize(),
      });
      frames.current = 0;
    }, intervalMs);
    return () => clearInterval(id);
  }, [gl, onSample, intervalMs]);

  return null;
}
