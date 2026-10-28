// Shared helpers for the screenshot scripts (tools/shoot-*.mjs).
// Run from decks/: `make shots` or `node tools/shoot-<site>.mjs`.
// HEADED=1 shows the browser; SLOWMO=<ms> slows each action.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DECKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXAMPLES = path.join(DECKS, 'examples');
export const OPEN = 'https://gw.interop.community/QHConnectathon2026/open';
export const VIEWPORT = { width: 1600, height: 900 };

export function readExample(name) {
  return fs.readFileSync(path.join(EXAMPLES, name), 'utf8');
}

export async function launch() {
  const browser = await chromium.launch({
    headless: !process.env.HEADED,
    slowMo: process.env.SLOWMO ? +process.env.SLOWMO : 0,
  });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  return { browser, context, page };
}

// Screenshot into decks/img/<rel>; warns if the PNG looks blank (< 20 KB).
export async function shot(page, rel, opts = {}) {
  const out = path.join(DECKS, 'img', rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, ...opts });
  const size = fs.statSync(out).size;
  console.log(`${size < 20000 ? 'WARN small' : 'ok'}  img/${rel}  ${(size / 1024).toFixed(0)} KB`);
  return out;
}

// GET a search on the open endpoint. Meld returns 400 for a raw '|', so encode it.
export async function openSearch(query) {
  const url = `${OPEN}/${query.replaceAll('|', '%7C')}`;
  const res = await fetch(url, { headers: { Accept: 'application/fhir+json' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}
