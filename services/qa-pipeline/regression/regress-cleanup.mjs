#!/usr/bin/env node
/**
 * Cleanup old regression batches. Keep only the latest N per pool.
 *
 * Pools:
 *   - submitted: batches with submit-report.json and yes === true
 *   - unsubmitted: everything else (dry-run, not-yet-submitted)
 *
 * Each pool keeps its own latest N (default 2), older ones are removed recursively.
 * The current batch (passed via --protect) is never removed, regardless of pool.
 *
 *   node regress-cleanup.mjs                       # dry-run, show what would be deleted
 *   node regress-cleanup.mjs --yes                 # actually delete
 *   node regress-cleanup.mjs --keep 2              # override keep count (default 2)
 *   node regress-cleanup.mjs --protect <batchDir>  # never delete this batch
 *   node regress-cleanup.mjs --keep-submitted 2 --keep-unsubmitted 2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'pyproject.toml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start, '..', '..');
}
const BATCH_ROOT = path.join(findRepoRoot(__dirname), 'output', 'runtime', 'handoff', 'regression', 'batches');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { yes: false, keep: 2, keepSubmitted: null, keepUnsubmitted: null, protect: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--yes') out.yes = true;
    if (args[i] === '--keep') out.keep = parseInt(args[++i], 10);
    if (args[i] === '--keep-submitted') out.keepSubmitted = parseInt(args[++i], 10);
    if (args[i] === '--keep-unsubmitted') out.keepUnsubmitted = parseInt(args[++i], 10);
    if (args[i] === '--protect') out.protect = path.resolve(args[++i]);
  }
  if (out.keepSubmitted == null) out.keepSubmitted = out.keep;
  if (out.keepUnsubmitted == null) out.keepUnsubmitted = out.keep;
  return out;
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Determine if a batch was really submitted (yes===true in submit-report.json).
 */
function isSubmitted(batchDir) {
  const sr = path.join(batchDir, 'submit-report.json');
  if (!fs.existsSync(sr)) return false;
  try {
    const j = JSON.parse(fs.readFileSync(sr, 'utf8'));
    return j.yes === true;
  } catch {
    return false;
  }
}

function listBatches() {
  if (!fs.existsSync(BATCH_ROOT)) return [];
  return fs
    .readdirSync(BATCH_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(BATCH_ROOT, d.name))
    .sort() // batchId is timestamp-prefixed, so lexical sort == chronological
    .reverse(); // newest first
}

export function cleanupBatches({ yes = false, keepSubmitted = 2, keepUnsubmitted = 2, protect = null } = {}) {
  const batches = listBatches();
  const submitted = batches.filter((b) => isSubmitted(b));
  const unsubmitted = batches.filter((b) => !isSubmitted(b));

  const toDelete = [];
  for (const b of submitted.slice(keepSubmitted)) {
    if (protect && path.resolve(b) === path.resolve(protect)) continue;
    toDelete.push({ dir: b, pool: 'submitted' });
  }
  for (const b of unsubmitted.slice(keepUnsubmitted)) {
    if (protect && path.resolve(b) === path.resolve(protect)) continue;
    toDelete.push({ dir: b, pool: 'unsubmitted' });
  }

  const report = { deleted: [], kept: { submitted: submitted.slice(0, keepSubmitted), unsubmitted: unsubmitted.slice(0, keepUnsubmitted) } };

  for (const { dir, pool } of toDelete) {
    if (!yes) {
      report.deleted.push({ dir, pool, wouldDelete: true });
      continue;
    }
    rmrf(dir);
    report.deleted.push({ dir, pool, wouldDelete: false });
  }
  return report;
}

function main() {
  const opts = parseArgs();
  if (!fs.existsSync(BATCH_ROOT)) {
    console.log(`[cleanup] no batches dir: ${BATCH_ROOT}`);
    return;
  }
  const report = cleanupBatches(opts);
  const mode = opts.yes ? 'DELETE' : 'DRY-RUN';
  console.log(`\n========== CLEANUP (${mode}) ==========`);

  console.log(`\n[submitted] keeping ${report.kept.submitted.length}:`);
  for (const b of report.kept.submitted) console.log(`  + ${path.basename(b)}`);

  console.log(`\n[unsubmitted] keeping ${report.kept.unsubmitted.length}:`);
  for (const b of report.kept.unsubmitted) console.log(`  + ${path.basename(b)}`);

  if (!report.deleted.length) {
    console.log('\n[cleanup] nothing to delete.');
    return;
  }

  const verb = opts.yes ? 'deleted' : 'would delete';
  console.log(`\n[cleanup] ${verb} ${report.deleted.length}:`);
  for (const { dir, pool } of report.deleted) console.log(`  - [${pool}] ${path.basename(dir)}`);

  if (!opts.yes) console.log('\n(dry-run) re-run with --yes to actually delete.');
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('regress-cleanup.mjs')) {
  main();
}
