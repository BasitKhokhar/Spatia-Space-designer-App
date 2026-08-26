// Installs a prefiltered environment map on the scene, generated procedurally
// from the active lighting preset. Renders nothing itself.
//
// This is the single highest-impact change in the 3D pipeline: it turns on the
// indirect lighting term for every meshStandardMaterial in the app at once.
// See environment.js for why.

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber/native';
import { PMREMGenerator } from 'three';
import { buildEnvScene, disposeEnvScene, envSupported } from './environment';
import { setEnvIntensity } from './materials/library';
import { setTextureInvalidator } from './materials/textures';

// Logged once so a device that silently falls back is still diagnosable.
let warned = false;

export default function Environment({ preset, intensity = 1 }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  // Exposure is part of the mood, not a constant. Dark presets need to be lifted
  // or the ACES curve crushes them to black; bright ones sit at 1.0.
  useEffect(() => {
    gl.toneMappingExposure = preset.exposure ?? 1;
    invalidate();
  }, [gl, preset, invalidate]);

  // Materials are cached and shared, so the indirect-light gain is applied to the
  // whole cache at once rather than per-material at construction time.
  useEffect(() => {
    setEnvIntensity(intensity);
    invalidate();
  }, [intensity, invalidate]);

  // Textures resolve asynchronously and return an empty texture synchronously.
  // Without this, one arriving after first paint would never be shown under
  // frameloop="demand".
  useEffect(() => {
    setTextureInvalidator(invalidate);
    return () => setTextureInvalidator(null);
  }, [invalidate]);

  useEffect(() => {
    if (!envSupported(gl)) {
      if (!warned) {
        warned = true;
        console.warn(
          '[3D] EXT_color_buffer_half_float unavailable — falling back to analytic lights only.'
        );
      }
      scene.environment = null;
      return undefined;
    }

    let pmrem = null;
    let rt = null;
    let envScene = null;

    try {
      pmrem = new PMREMGenerator(gl);
      envScene = buildEnvScene(preset);
      // sigma pre-blurs the source before convolution, which hides the fact that
      // our "sun" is a hard-edged quad rather than a real solar disc.
      rt = pmrem.fromScene(envScene, 0.04, 0.1, 100);
      scene.environment = rt?.texture ?? null;
      scene.environmentIntensity = intensity;
      invalidate();
    } catch (e) {
      // An incomplete framebuffer throws inside setRenderTarget. Never let that
      // reach the canvas — a flat scene is infinitely better than a blank one.
      console.warn('[3D] environment generation failed, using analytic lights:', e?.message || e);
      scene.environment = null;
      rt?.dispose();
      rt = null;
    } finally {
      if (envScene) disposeEnvScene(envScene);
      pmrem?.dispose();
    }

    return () => {
      scene.environment = null;
      rt?.dispose();
    };
  }, [gl, scene, preset, intensity, invalidate]);

  return null;
}
