/**
 * Shared path replay (CDP page). Returns result; does not process.exit / browser.close.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PATHS_ROOT = path.resolve(__dirname, '..', 'paths');

export function resolvePathFile(pathIdOrFile) {
  if (path.isAbsolute(pathIdOrFile) && fs.existsSync(pathIdOrFile)) return pathIdOrFile;
  const rel = pathIdOrFile.endsWith('.json') ? pathIdOrFile : `${pathIdOrFile}.json`;
  const full = path.join(PATHS_ROOT, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Path asset not found: ${full}`);
  }
  return full;
}

/**
 * Among a locator's matches, find the one whose center is closest to the
 * recorded (x, y). Only called as a LAST-resort tiebreaker after selector+text
 * narrowing already failed to reach a unique match — never used as the primary
 * locator strategy, since raw coordinates drift with unrelated layout changes.
 * Uses only the x/y the recorder already captured for this exact step.
 */
async function pickNearestByPosition(locator, x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  let handles;
  try {
    handles = await locator.all();
  } catch {
    return null;
  }
  let bestIndex = -1;
  let bestDist = Infinity;
  for (let i = 0; i < handles.length; i++) {
    let box;
    try {
      box = await handles[i].boundingBox();
    } catch {
      continue;
    }
    if (!box) continue;
    const dist = Math.hypot(box.x + box.width / 2 - x, box.y + box.height / 2 - y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  if (bestIndex === -1) return null;
  return { index: bestIndex, distance: Math.round(bestDist), total: handles.length };
}

/**
 * When a locator still matches >1 after narrowing, try the recorded (x, y) as a
 * tiebreaker before giving up to "first". Returns the resolved { loc, how }.
 */
async function disambiguate(loc, count, step, baseHow) {
  if (count === 1) return { loc, how: baseHow };
  const tie = await pickNearestByPosition(loc, step.x, step.y);
  if (tie) {
    console.warn(
      `[replay] ${baseHow} still matched ${count}; picked nearest to recorded (${step.x},${step.y}) — ${tie.distance}px away`
    );
    return { loc: loc.nth(tie.index), how: `${baseHow}+xy-tiebreak(${tie.distance}px of ${count})` };
  }
  console.warn(`[replay] ${baseHow} still matched ${count}, no recorded x/y to tiebreak, using first`);
  return { loc, how: `${baseHow}(first of ${count})` };
}

/**
 * Purge transient/state classes from a recorded selector so old paths
 * (recorded before describe() learned to strip them) still replay.
 * Strips: focusing, is-focus, active, delivery-success, enter-active, etc.
 * Operates only on class tokens after '.' — leaves tag/id/descendant combinators.
 */
const TRANSIENT_REPLAY_RE = /^(focusing|is-focus|is-focused|focus|focused|active|isActive|hovering|is-hover|is-open|enter-active|enter-from|leave-active|leave-to|loading|is-loading|disabled|is-disabled|selected|is-selected|checked|is-checked|delivery-success|delivery-fail|delivery-pending|collapse-transition|fade-enter|v-enter|v-leave|el-popover__reference)$/i;

function purgedSelector(selector) {
  if (!selector) return selector;
  return selector
    .split(/\s+/) // split on descendant / '>' combinators
    .map((compound) => {
      // compound like "div.foo.bar#id"
      const parts = compound.split('.');
      const head = parts[0]; // "div#id" or "div"
      const kept = parts.slice(1).filter((cls) => !TRANSIENT_REPLAY_RE.test(cls));
      return kept.length ? head + '.' + kept.join('.') : head;
    })
    .join(' ');
}

/**
 * Resolve a locator using ONLY signals already recorded on the step (selector,
 * text, x/y). No new heuristics, no container guessing — just uses every field
 * the recorder already captured for this step instead of discarding most of
 * them once one strategy finds a match.
 *
 * @returns {{ loc: import('playwright').Locator, how: string } | null} null when
 *   selector is missing/invalid/matches 0 — caller should fall back to text-only / xy.
 */
async function resolveBySelectorAndText(page, step) {
  if (!step.selector) return null;
  const sel = purgedSelector(step.selector);
  if (sel !== step.selector) {
    console.warn(`[replay] purged transient classes: "${step.selector}" → "${sel}"`);
  }
  let base;
  let cnt;
  try {
    base = page.locator(sel);
    cnt = await base.count();
  } catch (e) {
    console.error(`[replay] invalid selector "${sel}": ${e.message}`);
    return null;
  }
  if (cnt === 0) {
    console.error(`[replay] selector "${sel}" matched 0 elements`);
    return null;
  }
  if (cnt === 1) return { loc: base, how: 'selector' };

  // cnt > 1: narrow using the text recorded alongside this selector (not a new
  // guess — same signal the recorder already stored for this exact step).
  if (step.text && step.text.trim().length > 0) {
    const narrowed = base.filter({ hasText: step.text });
    let narrowedCnt;
    try {
      narrowedCnt = await narrowed.count();
    } catch {
      narrowedCnt = 0;
    }
    if (narrowedCnt >= 1) {
      return disambiguate(narrowed, narrowedCnt, step, 'selector+text');
    }
    // narrowedCnt === 0: recorded text no longer appears among selector matches —
    // this is a genuine drift signal (stale text), not silently swallowed.
    console.warn(
      `[replay] recorded text "${step.text}" not found among ${cnt} "${sel}" matches — text stale`
    );
    return disambiguate(base, cnt, step, 'selector(text stale)');
  }

  return disambiguate(base, cnt, step, 'selector');
}

/**
 * Wait until a step's recorded target is ready (or page settles if no next step).
 * Uses only recorded selector/text — no new heuristics.
 * @returns {string} how we waited (for logs)
 */
async function waitReadyForStep(page, step, { timeout = 10000 } = {}) {
  if (!step) {
    try {
      await page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch {
      /* ignore — SPA may never go fully idle */
    }
    await page.waitForTimeout(400);
    return 'settle';
  }

  const sel = step.selector ? purgedSelector(step.selector) : step.selector;
  if (sel) {
    const base = page.locator(sel);
    if (step.text && step.text.trim()) {
      try {
        await base.filter({ hasText: step.text }).first().waitFor({ state: 'visible', timeout });
        return 'ready:selector+text';
      } catch {
        /* text may be stale; still try bare selector */
      }
    }
    try {
      await base.first().waitFor({ state: 'visible', timeout });
      return 'ready:selector';
    } catch (e) {
      console.warn(`[replay] wait selector timed out: "${sel}" — ${e.message}`);
    }
  }

  if (step.text && step.text.trim()) {
    try {
      await page
        .getByText(step.text, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: Math.min(5000, timeout) });
      return 'ready:text';
    } catch (e) {
      console.warn(`[replay] wait text timed out: "${step.text}" — ${e.message}`);
    }
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: 2000 });
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(500);
  return 'ready:fallback';
}

export async function clickStep(page, step, index) {
  const label = step.selector || step.text || `${step.x},${step.y}`;
  console.log(`[replay] step ${index}: ${label}`);

  if (step.type === 'hover') {
    const resolved = await resolveBySelectorAndText(page, step);
    if (resolved) {
      try {
        await resolved.loc.first().hover({ timeout: 5000 });
        return `hover:${resolved.how}`;
      } catch (e) {
        console.error(`[replay] hover failed for "${step.selector}": ${e.message}`);
      }
    }
    if (typeof step.x === 'number' && typeof step.y === 'number') {
      await page.mouse.move(step.x, step.y);
      return 'hover:xy';
    }
    throw new Error(`Hover step ${index} has neither selector nor coordinates`);
  }

  // Click priority: selector(+text narrowing) → text-only → xy
  const resolved = await resolveBySelectorAndText(page, step);
  if (resolved) {
    try {
      await resolved.loc.first().click({ timeout: 5000 });
      return resolved.how;
    } catch (e) {
      console.error(`[replay] click failed for "${step.selector}": ${e.message}`);
    }
  }

  if (step.text && step.text.length > 0 && step.text.length <= 40) {
    const loc = page.getByText(step.text, { exact: false }).first();
    try {
      await loc.click({ timeout: 5000 });
      return 'text';
    } catch (e) {
      console.error(`[replay] text click failed for "${step.text}": ${e.message}`);
    }
  }

  if (typeof step.x === 'number' && typeof step.y === 'number') {
    // Coordinates are viewport-relative; ensure the recorded point is actually
    // in view before clicking, otherwise the click lands off-screen or on a
    // shifted element after scroll.
    try {
      await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ block: 'center', inline: 'center' });
        }
      }, { x: step.x, y: step.y });
      await page.waitForTimeout(150);
    } catch {
      /* scroll best-effort */
    }
    await page.mouse.click(step.x, step.y);
    return 'xy';
  }

  throw new Error(`Step ${index} has neither usable selector, text, nor coordinates`);
}

