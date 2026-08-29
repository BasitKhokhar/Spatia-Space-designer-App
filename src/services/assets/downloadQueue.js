// The download engine: priority, concurrency, retry, Wi-Fi gating, and — the
// reason this uses the LEGACY expo-file-system API — real progress plus a pause
// that survives the app being killed.
//
// `File.downloadFileAsync` (the new OO API, used by the old remoteModels.js) is
// all-or-nothing: no progress callback, no pause, no cancel. `createDownloadResumable`
// gives all three, and its `savable()` blob persists into the manifest so a
// paused transfer resumes from its byte offset on the next cold start rather
// than starting over.

import * as Legacy from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';

import { legacyAssetsDir, ensureDirs, fileNameFor, deleteFile, fileSize } from './assetPaths';
import * as manifest from './manifest';

// A NETWORK gate. Deliberately separate from the GLTF parse gate in
// remoteModels.js: the documented OOM risk there comes from GLTFLoader.parse
// holding file bytes plus the decoded scene, not from streaming bytes to disk.
// Conflating them throttled downloads for no reason.
const MAX_DOWNLOADS = 3;

// Backoff schedule. A 404/410 is never retried — a missing asset is a data
// problem the operator must fix, not a transient failure to hammer.
const RETRY_DELAYS = [1000, 4000, 15000, 60000];
const PERMANENT = new Set([400, 401, 403, 404, 410]);

const SUBSCRIBER_HZ_MS = 250;

export const STATUS = {
  idle: 'idle',
  running: 'running',
  paused: 'paused',
  done: 'done',
};

// ── state ──────────────────────────────────────────────────────────────────
const queues = { user: [], bulk: [] }; // two FIFOs; `user` fully drains first
const active = new Map();              // key -> { descriptor, resumable, received }
const failed = new Map();              // key -> { descriptor, status, attempts, permanent }
const inFlightPromises = new Map();    // key -> Promise<localUri>, so ensure() dedupes
const queuedKeys = new Set();

let status = STATUS.idle;
let policy = 'wifi';                   // 'wifi' | 'always' | 'off'
let netOK = true;                      // does the current connection satisfy `policy`
let unsubscribeNet = null;

let totalBytes = 0;                    // planned bytes for the current run
let doneBytes = 0;                     // completed bytes for the current run
let activeBytes = 0;                   // partial bytes of in-flight transfers

const subscribers = new Set();
let notifyTimer = null;

// ── subscriptions ──────────────────────────────────────────────────────────
export function subscribe(fn) {
  subscribers.add(fn);
  fn(getState());
  return () => subscribers.delete(fn);
}

function notifyNow() {
  const snapshot = getState();
  subscribers.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (err) {
      console.warn('[assets] subscriber threw', err?.message || err);
    }
  });
}

// Throttled: a 3-wide download fires progress callbacks far faster than any UI
// needs, and re-rendering a settings screen at that rate is pure jank.
function notify({ immediate = false } = {}) {
  if (immediate) {
    if (notifyTimer) {
      clearTimeout(notifyTimer);
      notifyTimer = null;
    }
    notifyNow();
    return;
  }
  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    notifyNow();
  }, SUBSCRIBER_HZ_MS);
}

export function getState() {
  const received = doneBytes + activeBytes;
  return {
    status,
    totalBytes,
    doneBytes: Math.min(received, totalBytes || received),
    remainingBytes: Math.max(0, totalBytes - received),
    pct: totalBytes > 0 ? Math.min(1, received / totalBytes) : 0,
    activeCount: active.size,
    queuedCount: queues.user.length + queues.bulk.length,
    failed: [...failed.values()].map((f) => ({
      key: f.descriptor.key,
      itemId: f.descriptor.itemId,
      kind: f.descriptor.kind,
      permanent: f.permanent,
    })),
    usedBytes: manifest.usedBytes(),
  };
}

// ── network policy ─────────────────────────────────────────────────────────
// The queue owns its own NetInfo listener rather than reusing useNetworkStatus:
// that hook is React-only and exposes a boolean, but the policy needs the
// connection TYPE. `isConnectionExpensive` is the portable signal — checking
// `type === 'wifi'` alone misclassifies metered hotspots as free.
function connectionAllows(state) {
  if (policy === 'off') return false;
  if (!state?.isConnected) return false;
  if (policy === 'always') return true;
  if (state.type === 'wifi' || state.type === 'ethernet') return true;
  return state.details?.isConnectionExpensive === false;
}

export function setPolicy(next) {
  if (next === policy) return;
  policy = next;
  NetInfo.fetch().then(applyNetState);
}

function applyNetState(state) {
  const was = netOK;
  netOK = connectionAllows(state);
  if (was === netOK) return;
  if (!netOK) {
    // Leaving Wi-Fi pauses BULK work only. A `user`-priority job is someone
    // standing in the editor waiting for the sofa they just placed — stalling
    // that to save a few hundred KB is the worse trade.
    pauseBulkForNetwork();
  } else if (status === STATUS.running) {
    pump();
  }
  notify({ immediate: true });
}

