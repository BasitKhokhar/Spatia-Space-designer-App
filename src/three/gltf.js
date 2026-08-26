// Self-contained GLB/GLTF loader for Expo + react-three-fiber.
//
// Loads a bundled `.glb` (require()'d module) into a parsed three.js scene and
// caches it, integrating with React Suspense: while a model streams in the
// component "suspends" and the caller's <Suspense fallback> (our procedural
// box) is shown instead. No extra dependency — we read the asset's bytes with
// expo-file-system and hand the ArrayBuffer straight to three's GLTFLoader.parse
// (so embedded textures in the .glb load with it, no network/XHR involved).
//
// Bytes come from expo-file-system's File.arrayBuffer(), which crosses the JSI
// boundary as binary. The obvious alternative — readAsStringAsync(base64) plus a
// JS decode loop — costs roughly four times the file size in peak heap (the
// base64 string is UTF-16 in Hermes) and blocks the JS thread for the whole
// decode, which freezes every gesture on the 3D screen while a model loads.

import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Anything larger than this is a mis-published asset, not a piece of furniture.
// Refusing it degrades that one item to its procedural box; parsing it risks
// taking the whole app down with a native OOM. The pipeline's own output tops
// out around 4MB (scripts/models/pipeline/2-optimize.mjs).
const MAX_GLB_BYTES = 12 * 1024 * 1024;

// --- React Native compatibility shim ---------------------------------------
// three's GLTFLoader sniffs the browser via `navigator.userAgent` (to decide
// whether to use ImageBitmapLoader). React Native defines `navigator` but leaves
// `userAgent` undefined, so `navigator.userAgent.match(...)` throws
//   "Cannot read property 'match' of undefined"
// and takes the whole 3D canvas down. Give it a harmless string once, up front,
// so the loader safely takes the plain-TextureLoader path (RN has no
// createImageBitmap anyway). Must run before any GLTFLoader.parse() call.
if (typeof navigator !== 'undefined' && navigator.userAgent == null) {
  try {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'ReactNative',
      configurable: true,
      writable: true,
    });
  } catch (e) {
    try { navigator.userAgent = 'ReactNative'; } catch (_) { /* read-only: ignore */ }
  }
}

// Parses a .glb at a local file:// URI. Exported so src/three/remoteModels.js
// can reuse it for models downloaded from the catalog API instead of require()'d
// from the bundle.
export async function parseGlbAtUri(uri) {
  const t0 = Date.now();
  const file = new File(uri);
  const size = file.size ?? 0;
  if (size > MAX_GLB_BYTES) {
    throw new Error(`glb too large (${size} bytes, limit ${MAX_GLB_BYTES}): ${uri}`);
  }

  const buffer = await file.arrayBuffer();
  const t1 = Date.now();
  console.log(`[3D] read glb (${t1 - t0}ms), byteLength=${buffer.byteLength}: ${uri}`);

  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      (gltf) => {
        console.log(`[3D] GLTFLoader.parse done (${Date.now() - t1}ms): ${uri}`);
        resolve(gltf);
      },
      (err) => {
        console.error(`[3D] GLTFLoader.parse failed (${Date.now() - t1}ms): ${uri}`, err?.message || err);
        reject(err);
      }
    );
  });
}

async function loadGLB(moduleRef) {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync(); // resolves to a local file:// uri on device
  const uri = asset.localUri || asset.uri;
  return parseGlbAtUri(uri);
}

const cache = new Map(); // moduleRef -> { status, result, error, promise }

// Suspense-friendly read: throws a promise while loading, throws on error,
// returns the parsed gltf ({ scene, animations, ... }) once ready.
export function useGLTFModel(moduleRef) {
  let entry = cache.get(moduleRef);
  if (!entry) {
    entry = { status: 'pending' };
    entry.promise = loadGLB(moduleRef).then(
      (gltf) => { entry.status = 'done'; entry.result = gltf; },
      (err) => { entry.status = 'error'; entry.error = err; }
    );
    cache.set(moduleRef, entry);
  }
  if (entry.status === 'pending') throw entry.promise;
  if (entry.status === 'error') throw entry.error;
  return entry.result;
}

// Optional: warm the cache ahead of time (e.g. on a viewer mount) so models are
// ready by the time items render. Safe to call repeatedly.
export function preloadModel(moduleRef) {
  if (!cache.has(moduleRef)) {
    const entry = { status: 'pending' };
    entry.promise = loadGLB(moduleRef).then(
      (gltf) => { entry.status = 'done'; entry.result = gltf; },
      (err) => { entry.status = 'error'; entry.error = err; }
    );
    cache.set(moduleRef, entry);
  }
}
