#!/usr/bin/env node
/**
 * Record a path on already-logged-in Chrome (CDP).
 *
 * Bug path (primary):
 *   node record-path.mjs --url http://… --project wxfb --bug 3847
 *   → paths/wxfb/bugs/3847.json
 *
 * Module path (optional reuse):
 *   node record-path.mjs --url http://… --out console/dispatch
 *   → paths/console/dispatch.json
 *
 * Page: click through, then green DONE bar (or type "done").
 * Does NOT close Chrome.
 */
import fs from 'fs';
import path from 'path';
import { connectCdp, pickPage } from './cdp-connect.mjs';
import { PATHS_ROOT } from './path-replay-lib.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') out.url = args[++i];
    if (args[i] === '--out') out.out = args[++i];
    if (args[i] === '--project') out.project = args[++i];
    if (args[i] === '--bug') out.bug = args[++i];
  }
  if (!out.url) {
    usage();
  }
  if (out.project && out.bug) {
    if (!/^[a-zA-Z0-9_-]+$/.test(out.project)) {
      console.error('--project must be short ascii key, e.g. wxfb');
      process.exit(1);
    }
    out.mode = 'bug';
    out.relId = `${out.project}/bugs/${out.bug}`;
    out.outPath = path.join(PATHS_ROOT, out.project, 'bugs', `${out.bug}.json`);
  } else if (out.out) {
    if (out.out.includes('..') || path.isAbsolute(out.out)) {
      console.error('--out must be relative, e.g. console/dispatch');
      process.exit(1);
    }
    out.mode = 'module';
    out.relId = out.out.replace(/\\/g, '/');
    out.outPath = path.join(PATHS_ROOT, `${out.out}.json`);
  } else {
    usage();
  }
  return out;
}

function usage() {
  console.error('Usage:');
  console.error('  node record-path.mjs --url <url> --project <key> --bug <id>');
  console.error('  node record-path.mjs --url <url> --out <module/scene>');
  process.exit(1);
}

