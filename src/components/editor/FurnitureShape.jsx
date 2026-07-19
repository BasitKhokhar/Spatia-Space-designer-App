import { Image as SkiaImage, useImage, RoundedRect, Line } from '@shopify/react-native-skia';

import { planTopFor } from './planTops';

// Draws one furniture item's body on the 2D plan canvas. Rendered inside a
// <Group> that already applies the item's translate + rotation, so this only
// shapes the body in the item's local frame (origin at center, front = up / -Y).
//
// If the item's `kind` has a registered top-down PNG (planTops.js) we draw that
// real image fitted to the w×d footprint; otherwise we fall back to the original
// rounded-rect + front-tick vector. `useImage` returns null while decoding, so
// the vector shows until the image is ready — never a blank gap.
export default function FurnitureShape({ f, w, d }) {
  const src = planTopFor(f.kind);
  const image = useImage(src || null);

  if (src && image) {
    return (
      <SkiaImage image={image} x={-w / 2} y={-d / 2} width={w} height={d} fit="contain" />
    );
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
