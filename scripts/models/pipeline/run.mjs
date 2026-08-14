// Orchestrator for the realistic-render catalog asset pipeline.
//
// USAGE
//   node scripts/models/pipeline/run.mjs                    # all steps, all assets
//   node scripts/models/pipeline/run.mjs --only slug-a,slug-b
//   node scripts/models/pipeline/run.mjs --step optimize     # single step, all assets
//   node scripts/models/pipeline/run.mjs --step thumbs --only slug-a
//
// Add models by editing assets.config.mjs, then just re-run — fetch skips
// cached slugs, optimize/thumbs/manifest overwrite deterministically, and
// publish/seed both upsert by slug. Nothing here deletes a previously
// published item.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { PIPELINE_ROOT } from './lib/common.mjs';

const STEPS = [
  { name: 'fetch', file: '1-fetch.mjs' },
  { name: 'optimize', file: '2-optimize.mjs' },
  { name: 'thumbs', file: '3-thumbs.mjs' },
  { name: 'manifest', file: '4-manifest.mjs' },
  { name: 'publish', file: '5-publish.mjs' },
];

const stepIdx = process.argv.indexOf('--step');
const onlyStep = stepIdx > -1 ? process.argv[stepIdx + 1] : null;
const steps = onlyStep ? STEPS.filter((s) => s.name === onlyStep) : STEPS;

if (onlyStep && steps.length === 0) {
  console.error(`Unknown --step "${onlyStep}". Valid: ${STEPS.map((s) => s.name).join(', ')}`);
  process.exit(1);
}

const passthroughArgs = process.argv.slice(2).filter((a, i, arr) => {
  if (a === '--step' || arr[i - 1] === '--step') return false;
  return true;
});

for (const step of steps) {
  console.log(`\n=== ${step.name} ===`);
  execFileSync('node', [join(PIPELINE_ROOT, step.file), ...passthroughArgs], { stdio: 'inherit' });
}

console.log('\nPipeline complete.');
