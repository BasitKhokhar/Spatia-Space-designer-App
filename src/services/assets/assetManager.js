// The facade. Nothing outside src/services/assets/ imports the queue or the
// manifest directly — everything goes through here, so the internals stay
// swappable (e.g. if a native background downloader replaces the JS queue).

import { AppState } from 'react-native';

import * as manifest from './manifest';
import * as queue from './downloadQueue';
import { assetsForItem, assetsForCatalog, descriptorFor, ASSET_KINDS } from './assetKeys';
import { ensureDirs, legacyModelsDir, deleteFile } from './assetPaths';
import { TIER_ORDER } from './tiers';

export { STATUS } from './downloadQueue';
export const subscribe = queue.subscribe;
export const getState = queue.getState;
export const pause = queue.pause;
export const resume = queue.resume;
export const cancelAll = queue.cancelAll;
export const retryFailed = queue.retryFailed;
export const setPolicy = queue.setPolicy;

let initialised = false;

export function initAssets() {
  if (initialised) return;
  initialised = true;

  ensureDirs();
  manifest.load();
  // Drop entries whose file vanished and files whose entry vanished, so the app
  // never renders a file:// URI that no longer resolves.
  manifest.reconcile();

  // The pre-existing remoteModels cache wrote Documents/models/<slug>.glb with
  // no record of what it held and no way to invalidate it. Those files are
  // unreachable by the new key scheme, so they are pure dead weight — clear the
  // directory once. Anything still needed re-downloads under a proper key.
  deleteFile(legacyModelsDir);

  // Pick up anything a previous session left paused, so a force-quit resumes
  // from its byte offset rather than restarting.
  queue.resumeInterrupted();

  // MMKV writes are debounced; make sure a backgrounding app does not lose the
  // last second of progress.
  AppState.addEventListener('change', (state) => {
    if (state === 'background' || state === 'inactive') manifest.flush();
  });
}

// What a full offline download costs, measured against what is already here.
// `items` is the live catalog, so this reflects whatever the server actually
// holds today — 17 MB or 600 MB, nothing is hardcoded.
export function planFullDownload(items = []) {
  const descriptors = assetsForCatalog(items, TIER_ORDER);
  const byKind = {};
  let totalBytes = 0;
  let haveBytes = 0;
  let missingBytes = 0;
  let missingCount = 0;

  for (const d of descriptors) {
    const bucket = (byKind[d.kind] = byKind[d.kind] || { count: 0, bytes: 0, haveBytes: 0, haveCount: 0 });
    bucket.count += 1;
    bucket.bytes += d.bytes || 0;
    totalBytes += d.bytes || 0;

    const entry = manifest.getEntry(d.key);
    if (entry && !entry.resumeData) {
      bucket.haveBytes += entry.bytes || d.bytes || 0;
      bucket.haveCount += 1;
      haveBytes += entry.bytes || d.bytes || 0;
    } else {
      missingBytes += d.bytes || 0;
      missingCount += 1;
    }
  }

  return {
    totalBytes,
    haveBytes,
    missingBytes,
    missingCount,
    count: descriptors.length,
    byKind,
    pct: totalBytes > 0 ? haveBytes / totalBytes : 0,
  };
}

// Queue everything the catalog offers that is not already here, in tier order.
export function startFullDownload(items = [], kinds = TIER_ORDER) {
  initAssets();
  queue.resetProgress();
  const descriptors = assetsForCatalog(items, kinds);
  queue.enqueue(descriptors, { priority: 'bulk' });
  queue.start();
  return queue.getState();
}

// One tier only — the per-row download buttons in Settings.
export function startTierDownload(items = [], kind) {
  return startFullDownload(items, [kind]);
}

// On-demand. Called when an item is placed in the editor: its assets jump ahead
// of any bulk prefetch. Returns { planTop, thumb, model } local URIs.
export async function ensureItemAssets(item, kinds = ASSET_KINDS) {
  if (!item) return {};
  initAssets();
  const descriptors = assetsForItem(item, kinds);
  const results = await Promise.all(descriptors.map((d) => queue.ensure(d)));
  const out = {};
  descriptors.forEach((d, i) => {
    out[d.kind] = results[i];
  });
  return out;
}

// Synchronous — safe to call during render. Returns a file:// URI or null.
export function localUriFor(itemId, kind) {
  return manifest.localUriFor(itemId, kind);
}

// True once every asset this item offers is on disk.
export function itemIsReady(item, kinds = ASSET_KINDS) {
  return assetsForItem(item, kinds).every((d) => {
    const entry = manifest.getEntry(d.key);
    return entry && !entry.resumeData;
  });
}

// Assets belonging to a saved project are pinned: "Clear downloads" spares them,
// so reopening an old project offline always works.
export function pinProjectAssets(catalogIds = []) {
  manifest.setPinned(catalogIds);
  manifest.flush();
}

export function usageStats(items = []) {
  const plan = planFullDownload(items);
  return {
    usedBytes: manifest.usedBytes(),
    pinnedBytes: manifest.pinnedBytes(),
    requiredBytes: plan.totalBytes,
    missingBytes: plan.missingBytes,
    pct: plan.pct,
    byKind: plan.byKind,
    count: plan.count,
  };
}

export function clearDownloads({ keepPinned = true } = {}) {
  const removed = manifest.clear({ keepPinned });
  queue.resetProgress();
  return removed.length;
}

export { descriptorFor, assetsForItem, assetsForCatalog };
