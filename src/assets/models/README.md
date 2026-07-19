# 3D item models (`.glb`)

Drop artist-made low-poly `.glb` files here to make catalog items look realistic
in the 3D view. Each file is wired to an item `kind` in
[`src/three/modelRegistry.js`](../../three/modelRegistry.js).

## Add a model in 3 steps

1. Save the file here, e.g. `car.glb`.
2. In `src/three/modelRegistry.js`, uncomment/add:
   ```js
   car: model(require('../assets/models/car.glb'), { rotY: Math.PI }),
   ```
3. Reload the app. The car item now renders the real model, auto-fitted to its
   footprint. Every other item keeps its procedural look until you add its file.

## Requirements

- Format: **`.glb`** (single self-contained file with textures embedded).
  Convert `.gltf`+textures or `.fbx`/`.obj` to `.glb` in Blender
  (File → Export → glTF 2.0 → format **glTF Binary (.glb)**).
- Keep it light: aim for **< 5k triangles** and textures ≤ 1024px. Phones
  render dozens of these at once.
- Model should sit roughly upright with its front facing **+Z**; use `rotY` in
  the registry to correct orientation, `scale`/`yOffset` to fine-tune.

## Free, app-safe (CC0 / CC-BY) sources

| Source | URL | Good for |
|--------|-----|----------|
| Kenney | https://kenney.nl/assets | furniture, cars, city |
| Quaternius | https://quaternius.com | furniture, nature, props |
| Poly Pizza | https://poly.pizza | huge searchable low-poly library |
| Sketchfab | https://sketchfab.com (filter License = CC0) | everything, export glTF |

Prefer stylized low-poly packs — they are exactly the "not a real photo, but
clearly a car/sofa" look you see in other apps, and they perform well on-device.
