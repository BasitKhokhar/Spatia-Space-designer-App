// Durable record of what is actually on disk.
//
// Deliberately a hand-rolled MMKV module rather than a fifth zustand `persist`
// store: persist re-serializes the WHOLE state object on every `set`, and a
// bulk download mutates this hundreds of times per minute. That would mean
// thousands of full-JSON writes. Here the in-memory Map is the source of truth
// during a session and `flush()` is debounced.

import { storage } from '@/store/storage';
import { legacyAssetsDir, listFiles, fileNameFor, deleteFile } from './assetPaths';

const KEY = 'assets.manifest';
const VERSION = 1;
const FLUSH_MS = 1000;

/**
 * Entry = {
 *   key, itemId, kind, localUri, bytes, sha, url, downloadedAt,
 *   pinned,      // used by a saved project — survives "Clear downloads"
 *   resumeData,  // set only while a download is paused mid-flight
 * }
 */
let entries = new Map();
let byItem = new Map(); // `${itemId}:${kind}` -> key, so lookups are O(1) in render
let loaded = false;
let flushTimer = null;
let dirty = false;

function indexKey(itemId, kind) {
  return `${itemId}:${kind}`;
}

function reindex() {
  byItem = new Map();
  for (const entry of entries.values()) {
    byItem.set(indexKey(entry.itemId, entry.kind), entry.key);
  }
}

export function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = storage.getString(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION || !parsed.entries) return;
    entries = new Map(Object.entries(parsed.entries));
    reindex();
  } catch (err) {
    // A corrupt manifest must not brick the app — the reconcile sweep will
    // rebuild what it can from the files still on disk.
    console.warn('[assets] manifest unreadable, starting empty', err?.message || err);
    entries = new Map();
    byItem = new Map();
  }
}

export function flush() {
  if (!dirty) return;
  dirty = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    storage.set(KEY, JSON.stringify({ version: VERSION, entries: Object.fromEntries(entries) }));
  } catch (err) {
    console.warn('[assets] manifest flush failed', err?.message || err);
  }
}

function markDirty() {
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_MS);
}

export function getEntry(key) {
  load();
  return entries.get(key) || null;
}

export function hasEntry(key) {
  load();
  return entries.has(key);
}

// Synchronous by design: FurnitureShape/FurnitureGlyph call this during render
// and must get a cached file:// URI on the FIRST frame, with no flash of
// fallback art for an asset that is already on disk.
export function localUriFor(itemId, kind) {
  load();
  const key = byItem.get(indexKey(itemId, kind));
  if (!key) return null;
  const entry = entries.get(key);
  // A paused/partial download has resumeData and is NOT usable yet.
  return entry && !entry.resumeData ? entry.localUri : null;
}

export function putEntry(entry) {
  load();
  // One asset per (item, kind): a new token supersedes the old file, so drop
  // the previous entry (and its bytes) rather than accumulating generations.
  const prevKey = byItem.get(indexKey(entry.itemId, entry.kind));
  if (prevKey && prevKey !== entry.key) {
    const prev = entries.get(prevKey);
    if (prev?.localUri) deleteFile(prev.localUri);
    entries.delete(prevKey);
  }
  entries.set(entry.key, entry);
  byItem.set(indexKey(entry.itemId, entry.kind), entry.key);
  markDirty();
  return entry;
}

export function removeEntry(key) {
  load();
  const entry = entries.get(key);
  if (!entry) return;
  entries.delete(key);
  if (byItem.get(indexKey(entry.itemId, entry.kind)) === key) {
    byItem.delete(indexKey(entry.itemId, entry.kind));
  }
  markDirty();
}

export function allEntries() {
  load();
  return [...entries.values()];
}

// Only completed downloads count toward "used on device"; a paused partial is
// not yet a usable asset.
export function usedBytes() {
  load();
  let total = 0;
  for (const entry of entries.values()) {
    if (!entry.resumeData) total += entry.bytes || 0;
  }
  return total;
}

export function pinnedBytes() {
  load();
  let total = 0;
  for (const entry of entries.values()) {
    if (entry.pinned && !entry.resumeData) total += entry.bytes || 0;
  }
  return total;
}

// Mark exactly the given item ids as pinned, clearing the flag everywhere else.
// Pinned assets belong to a saved project and survive "Clear downloads", so
// opening an old project offline always works.
export function setPinned(itemIds) {
  load();
  const pin = new Set(itemIds);
  let changed = false;
  for (const entry of entries.values()) {
    const next = pin.has(entry.itemId);
    if (entry.pinned !== next) {
      entry.pinned = next;
      changed = true;
    }
  }
  if (changed) markDirty();
}

export function setResumeData(key, resumeData) {
  load();
  const entry = entries.get(key);
  if (!entry) return;
  entry.resumeData = resumeData || undefined;
  markDirty();
}

// Every entry that is a paused partial, so the queue can resume them after a
// cold start — this is what makes Pause survive the app being killed.
export function pausedEntries() {
  load();
  return [...entries.values()].filter((e) => e.resumeData);
}

// Reconcile manifest against disk. Both directions matter:
//  - an entry whose file is gone (OS cleanup, user cleared data) must be
//    dropped, or the app renders a file:// URI that 404s locally;
//  - a file with no entry is an orphan from a superseded token and is pure
//    wasted space.
export function reconcile() {
  load();
  const onDisk = listFiles();
  const expected = new Set();
  let dropped = 0;

  for (const entry of [...entries.values()]) {
    const name = fileNameFor(entry.key, entry.kind);
    expected.add(name);
    if (!onDisk.has(name)) {
      entries.delete(entry.key);
      dropped += 1;
      markDirty();
    }
  }
  reindex();

  let orphans = 0;
  for (const name of onDisk) {
    if (expected.has(name)) continue;
    deleteFile(`${legacyAssetsDir}${name}`);
    orphans += 1;
  }

  if (dropped || orphans) {
    console.log(`[assets] reconcile: dropped ${dropped} missing entr(ies), removed ${orphans} orphan file(s)`);
  }
  flush();
  return { dropped, orphans };
}

export function clear({ keepPinned = true } = {}) {
  load();
  const removed = [];
  for (const entry of [...entries.values()]) {
    if (keepPinned && entry.pinned) continue;
    if (entry.localUri) deleteFile(entry.localUri);
    entries.delete(entry.key);
    removed.push(entry);
  }
  reindex();
  markDirty();
  flush();
  return removed;
}
