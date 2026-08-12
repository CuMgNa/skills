/**
 * Shared CDP attach for local Chrome (never launch a fresh browser).
 * Resolves ws from DevToolsActivePort or BU_CDP_WS / PW_CDP_WS.
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export function resolveCdpWs() {
  if (process.env.BU_CDP_WS) return process.env.BU_CDP_WS;
  if (process.env.PW_CDP_WS) return process.env.PW_CDP_WS;
  const portFile = path.join(
    process.env.LOCALAPPDATA || '',
    'Google',
    'Chrome',
    'User Data',
    'DevToolsActivePort'
  );
  if (!fs.existsSync(portFile)) {
    throw new Error(
      `DevToolsActivePort not found: ${portFile}\n` +
        'Enable chrome://inspect/#remote-debugging, or set BU_CDP_WS.'
    );
  }
  const lines = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
  const port = lines[0].trim();
  const suffix = (lines[1] || '').trim();
  if (!port || !suffix) {
    throw new Error(`Invalid DevToolsActivePort content in ${portFile}`);
  }
  return `ws://127.0.0.1:${port}${suffix}`;
}

/** Connect; caller must NOT browser.close() (kills user's Chrome). */
export async function connectCdp() {
  const ws = resolveCdpWs();
  // Local Chrome handshake can take >30s under load (e.g. another CDP client
  // already attached); default Playwright timeout was too tight in practice.
  const browser = await chromium.connectOverCDP(ws, { timeout: 60000 });
  return { browser, ws };
}

/** Prefer an existing page matching urlHost, else first page, else new page. */
export async function pickPage(browser, urlHint) {
  const contexts = browser.contexts();
  if (!contexts.length) throw new Error('No browser contexts on CDP');
  const ctx = contexts[0];
  const pages = ctx.pages().filter((p) => {
    const u = p.url();
    return u && !u.startsWith('chrome://') && !u.startsWith('devtools://');
  });
  if (urlHint) {
    try {
      const host = new URL(urlHint).host;
      const hit = pages.find((p) => {
        try {
          return new URL(p.url()).host === host;
        } catch {
          return false;
        }
      });
      if (hit) return hit;
    } catch {
      /* ignore */
    }
  }
  if (pages.length) return pages[0];
  return ctx.newPage();
}

export { chromium };
