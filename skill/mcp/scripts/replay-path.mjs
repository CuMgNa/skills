#!/usr/bin/env node
/**
 * Single-path replay on local Chrome (CDP).
 *
 *   node replay-path.mjs --path wxfb/bugs/3847 --out-dir ../output/... [--bug 3847]
 *
 * Failure → exit 2. Does NOT close Chrome.
 */
import fs from 'fs';
import path from 'path';
import { connectCdp, pickPage } from './cdp-connect.mjs';
import { resolvePathFile, replayPathOnPage } from './path-replay-lib.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path') out.pathId = args[++i];
    if (args[i] === '--path-file') out.pathFile = args[++i];
    if (args[i] === '--out-dir') out.outDir = args[++i];
    if (args[i] === '--bug') out.bug = args[++i];
  }
  if ((!out.pathId && !out.pathFile) || !out.outDir) {
    console.error('Usage: node replay-path.mjs --path <id> --out-dir <dir> [--bug <id>]');
    process.exit(1);
  }
  return out;
}

async function main() {
  const { pathId, pathFile: pf, outDir, bug } = parseArgs();
  const pathFile = pf || resolvePathFile(pathId);
  const absOut = path.resolve(outDir);
  const data = JSON.parse(fs.readFileSync(pathFile, 'utf8'));

  const { browser, ws } = await connectCdp();
  console.log('[replay] CDP:', ws);
  const page = await pickPage(browser, data.url);
  await page.bringToFront();

  const result = await replayPathOnPage({
    page,
    pathFile,
    outDir: absOut,
    bugId: bug || data.bugId,
  });

  if (!result.ok) {
    console.error(`[replay] STOP at step ${result.error.step}: ${result.error.message}`);
    process.exit(2);
  }

  console.log(`[replay] OK → ${absOut}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[replay] FAIL:', e.message || e);
  process.exit(1);
});
