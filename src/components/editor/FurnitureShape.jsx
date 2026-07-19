import { Image as SkiaImage, useImage, RoundedRect, Line } from '@shopify/react-native-skia';

import { planTopFor } from './planTops';

// Darken/lighten a #rrggbb hex by factor f (1 = same, <1 darker, >1 lighter).
function shade(hex, f) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.round(Math.min(255, Math.max(0, ((n >> 16) & 255) * f)));
  const g = Math.round(Math.min(255, Math.max(0, ((n >> 8) & 255) * f)));
  const b = Math.round(Math.min(255, Math.max(0, (n & 255) * f)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Top-down car silhouette drawn straight on the plan canvas so a placed vehicle
// reads as a car (hood, cabin, glass, wheels) instead of a flat box. Drawn in the
// item's local frame: origin centered, front = up (-Y), width = w, length = d.
function CarTop({ f, w, d }) {
  const body = f.color || '#3E4A5C';
  const roof = shade(body, 0.78);
  const glass = '#232A32';
  const tyre = '#141416';
  const head = '#FFF3D0';
  const tail = '#C0392B';

  const wheelW = w * 0.13;
  const wheelL = d * 0.16;
  const wx = w * 0.4; // wheel-center offset from the centreline

  return (
    <>
      {/* wheels (under the body so only their outer edge shows at the sides) */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
        <RoundedRect
          key={i}
          x={sx * wx - wheelW / 2}
          y={sy * d * 0.28 - wheelL / 2}
          width={wheelW}
          height={wheelL}
          r={wheelW * 0.4}
          color={tyre}
        />
      ))}

      {/* body shell */}
      <RoundedRect x={-w * 0.4} y={-d * 0.47} width={w * 0.8} height={d * 0.94} r={w * 0.3} color={body} />

      {/* cabin / roof, set slightly back from the nose */}
      <RoundedRect x={-w * 0.31} y={-d * 0.05} width={w * 0.62} height={d * 0.28} r={w * 0.16} color={roof} />

      {/* windshield (front) + rear window as tinted glass */}
      <RoundedRect x={-w * 0.28} y={-d * 0.19} width={w * 0.56} height={d * 0.15} r={w * 0.1} color={glass} opacity={0.92} />
      <RoundedRect x={-w * 0.26} y={d * 0.23} width={w * 0.52} height={d * 0.11} r={w * 0.09} color={glass} opacity={0.92} />

      {/* side mirrors */}
      <RoundedRect x={-w * 0.48} y={-d * 0.12} width={w * 0.09} height={d * 0.05} r={w * 0.02} color={roof} />
      <RoundedRect x={w * 0.39} y={-d * 0.12} width={w * 0.09} height={d * 0.05} r={w * 0.02} color={roof} />

      {/* hood centre line (also reads as the front indicator) */}
      <Line p1={{ x: 0, y: -d * 0.44 }} p2={{ x: 0, y: -d * 0.22 }} color="#ffffff" strokeWidth={1.5} opacity={0.4} />

      {/* headlights (front) + taillights (rear) */}
      <RoundedRect x={-w * 0.3} y={-d * 0.46} width={w * 0.13} height={d * 0.04} r={w * 0.02} color={head} />
      <RoundedRect x={w * 0.17} y={-d * 0.46} width={w * 0.13} height={d * 0.04} r={w * 0.02} color={head} />
      <RoundedRect x={-w * 0.3} y={d * 0.42} width={w * 0.13} height={d * 0.035} r={w * 0.02} color={tail} />
      <RoundedRect x={w * 0.17} y={d * 0.42} width={w * 0.13} height={d * 0.035} r={w * 0.02} color={tail} />
    </>
  );
}

// Draws one furniture item's body on the 2D plan canvas. Rendered inside a
// <Group> that already applies the item's translate + rotation, so this only
// shapes the body in the item's local frame (origin at center, front = up / -Y).
//
// Priority: a registered top-down PNG (planTops.js) wins; otherwise a hand-drawn
// top-down vector for known kinds (car); otherwise the original rounded-rect +
// front-tick fallback. `useImage` returns null while decoding, so a vector shows
// until any image is ready — never a blank gap.
export default function FurnitureShape({ f, w, d }) {
  const src = planTopFor(f.kind);
  const image = useImage(src || null);

  if (src && image) {
    return (
      <SkiaImage image={image} x={-w / 2} y={-d / 2} width={w} height={d} fit="contain" />
    );
  }

  if (f.kind === 'car') {
    return <CarTop f={f} w={w} d={d} />;
  }

  return (
    <>
      <RoundedRect x={-w / 2} y={-d / 2} width={w} height={d} r={8} color={f.color} opacity={0.92} />
      {/* front indicator */}
      <Line
        p1={{ x: 0, y: -d / 2 }}
        p2={{ x: 0, y: -d / 2 + Math.min(14, d * 0.3) }}
        color="#ffffff"
        strokeWidth={2}
        opacity={0.7}
      />
    </>
  );
}
