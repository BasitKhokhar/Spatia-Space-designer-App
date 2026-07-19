# Top-down plan images (`.png`)

Drop square **top-down** PNGs here to make placed items look real on the 2D
floor-plan editor canvas (a car reads as a car from above, not a colored box).
Each file is wired to an item `kind` in
[`src/components/editor/planTops.js`](../../components/editor/planTops.js).

These are **different** from `src/assets/thumbs` (those are 3/4 tile art). Plan
images are the object seen straight from above.

## Add one in 3 steps

1. Save a square top-down PNG here, e.g. `car.png` (256×256, transparent bg).
2. In `src/components/editor/planTops.js`, uncomment/add:
   ```js
   car: require('../../assets/tops/car.png'),
   ```
3. Reload the editor — every placed item of that kind draws the image; the rest
   keep the vector box.

## Rendering from the GLB (Blender)

1. Open the `.glb`, add a Camera, set it to **Orthographic**, pointing straight
   **down** (top view: numpad 7).
2. Rotate the model so its **front faces up** in the view (toward the top of the
   frame) — the canvas rotates the image by the item's rotation, so "up = front"
   keeps it aligned with the front tick.
3. Render Properties → Film → **Transparent**.
4. Render (F12) → save square PNG here.

The image is drawn with `fit: contain` into the item's footprint, so proportions
are preserved even if the PNG isn't a perfect square.
