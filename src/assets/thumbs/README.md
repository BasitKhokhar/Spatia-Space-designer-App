# 2D item thumbnails (`.png`)

Drop square PNGs here to replace the flat vector glyphs in the catalog/browse
tiles with real product-style images. Each file is wired to an item `kind` in
[`src/components/graphics/itemThumbs.js`](../../components/graphics/itemThumbs.js).

## Add a thumbnail in 3 steps

1. Save a square PNG here, e.g. `car.png` (256×256, transparent background).
2. In `src/components/graphics/itemThumbs.js`, uncomment/add:
   ```js
   car: require('../../assets/thumbs/car.png'),
   ```
3. Reload. Every catalog/drawer/placement tile for that kind shows the image.
   Items without a PNG keep their vector glyph.

## Best source: render it from the GLB you already added

When you export a model for 3D (`src/assets/models/<name>.glb`), render one frame
in Blender and save it here:

1. Open the `.glb` in Blender, frame the object.
2. A **3/4 view** reads best on tiles; a **top-down** view matches the floor plan.
3. Set the world/film to **transparent** (Render Properties → Film → Transparent).
4. Render (F12) → Image → Save As → PNG, square resolution (e.g. 256×256).

Any product photo or icon PNG works too, as long as it's roughly square.

## Notes

- Images are shown with `resizeMode: contain`, so non-square art won't distort —
  but square art fills the tile best.
- These thumbnails are for the **browse tiles** only. The top-down floor-plan
  editor canvas is drawn separately (Skia) and is a later step.
