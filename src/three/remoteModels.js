// Suspense-load a catalog item's remote .glb.
//
// The DOWNLOAD half now lives in src/services/assets — one cache for models,
// thumbnails and plan images, with progress, pause/resume, a persisted manifest
// and content-token invalidation. This module keeps the two things that are
// genuinely 3D-specific and were hard-won here:
//
//   1. the parse concurrency gate (an OOM guard, see below), and
//   2. the Suspense contract that ModelItem/models.jsx build on.
//
// Mirrors gltf.js's bundled-model pattern (Suspense-friendly Map cache,
// parseGlbAtUri) so ModelItem can treat a remote entry like a bundled one:
// suspend while loading, throw on error, <ModelBoundary> catches either and
// keeps showing the procedural fallback.

import { parseGlbAtUri } from './gltf';
import * as assetManager from '@/services/assets/assetManager';

// Resolve a catalog item's .glb to a local file:// URI, downloading it at USER
// priority if it isn't cached yet — a model needed for something on screen
// jumps ahead of any bulk prefetch running in the background.
//
// The magic-byte validation and delete-on-failure that used to live here moved
// into downloadQueue.validate(), where they now protect every download rather
// than only models fetched on demand. That protection is not optional: the old
// legacy downloadAsync resolved *successfully* on a 404 and wrote the error page
// to disk as <slug>.glb, poisoning the cache until a reinstall.
export async function ensureLocalModel(slug, url) {
  const uris = await assetManager.ensureItemAssets({ id: slug, modelUrl: url }, ['model']);
  const uri = uris?.model;
  if (!uri) throw new Error(`model unavailable: ${slug}`);
  return uri;
}

// --- parse gating ----------------------------------------------------------
// A room with ten remote items would otherwise run ten parses at once. Each
// parse holds the file's bytes plus the decoded scene, and GLTFLoader.parse is
// synchronous JS — running them concurrently spikes memory hard enough for
// Android to kill the process, and stalls the gesture thread.
//
// This gate now wraps ONLY the parse. It used to wrap download+parse together,
// which throttled the network for no reason: the OOM risk is decoding, not
// streaming bytes to disk. Downloads are gated separately (and more widely) by
// downloadQueue's MAX_DOWNLOADS.
const MAX_PARSE_CONCURRENT = 2;
let inFlight = 0;
const waiting = [];

function pump() {
  while (inFlight < MAX_PARSE_CONCURRENT && waiting.length) {
    const job = waiting.shift();
    inFlight++;
    job.run().then(job.resolve, job.reject).finally(() => {
      inFlight--;
      pump();
    });
  }
}

function enqueueParse(run) {
  return new Promise((resolve, reject) => {
    waiting.push({ run, resolve, reject });
    pump();
  });
}

function loadRemote(slug, url) {
  // Download outside the gate, parse inside it.
  return ensureLocalModel(slug, url).then((uri) => enqueueParse(() => parseGlbAtUri(uri)));
}

const cache = new Map(); // slug -> { status, result, error, promise, url }

function startLoad(slug, url) {
  const entry = { status: 'pending', url };
  entry.promise = loadRemote(slug, url).then(
    (gltf) => { entry.status = 'done'; entry.result = gltf; },
    (err) => {
      console.error(`[3D] remote model load/parse failed: ${slug} <- ${url}`, err?.message || err, err?.stack);
      entry.status = 'error';
      entry.error = err;
    }
  );
  cache.set(slug, entry);
  return entry;
}

// Suspense-friendly read, same contract as gltf.js's useGLTFModel: throws a
// promise while loading, throws the error on failure, returns the parsed gltf
// once ready.
//
// Re-keys on `url` as well as slug, so a republished model at the same catalog
// id is re-fetched instead of serving the previously parsed scene forever.
export function useRemoteGLTF(slug, url) {
  const hit = cache.get(slug);
  const entry = hit && hit.url === url ? hit : startLoad(slug, url);
  if (entry.status === 'pending') throw entry.promise;
  if (entry.status === 'error') throw entry.error;
  return entry.result;
}

// Drop a parsed scene. Called when downloads are cleared so the renderer stops
// holding geometry whose backing file has just been deleted.
export function evictParsed(slug) {
  if (slug) cache.delete(slug);
  else cache.clear();
}

// Warm the cache for a set of catalog items ahead of time (e.g. when the 3D
// view opens) so already-placed remote items don't pop from procedural to real
// on first render. Best-effort — a failed preload just means the normal
// Suspense/ModelBoundary path handles it on demand instead.
export function preloadRemoteModels(items) {
  for (const item of items) {
    if (!item?.modelUrl) continue;
    const hit = cache.get(item.id);
    if (hit && hit.url === item.modelUrl) continue;
    startLoad(item.id, item.modelUrl);
  }
}
