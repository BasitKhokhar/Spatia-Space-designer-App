// Step 4: join assets.config.mjs + the dimensions/source metadata extracted
// by 2-optimize.mjs into dist/items.json — the manifest 5-publish.mjs copies
// into Backend/prisma/modelCatalog.json for the seed script to read.

import { join } from 'node:path';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { ASSETS } from './assets.config.mjs';
import {
  RAW_DIR, DIST_DIR, BUCKET_DIR, ITEMS_JSON_PATH, log, readJsonIfExists, writeJson, parseOnlyFilter,
} from './lib/common.mjs';

// Must match Backend/prisma/catalogData.js CATEGORIES[].name exactly — the
// seed script looks categories up by this string.
const VALID_CATEGORIES = new Set([
  'Structure', 'Doors & Windows', 'Furniture', 'Kitchen', 'Electrical',
  'Sanitary', 'Decor', 'Flooring & Finishes', 'Outdoor', 'Garden',
  'Retail', 'Clinic', 'School',
]);

function main() {
  const only = parseOnlyFilter();
  const optimizeMeta = readJsonIfExists(join(DIST_DIR, 'optimize-meta.json'), {});
  const existingManifest = readJsonIfExists(ITEMS_JSON_PATH, []);
  const byslug = new Map(existingManifest.map((item) => [item.slug, item]));

  const creditsLines = [
    'CC0 assets used by this catalog — no attribution legally required; kept for bookkeeping.',
    '',
  ];

  let count = 0;
  for (const asset of ASSETS) {
    if (only && !only.has(asset.slug)) continue;

    if (!VALID_CATEGORIES.has(asset.category)) {
      throw new Error(`${asset.slug}: category "${asset.category}" is not one of Backend's canonical categories: ${[...VALID_CATEGORIES].join(', ')}`);
    }

    const meta = optimizeMeta[asset.slug];
    if (!meta) {
      throw new Error(`${asset.slug}: no optimize-meta entry — run 2-optimize.mjs first (or with --only ${asset.slug})`);
    }

    const sourceMetaPath = join(RAW_DIR, asset.slug, '_source.json');
    const sourceMeta = existsSync(sourceMetaPath) ? JSON.parse(readFileSync(sourceMetaPath, 'utf8')) : {};

    const item = {
      slug: asset.slug,
      name: asset.name,
      category: asset.category,
      kind: asset.kind,
      dimensions: meta.dims,
      colors: asset.colors || [],
      price: asset.price ?? 0,
      cost: asset.cost ?? 0,
      premium: !!asset.premium,
      group: asset.group || null,
      tags: [...(asset.tags || []), 'cc0', `src:${asset.source}:${asset.sourceId || asset.file}`],
      modelPath: `models/${asset.slug}.glb`,
      thumbPath: `thumbs/${asset.slug}.png`,
      source: asset.source,
      sourceUrl: sourceMeta.sourceUrl || null,
      license: sourceMeta.license || 'CC0',
    };

    byslug.set(asset.slug, item);
    creditsLines.push(`${item.slug}  —  "${item.name}"  by ${sourceMeta.author || 'Unknown'}  (${item.license})  ${item.sourceUrl || ''}`);
    count++;
  }

  const manifest = [...byslug.values()];
  writeJson(ITEMS_JSON_PATH, manifest);

  const creditsPath = join(BUCKET_DIR, 'models', 'CREDITS.txt');
  mkdirSync(join(BUCKET_DIR, 'models'), { recursive: true });
  writeFileSync(creditsPath, creditsLines.join('\n') + '\n');

  log('manifest', `updated ${count} entr${count === 1 ? 'y' : 'ies'}, ${manifest.length} total in items.json`);
}

main();
