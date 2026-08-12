#!/usr/bin/env node
/**
 * Batch regression: scan paths/{project}/bugs/*.json ∩ zentao resolved → replay all → summary.
 *
 *   node regress.mjs --project wxfb
 *   node regress.mjs --project wxfb --status resolved   # default
 *   node regress.mjs --project wxfb --dry-select        # only list candidates
 *
 * Does NOT close Chrome. Does NOT judge PASS/FAIL.
 * See docs/defect-path-regression-design.md
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { connectCdp, pickPage } from './cdp-connect.mjs';
import { PATHS_ROOT, replayPathOnPage } from './path-replay-lib.mjs';
import { loadZentaoConfig } from './zentao-upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BATCH_ROOT = path.resolve(__dirname, '..', 'output', 'handoff', 'regression', 'batches');

/**
 * 进程级互斥锁：防止多个 regress.mjs 并发跑。
 * 根因：两个进程会各自 CDP 握手（= 两次接管请求）、各自创建 batch、
 * 且 pickPage 按 host 命中同一 tab → 轮流点击互相破坏页面状态，
 * 导致原本 OK 的路径被误判为回放失败。
 * 锁放在 dry-select 之后，纯查询不互斥。
 */
const LOCK_FILE = path.join(BATCH_ROOT, '.regress.lock');

function pidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // 进程存在但无权限
  }
}

