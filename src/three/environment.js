// Procedural environment scenes for image-based lighting (IBL).
//
// WHY THIS EXISTS
// Every surface in the app uses meshStandardMaterial, which is a physically-based
// shader. PBR splits light into direct (our lights) and indirect (the surrounding
// environment). With `scene.environment === null` the indirect term is exactly
// zero — no ambient specular, no reflections, no sky bounce. That missing term is
// what makes the current render read as "3D shapes" instead of "a room".
//
// Rather than ship an .hdr file (megabytes, and one fixed mood), we build a tiny
// three.js scene out of emissive planes and let PMREMGenerator convolve it into a
// prefiltered radiance map. That gives us a per-preset environment for free, in
// code, tuned to match each lighting mood in lighting.js.
//
// The scene is disposable — it exists only long enough for PMREM to render it into
// a cube target, then it is thrown away. See Environment.jsx.

import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
} from 'three';

// A dome big enough that the emissive panels sit well inside it.
const DOME_SIZE = 100;

// ---------------------------------------------------------------------------
// Gradient dome
// ---------------------------------------------------------------------------

// An inverted box painted with a sky -> horizon -> ground vertical gradient via
// vertex colors. This is what fills the majority of the hemisphere and therefore
// sets the overall ambient tint of the scene.
function makeDome(skyHex, groundHex) {
  const geo = new BoxGeometry(DOME_SIZE, DOME_SIZE, DOME_SIZE);
  const pos = geo.attributes.position;
  const sky = new Color(skyHex);
  const ground = new Color(groundHex);
  // Horizon is a blend of the two, slightly brightened — real skies are brightest
  // near the horizon, and that gradient is what gives surfaces their soft rolloff.
  const horizon = sky.clone().lerp(ground, 0.5).multiplyScalar(1.12);

  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    // -1 (floor) .. +1 (ceiling)
    const t = pos.getY(i) / (DOME_SIZE / 2);
    if (t >= 0) c.copy(horizon).lerp(sky, Math.min(1, t * 1.15));
    else c.copy(horizon).lerp(ground, Math.min(1, -t * 1.35));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));

  return new Mesh(geo, new MeshBasicMaterial({ side: BackSide, vertexColors: true }));
}

// ---------------------------------------------------------------------------
// Emissive panels
// ---------------------------------------------------------------------------

// A flat emissive quad. PMREM reads emissive as radiance, so these act as area
// lights in the convolution — which is exactly how we get soft, directional
// specular highlights that a point/directional light cannot produce.
//
// MeshStandardMaterial rather than Basic specifically because emissiveIntensity
// can exceed 1: the sun must be far brighter than white for the environment to
// carry any real dynamic range.
function panel(hex, power, size, position, lookAt = [0, 0, 0]) {
  const mat = new MeshStandardMaterial({
    color: 0x000000,
    emissive: new Color(hex),
    emissiveIntensity: power,
  });
  const mesh = new Mesh(new PlaneGeometry(size, size), mat);
  mesh.position.set(position[0], position[1], position[2]);
  // PlaneGeometry's front face is +Z, and lookAt aims +Z at the target — so this
  // leaves the lit face pointing back at the origin, where PMREM's cameras sit.
  // (Default FrontSide is therefore correct here; BackSide would be invisible.)
  mesh.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  return mesh;
}

/**
 * Build a throwaway scene describing the surrounding light for one lighting preset.
 * Caller is responsible for disposeEnvScene() once PMREM has consumed it.
 *
 * @param {object} preset an entry from LIGHTING in ./lighting
 * @returns {Scene}
 */
export function buildEnvScene(preset) {
  const scene = new Scene();

  const sky = preset.background || '#EAE0D2';
  const ground = preset.ground || preset.floor || '#8A8378';
  scene.add(makeDome(sky, ground));

  const sunColor = preset.directional?.color || '#FFFFFF';
  const sunPower = preset.sunPower ?? 12;
  const sunSize = preset.sunSize ?? 26;

  if (sunPower > 0) {
    // Place the key panel along the preset's own sun direction so the IBL
    // highlight and the shadow-casting directionalLight agree with each other.
    const dir = preset.directional?.position || [4, 6, 2];
    const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const dist = DOME_SIZE * 0.34;
    scene.add(
      panel(sunColor, sunPower, sunSize, [
        (dir[0] / len) * dist,
        (dir[1] / len) * dist,
        (dir[2] / len) * dist,
      ])
    );
  }

  // Fill from the opposite side + overhead, so interiors are not lit from a single
  // direction (which produces dead black sides on every object).
  const fill = preset.fillColor || sky;
  const fillPower = preset.fillPower ?? 0.9;
  const dir = preset.directional?.position || [4, 6, 2];
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const d = DOME_SIZE * 0.32;
  scene.add(panel(fill, fillPower, 46, [(-dir[0] / len) * d, DOME_SIZE * 0.12, (-dir[2] / len) * d]));
  scene.add(panel(fill, fillPower * 0.75, 60, [0, DOME_SIZE * 0.42, 0]));

  // Dark presets: the sky contributes almost nothing, so without these the scene
  // has no specular at all and metal/glass go completely flat. Small warm quads at
  // roughly lamp height stand in for interior lighting.
  if (preset.lampPower) {
    const r = DOME_SIZE * 0.11;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      scene.add(
        panel(preset.lampColor || '#FFD8A0', preset.lampPower, 7, [
          Math.cos(a) * r,
          2.2,
          Math.sin(a) * r,
        ])
      );
    }
  }

  return scene;
}

/** Release every geometry and material in a scene built by buildEnvScene. */
export function disposeEnvScene(scene) {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
}

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

// PMREMGenerator allocates its cubeUV render target as HalfFloatType (RGBA16F).
// Rendering *into* a half-float target requires EXT_color_buffer_half_float (or
// the full-float variant). This is present on effectively every GLES3 Android
// driver and all iOS devices, but it is not guaranteed — and a missing extension
// surfaces as an incomplete framebuffer that throws inside setRenderTarget and
// takes the whole canvas down. So we check first.
export function envSupported(gl) {
  try {
    return !!(
      gl?.extensions?.has('EXT_color_buffer_half_float') ||
      gl?.extensions?.has('EXT_color_buffer_float')
    );
  } catch (e) {
    return false;
  }
}
