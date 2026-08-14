// Step 2: turn each fetched raw model into a decoder-free, mobile-sized .glb.
//
// HARD CONSTRAINT: Hermes (React Native's JS engine) has no WebAssembly, so
// GLTFLoader on-device cannot run a Draco, meshopt, or Basis/KTX2 decoder.
// The output must therefore only use extensions GLTFLoader decodes natively.
// KHR_mesh_quantization qualifies (it's just smaller integer accessor types,
// no decompression step) — quantize() adds it automatically. Simplification
// itself runs here, in Node, where meshoptimizer's WASM is perfectly fine;
// only the *shipped* file has to stay decoder-free. See lib/common.mjs and
// scripts/textures/build-textures.mjs for the same constraint on textures
// (JPEG/PNG only — expo-gl's stb_image build silently fails on WebP).
//
// Chain: dedup -> flatten -> join -> weld -> simplify (skipped for already
// low-poly Quaternius sources) -> resample -> prune -> quantize ->
// textureCompress (sharp: JPEG for color/ORM data, PNG for normals, 1024 cap).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { Document, NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join as joinFn, weld, simplify, resample, prune, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { ASSETS } from './assets.config.mjs';
import {
  RAW_DIR, DIST_DIR, MODELS_OUT_DIR, ensureDir, log, parseOnlyFilter, readJsonIfExists, writeJson,
} from './lib/common.mjs';

const TEXTURE_SIZE = 1024;
// Normals are lossless PNG (JPEG ringing shows badly on curved surfaces), and
// a 1024 normal map routinely lands 2-3MB — by far the biggest thing in the
// file for a texture nobody perceives at phone zoom. Half resolution mirrors
// build-textures.mjs's NORMAL_SIZE convention for the same reason.
const NORMAL_TEXTURE_SIZE = 512;
const WARN_BYTES = 1.5 * 1024 * 1024;
const FAIL_BYTES = 4 * 1024 * 1024;
// Extensions the output must never contain — each needs a WASM decoder Hermes
// can't run. Checked after the full transform chain as a safety net (nothing
// in the chain below adds these, but a future edit here shouldn't be able to
// reintroduce them silently).
const FORBIDDEN_EXTENSIONS = [
  'KHR_draco_mesh_compression',
  'EXT_meshopt_compression',
  'KHR_texture_basisu',
];

function findEntryFile(rawDir, hintName) {
  if (hintName && existsSync(join(rawDir, hintName))) return join(rawDir, hintName);
  const files = readdirSync(rawDir);
  const gltf = files.find((f) => f.endsWith('.gltf') || f.endsWith('.glb'));
  if (!gltf) throw new Error(`no .gltf/.glb found in ${rawDir}`);
  return join(rawDir, gltf);
}

async function optimizeOne(asset) {
  const rawDir = join(RAW_DIR, asset.slug);
  const sourceMeta = readJsonIfExists(join(rawDir, '_source.json'), {});
  const entryPath = findEntryFile(rawDir, sourceMeta.gltfFile || sourceMeta.entryFile);

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.read(entryPath);

  // Quaternius packs are already low-poly by design; simplifying further just
  // loses shape fidelity for no size win. Poly Haven's scanned/high-poly
  // sources are the ones that actually need it.
  const shouldSimplify = asset.source === 'polyhaven' && asset.simplify !== false;

  const transforms = [dedup(), flatten(), joinFn(), weld()];
  if (shouldSimplify) {
    transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio: 0.6, error: 0.001 }));
  }
  transforms.push(
    resample(),
    prune(),
    quantize(),
    // Photographic albedo — JPEG, default chroma subsampling is fine.
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 82, resize: [TEXTURE_SIZE, TEXTURE_SIZE], slots: /^baseColorTexture$/ }),
    // Packed data channels (Poly Haven's "arm" = AO/Rough/Metal): no chroma
    // subsampling, or roughness/AO bleed into each other — see
    // build-textures.mjs for the same reasoning.
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 88, resize: [TEXTURE_SIZE, TEXTURE_SIZE], chromaSubsampling: '4:4:4', slots: /^(metallicRoughnessTexture|occlusionTexture)$/ }),
    // Normals: lossless, JPEG ringing shows up badly on smooth curved surfaces.
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: [NORMAL_TEXTURE_SIZE, NORMAL_TEXTURE_SIZE], slots: /^normalTexture$/ })
  );

  await document.transform(...transforms);

  const usedExtensions = document.getRoot().listExtensionsUsed().map((e) => e.extensionName);
  const forbidden = usedExtensions.filter((name) => FORBIDDEN_EXTENSIONS.includes(name));
  if (forbidden.length) {
    throw new Error(`output uses decoder-requiring extension(s) [${forbidden.join(', ')}] — Hermes cannot load this on-device`);
  }

  // Bounding box, in the document's own units (glTF = meters) -> cm, so the
  // app's dimensions field stays consistent with everything hand-authored.
  const scenes = document.getRoot().listScenes();
  const { min, max } = getBounds(scenes[0]);
  let dims = {
    w: Math.round((max[0] - min[0]) * 100),
    h: Math.round((max[1] - min[1]) * 100),
    d: Math.round((max[2] - min[2]) * 100),
  };
  if (asset.dimsOverride) dims = { ...dims, ...asset.dimsOverride };

  const io2 = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const outPath = join(ensureDir(MODELS_OUT_DIR), `${asset.slug}.glb`);
  await io2.write(outPath, document);

  const bytes = readFileSync(outPath).length;
  if (bytes > FAIL_BYTES) {
    throw new Error(`${asset.slug}.glb is ${(bytes / 1048576).toFixed(2)}MB — exceeds the ${(FAIL_BYTES / 1048576).toFixed(1)}MB hard budget`);
  }
  if (bytes > WARN_BYTES) {
    log('optimize', `WARNING ${asset.slug}.glb is ${(bytes / 1048576).toFixed(2)}MB — above the ${(WARN_BYTES / 1048576).toFixed(1)}MB soft budget`);
  }

  return { dims, bytes, sourceMeta };
}

async function main() {
  const only = parseOnlyFilter();
  const metaOut = {};

  for (const asset of ASSETS) {
    if (only && !only.has(asset.slug)) continue;
    log('optimize', `${asset.slug}: transforming...`);
    const result = await optimizeOne(asset);
    metaOut[asset.slug] = result;
    log('optimize', `${asset.slug}: done, ${(result.bytes / 1048576).toFixed(2)}MB, dims ${JSON.stringify(result.dims)}`);
  }

  // Merge into any existing metadata file so a --only run doesn't clobber
  // entries for slugs it didn't touch. Lives in DIST_DIR (not bucket/) —
  // it's pipeline bookkeeping, not a file that gets published.
  const metaPath = join(DIST_DIR, 'optimize-meta.json');
  const existing = readJsonIfExists(metaPath, {});
  writeJson(metaPath, { ...existing, ...metaOut });

  log('optimize', `done: ${Object.keys(metaOut).length} model(s).`);
}

main().catch((e) => {
  console.error('\n[optimize] FAILED:', e.message);
  process.exit(1);
});
