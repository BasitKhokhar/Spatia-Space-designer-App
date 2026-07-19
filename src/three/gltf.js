// Self-contained GLB/GLTF loader for Expo + react-three-fiber.
//
// Loads a bundled `.glb` (require()'d module) into a parsed three.js scene and
// caches it, integrating with React Suspense: while a model streams in the
// component "suspends" and the caller's <Suspense fallback> (our procedural
// box) is shown instead. No extra dependency — we read the asset's bytes with
// expo-file-system and hand the ArrayBuffer straight to three's GLTFLoader.parse
// (so embedded textures in the .glb load with it, no network/XHR involved).

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

// Decode a base64 string to an ArrayBuffer without relying on atob (not always
// present in the RN runtime).
function base64ToArrayBuffer(b64) {
  let len = b64.length;
  if (b64[len - 1] === '=') len--;
  if (b64[len - 1] === '=') len--;
  const bytes = new Uint8Array((len * 3) / 4 | 0);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = LOOKUP[b64.charCodeAt(i)];
    const e2 = LOOKUP[b64.charCodeAt(i + 1)];
    const e3 = LOOKUP[b64.charCodeAt(i + 2)];
    const e4 = LOOKUP[b64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bytes.length) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bytes.length) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes.buffer;
}

async function loadGLB(moduleRef) {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync(); // resolves to a local file:// uri on device
  const uri = asset.localUri || asset.uri;
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const buffer = base64ToArrayBuffer(b64);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(buffer, '', resolve, reject);
  });
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
