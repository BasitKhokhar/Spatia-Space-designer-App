// One-off script: renders a straight-down top-down PNG for every `kind` in
// src/three/modelRegistry.js's MODELS table, from the already-bundled Kenney
// kit (no download/licensing work — the .glb files already ship in the app).
// Fills the generic per-kind middle layer of
// src/components/editor/planTops.js (currently empty), which is drawn for a
// placed item when it has no per-product photo (catalogItem.planTopUrl).
//
// This is NOT part of the runtime asset pipeline (scripts/models/pipeline/) —
// run it once, review the output, and commit the PNGs + the planTops.js edit.
//
// Usage: node scripts/models/render-plan-tops.mjs [--only kind-a,kind-b]

import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = dirname(fileURLToPath(import.meta.url)); // scripts/models
const FRONTEND_ROOT = join(HERE, '..', '..');
const KENNEY_DIR = join(FRONTEND_ROOT, 'src', 'assets', 'models', 'kenney');
const OUT_DIR = join(FRONTEND_ROOT, 'src', 'assets', 'tops');
const HARNESS_TEMPLATE = join(HERE, 'lib', 'kenney-plan-top-harness.html');
const KENNEY_MAP_PATH = join(FRONTEND_ROOT, 'src', 'three', 'materials', 'kenneyMap.js');

const SIZE = 512;

// Mirrors src/three/modelRegistry.js's MODELS table (kind -> Kenney base
// name). Kept as a plain literal here rather than imported, since that file
// is authored for Metro's require() bundler, not a Node ESM script.
const KIND_TO_KENNEY = {
  sofa: 'loungeSofa',
  sectional: 'loungeSofaCorner',
  chair: 'chairModernCushion',
  stool: 'stoolBar',
  bench: 'bench',
  table: 'table',
  roundTable: 'tableRound',
  desk: 'desk',
  nightstand: 'sideTableDrawers',
  bed: 'bedDouble',
  wardrobe: 'bookcaseClosedDoors',
  dresser: 'cabinetBedDrawer',
  bookshelf: 'bookcaseOpen',
  shelfUnit: 'bookcaseOpenLow',
  cabinet: 'kitchenCabinet',
  tvStand: 'cabinetTelevision',
  wallShelf: 'kitchenCabinetUpper',
  counter: 'kitchenCabinet',
  island: 'kitchenBar',
  stove: 'kitchenStove',
  fridge: 'kitchenFridge',
  sink: 'kitchenSink',
  bathtub: 'bathtub',
  shower: 'shower',
  toilet: 'toilet',
  mirror: 'bathroomMirror',
  lamp: 'lampRoundFloor',
  pendant: 'lampSquareCeiling',
  sconce: 'lampWall',
  ceilingFan: 'ceilingFan',
  tv: 'televisionModern',
  plant: 'pottedPlant',
  planter: 'plantSmall1',
  rug: 'rugRectangle',
  crate: 'cardboardBoxClosed',
  bin: 'trashcan',
  displayCase: 'tableGlass',
};

function parseOnlyFilter() {
  const idx = process.argv.indexOf('--only');
  if (idx === -1) return null;
  return new Set(process.argv[idx + 1].split(',').map((s) => s.trim()));
}

function renderHarness(tmpDir) {
  const threeUrl = pathToFileURL(join(FRONTEND_ROOT, 'node_modules/three/build/three.module.js')).href;
  const gltfLoaderUrl = pathToFileURL(join(FRONTEND_ROOT, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js')).href;
  // Points straight at the real src/three/materials/kenneyMap.js (it has no
  // imports of its own — "kept dependency-free... the offline thumbnail
  // renderer consumes it verbatim", per its header comment) so this script
  // can never drift from the tint table the live 3D view actually uses.
  const kenneyMapUrl = pathToFileURL(KENNEY_MAP_PATH).href;
  const template = readFileSync(HARNESS_TEMPLATE, 'utf8');
  const html = template
    .replaceAll('__THREE_URL__', threeUrl)
    .replaceAll('__GLTFLOADER_URL__', gltfLoaderUrl)
    .replaceAll('__KENNEYMAP_URL__', kenneyMapUrl);
  const outPath = join(tmpDir, 'kenney-plan-top-harness.html');
  writeFileSync(outPath, html);
  return outPath;
}

async function renderTop(browser, harnessPath, glbPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE });
  page.on('pageerror', (e) => console.log(`  page error: ${e.message}`));

  const params = new URLSearchParams({ glb: pathToFileURL(glbPath).href, size: String(SIZE) });
  const url = `${pathToFileURL(harnessPath).href}?${params.toString()}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__thumbDone === true || window.__thumbError, { timeout: 30000 });

  const error = await page.evaluate(() => window.__thumbError);
  if (error) throw new Error(error);

  const dataUrl = await page.evaluate(() => window.__thumbDataUrl);
  await page.close();
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

async function main() {
  const only = parseOnlyFilter();
  const tmpDir = mkdtempSync(join(tmpdir(), 'plan-tops-'));
  const harnessPath = renderHarness(tmpDir);
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--allow-file-access-from-files',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
    ],
  });

  // Render once per unique Kenney basename, then copy to every kind that
  // shares it (e.g. counter/cabinet both use kitchenCabinet) — avoids
  // rendering the same model twice.
  const basenameToBuffer = new Map();
  let rendered = 0;
  let written = 0;
  try {
    for (const [kind, basename] of Object.entries(KIND_TO_KENNEY)) {
      if (only && !only.has(kind)) continue;
      if (!basenameToBuffer.has(basename)) {
        const glbPath = join(KENNEY_DIR, `${basename}.glb`);
        if (!existsSync(glbPath)) {
          console.warn(`  skip ${kind} (${basename}): .glb not found at ${glbPath}`);
          continue;
        }
        console.log(`rendering ${basename}.glb...`);
        const png = await renderTop(browser, harnessPath, glbPath);
        basenameToBuffer.set(basename, png);
        rendered++;
      }
      const outPath = join(OUT_DIR, `${kind}.png`);
      writeFileSync(outPath, basenameToBuffer.get(basename));
      console.log(`  wrote ${kind}.png (from ${basename})`);
      written++;
    }
  } finally {
    await browser.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log(`\ndone: ${rendered} unique model(s) rendered, ${written} kind PNG(s) written to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
