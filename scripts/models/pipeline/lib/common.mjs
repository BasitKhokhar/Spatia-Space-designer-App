// Shared paths, download helper and logging for the model asset pipeline.
//
// Layout (all relative to this file's directory, scripts/models/pipeline/):
//   .cache/raw/<slug>/       untouched downloads, safe to delete and re-fetch
//   dist/bucket/models/      optimized .glb output, ready to publish
//   dist/bucket/thumbs/      rendered .png thumbnails, ready to publish
//   dist/items.json          the manifest joining config + extracted metadata
//
// Re-running any step is safe: fetch skips cached slugs, optimize/thumbs
// overwrite their own output deterministically, and publish upserts by slug.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // scripts/models/pipeline/lib
export const PIPELINE_ROOT = resolve(HERE, '..'); // scripts/models/pipeline
export const FRONTEND_ROOT = resolve(PIPELINE_ROOT, '../../..');
export const BACKEND_ROOT = resolve(FRONTEND_ROOT, '../Backend');

export const CACHE_DIR = process.env.MODEL_PIPELINE_CACHE || join(PIPELINE_ROOT, '.cache');
export const RAW_DIR = join(CACHE_DIR, 'raw');
export const DIST_DIR = process.env.MODEL_PIPELINE_DIST || join(PIPELINE_ROOT, 'dist');
export const BUCKET_DIR = join(DIST_DIR, 'bucket');
export const MODELS_OUT_DIR = join(BUCKET_DIR, 'models');
export const THUMBS_OUT_DIR = join(BUCKET_DIR, 'thumbs');
export const TOPS_OUT_DIR = join(BUCKET_DIR, 'tops');
export const ITEMS_JSON_PATH = join(DIST_DIR, 'items.json');

// Same sibling convention as scripts/textures/build-textures.mjs: hand-unzipped
// packs (Quaternius, etc.) live next to the Frontend checkout, not inside it.
export const LOCAL_ASSETS_DIR = process.env.MODEL_PIPELINE_LOCAL || resolve(FRONTEND_ROOT, '../assetss');

export function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function slugDir(slug) {
  return ensureDir(join(RAW_DIR, slug));
}

// Downloads with curl (present on Windows/macOS/Linux via Git for Windows —
// same requirement as build-textures.mjs) rather than fetch(), so large
// binary downloads don't have to be buffered through Node's heap.
export function downloadFile(url, destPath) {
  ensureDir(dirname(destPath));
  execFileSync('curl', ['-sL', '--fail', url, '-o', destPath], { stdio: 'inherit' });
}

export function fetchJson(url) {
  const out = execFileSync('curl', ['-sL', '--fail', url], { maxBuffer: 1024 * 1024 * 64 });
  return JSON.parse(out.toString('utf8'));
}

export function readJsonIfExists(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

const VALID_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function assertValidSlug(slug) {
  if (!VALID_SLUG.test(slug)) {
    throw new Error(`invalid slug "${slug}" — must be lowercase kebab-case (a-z0-9-)`);
  }
}

export function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

export function parseOnlyFilter() {
  const idx = process.argv.indexOf('--only');
  if (idx === -1) return null;
  return new Set(process.argv[idx + 1].split(',').map((s) => s.trim()));
}