function acquireLock() {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  // 僵尸锁清理：锁存在但持有者已死 → 接管
  if (fs.existsSync(LOCK_FILE)) {
    const raw = fs.readFileSync(LOCK_FILE, 'utf8');
    const holder = Number(raw.trim());
    if (pidAlive(holder)) {
      console.error(`[regress] 已有回归在跑 (pid=${holder})，请等它结束或手动清理: ${LOCK_FILE}`);
      console.error('[regress] 拒绝并发启动，避免抢同一 Chrome tab 互相破坏回放。');
      process.exit(8);
    }
    console.warn(`[regress] 发现僵尸锁 (pid=${holder} 已退出)，自动清理后接管。`);
    try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
  }
  // O_EXCL 原子创建：第二个进程到此必失败
  try {
    const fd = fs.openSync(LOCK_FILE, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
  } catch (e) {
    if (e.code === 'EEXIST') {
      const raw = fs.readFileSync(LOCK_FILE, 'utf8');
      console.error(`[regress] 已有回归在跑 (pid=${raw.trim()})，拒绝并发启动。`);
      process.exit(8);
    }
    throw e;
  }
}

let _lockHeld = false;
function releaseLock() {
  if (!_lockHeld) return;
  _lockHeld = false;
  try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

/** Default: 已解决 / 待回归 → zentao status "resolved" */
const DEFAULT_STATUSES = new Set(['resolved']);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { statuses: null, drySelect: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project') out.project = args[++i];
    if (args[i] === '--status') {
      out.statuses = new Set(
        args[++i]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
    if (args[i] === '--dry-select') out.drySelect = true;
  }
  if (!out.project || !/^[a-zA-Z0-9_-]+$/.test(out.project)) {
    console.error('Usage: node regress.mjs --project <key> [--status resolved] [--dry-select]');
    process.exit(1);
  }
  if (!out.statuses) out.statuses = DEFAULT_STATUSES;
  return out;
}

function joinUrl(base, p) {
  return base.replace(/\/$/, '') + '/' + p.replace(/^\//, '');
}

async function zentaoLogin(cfg) {
  const res = await fetch(joinUrl(cfg.ZENTAO_URL, '/api.php/v1/tokens'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ account: cfg.ZENTAO_ACCOUNT, password: cfg.ZENTAO_PASSWORD }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`zentao login (${res.status}): ${text.slice(0, 300)}`);
  const token = JSON.parse(text).token;
  if (!token) throw new Error('zentao login: no token');
  return token;
}

async function fetchBug(cfg, token, bugId) {
  const res = await fetch(joinUrl(cfg.ZENTAO_URL, `/api.php/v1/bugs/${bugId}`), {
    headers: { Token: token },
  });
  const text = await res.text();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET bug ${bugId} (${res.status}): ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  return data.bug || data;
}

function listBugPathFiles(project) {
  const dir = path.join(PATHS_ROOT, project, 'bugs');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => ({
      bugId: f.replace(/\.json$/, ''),
      pathFile: path.join(dir, f),
    }));
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    '-' +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

async function main() {
  const { project, statuses, drySelect } = parseArgs();
  const locals = listBugPathFiles(project);
  console.log(`[regress] project=${project} local paths=${locals.length}`);

  if (!locals.length) {
    console.log(`[regress] no files under paths/${project}/bugs/ — nothing to do`);
    process.exit(0);
  }

  const cfg = loadZentaoConfig();
  if (!cfg.ZENTAO_URL || !cfg.ZENTAO_ACCOUNT || !cfg.ZENTAO_PASSWORD) {
    console.error('[regress] missing zentao config (mcp.json env)');
    process.exit(1);
  }
  const token = await zentaoLogin(cfg);

  const selected = [];
  const skipped = [];
  for (const item of locals) {
    let bug;
    try {
      bug = await fetchBug(cfg, token, item.bugId);
    } catch (e) {
      skipped.push({ bugId: item.bugId, reason: `api error: ${e.message}` });
      continue;
    }
    if (!bug) {
      skipped.push({ bugId: item.bugId, reason: 'not found on zentao' });
      continue;
    }
    const st = bug.status;
    if (!statuses.has(st)) {
      skipped.push({ bugId: item.bugId, reason: `status=${st} not in [${[...statuses]}]`, title: bug.title });
      continue;
    }
    selected.push({ ...item, title: bug.title, status: st, url: JSON.parse(fs.readFileSync(item.pathFile, 'utf8')).url });
  }

  console.log(`[regress] selected=${selected.length} skipped=${skipped.length}`);
  for (const s of selected) console.log(`  + #${s.bugId} [${s.status}] ${s.title || ''}`);
  for (const s of skipped) console.log(`  - #${s.bugId} ${s.reason}`);

  if (drySelect) {
    console.log('[regress] --dry-select done');
    process.exit(0);
  }
  if (!selected.length) {
    console.log('[regress] nothing to replay');
    process.exit(0);
  }

  // 锁必须在 CDP 连接之前加：否则两个进程各自握手 = 两次接管请求 + 抢同一 tab。
  acquireLock();
  _lockHeld = true;
  // 任何退出路径（正常 exit / Ctrl+C / uncaughtException）都释放锁，避免僵尸锁。
  process.on('exit', releaseLock);
  process.on('SIGINT', () => { releaseLock(); process.exit(130); });
  process.on('SIGTERM', () => { releaseLock(); process.exit(143); });
  process.on('uncaughtException', (e) => {
    console.error('[regress] uncaughtException:', e);
    releaseLock();
    process.exit(1);
  });

  const { browser, ws } = await connectCdp();
  console.log('[regress] CDP:', ws);

  const batchId = `${project}-${stamp()}`;
  const batchDir = path.join(BATCH_ROOT, batchId);
  fs.mkdirSync(path.join(batchDir, 'failed'), { recursive: true });

  const succeeded = [];
  const failed = [];

  for (const item of selected) {
    console.log(`\n[regress] ——— bug #${item.bugId} ———`);
    const outDir = path.join(batchDir, String(item.bugId));
    try {
      const pathData = JSON.parse(fs.readFileSync(item.pathFile, 'utf8'));
      const page = await pickPage(browser, pathData.url);
      await page.bringToFront();
      const result = await replayPathOnPage({
        page,
        pathFile: item.pathFile,
        outDir,
        bugId: item.bugId,
      });
      if (result.ok) {
        succeeded.push({ bugId: item.bugId, title: item.title, dir: outDir });
        console.log(`[regress] OK #${item.bugId}`);
      } else {
        const failMeta = {
          bugId: item.bugId,
          title: item.title,
          error: result.error,
          needRerecord: true,
        };
        fs.writeFileSync(
          path.join(batchDir, 'failed', `${item.bugId}-error.json`),
          JSON.stringify(failMeta, null, 2)
        );
        try {
          fs.copyFileSync(
            path.join(outDir, result.error.shot),
            path.join(batchDir, 'failed', `${item.bugId}-FAIL.png`)
          );
        } catch {
          /* ignore */
        }
        failed.push(failMeta);
        console.error(`[regress] FAIL #${item.bugId} step ${result.error.step}: ${result.error.message}`);
      }
    } catch (e) {
      const failMeta = { bugId: item.bugId, title: item.title, error: { message: e.message }, needRerecord: true };
      fs.writeFileSync(
        path.join(batchDir, 'failed', `${item.bugId}-error.json`),
        JSON.stringify(failMeta, null, 2)
      );
      failed.push(failMeta);
      console.error(`[regress] FAIL #${item.bugId}: ${e.message}`);
    }
  }

  const summary = {
    projectKey: project,
    batchId,
    batchDir,
    startedAt: new Date().toISOString(),
    statuses: [...statuses],
    selected: selected.map((s) => ({ bugId: s.bugId, title: s.title, status: s.status })),
    skipped,
    succeeded,
    failed,
  };
  fs.writeFileSync(path.join(batchDir, 'batch-summary.json'), JSON.stringify(summary, null, 2));

  // 有成功回放的条目才生成 Canvas 评审面板，并自动打开。
  // failed 全挂的批次没评审意义；canvas 脚本本身会处理空 succeeded。
  if (succeeded.length) {
    try {
      const canvasScript = path.join(__dirname, 'regress-canvas.mjs');
      const r = spawnSync(process.execPath, [canvasScript, '--batch', batchDir], {
        encoding: 'utf8',
        stdio: 'inherit',
      });
      if (r.status === 0) {
        console.log('[regress] 面板已生成，在 IDE 中打开 regression-review.canvas.tsx');
      }
    } catch (e) {
      console.warn(`[regress] canvas 生成失败（不影响回归结果）: ${e.message}`);
    }
  }

  console.log('\n========== BATCH SUMMARY ==========');
  console.log(`dir: ${batchDir}`);
  console.log(`ok: ${succeeded.length}  fail: ${failed.length}  skipped: ${skipped.length}`);
  if (failed.length) {
    console.log('need re-record:');
    for (const f of failed) console.log(`  #${f.bugId}`);
  }
  console.log('\nNext:');
  console.log(`  1. 打开 regression-review.canvas.tsx 面板，逐张点 PASS/FAIL`);
  console.log(`  2. 点面板「提交结论」，或手动: node scripts/regress-submit.mjs --batch ${batchDir}`);
  console.log(`  3. 确认无误后真正提交: node scripts/regress-submit.mjs --batch ${batchDir} --yes`);
  process.stdout.write('\u0007');
  process.exit(failed.length ? 2 : 0);
}

main().catch((e) => {
  console.error('[regress] FAIL:', e.message || e);
  process.exit(1);
});
