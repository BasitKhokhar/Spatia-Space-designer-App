// Build the bundled tiling-texture set from ambientCG (CC0).
//
// WHAT THIS DOES
//   1. Downloads the 1K-JPG archive for each material listed in MATERIALS below.
//   2. Extracts the Color and NormalGL maps.
//   3. Resizes to 512x512, desaturates the albedo toward neutral grey, and writes
//      JPEG (albedo) / PNG (normal) into src/assets/textures/.
//
// WHY DESATURATE THE ALBEDO
// three's standard shader multiplies material.color by the albedo map. Authoring
// albedos near neutral grey means one wood texture tinted #D8B98C reads as oak and
// tinted #7C5A3C reads as walnut — so ~11 textures cover every finish in
// FLOOR_MATERIALS plus every user-selected item color. A fully saturated source
// texture would fight the tint instead.
//
// WHY 512 AND JPEG
//   * expo-gl compiles stb_image with STBI_ONLY_JPEG / STBI_ONLY_PNG. WebP fails
//     silently and renders black. Never emit WebP.
//   * No KTX2/Basis: the transcoder needs WebAssembly and Hermes has none. Texture
//     memory is therefore controlled by pixel size alone. 512 is the sweet spot on
//     a phone; 1024 quadruples memory for detail nobody sees at typical zoom.
//   * Normals stay PNG — JPEG ringing artifacts show up badly in a normal map.
//
// LICENSE
// Everything from ambientCG is CC0 (public domain): free for commercial use, no
// attribution required, safe to redistribute inside a published app binary.
//
// USAGE
//   npm i -D sharp
//   node scripts/textures/build-textures.mjs
//
// Requires `curl` and `unzip` on PATH (both ship with Git for Windows / macOS /
// most Linux). Re-running is safe: downloads are cached in .cache/.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
// TEXTURE_OUT / TEXTURE_CACHE let the script run from outside the repo (e.g. with
// sharp installed in a throwaway toolchain) without changing where output lands.
const OUT = process.env.TEXTURE_OUT || join(ROOT, 'src/assets/textures');
const CACHE = process.env.TEXTURE_CACHE || join(HERE, '.cache');

const SIZE = 512;
// Normals are deliberately half the albedo resolution. They carry low-frequency
// surface slope, not detail, so 256 is visually indistinguishable at phone zoom
// while being 4x smaller — and PNG normals are by far the biggest thing we ship
// (a 512 normal is 200-700KB against a 512 albedo's 10-90KB).
const NORMAL_SIZE = 256;
const JPEG_QUALITY = 82;

// Every albedo is normalised to this average brightness.
//
// This is the single most important step in the whole script. three multiplies
// material.color by the albedo map, so the map's brightness directly scales the
// final color: a source texture averaging 65 would render oak (#D8B98C) at a
// quarter of its intended lightness, while one averaging 217 would wash the tint
// out entirely. Raw ambientCG albedos here span 15..217. Normalising them all to
// one value is what makes a single tint palette behave the same on every texture.
const TARGET_MEAN = 178;

// key         -> the registry key used in src/three/materials/textures.js
// asset       -> ambientCG asset id
// normal      -> also emit a <key>_n.png normal map
// saturation  -> how much original color to keep (0 = fully grey). Albedos that
//                carry meaningful hue (brick, clay) keep more.
// `normal` is enabled only where surface relief actually reads at typical viewing
// distance. Marble, concrete and plaster are near-flat in a room-scale view, so
// their normal maps cost hundreds of KB to change essentially nothing.
const MATERIALS = [
  { key: 'wood_floor', asset: 'WoodFloor043', normal: true, saturation: 0.35 },
  // Wood066's normal map measures essentially flat (sd 0.5) — the grain is all in
  // the albedo, so shipping the normal would be weight for no visible gain.
  { key: 'wood', asset: 'Wood066', normal: false, saturation: 0.35 },
  // Tiles074 is a flat printed tile — its normal map is genuinely featureless
  // (measured sd ~1), so the grout pattern lives entirely in the albedo.
  { key: 'tile_sq', asset: 'Tiles074', normal: false, saturation: 0.3 },
  { key: 'marble', asset: 'Marble016', normal: false, saturation: 0.45 },
  { key: 'concrete', asset: 'Concrete034', normal: false, saturation: 0.4 },
  { key: 'carpet', asset: 'Carpet013', normal: true, saturation: 0.35 },
  { key: 'plaster', asset: 'Plaster001', normal: false, saturation: 0.4 },
  { key: 'brick', asset: 'Bricks094', normal: true, saturation: 0.6 },
  { key: 'fabric', asset: 'Fabric063', normal: true, saturation: 0.3 },
  // Leather is inherently low-contrast in albedo; its character comes almost
  // entirely from grain relief, so the normal map is the important half here.
  { key: 'leather', asset: 'Leather030', normal: true, saturation: 0.4 },
];

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