function startNetWatch() {
  if (unsubscribeNet) return;
  unsubscribeNet = NetInfo.addEventListener(applyNetState);
  NetInfo.fetch().then(applyNetState);
}

function pauseBulkForNetwork() {
  for (const [key, job] of active) {
    if (job.descriptor.priority === 'user') continue;
    pauseJob(key, job);
  }
}

// ── queueing ───────────────────────────────────────────────────────────────
function alreadyHave(descriptor) {
  return manifest.hasEntry(descriptor.key) && !manifest.getEntry(descriptor.key)?.resumeData;
}

export function enqueue(descriptors, { priority = 'bulk' } = {}) {
  ensureDirs();
  startNetWatch();
  let added = 0;
  for (const descriptor of descriptors) {
    if (!descriptor?.url) continue;
    if (alreadyHave(descriptor)) continue;
    if (queuedKeys.has(descriptor.key) || active.has(descriptor.key)) continue;
    const perm = failed.get(descriptor.key);
    if (perm?.permanent) continue; // do not re-queue a known-404 every launch
    queues[priority].push({ ...descriptor, priority });
    queuedKeys.add(descriptor.key);
    totalBytes += descriptor.bytes || 0;
    added += 1;
  }
  if (added) notify();
  return added;
}

// On-demand: place an item and its assets jump the queue. Returns the local URI
// so callers can await a specific asset without caring about the bulk run.
export function ensure(descriptor) {
  if (!descriptor?.url) return Promise.resolve(null);
  const existing = manifest.getEntry(descriptor.key);
  if (existing && !existing.resumeData) return Promise.resolve(existing.localUri);
  if (inFlightPromises.has(descriptor.key)) return inFlightPromises.get(descriptor.key);

  // Promote an already-queued bulk job instead of duplicating it.
  const idx = queues.bulk.findIndex((d) => d.key === descriptor.key);
  if (idx >= 0) queues.bulk.splice(idx, 1);
  else if (!queuedKeys.has(descriptor.key)) totalBytes += descriptor.bytes || 0;

  queuedKeys.add(descriptor.key);
  failed.delete(descriptor.key);
  queues.user.push({ ...descriptor, priority: 'user' });

  ensureDirs();
  startNetWatch();
  if (status !== STATUS.running) status = STATUS.running;
  const promise = new Promise((resolve) => {
    resolvers.set(descriptor.key, resolve);
  });
  inFlightPromises.set(descriptor.key, promise);
  pump();
  return promise;
}

const resolvers = new Map();

function settle(key, uri) {
  const resolve = resolvers.get(key);
  if (resolve) {
    resolve(uri);
    resolvers.delete(key);
  }
  inFlightPromises.delete(key);
}

// ── the pump ───────────────────────────────────────────────────────────────
function nextJob() {
  // `user` drains fully before `bulk`, so on-demand placement beats a bulk
  // prefetch by construction rather than by a comparator that can drift.
  if (queues.user.length) return queues.user.shift();
  if (!netOK) return null; // bulk work waits for an acceptable connection
  return queues.bulk.shift();
}

function pump() {
  if (status === STATUS.paused) return;
  while (active.size < MAX_DOWNLOADS) {
    const job = nextJob();
    if (!job) break;
    queuedKeys.delete(job.key);
    runJob(job);
  }
  if (!active.size && !queues.user.length && !queues.bulk.length) {
    if (status === STATUS.running) {
      status = STATUS.done;
      manifest.flush();
    }
    notify({ immediate: true });
  }
}

async function runJob(job, attempt = 0) {
  const fileUri = `${legacyAssetsDir}${fileNameFor(job.key, job.kind)}`;
  const prior = manifest.getEntry(job.key);
  const record = { descriptor: job, received: 0, resumable: null };
  active.set(job.key, record);

  const onProgress = ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
    const delta = totalBytesWritten - record.received;
    record.received = totalBytesWritten;
    activeBytes += delta;
    // The server may not have been backfilled with sizes yet; learn the real
    // total from the transfer so the progress bar is honest either way.
    if (!job.bytes && totalBytesExpectedToWrite > 0) {
      job.bytes = totalBytesExpectedToWrite;
      totalBytes += totalBytesExpectedToWrite;
    }
    notify();
  };

  try {
    const resumable = Legacy.createDownloadResumable(
      job.url,
      fileUri,
      {},
      onProgress,
      prior?.resumeData,
    );
    record.resumable = resumable;

    const result = prior?.resumeData ? await resumable.resumeAsync() : await resumable.downloadAsync();

    // A paused transfer resolves undefined — that is not a failure.
    if (!result) {
      active.delete(job.key);
      activeBytes -= record.received;
      return;
    }
    if (result.status && result.status >= 400) {
      throw Object.assign(new Error(`HTTP ${result.status}`), { status: result.status });
    }

    const bytes = (await fileSize(fileUri)) || job.bytes || record.received;
    const valid = await validate(job, fileUri, bytes);
    if (!valid) throw Object.assign(new Error('Downloaded file failed validation'), { status: 415 });

    manifest.putEntry({
      key: job.key,
      itemId: job.itemId,
      kind: job.kind,
      localUri: fileUri,
      bytes,
      sha: job.sha || null,
      url: job.url,
      downloadedAt: Date.now(),
      pinned: prior?.pinned || false,
    });
    manifest.setResumeData(job.key, null);

    activeBytes -= record.received;
    doneBytes += bytes;
    active.delete(job.key);
    failed.delete(job.key);
    settle(job.key, fileUri);
    notify();
    pump();
  } catch (err) {
    activeBytes -= record.received;
    active.delete(job.key);
    await deleteFile(fileUri); // never leave a poisoned partial behind
    manifest.setResumeData(job.key, null);

    const httpStatus = err?.status;
    const permanent = PERMANENT.has(httpStatus);
    const attempts = attempt + 1;

    if (!permanent && attempt < RETRY_DELAYS.length) {
      const jitter = Math.random() * 400;
      setTimeout(() => {
        if (status !== STATUS.paused) runJob(job, attempts);
        else queues[job.priority].push(job);
      }, RETRY_DELAYS[attempt] + jitter);
      return;
    }

    failed.set(job.key, { descriptor: job, status: httpStatus, attempts, permanent });
    console.warn(`[assets] ${job.itemId}/${job.kind} failed${permanent ? ' permanently' : ''}: ${err?.message || err}`);
    settle(job.key, null);
    notify();
    pump();
  }
}