/**
 * @returns {{ ok: true, shots, manifest } | { ok: false, error, shots }}
 */
export async function replayPathOnPage({ page, pathFile, outDir, bugId }) {
  const data = JSON.parse(fs.readFileSync(pathFile, 'utf8'));
  const { url, steps } = data;
  if (!Array.isArray(steps) || !steps.length) {
    throw new Error(`Path file has no steps: ${pathFile}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const ready0 = await waitReadyForStep(page, steps[0]);
  console.log(`[replay] after goto: ${ready0}`);

  const shots = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    try {
      const how = await clickStep(page, s, i);
      // Wait for NEXT step's recorded target (or settle if last) — not a fixed 2s sleep.
      // Fixes "panel still loading" when selector count was 0 after a blind wait.
      const next = steps[i + 1] || null;
      const ready = await waitReadyForStep(page, next);
      console.log(`[replay] after step ${i}: ${ready}`);
      const shotName = `step-${i}.png`;
      await page.screenshot({ path: path.join(outDir, shotName), fullPage: true });
      shots.push({ step: i, name: shotName, file: shotName, action: s.text || s.selector, how, ok: true });
    } catch (e) {
      const shotName = `step-${i}-FAIL.png`;
      try {
        await page.screenshot({ path: path.join(outDir, shotName), fullPage: true });
      } catch {
        /* ignore */
      }
      const err = {
        step: i,
        action: s.text || s.selector,
        message: e.message || String(e),
        shot: shotName,
      };
      fs.writeFileSync(path.join(outDir, 'error.json'), JSON.stringify(err, null, 2));
      return { ok: false, error: err, shots, url, steps, data };
    }
  }

  await page.screenshot({ path: path.join(outDir, 'final.png'), fullPage: true });
  shots.push({ step: 'final', name: 'final', file: 'final.png', action: 'final state', ok: true });

  const id = bugId || data.bugId || path.basename(outDir);
  const manifest = {
    bugId: id,
    pathId: data.id || pathFile,
    pathFile,
    projectKey: data.projectKey || null,
    url,
    replayedAt: new Date().toISOString(),
    shots,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const tpl = [
    `# Bug #${id} regression`,
    '',
    '## verdict (check one)',
    '- [ ] PASS',
    '- [ ] FAIL',
    '',
    `> after batch check: node regress-submit.mjs --batch <batch-dir> --yes`,
    `> or single: node regression-submit.mjs --dir ${outDir} --yes`,
    '',
    `path: ${manifest.pathId}`,
    `page: ${url}`,
    `time: ${new Date().toLocaleString()}`,
    '',
    '## steps replayed',
    ...steps.map((s, i) => `${i}. [${s.type === 'hover' ? 'hover' : 'click'}] ${s.text || s.selector}`),
    '',
    '## evidence',
    ...shots.map((s) => `- ${s.file}: ${s.action}`),
  ];
  fs.writeFileSync(path.join(outDir, 'template.md'), tpl.join('\n'));

  return { ok: true, shots, manifest, url, steps, data };
}
