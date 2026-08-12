#!/usr/bin/env node
/**
 * Batch submit: scan a regress batch dir for checked template.md → close/active.
 *
 *   node regress-submit.mjs --batch <batchDir>
 *   node regress-submit.mjs --batch <batchDir> --yes
 *
 * Reuses regression-submit logic (upload + active/close).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupBatches } from './regress-cleanup.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUBMIT = path.join(__dirname, 'regression-submit.mjs');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { yes: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch') out.batch = args[++i];
    if (args[i] === '--yes') out.yes = true;
  }
  if (!out.batch) {
    console.error('Usage: node regress-submit.mjs --batch <batch-dir> [--yes]');
    process.exit(1);
  }
  return out;
}

function parseVerdict(templatePath) {
  const md = fs.readFileSync(templatePath, 'utf8');
  const passMatch = md.match(/-\s*\[[xX√✓]\]\s*PASS/i);
  const failMatch = md.match(/-\s*\[[xX√✓]\]\s*FAIL/i);
  if (passMatch && failMatch) return 'BOTH';
  if (passMatch) return 'PASS';
  if (failMatch) return 'FAIL';
  return null;
}

function main() {
  const { batch, yes } = parseArgs();
  const abs = path.resolve(batch);
  if (!fs.existsSync(abs)) {
    console.error(`batch dir not found: ${abs}`);
    process.exit(1);
  }

  const summaryPath = path.join(abs, 'batch-summary.json');
  const summary = fs.existsSync(summaryPath)
    ? JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    : { succeeded: [] };

  const dirs = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => path.join(abs, d.name));

  const report = { submitted: [], skipped: [], errors: [] };

  for (const dir of dirs) {
    const bugId = path.basename(dir);
    const tpl = path.join(dir, 'template.md');
    const mf = path.join(dir, 'manifest.json');
    if (!fs.existsSync(tpl) || !fs.existsSync(mf)) {
      report.skipped.push({ bugId, reason: 'missing template/manifest' });
      continue;
    }
    if (fs.existsSync(path.join(dir, 'error.json'))) {
      report.skipped.push({ bugId, reason: 'replay failed (error.json)' });
      continue;
    }
    const verdict = parseVerdict(tpl);
    if (!verdict) {
      report.skipped.push({ bugId, reason: 'no PASS/FAIL checked' });
      continue;
    }
    if (verdict === 'BOTH') {
      report.skipped.push({ bugId, reason: 'both PASS and FAIL checked' });
      continue;
    }

    console.log(`\n[batch-submit] #${bugId} → ${verdict}${yes ? '' : ' (dry-run)'}`);
    const args = [SUBMIT, '--dir', dir];
    if (yes) args.push('--yes');
    const r = spawnSync(process.execPath, args, { encoding: 'utf8', stdio: 'inherit' });
    if (r.status === 0) {
      report.submitted.push({ bugId, verdict, dryRun: !yes });
    } else {
      report.errors.push({ bugId, verdict, exit: r.status });
    }
  }

  const outReport = path.join(abs, 'submit-report.json');
  fs.writeFileSync(
    outReport,
    JSON.stringify({ ...report, batch: abs, yes, at: new Date().toISOString(), summaryRef: summary.batchId }, null, 2)
  );

  console.log('\n========== SUBMIT SUMMARY ==========');
  console.log(`submitted: ${report.submitted.length}`);
  console.log(`skipped:   ${report.skipped.length}`);
  console.log(`errors:    ${report.errors.length}`);
  for (const s of report.skipped) console.log(`  skip #${s.bugId}: ${s.reason}`);
  for (const e of report.errors) console.log(`  err  #${e.bugId}: exit ${e.exit}`);
  console.log(`report: ${outReport}`);
  if (!yes) console.log('\n(dry-run) add --yes to really close/activate');

  if (yes && report.errors.length === 0) {
    const c = cleanupBatches({ yes: true, keepSubmitted: 2, keepUnsubmitted: 2, protect: abs });
    if (c.deleted.length) {
      console.log('\n========== AUTO CLEANUP ==========');
      for (const { dir, pool } of c.deleted) console.log(`  - [${pool}] ${path.basename(dir)}`);
      console.log(`[cleanup] deleted ${c.deleted.length} old batch(es); current batch ${path.basename(abs)} protected.`);
    }
  }

  process.exit(report.errors.length ? 1 : 0);
}

main();