// A .glb that is actually an HTML error page would crash GLTFLoader on parse,
// so the magic-byte check earned by the old remoteModels.js is kept here — now
// applied to every download rather than only to models fetched on demand.
async function validate(job, fileUri, bytes) {
  if (job.kind !== 'model') return bytes > 0;
  if (bytes < 12) return false;
  try {
    const head = await Legacy.readAsStringAsync(fileUri, {
      encoding: Legacy.EncodingType.Base64,
      length: 12,
      position: 0,
    });
    // "glTF" magic -> base64 of the first bytes starts with "Z2xURg" family.
    const bin = global.atob ? global.atob(head) : Buffer.from(head, 'base64').toString('binary');
    return bin.slice(0, 4) === 'glTF';
  } catch {
    return bytes > 0; // do not reject on a read hiccup — the parser still guards
  }
}

// ── controls ───────────────────────────────────────────────────────────────
export function start() {
  ensureDirs();
  startNetWatch();
  if (status === STATUS.done && !queues.user.length && !queues.bulk.length) return;
  status = STATUS.running;
  notify({ immediate: true });
  pump();
}

async function pauseJob(key, job) {
  try {
    const savable = await job.resumable?.pauseAsync();
    if (savable?.resumeData) manifest.setResumeData(key, savable.resumeData);
    // Re-queue at its original priority so resume picks it back up in order.
    queues[job.descriptor.priority].push(job.descriptor);
    queuedKeys.add(key);
  } catch (err) {
    console.warn('[assets] pause failed, re-queueing from scratch', err?.message || err);
    queues[job.descriptor.priority].push(job.descriptor);
    queuedKeys.add(key);
  } finally {
    activeBytes -= job.received;
    active.delete(key);
  }
}

export async function pause() {
  if (status !== STATUS.running) return;
  status = STATUS.paused;
  await Promise.all([...active.entries()].map(([key, job]) => pauseJob(key, job)));
  manifest.flush();
  notify({ immediate: true });
}

export function resume() {
  if (status !== STATUS.paused) return;
  status = STATUS.running;
  notify({ immediate: true });
  pump();
}

export async function cancelAll() {
  status = STATUS.idle;
  await Promise.all(
    [...active.entries()].map(async ([key, job]) => {
      try {
        await job.resumable?.cancelAsync();
      } catch {
        /* best effort */
      }
      settle(key, null);
      active.delete(key);
    }),
  );
  queues.user.forEach((d) => settle(d.key, null));
  queues.bulk.forEach((d) => settle(d.key, null));
  queues.user = [];
  queues.bulk = [];
  queuedKeys.clear();
  totalBytes = 0;
  doneBytes = 0;
  activeBytes = 0;
  manifest.flush();
  notify({ immediate: true });
}

export function retryFailed() {
  const retryable = [...failed.values()].map((f) => f.descriptor);
  failed.clear();
  enqueue(retryable, { priority: 'bulk' });
  start();
}

// Resume anything left paused by a previous session. This is what makes a
// force-quit mid-download pick up from its byte offset instead of from zero.
export function resumeInterrupted() {
  const paused = manifest.pausedEntries();
  if (!paused.length) return 0;
  const descriptors = paused.map((e) => ({
    key: e.key,
    itemId: e.itemId,
    kind: e.kind,
    url: e.url,
    bytes: e.bytes || 0,
    sha: e.sha || null,
  }));
  enqueue(descriptors, { priority: 'bulk' });
  return descriptors.length;
}

// Reset the run accounting without touching what is already on disk — used when
// planning a fresh "download everything" pass.
export function resetProgress() {
  totalBytes = 0;
  doneBytes = 0;
  activeBytes = 0;
  status = STATUS.idle;
}
