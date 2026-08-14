// Step 1: download raw source files for every asset in assets.config.mjs into
// .cache/raw/<slug>/. Idempotent — a slug whose raw dir already has a .gltf
// or .bin is skipped (delete .cache/raw/<slug>/ by hand to force a re-fetch).
//
// Poly Haven (source: 'polyhaven')
//   GET https://api.polyhaven.com/files/<sourceId> -> { gltf: { '1k': {...} } }
//   .gltf.include is a map of "relative/path" -> { url, size, md5 }; every
//   entry plus the .gltf itself is downloaded preserving relative paths, so
//   2-optimize.mjs can load the .gltf and have its textures/.bin resolve.
//   Verified against the live API on 2026-08-03 — see plan notes if this
//   breaks; the schema is documented at github.com/Poly-Haven/Public-API.
//
// Quaternius (source: 'quaternius')
//   No API — packs are unzipped by hand into LOCAL_ASSETS_DIR/quaternius/
//   (mirrors the existing kenney/ambientCG convention in this repo). The
//   config's `file` field is a path relative to that folder; this step just
//   validates it exists and copies it + sibling resources into the cache.

import { existsSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ASSETS } from './assets.config.mjs';
import {
  RAW_DIR, LOCAL_ASSETS_DIR, slugDir, downloadFile, fetchJson, ensureDir,
  assertValidSlug, log, parseOnlyFilter, writeJson,
} from './lib/common.mjs';

const RESOLUTION = process.env.MODEL_PIPELINE_RES || '1k';

function alreadyFetched(dir) {
  if (!existsSync(dir)) return false;
  const files = readdirSync(dir);
  return files.some((f) => f.endsWith('.gltf') || f.endsWith('.glb'));
}

async function fetchPolyHaven(asset, dir) {
  const files = fetchJson(`https://api.polyhaven.com/files/${asset.sourceId}`);
  const res = files.gltf?.[RESOLUTION];
  if (!res) {
    throw new Error(`Poly Haven asset "${asset.sourceId}" has no gltf/${RESOLUTION} — available: ${Object.keys(files.gltf || {}).join(', ') || 'none'}`);
  }

  // Main .gltf — keep its own filename (basename of the url).
  const gltfName = res.gltf.url.split('/').pop();
  log('fetch', `${asset.slug}: downloading ${gltfName}`);
  downloadFile(res.gltf.url, join(dir, gltfName));

  // Every include entry (textures/*.jpg, <id>.bin) at its declared relative path.
  for (const [relPath, entry] of Object.entries(res.gltf.include || {})) {
    const dest = join(dir, relPath);
    ensureDir(dirname(dest));
    downloadFile(entry.url, dest);
  }

  // Author/license metadata for CREDITS.txt (best-effort — asset info endpoint).
  let author = 'Unknown';
  try {
    const info = fetchJson(`https://api.polyhaven.com/info/${asset.sourceId}`);
    author = Object.keys(info?.authors || {}).join(', ') || author;
  } catch {
    // Non-fatal — CREDITS.txt will just say "Unknown".
  }

  writeJson(join(dir, '_source.json'), {
    source: 'polyhaven',
    sourceId: asset.sourceId,
    gltfFile: gltfName,
    author,
    sourceUrl: `https://polyhaven.com/a/${asset.sourceId}`,
    license: 'CC0',
    dimensionsMm: null, // recomputed from the optimized mesh in step 2, not trusted here
  });

  return { entryFile: gltfName };
}

function copyDirFiles(fromDir, toDir) {
  ensureDir(toDir);
  let count = 0;
  for (const f of readdirSync(fromDir)) {
    const src = join(fromDir, f);
    if (statSync(src).isDirectory()) {
      count += copyDirFiles(src, join(toDir, f));
    } else {
      copyFileSync(src, join(toDir, f));
      count++;
    }
  }
  return count;
}

async function fetchQuaternius(asset, dir) {
  const src = join(LOCAL_ASSETS_DIR, 'quaternius', asset.file);
  if (!existsSync(src)) {
    throw new Error(
      `Quaternius source not found: ${src}\n` +
      `  Download the pack from quaternius.com (or itch.io) and unzip it into\n` +
      `  ${join(LOCAL_ASSETS_DIR, 'quaternius')}\\, then re-run this step.`
    );
  }

  // Copy the whole pack's glTF folder (siblings often share one .bin/texture
  // set) so relative references inside the .gltf resolve without editing it.
  const srcDir = dirname(src);
  copyDirFiles(srcDir, dir);

  writeJson(join(dir, '_source.json'), {
    source: 'quaternius',
    file: asset.file,
    gltfFile: relative(srcDir, src).split(/[\\/]/).pop(),
    author: 'Quaternius',
    sourceUrl: 'https://quaternius.com/',
    license: 'CC0',
  });

  return { entryFile: relative(srcDir, src).split(/[\\/]/).pop() };
}

async function main() {
  const only = parseOnlyFilter();
  let done = 0;
  let skipped = 0;

  for (const asset of ASSETS) {
    if (only && !only.has(asset.slug)) continue;
    assertValidSlug(asset.slug);
    const dir = slugDir(asset.slug);

    if (alreadyFetched(dir)) {
      log('fetch', `${asset.slug}: cached, skipping (delete .cache/raw/${asset.slug}/ to refetch)`);
      skipped++;
      continue;
    }

    log('fetch', `${asset.slug}: fetching from ${asset.source}...`);
    if (asset.source === 'polyhaven') {
      await fetchPolyHaven(asset, dir);
    } else if (asset.source === 'quaternius') {
      await fetchQuaternius(asset, dir);
    } else {
      throw new Error(`${asset.slug}: unknown source "${asset.source}"`);
    }
    done++;
  }

  log('fetch', `done: ${done} fetched, ${skipped} cached.`);
}

main().catch((e) => {
  console.error('\n[fetch] FAILED:', e.message);
  process.exit(1);
});
