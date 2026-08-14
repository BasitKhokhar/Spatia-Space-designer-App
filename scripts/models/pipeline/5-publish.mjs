// Step 5: hand the pipeline's output to the Backend repo.
//
// dist/items.json is copied to Backend/prisma/modelCatalog.json (committed —
// it's the durable record of what's been published; catalogData.models.js
// reads it at seed time and never deletes an entry a later --only run didn't
// touch).
//
// dist/bucket/{models,thumbs}/ is the actual file payload. BUCKET_PATH in
// Backend/.env is a path on the production VPS
// (/home/basitvps/public_html/ImagesBucket/Spatia) — this script cannot write
// there from a Windows dev machine, so:
//   - if LOCAL_BUCKET_PATH is set (dev: point Backend's BUCKET_PATH at a
//     local folder instead), copy the files there directly.
//   - otherwise, print the exact folder to upload and where it goes.

import { existsSync, cpSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUCKET_DIR, ITEMS_JSON_PATH, BACKEND_ROOT, log } from './lib/common.mjs';

function main() {
  if (!existsSync(ITEMS_JSON_PATH)) {
    throw new Error(`${ITEMS_JSON_PATH} not found — run 4-manifest.mjs first.`);
  }

  const backendCatalogPath = join(BACKEND_ROOT, 'prisma', 'modelCatalog.json');
  if (!existsSync(join(BACKEND_ROOT, 'prisma'))) {
    throw new Error(`Backend repo not found at ${BACKEND_ROOT} — expected it as a sibling of Frontend.`);
  }
  copyFileSync(ITEMS_JSON_PATH, backendCatalogPath);
  log('publish', `wrote ${backendCatalogPath}`);

  const localBucket = process.env.LOCAL_BUCKET_PATH;
  if (localBucket) {
    mkdirSync(localBucket, { recursive: true });
    cpSync(BUCKET_DIR, localBucket, { recursive: true });
    log('publish', `copied models/ + thumbs/ -> ${localBucket}`);
    log('publish', 'done. Backend .env BUCKET_PATH should point at this same folder for local dev.');
  } else {
    log('publish', 'LOCAL_BUCKET_PATH not set — files staged, not copied anywhere.');
    log('publish', `Upload the CONTENTS of:\n    ${BUCKET_DIR}\n  to the production bucket root:\n    ${'<VPS>'}/ImagesBucket/Spatia/ (BUCKET_PATH in Backend/.env)`);
    log('publish', 'so that e.g. models/<slug>.glb lands at BUCKET_BASE_URL/models/<slug>.glb.');
  }

  log('publish', 'Next: run `npm run seed` in Backend to upsert these items into AllItems.');
}

main();
