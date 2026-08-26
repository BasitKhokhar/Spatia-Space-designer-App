// Download + cache + Suspense-load a catalog item's remote .glb (produced by
// scripts/models/pipeline/, served from the backend bucket at item.modelUrl).
//
// Mirrors gltf.js's bundled-model pattern exactly (Suspense-friendly Map
// cache, File.arrayBuffer -> GLTFLoader.parse via parseGlbAtUri) so
// ModelItem/models.jsx can treat a remote entry the same way as a bundled
// one: suspend while loading, throw on error, <ModelBoundary> catches either
// and keeps showing the procedural fallback.

import { Directory, File, Paths } from 'expo-file-system';
import { parseGlbAtUri } from './gltf';

const MODELS_DIR = new Directory(Paths.document, 'models');

function localFileFor(slug) {
  return new File(MODELS_DIR, `${slug}.glb`);
}

// A .glb starts with the 4-byte magic "glTF" (0x46546C67 little-endian). A
// download can still leave a truncated body on disk if the connection drops
// mid-stream, so the only trustworthy check is on the bytes themselves. Read
// through a file handle rather than file.bytes() — we want 4 bytes, not the
// whole multi-megabyte model.
function looksLikeGlb(file) {
  let handle = null;
  try {
    if ((file.size ?? 0) < 12) return false;
    handle = file.open();
    const head = handle.readBytes(4);
    return head[0] === 0x67 && head[1] === 0x6c && head[2] === 0x54 && head[3] === 0x46;
  } catch (e) {
    return false;
  } finally {
    try { handle?.close(); } catch (e) { /* nothing to do */ }
  }
}

function discard(file) {
  try {
    file.delete();
  } catch (e) {
    /* already gone, or unreadable — nothing useful to do */
  }
}

// Downloads item to the app's document directory on first use, then reuses
// the file forever after (catalog items are immutable once published — a
// changed model gets a new slug, per assets.config.mjs convention). Returns
// the local file:// URI.
//
// Every path that keeps a file first proves it is really a .glb, and every path
// that fails deletes it. The legacy downloadAsync used here before resolved
// *successfully* on a 404 and wrote the error page to disk as <slug>.glb, so a
// single bad response poisoned the cache permanently: each later launch took the
// cache-hit branch and fed HTML to the parser, and only a reinstall recovered.
export async function ensureLocalModel(slug, url) {
  const file = localFileFor(slug);

  if (file.exists) {
    if (looksLikeGlb(file)) {
      console.log(`[3D] remote model cache hit: ${slug}`);
      return file.uri;
    }
    console.warn(`[3D] cached model is not a glb, re-downloading: ${slug}`);
    discard(file);
  }

  MODELS_DIR.create({ intermediates: true, idempotent: true });

  console.log(`[3D] downloading remote model: ${slug} <- ${url}`);
  try {
    // Rejects on a non-2xx status instead of writing the error body to disk.
    const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
    if (!looksLikeGlb(downloaded)) {
      throw new Error(`downloaded file is not a glb (${downloaded.size ?? 0} bytes)`);
    }
    console.log(`[3D] download finished: ${slug} (${downloaded.size} bytes)`);
    return downloaded.uri;
  } catch (e) {
    // Never leave a partial or bogus file behind — it would "cache hit" on the
    // next attempt and fail to parse forever. Android streams the body straight
    // into the destination, so a mid-stream failure does leave one there.
    console.error(`[3D] remote model download failed: ${slug} <- ${url}`, e?.message || e);
    discard(file);
    throw e;
  }
}

// --- load gating -----------------------------------------------------------
// A room with ten remote items would otherwise start ten downloads and ten
// parses at once. Each parse holds the file's bytes plus the decoded scene, and
// GLTFLoader.parse is synchronous JS — running them concurrently spikes memory
// hard enough for Android to kill the process, and stalls the gesture thread.
// Two at a time keeps the view responsive and the peak bounded.
const MAX_CONCURRENT = 2;
let inFlight = 0;
const waiting = [];

function pump() {
  while (inFlight < MAX_CONCURRENT && waiting.length) {
    const job = waiting.shift();
    inFlight++;
    job.run().then(job.resolve, job.reject).finally(() => {
      inFlight--;
      pump();
    });
  }
}

function enqueue(run) {
  return new Promise((resolve, reject) => {
    waiting.push({ run, resolve, reject });
    pump();
  });
}

function loadRemote(slug, url) {
  return enqueue(() => ensureLocalModel(slug, url).then((uri) => parseGlbAtUri(uri)));
}

const cache = new Map(); // slug -> { status, result, error, promise }

function startLoad(slug, url) {
  const entry = { status: 'pending' };
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
// promise while loading, throws the error on failure, returns the parsed
// gltf once ready.
export function useRemoteGLTF(slug, url) {
  const entry = cache.get(slug) || startLoad(slug, url);
  if (entry.status === 'pending') throw entry.promise;
  if (entry.status === 'error') throw entry.error;
  return entry.result;
}

// Warm the download+parse cache for a set of catalog items ahead of time
// (e.g. when the 3D view opens) so already-placed remote items don't pop from
// procedural to real on first render. Best-effort — a failed preload just
// means the normal Suspense/ModelBoundary path handles it on demand instead.
// Goes through the same queue, so preloading can't flood the device either.
export function preloadRemoteModels(items) {
  for (const item of items) {
    if (!item?.modelUrl || cache.has(item.id)) continue;
    startLoad(item.id, item.modelUrl);
  }
}
