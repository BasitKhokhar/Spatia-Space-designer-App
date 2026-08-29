// What each asset kind actually buys the user offline.
//
// This exists so "how much you can do offline depends on how much you've
// downloaded" is a stated contract the Settings screen can render, rather than
// emergent behaviour nobody can explain. Order is download order.

export const TIERS = [
  {
    kind: 'planTop',
    icon: 'image',
    label: 'Top-down plan images',
    unlocks: 'Photoreal 2D floor plan',
    // Small, and it is the view users spend the most time in — so it is worth
    // downloading first even though 3D is the flashier feature.
    blurb: 'Real product artwork on the 2D canvas instead of generic shapes.',
  },
  {
    kind: 'thumb',
    icon: 'layers',
    label: 'Catalog thumbnails',
    unlocks: 'Offline catalog browsing',
    blurb: 'Product photos in the catalog drawer without a connection.',
  },
  {
    kind: 'model',
    icon: 'cube',
    label: '3D models',
    unlocks: 'Photoreal 3D view',
    // By far the heaviest tier — typically ~80% of the total bytes.
    blurb: 'Real furniture geometry in 3D instead of built-in stand-ins.',
  },
];

export const TIER_ORDER = TIERS.map((t) => t.kind);

// Tier 0 is the art compiled into the app: 37 bundled top-down PNGs and the
// bundled Kenney .glb set. It costs zero bytes, is always present, and is what
// every fallback path lands on. Nothing here can remove it — which is why the
// app is fully usable having downloaded nothing at all.
export const BUNDLED_TIER = {
  label: 'Built-in artwork',
  unlocks: 'Full 2D editing and basic 3D',
  bytes: 0,
};
