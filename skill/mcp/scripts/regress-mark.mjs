#!/usr/bin/env node
/**
 * Batch mark PASS/FAIL in template.md files — without opening any editor.
 *
 *   # 批量标记
 *   node regress-mark.mjs --batch <batch-dir> --set 3848=PASS 3849=FAIL 3850=FAIL
 *
 *   # 单条标记
 *   node regress-mark.mjs --dir <bug-dir> --set FAIL
 *
 *   # 查看当前所有结论
 *   node regress-mark.mjs --batch <batch-dir> --show
 *
 *   # 重置（清除所有勾选）
 *   node regress-mark.mjs --batch <batch-dir> --reset
 *
 * 直接改写 template.md 的 verdict 两行，兼容 x/X/√/✓。
 */
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { sets: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch') out.batch = args[++i];
    else if (args[i] === '--dir') out.dir = args[++i];
    else if (args[i] === '--set') {
      const v = args[++i];
      if (v && v.includes('=')) {
        const [id, verdict] = v.split('=');
        out.sets.push({ bugId: id.trim(), verdict: verdict.trim().toUpperCase() });
      } else {
        out.singleSet = (v || '').trim().toUpperCase();
      }
    }
    else if (args[i] === '--show') out.show = true;
    else if (args[i] === '--reset') out.reset = true;
  }
  return out;
}

function normalizeVerdict(v) {
  const u = v.toUpperCase();
  if (u === 'PASS' || u === 'P' || u === '1') return 'PASS';
  if (u === 'FAIL' || u === 'F' || u === '0') return 'FAIL';
  return null;
}

/** 读 template.md → 'PASS' | 'FAIL' | null */
function readVerdict(tplPath) {
  if (!fs.existsSync(tplPath)) return null;
  const md = fs.readFileSync(tplPath, 'utf8');
  if (/-\s*\[[xX√✓]\]\s*PASS/i.test(md) && /-\s*\[[xX√✓]\]\s*FAIL/i.test(md)) return 'BOTH';
  if (/-\s*\[[xX√✓]\]\s*PASS/i.test(md)) return 'PASS';
  if (/-\s*\[[xX√✓]\]\s*FAIL/i.test(md)) return 'FAIL';
  return null;
}

/** 写 template.md：把 verdict 两行设成指定结论 */
function writeVerdict(tplPath, verdict) {
  if (!fs.existsSync(tplPath)) throw new Error(`template.md 不存在：${tplPath}`);
  let md = fs.readFileSync(tplPath, 'utf8');
  const passCheck = verdict === 'PASS' ? '- [x] PASS' : '- [ ] PASS';
  const failCheck = verdict === 'FAIL' ? '- [x] FAIL' : '- [ ] FAIL';
  md = md.replace(/^-\s*\[[ xX√✓]?\]\s*PASS\s*$/im, passCheck);
  md = md.replace(/^-\s*\[[ xX√✓]?\]\s*FAIL\s*$/im, failCheck);
  fs.writeFileSync(tplPath, md, 'utf8');
}

/** 清除勾选 */
function resetVerdict(tplPath) {
  if (!fs.existsSync(tplPath)) return;
  let md = fs.readFileSync(tplPath, 'utf8');
  md = md.replace(/^-\s*\[[ xX√✓]?\]\s*PASS\s*$/im, '- [ ] PASS');
  md = md.replace(/^-\s*\[[ xX√✓]?\]\s*FAIL\s*$/im, '- [ ] FAIL');
  fs.writeFileSync(tplPath, md, 'utf8');
}

/** 列出批次目录下所有 bug 子目录 */
function listBugDirs(batchDir) {
  return fs
    .readdirSync(batchDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => ({ bugId: d.name, dir: path.join(batchDir, d.name) }))
    .sort((a, b) => Number(a.bugId) - Number(b.bugId));
}

function main() {
  const opts = parseArgs();

  // --show
  if (opts.show) {
    if (!opts.batch) { console.error('--show 需要 --batch'); process.exit(1); }
    const dirs = listBugDirs(opts.batch);
    if (!dirs.length) { console.log('（批次目录下无 bug 子目录）'); return; }
    console.log('bugId    verdict    template');
    console.log('------   --------   --------');
    for (const d of dirs) {
      const v = readVerdict(path.join(d.dir, 'template.md'));
      console.log(`#${d.bugId.padEnd(7)} ${(v || '-').padEnd(9)} ${path.join(d.dir, 'template.md')}`);
    }
    return;
  }

  // --reset
  if (opts.reset) {
    if (!opts.batch) { console.error('--reset 需要 --batch'); process.exit(1); }
    const dirs = listBugDirs(opts.batch);
    let n = 0;
    for (const d of dirs) { resetVerdict(path.join(d.dir, 'template.md')); n++; }
    console.log(`[mark] 已重置 ${n} 条 template.md`);
    return;
  }

  // --dir --set <verdict>
  if (opts.dir && opts.singleSet) {
    const v = normalizeVerdict(opts.singleSet);
    if (!v) { console.error(`无效结论：${opts.singleSet}（应为 PASS 或 FAIL）`); process.exit(1); }
    const tpl = path.join(opts.dir, 'template.md');
    writeVerdict(tpl, v);
    const bugId = path.basename(opts.dir);
    console.log(`[mark] #${bugId} → ${v}`);
    return;
  }

  // --batch --set id=verdict ...
  if (opts.batch && opts.sets.length) {
    const dirs = listBugDirs(opts.batch);
    const byId = new Map(dirs.map((d) => [d.bugId, d.dir]));
    let ok = 0, skip = 0;
    for (const s of opts.sets) {
      const v = normalizeVerdict(s.verdict);
      if (!v) { console.error(`无效结论：${s.verdict}（应为 PASS 或 FAIL）`); process.exit(1); }
      const dir = byId.get(s.bugId);
      if (!dir) { console.error(`[mark] 跳过 #${s.bugId}：批次中无此 bug`); skip++; continue; }
      writeVerdict(path.join(dir, 'template.md'), v);
      console.log(`[mark] #${s.bugId} → ${v}`);
      ok++;
    }
    console.log(`[mark] 完成 ${ok} 条，跳过 ${skip} 条`);
    console.log(`[mark] 下一步: node scripts/regress-submit.mjs --batch ${path.resolve(opts.batch)} --yes`);
    return;
  }

  console.error('用法:');
  console.error('  node regress-mark.mjs --batch <batch-dir> --set 3848=PASS 3849=FAIL ...');
  console.error('  node regress-mark.mjs --dir <bug-dir> --set FAIL');
  console.error('  node regress-mark.mjs --batch <batch-dir> --show');
  console.error('  node regress-mark.mjs --batch <batch-dir> --reset');
  process.exit(1);
}

main();
