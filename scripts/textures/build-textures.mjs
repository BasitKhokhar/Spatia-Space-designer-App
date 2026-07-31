// Build the bundled tiling-texture set from ambientCG (CC0).
//
// WHAT THIS DOES
//   1. Downloads the 1K-JPG archive for each material listed in MATERIALS below
//      (or reads an already-downloaded folder via `dir`).
//   2. Extracts the Color, NormalGL, Roughness and AmbientOcclusion maps.
//   3. Resizes, desaturates the albedo toward neutral grey, and writes
//      JPEG (albedo) / PNG (normal) / JPEG (packed ORM) into src/assets/textures/.
//
// WHY A PACKED ORM MAP
// Uniform roughness is the main reason a PBR surface still reads as plastic:
// every point on a floor catches the light identically, which never happens in
// reality. three can read occlusion, roughness and metalness from the R, G and B
// channels of ONE texture, so per-pixel roughness costs a single extra ~25KB
// JPEG per material rather than three separate maps.
//   R = AmbientOcclusion  (255 = unoccluded, used when the source has no AO map)
//   G = Roughness         (normalised, see ORM_ROUGH_MEAN below)
//   B = Metalness         (255 = pass-through; the material's own scalar decides)
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

// Where locally-downloaded ambientCG sets live (the ones already unzipped by
// hand). Anything with a `dir` is read from here instead of being fetched.
const LOCAL = process.env.TEXTURE_LOCAL || resolve(ROOT, '../assetss');

const SIZE = 512;
// Normals are deliberately half the albedo resolution. They carry low-frequency
// surface slope, not detail, so 256 is visually indistinguishable at phone zoom
// while being 4x smaller — and PNG normals are by far the biggest thing we ship
// (a 512 normal is 200-700KB against a 512 albedo's 10-90KB).
const NORMAL_SIZE = 256;
// ORM carries low-frequency "how worn is this patch" information, not detail —
// 256 is ample, and it keeps the whole set under a quarter of a megabyte.
const ORM_SIZE = 256;
const JPEG_QUALITY = 82;
// Packed channels must NOT be chroma-subsampled: 4:2:0 averages colour across
// 2x2 blocks, which bleeds the roughness channel into the AO channel and back.
const ORM_QUALITY = 88;

