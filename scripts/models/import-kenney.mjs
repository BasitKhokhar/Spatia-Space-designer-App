// Import the Kenney Furniture Kit into src/assets.
//
// WHAT THIS COPIES
//   Models/GLTF format/*.glb  ->  src/assets/models/kenney/*.glb    (140 files, ~1.9MB)
//   Isometric/<name>_NE.png   ->  src/assets/thumbs/kenney/<name>.png (140 files, ~400KB)
//   License.txt               ->  src/assets/models/kenney/LICENSE.txt
//
// The kit ships two preview sets. `Side/` is a flat side elevation, which for a
// low-poly sofa is an unreadable coloured blob; `Isometric/` has four 3/4 views
// per model (_NE/_NW/_SE/_SW). We take _NE — a 3/4 view is what reads as a
// product in a catalog tile. The `_NE` suffix is stripped so the basename stays
// the model's name, which is the join key the registries use.
//
// Names are preserved verbatim (camelCase, no prefix) because they are the join
// key used by src/three/modelRegistry.js and src/components/graphics/itemThumbs.js.
// Note Kenney's own typo in `wallCornerRond.glb` — do NOT "fix" it here, the
// registry has to match the file on disk.
//
// WHY A SCRIPT RATHER THAN A ONE-OFF COPY
// The kit lives outside the repo (it is 17MB across 5 formats, only one of which
// we ship). Re-running this after a kit update, or on another machine, has to
// produce byte-identical output or the registry silently breaks — so the mapping
// lives in code, not in someone's shell history.
//
// USAGE
//   node scripts/models/import-kenney.mjs
//   node scripts/models/import-kenney.mjs --src "D:/path/to/kenney_furniture-kit"
//
// LICENSE
// Kenney assets are CC0 (public domain): free for commercial use, attribution
// optional, safe to redistribute inside a published app binary. The kit's own
// License.txt is copied alongside the models so the terms ship with the files.

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// Default location: sibling `assetss` folder next to the Frontend checkout.
const DEFAULT_SRC = resolve(ROOT, '../assetss/kenney_furniture-kit');

const argSrc = process.argv.indexOf('--src');
const SRC = argSrc > -1 ? resolve(process.argv[argSrc + 1]) : DEFAULT_SRC;

const MODELS_SRC = join(SRC, 'Models/GLTF format');
const THUMBS_SRC = join(SRC, 'Isometric');
const LICENSE_SRC = join(SRC, 'License.txt');

const MODELS_OUT = join(ROOT, 'src/assets/models/kenney');
const THUMBS_OUT = join(ROOT, 'src/assets/thumbs/kenney');

// Which isometric angle to keep. All four exist per model; one is enough.
const ISO_ANGLE = '_NE';

/**
 * @param {(name: string) => string|null} rename maps a source filename to its
 *        output filename, or null to skip it.
 */
function copyAll(from, to, ext, rename = (f) => f) {
  if (!existsSync(from)) throw new Error(`missing source directory: ${from}`);

  // Wipe first so a removed upstream file does not linger and get require()'d.
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });

  const files = readdirSync(from).filter((f) => f.toLowerCase().endsWith(ext));
  let bytes = 0;
  let count = 0;
  for (const f of files) {
    const out = rename(f);
    if (!out) continue;
    copyFileSync(join(from, f), join(to, out));
    bytes += statSync(join(to, out)).size;
    count++;
  }
  return { count, bytes };
}

function main() {
  console.log(`source: ${SRC}\n`);

  const models = copyAll(MODELS_SRC, MODELS_OUT, '.glb');
  console.log(`models  ${String(models.count).padStart(3)} files  ${(models.bytes / 1048576).toFixed(2)}MB  -> src/assets/models/kenney/`);

  const thumbs = copyAll(THUMBS_SRC, THUMBS_OUT, '.png', (f) =>
    f.endsWith(`${ISO_ANGLE}.png`) ? `${f.slice(0, -(ISO_ANGLE.length + 4))}.png` : null
  );
  console.log(`thumbs  ${String(thumbs.count).padStart(3)} files  ${(thumbs.bytes / 1048576).toFixed(2)}MB  -> src/assets/thumbs/kenney/`);

  if (existsSync(LICENSE_SRC)) {
    copyFileSync(LICENSE_SRC, join(MODELS_OUT, 'LICENSE.txt'));
    console.log('license   1 file                 -> src/assets/models/kenney/LICENSE.txt');
  } else {
    console.warn('WARNING: License.txt not found in the kit — copy it manually before shipping.');
  }

  // A model with no matching thumbnail (or vice versa) means the registry and the
  // 2D tile map will disagree, which shows up as a real 3D model paired with a
  // fallback SVG glyph. Cheap to catch here, annoying to notice on a device.
  const modelNames = new Set(readdirSync(MODELS_OUT).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)));
  const thumbNames = new Set(readdirSync(THUMBS_OUT).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)));
  const missingThumbs = [...modelNames].filter((n) => !thumbNames.has(n));
  const orphanThumbs = [...thumbNames].filter((n) => !modelNames.has(n));

  if (missingThumbs.length) console.warn(`\n${missingThumbs.length} model(s) without a thumbnail: ${missingThumbs.join(', ')}`);
  if (orphanThumbs.length) console.warn(`${orphanThumbs.length} thumbnail(s) without a model: ${orphanThumbs.join(', ')}`);

  const total = (models.bytes + thumbs.bytes) / 1048576;
  console.log(`\ntotal added to bundle: ${total.toFixed(2)}MB`);
}

try {
  main();
} catch (e) {
  console.error('\nFAILED:', e.message);
  process.exit(1);
}
