// Questionnaires deck: forms pasted into the Smart Forms playground's JSON editor (no server writes).
//
//   03  the NLM Form Builder's R4 export (examples/lhc-export-stage1.json), built
//   04  enableWhen illustration, before choosing a test: Result hidden
//   05  ... after choosing Haemoglobin (Hb): Result shown
//
// The enableWhen form is examples/pathology-walkthrough-stage1.json with the deck's illustration
// (an enableWhen on pam-ext-value: pam-ext-test exists) added here; it is not an example file.
// Uses the patched playground (see shoot-smart-forms-playground.mjs); pasting needs no FHIR server.
import { chromium } from 'playwright';
import { shot, readExample, VIEWPORT } from './lib.mjs';

const PLAYGROUND = 'https://aehrc.github.io/qh-connectathon/smart-forms/playground';

function enableWhenForm() {
  const q = JSON.parse(readExample('pathology-walkthrough-stage1.json'));
  const value = q.item[0].item.find((i) => i.linkId === 'pam-ext').item.find((i) => i.linkId === 'pam-ext-value');
  value.enableWhen = [{ question: 'pam-ext-test', operator: 'exists', answerBoolean: true }];
  return JSON.stringify(q, null, 2);
}

function check(ok, msg) {
  if (!ok) throw new Error(`unexpected state: ${msg}`);
}

// 2x pixels so the cropped enableWhen shots stay readable on the slide.
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })).newPage();
try {
  await page.goto(PLAYGROUND, { waitUntil: 'networkidle' });

  // Paste into the Monaco JSON editor (right), then BUILD FORM.
  async function build(json) {
    await page.waitForFunction(() => window.monaco?.editor.getModels().length > 0);
    await page.evaluate((t) => window.monaco.editor.getModels()[0].setValue(t), json);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Build form' }).first().click();
    await page.locator('#decimal-pam-hb').waitFor();
    await page.waitForTimeout(1500);
  }
  const card = { x: 40, y: 365, width: 580, height: 290 }; // "Results from an external lab"

  await build(readExample('lhc-export-stage1.json'));
  check(await page.getByText('gram per liter', { exact: true }).isVisible(), 'unit display "gram per liter"');
  check(await page.getByText('Pathology results', { exact: true }).first().isVisible(), 'title "Pathology results"');
  await shot(page, 'questionnaires/03-playground-lhc-export.png', { scale: 'css' });
  await page.getByRole('button', { name: 'Destroy form' }).click();
  await page.waitForTimeout(800);

  await build(enableWhenForm());
  check(await page.locator('#decimal-pam-ext-value').count() === 0, 'Result hidden before a test is chosen');
  await shot(page, 'questionnaires/04-playground-enablewhen-before.png', { clip: card });
  await page.locator('#choice-pam-ext-test').click();
  await page.getByRole('option', { name: 'Haemoglobin (Hb)' }).click();
  await page.locator('#decimal-pam-ext-value').waitFor();
  await page.waitForTimeout(800);
  await shot(page, 'questionnaires/05-playground-enablewhen-after.png', { clip: card });
} finally {
  await browser.close();
}
