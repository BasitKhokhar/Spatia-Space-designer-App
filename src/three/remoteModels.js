// Download + cache + Suspense-load a catalog item's remote .glb (produced by
// scripts/models/pipeline/, served from the backend bucket at item.modelUrl).
//
// Mirrors gltf.js's bundled-model pattern exactly (Suspense-friendly Map
// cache, base64 -> ArrayBuffer -> GLTFLoader.parse via parseGlbAtUri) so
// ModelItem/models.jsx can treat a remote entry the same way as a bundled
// one: suspend while loading, throw on error, <ModelBoundary> catches either
// and keeps showing the procedural fallback.

import * as FileSystem from 'expo-file-system/legacy';
import { parseGlbAtUri } from './gltf';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

function localPathFor(slug) {
  return `${MODELS_DIR}${slug}.glb`;
}

// Downloads item to the app's document directory on first use, then reuses
// the file forever after (catalog items are immutable once published — a
// changed model gets a new slug, per assets.config.mjs convention). Returns
// the local file:// URI.
export async function ensureLocalModel(slug, url) {
  const path = localPathFor(slug);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    console.log(`[3D] remote model cache hit: ${slug}`);
    return path;
  }

  await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true }).catch(() => {});
  console.log(`[3D] downloading remote model: ${slug}`);
  try {
    await FileSystem.downloadAsync(url, path);
    return path;
  } catch (e) {
    // Never leave a partial file behind — a truncated .glb would "cache hit"
    // on the next attempt and fail to parse.
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    throw e;
  }
}

const cache = new Map(); // slug -> { status, result, error, promise }

// Suspense-friendly read, same contract as gltf.js's useGLTFModel: throws a
// promise while loading, throws the error on failure, returns the parsed
// gltf once ready.
export function useRemoteGLTF(slug, url) {
  let entry = cache.get(slug);
  if (!entry) {
    entry = { status: 'pending' };
    entry.promise = ensureLocalModel(slug, url)
      .then((uri) => parseGlbAtUri(uri))
      .then(
        (gltf) => { entry.status = 'done'; entry.result = gltf; },
        (err) => { entry.status = 'error'; entry.error = err; }
      );
    cache.set(slug, entry);
  }
  if (entry.status === 'pending') throw entry.promise;
  if (entry.status === 'error') throw entry.error;
  return entry.result;
}

// Warm the download+parse cache for a set of catalog items ahead of time
// (e.g. when a project opens) so already-placed remote items don't pop from
// procedural to real on first render. Best-effort — a failed preload just
// means the normal Suspense/ModelBoundary path handles it on demand instead.
export function preloadRemoteModels(items) {
  for (const item of items) {
    if (!item?.modelUrl || cache.has(item.id)) continue;
    const entry = { status: 'pending' };
    entry.promise = ensureLocalModel(item.id, item.modelUrl)
      .then((uri) => parseGlbAtUri(uri))
      .then(
        (gltf) => { entry.status = 'done'; entry.result = gltf; },
        (err) => { entry.status = 'error'; entry.error = err; }
      );
    cache.set(item.id, entry);
  }
}