async function main() {
  const opts = parseArgs();
  const { url, outPath, relId, mode, project, bug } = opts;
  const steps = [];
  let finished = false;

  const { browser, ws } = await connectCdp();
  console.log('[record] CDP:', ws);

  const page = await pickPage(browser, url);
  try {
    const base = url.split('?')[0].replace(/\/$/, '');
    if (page.url() !== url && !page.url().startsWith(base)) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }
  await page.bringToFront();
  console.log('[record] page:', page.url());
  console.log('[record] will save →', outPath);
  console.log('[record] Click through the flow. DONE bar or type "done".');

  const saveAndExit = async () => {
    if (finished) return;
    finished = true;
    if (!steps.length) {
      console.error('[record] no steps recorded — intake incomplete if path was required');
      process.exit(2);
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const payload = {
      id: relId,
      url,
      steps,
      recordedAt: new Date().toISOString(),
    };
    if (mode === 'bug') {
      payload.projectKey = project;
      payload.bugId = Number(bug) || bug;
    }
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[record] saved ${steps.length} steps → ${outPath}`);
    try {
      await page.evaluate(() => {
        const el = document.getElementById('__path_recorder_bar');
        if (el) el.remove();
      });
    } catch {
      /* ignore */
    }
    process.exit(0);
  };

  try {
    await page.exposeFunction('__pathRecordClick', (info) => {
      if (finished) return;
      const step = {
        type: 'click',
        index: steps.length,
        url: page.url(),
        x: info.x,
        y: info.y,
        text: info.text,
        tag: info.tag,
        selector: info.selector,
        ts: new Date().toISOString(),
      };
      steps.push(step);
      console.log(`[record] step ${step.index}: ${step.text || step.selector} @ ${step.x},${step.y}`);
    });
  } catch {
    /* already exposed on this page from prior run */
  }

  try {
    await page.exposeFunction('__pathRecordHover', (info) => {
      if (finished) return;
      const step = {
        type: 'hover',
        index: steps.length,
        url: page.url(),
        x: info.x,
        y: info.y,
        text: info.text,
        tag: info.tag,
        selector: info.selector,
        ts: new Date().toISOString(),
      };
      steps.push(step);
      console.log(`[record] hover ${step.index}: ${step.text || step.selector} @ ${step.x},${step.y}`);
    });
  } catch {
    /* already exposed */
  }

  try {
    await page.exposeFunction('__pathRecordDone', async () => {
      console.log('[record] DONE clicked in page');
      await saveAndExit();
    });
  } catch {
    /* already exposed */
  }

  const inject = () =>
    page.evaluate(() => {
      // 把 handler 挂到 window，每次 inject 复用同一引用。
      // addEventListener 对同一函数引用天然去重，即使 framenavigated 在 SPA
      // 里频繁触发 re-inject，也不会再叠加第二个监听器（修复"一次点击记 3 次"）。
      if (!window.__pathRecHandlers) {
        window.__pathRecLastMouse = { x: 0, y: 0 };

        // 瞬时态/状态类黑名单：这些 class 在点击瞬间存在，点完就消失，或随业务
        // 状态变化（如 delivery-success 仅在"已送达"时出现）。抓进 selector 会导致
        // 回放时匹配 0。录制时必须剔除，只保留结构性 class。
        const TRANSIENT_CLASS_RE = /^(focusing|is-focus|is-focused|focus|focused|active|isActive|hovering|is-hover|is-open|enter-active|enter-from|leave-active|leave-to|loading|is-loading|disabled|is-disabled|selected|is-selected|checked|is-checked|delivery-success|delivery-fail|delivery-pending|read|unread|collapse-transition|fade-enter|v-enter|v-leave)/i;

        // 录制时不计入 selector 的噪音 class（框架生成的、不可读的）
        const NOISE_CLASS_RE = /^(el-popover__reference|el-tooltip__popper|is-light|is-dark|is-pure|is-empty|el-input__icon|el-input__inner|el-icon|el-form-item__content|el-form-item__label|el-button|el-button--[a-z-]+)/i;

        const stableClasses = (el) => {
          let raw;
          try {
            raw = typeof el.className === 'string' ? el.className : '';
          } catch {
            return [];
          }
          return raw
            .split(/\s+/)
            .filter(Boolean)
            .filter((c) => !TRANSIENT_CLASS_RE.test(c) && !NOISE_CLASS_RE.test(c));
        };

        // 生成单元素选择器片段：tag + #id? + .stableClasses
        const fragment = (el) => {
          const tag = (el.tagName || '').toLowerCase();
          const id = el.id ? '#' + el.id : '';
          const cls = stableClasses(el);
          const clsPart = cls.length ? '.' + cls.slice(0, 4).join('.') : '';
          return tag + id + clsPart;
        };

        // 向上找祖先，优先带 id 的；拼成 "祖先 > 目标" 提升唯一性
        const buildSelector = (target) => {
          const self = fragment(target);
          try {
            if (document.querySelectorAll(self).length === 1) return self;
          } catch {
            return self;
          }
          // 不唯一，向上最多 3 层找锚
          let cur = target;
          const parts = [self];
          for (let i = 0; i < 3; i++) {
            const parent = cur.parentElement;
            if (!parent || parent === document.body) break;
            const pf = fragment(parent);
            parts.unshift(pf);
            const composed = parts.join(' > ');
            try {
              if (document.querySelectorAll(composed).length === 1) return composed;
            } catch {
              break;
            }
            cur = parent;
          }
          // 实在唯一不了，返回最深的组合（至少比单元素强）
          return parts.join(' > ');
        };

        const describe = (el) => {
          const text = ((el.innerText || el.getAttribute?.('aria-label') || el.getAttribute?.('title') || '') + '')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 50);
          return {
            tag: el.tagName || '',
            text,
            selector: buildSelector(el),
          };
        };

        window.__pathRecHandlers = {
          mousemove: (e) => {
            window.__pathRecLastMouse.x = e.clientX;
            window.__pathRecLastMouse.y = e.clientY;
          },
          click: (e) => {
            const el = e.target;
            if (!el || (el.closest && el.closest('#__path_recorder_bar'))) return;
            if (typeof window.__pathRecordClick === 'function') {
              window.__pathRecordClick({
                x: Math.round(e.clientX),
                y: Math.round(e.clientY),
                ...describe(el),
              });
            }
          },
          keydown: (e) => {
            if (e.key !== 'h' && e.key !== 'H') return;
            if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
            const el = document.elementFromPoint(window.__pathRecLastMouse.x, window.__pathRecLastMouse.y);
            if (!el) return;
            e.preventDefault();
            if (typeof window.__pathRecordHover === 'function') {
              window.__pathRecordHover({
                x: Math.round(window.__pathRecLastMouse.x),
                y: Math.round(window.__pathRecLastMouse.y),
                ...describe(el),
              });
            }
          },
        };
      }

      const h = window.__pathRecHandlers;
      // 始终用同一引用注册；重复调用天然去重
      document.addEventListener('mousemove', h.mousemove, true);
      document.addEventListener('click', h.click, true);
      document.addEventListener('keydown', h.keydown, true);

      if (!document.getElementById('__path_recorder_bar')) {
        const bar = document.createElement('div');
        bar.id = '__path_recorder_bar';
        bar.textContent = 'RECORDING — click=步 / 悬停+按H=hover步 / 点此DONE结束';
        Object.assign(bar.style, {
          position: 'fixed',
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: '2147483647',
          padding: '12px 16px',
          background: '#0a7a3e',
          color: '#fff',
          font: '14px/1.4 sans-serif',
          textAlign: 'center',
          cursor: 'pointer',
          boxShadow: '0 -2px 8px rgba(0,0,0,.3)',
        });
        bar.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (typeof window.__pathRecordDone === 'function') window.__pathRecordDone();
        });
        document.documentElement.appendChild(bar);
      }
    });

  await inject();
  page.on('framenavigated', async (frame) => {
    if (frame !== page.mainFrame()) return;
    try {
      await inject();
    } catch {
      /* ignore */
    }
  });

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => {
    rl.question('[record] > ', async (cmd) => {
      cmd = (cmd || '').trim();
      if (cmd === 'done') {
        rl.close();
        await saveAndExit();
        return;
      }
      if (cmd === 'list') console.log(JSON.stringify(steps, null, 2));
      ask();
    });
  };
  ask();
}

main().catch((e) => {
  console.error('[record] FAIL:', e.message || e);
  process.exit(1);
});
