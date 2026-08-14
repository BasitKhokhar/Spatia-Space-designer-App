// Step 3: render a 512x512 transparent PNG catalog thumbnail for every
// optimized .glb, using headless Chrome (Puppeteer) driving the same
// three.js the app renders with — not Blender (not installed on this
// machine), and not a screenshot of the app itself (no device attached
// during a pipeline run). See lib/thumb-harness.html for the render setup.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { ASSETS } from './assets.config.mjs';
import {
  PIPELINE_ROOT, MODELS_OUT_DIR, THUMBS_OUT_DIR, ensureDir, log, parseOnlyFilter,
} from './lib/common.mjs';

const SIZE = 512;
// 3/4 product-shot angle, matching the existing Kenney "_NE" isometric tiles
// (see scripts/models/import-kenney.mjs) so old and new thumbnails read the
// same way in a mixed catalog grid.
const DEFAULT_AZIMUTH = 45;
const DEFAULT_ELEVATION = 35;

const THREE_URL = pathToFileURL(join(PIPELINE_ROOT, '../../../node_modules/three/build/three.module.js')).href;
const GLTFLOADER_URL = pathToFileURL(join(PIPELINE_ROOT, '../../../node_modules/three/examples/jsm/loaders/GLTFLoader.js')).href;
const ROOMENV_URL = pathToFileURL(join(PIPELINE_ROOT, '../../../node_modules/three/examples/jsm/environments/RoomEnvironment.js')).href;

function renderHarness(tmpDir) {
  const template = readFileSync(join(PIPELINE_ROOT, 'lib/thumb-harness.html'), 'utf8');
  const html = template
    .replaceAll('__THREE_URL__', THREE_URL)
    .replaceAll('__GLTFLOADER_URL__', GLTFLOADER_URL)
    .replaceAll('__ROOMENV_URL__', ROOMENV_URL);
  const outPath = join(tmpDir, 'thumb-harness.html');
  writeFileSync(outPath, html);
  return outPath;
}

async function renderThumb(browser, harnessPath, glbPath, azimuth, elevation) {
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE });

  // Surface page-side console/errors — a silent blank PNG is the worst
  // failure mode here (it "succeeds" and ships an empty tile).
  page.on('pageerror', (e) => log('thumbs', `  page error: ${e.message}`));

  const url = `${pathToFileURL(harnessPath).href}?glb=${encodeURIComponent(pathToFileURL(glbPath).href)}&size=${SIZE}&azimuth=${azimuth}&elevation=${elevation}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__thumbDone === true || window.__thumbError, { timeout: 30000 });

  const error = await page.evaluate(() => window.__thumbError);
  if (error) throw new Error(error);

  const dataUrl = await page.evaluate(() => window.__thumbDataUrl);
  await page.close();

  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64, 'base64');
}

async function main() {
  const only = parseOnlyFilter();
  const tmpDir = mkdtempSync(join(tmpdir(), 'model-thumbs-'));
  const harnessPath = renderHarness(tmpDir);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--allow-file-access-from-files', // GLTFLoader fetches the .glb over file://
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', // software WebGL — no GPU on a CI/dev box
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
    ],
  });

  try {
    let done = 0;
    for (const asset of ASSETS) {
      if (only && !only.has(asset.slug)) continue;
      const glbPath = join(MODELS_OUT_DIR, `${asset.slug}.glb`);
      log('thumbs', `${asset.slug}: rendering...`);
      const png = await renderThumb(
        browser,
        harnessPath,
        glbPath,
        asset.thumbAzimuth ?? DEFAULT_AZIMUTH,
        asset.thumbElevation ?? DEFAULT_ELEVATION
      );
      const outPath = join(ensureDir(THUMBS_OUT_DIR), `${asset.slug}.png`);
      writeFileSync(outPath, png);
      log('thumbs', `${asset.slug}: wrote ${(png.length / 1024).toFixed(0)}KB -> ${outPath}`);
      done++;
    }
    log('thumbs', `done: ${done} thumbnail(s).`);
  } finally {
    await browser.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error('\n[thumbs] FAILED:', e.message);
  process.exit(1);
});
