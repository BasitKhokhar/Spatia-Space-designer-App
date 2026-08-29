// The ONE place that constructs on-disk asset paths.
//
// expo-file-system 19 ships two APIs and this feature needs both: the new OO
// API (`Paths`/`Directory`/`File`) for existence and cleanup, and the LEGACY
// string API for `createDownloadResumable`, which is the only downloader in the
// Expo surface with progress + pause/resume. They address the same directory
// through different representations (`file:///…/assets/` vs a `Directory`
// object), so letting two modules convert between them guarantees a mismatch
// bug. Everything funnels through here instead.

import { Directory, Paths } from 'expo-file-system';
import * as Legacy from 'expo-file-system/legacy';

// Sits alongside the pre-existing `models/` directory rather than replacing it,
// so an upgrade never orphans an already-downloaded .glb mid-flight; the old
// directory is swept once by assetManager.initAssets().
const DIR_NAME = 'assets';

export const assetsDirectory = new Directory(Paths.document, DIR_NAME);

// Legacy form, WITH the trailing slash createDownloadResumable expects.
export const legacyAssetsDir = `${Legacy.documentDirectory}${DIR_NAME}/`;

// The directory the old remoteModels.js cache used, kept only so initAssets()
// can migrate/clear it.
export const legacyModelsDir = `${Legacy.documentDirectory}models/`;

const EXT = { model: 'glb', thumb: 'png', planTop: 'png' };

// Filenames are `<key>.<ext>` where the key already carries a content token —
// see assetKeys.js. That is what makes a republished asset land on a DIFFERENT
// path instead of silently serving the stale bytes.
export function fileNameFor(key, kind) {
  return `${key}.${EXT[kind] || 'bin'}`;
}

export function legacyUriFor(key, kind) {
  return `${legacyAssetsDir}${fileNameFor(key, kind)}`;
}

export function ensureDirs() {
  try {
    if (!assetsDirectory.exists) assetsDirectory.create({ intermediates: true });
  } catch (err) {
    console.warn('[assets] could not create assets directory', err?.message || err);
  }
}

// Every file currently on disk, as a Set of bare filenames. Used by the
// manifest reconcile sweep to find orphans (files with no manifest entry) and
// ghosts (entries with no file).
export function listFiles() {
  try {
    if (!assetsDirectory.exists) return new Set();
    return new Set(assetsDirectory.list().map((entry) => entry.name));
  } catch (err) {
    console.warn('[assets] could not list assets directory', err?.message || err);
    return new Set();
  }
}

export async function deleteFile(uri) {
  try {
    await Legacy.deleteAsync(uri, { idempotent: true });
    return true;
  } catch {
    return false;
  }
}

export async function fileSize(uri) {
  try {
    const info = await Legacy.getInfoAsync(uri, { size: true });
    return info.exists ? info.size || 0 : 0;
  } catch {
    return 0;
  }
}

export async function fileExists(uri) {
  try {
    const info = await Legacy.getInfoAsync(uri);
    return !!info.exists;
  } catch {
    return false;
  }
}