// Mean brightness the roughness channel is normalised to, as a 0..1 fraction.
//
// three multiplies material.roughness by the map's green channel, so a map
// averaging 0.5 would halve every authored roughness in manifest.js and turn the
// whole app glossy. Normalising to a known mean lets the runtime divide it back
// out (see the matching constant in three/materials/library.js), which leaves
// the average appearance exactly as authored and adds only the per-pixel
// variation we actually want.
//
// KEEP THIS IN SYNC WITH ORM_ROUGH_MEAN IN src/three/materials/library.js.
const ORM_ROUGH_MEAN = 0.85;
// How much of the source's roughness contrast to keep. Full contrast on a 1K
// source produces speckle at phone viewing distance; this reads as variation.
const ORM_ROUGH_CONTRAST = 0.9;

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
// `orm` emits the packed occlusion/roughness/metalness map. On by default for
// everything that carries a texture — a Roughness map ships with every ambientCG
// set, and it is the cheapest realism per kilobyte in the whole pipeline.
// `dir` reads an already-unzipped set from LOCAL instead of downloading.
const MATERIALS = [
  { key: 'wood_floor', asset: 'WoodFloor043', normal: true, saturation: 0.35 },
  // The two sets already downloaded by hand — no network needed for these.
  { key: 'wood_plank', asset: 'WoodFloor008', dir: 'WoodFloor008_1K-JPG', normal: true, saturation: 0.35 },
  { key: 'wood_herringbone', asset: 'WoodFloor051', dir: 'WoodFloor051_1K-JPG', normal: true, saturation: 0.35 },
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
  // `stone` was declared in manifest.js with map:null from the start — it has
  // been rendering as flat colour ever since. PavingStones gives it real relief.
  { key: 'stone', asset: 'PavingStones070', normal: true, saturation: 0.4 },
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

/** Resolve a material's source folder, downloading only if it isn't local. */
function sourceDir(m) {
  if (m.dir) {
    const local = join(LOCAL, m.dir);
    if (!existsSync(local)) throw new Error(`local set not found: ${local}`);
    return local;
  }
  return extract(download(m.asset), m.asset);
}

// ---------------------------------------------------------------------------
// Packed ORM
// ---------------------------------------------------------------------------

/**
 * One 8-bit greyscale plane at `size`, or a constant fill when the source map is
 * absent. ambientCG is not consistent about which maps ship — WoodFloor008 has
 * no AmbientOcclusion while WoodFloor051 does — so every channel must tolerate a
 * missing source rather than assuming a uniform set.
 */
async function plane(sharp, src, size, fill) {
  if (!src) return Buffer.alloc(size * size, fill);
  const { data } = await sharp(src)
    .resize(size, size, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/** Recentre a roughness plane on ORM_ROUGH_MEAN, keeping part of its contrast. */
function normaliseRoughness(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length || 1;
  const target = ORM_ROUGH_MEAN * 255;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = target + (data[i] - mean) * ORM_ROUGH_CONTRAST;
    out[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }
  return { out, mean };
}

async function buildORM(sharp, dir, outPath) {
  const roughSrc = findMap(dir, '_roughness');
  if (!roughSrc) return null; // no roughness => nothing worth packing

  const aoSrc = findMap(dir, '_ambientocclusion');

  const rough = await plane(sharp, roughSrc, ORM_SIZE, 255);
  // 255 = fully unoccluded, which is three's no-op for aoMap.
  const ao = await plane(sharp, aoSrc, ORM_SIZE, 255);
  const { out: roughN, mean } = normaliseRoughness(rough);

  const n = ORM_SIZE * ORM_SIZE;
  const rgb = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = ao[i];
    rgb[i * 3 + 1] = roughN[i];
    // 255 = pass-through: metalness is decided by the material's own scalar, so
    // a future metallic material is not silently forced to zero here.
    rgb[i * 3 + 2] = 255;
  }

  await sharp(rgb, { raw: { width: ORM_SIZE, height: ORM_SIZE, channels: 3 } })
    .jpeg({ quality: ORM_QUALITY, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(outPath);

  return { hasAO: !!aoSrc, sourceMean: mean };
}

async function main() {
  const sharp = (await import('sharp')).default;

  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  const written = [];
  const failed = [];
  for (const m of MATERIALS) {
    console.log(`\n${m.key}  (${m.asset})`);
    let dir;
    try {
      dir = sourceDir(m);
    } catch (e) {
      // One unreachable asset must not cost the whole run. The material keeps
      // whatever files it already has, and getTexture() degrades to flat colour
      // for anything genuinely missing.
      failed.push(`${m.key}: ${e.message}`);
      console.warn(`  !  skipped — ${e.message}`);
      continue;
    }

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

    if (m.orm !== false) {
      const ormOut = join(OUT, `${m.key}_orm.jpg`);
      const orm = await buildORM(sharp, dir, ormOut);
      if (orm) {
        written.push(ormOut);
        console.log(
          `  -> ${m.key}_orm.jpg ${(statSync(ormOut).size / 1024).toFixed(0)}KB ` +
            `(rough mean ${orm.sourceMean.toFixed(0)} -> ${(ORM_ROUGH_MEAN * 255).toFixed(0)}` +
            `${orm.hasAO ? ', +AO' : ', no AO in set'})`
        );
      } else {
        console.log('  !  no roughness map in archive, no ORM emitted');
      }
    }
  }

  const total = written.reduce((n, f) => n + statSync(f).size, 0);
  console.log(`\n${written.length} files, ${(total / 1048576).toFixed(2)}MB total in src/assets/textures/`);
  if (failed.length) {
    console.warn(`\n${failed.length} material(s) skipped:`);
    failed.forEach((f) => console.warn('  ' + f));
  }
  console.log('Now add the matching lines to FILES in src/three/materials/textures.js.');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