function download(asset) {
  const zip = join(CACHE, `${asset}_1K-JPG.zip`);
  if (existsSync(zip) && statSync(zip).size > 1024) return zip;
  const url = `https://ambientcg.com/get?file=${asset}_1K-JPG.zip`;
  process.stdout.write(`  downloading ${asset} ... `);
  sh('curl', ['-sL', '--max-time', '300', '-o', zip, url]);
  if (!existsSync(zip) || statSync(zip).size < 1024) {
    throw new Error(`download failed or empty for ${asset}`);
  }
  process.stdout.write(`${(statSync(zip).size / 1048576).toFixed(1)}MB\n`);
  return zip;
}

function extract(zip, asset) {
  const dir = join(CACHE, asset);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    sh('unzip', ['-o', '-q', zip, '-d', dir]);
  }
  return dir;
}

// ambientCG names maps <Asset>_1K-JPG_Color.jpg / _NormalGL.jpg, but casing and
// suffixes drift between assets — so match on substring rather than exact name.
function findMap(dir, needle) {
  const hit = readdirSync(dir).find((f) => f.toLowerCase().includes(needle.toLowerCase()));
  return hit ? join(dir, hit) : null;
}

async function main() {
  const sharp = (await import('sharp')).default;

  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  const written = [];
  for (const m of MATERIALS) {
    console.log(`\n${m.key}  (${m.asset})`);
    const dir = extract(download(m.asset), m.asset);

    const colorSrc = findMap(dir, '_color');
    if (!colorSrc) throw new Error(`no Color map found for ${m.asset}`);

    const albedoOut = join(OUT, `${m.key}.jpg`);

    // Pass 1: desaturate toward neutral, then measure how bright the result is.
    const desaturated = await sharp(colorSrc)
      .resize(SIZE, SIZE, { fit: 'fill' })
      .modulate({ saturation: m.saturation })
      .toBuffer();
    const stats = await sharp(desaturated).stats();
    const mean = stats.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;

    // Pass 2: scale to the common target brightness. Gain is clamped so a very
    // dark source is not pushed so hard that compression noise becomes visible.
    const gain = Math.max(0.5, Math.min(4, TARGET_MEAN / Math.max(1, mean)));
    await sharp(desaturated)
      .linear(gain, 0)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(albedoOut);

    const after = await sharp(albedoOut).stats();
    const meanAfter = after.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
    written.push(albedoOut);
    console.log(
      `  -> ${m.key}.jpg  ${(statSync(albedoOut).size / 1024).toFixed(0)}KB ` +
        `(mean ${mean.toFixed(0)} -> ${meanAfter.toFixed(0)}, gain x${gain.toFixed(2)})`
    );

    if (m.normal) {
      // three expects OpenGL-convention normals (green = +Y, pointing up). Some
      // ambientCG assets ship only the DirectX variant, whose green channel is
      // inverted — using it as-is lights every bump from the wrong side, which
      // reads as a subtly "inside out" surface. Flip green when that is all we have.
      const glSrc = findMap(dir, '_normalgl');
      const dxSrc = findMap(dir, '_normaldx');
      const nSrc = glSrc || dxSrc;
      if (nSrc) {
        const nOut = join(OUT, `${m.key}_n.png`);
        let pipe = sharp(nSrc).resize(NORMAL_SIZE, NORMAL_SIZE, { fit: 'fill' });
        if (!glSrc && dxSrc) {
          const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
          for (let i = 0; i < data.length; i += info.channels) {
            data[i + 1] = 255 - data[i + 1]; // G -> OpenGL convention
          }
          pipe = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
          console.log('  .  converted NormalDX -> NormalGL (green inverted)');
        }
        await pipe.png({ compressionLevel: 9, palette: false }).toFile(nOut);
        written.push(nOut);
        console.log(`  -> ${m.key}_n.png ${(statSync(nOut).size / 1024).toFixed(0)}KB`);
      } else {
        console.log('  !  no normal map in archive, skipping');
      }
    }
  }

  const total = written.reduce((n, f) => n + statSync(f).size, 0);
  console.log(`\n${written.length} files, ${(total / 1048576).toFixed(2)}MB total in src/assets/textures/`);
  console.log('Now uncomment the matching lines in src/three/materials/textures.js.');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
