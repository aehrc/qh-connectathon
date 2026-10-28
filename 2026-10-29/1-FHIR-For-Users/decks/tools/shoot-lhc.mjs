// NLM (LHC) Form Builder: the Questionnaires deck walkthrough (Presenter-Guide.md section 1).
//
//   node tools/shoot-lhc.mjs                      # only 01-lhc-terms.png (fresh browser, terms not accepted)
//   LHC_PROFILE=/abs/path/to/profile node tools/shoot-lhc.mjs
//                                                 # also builds the stage 1 form and takes 10-17
//
// LHC_PROFILE is a Chromium user-data dir (absolute path; relative paths fail to launch) used with
// launchPersistentContext, in which a person has already accepted the builder's "Accept Terms of Use"
// dialog (LOINC, plus the optional SNOMED CT box; the shots were taken with both). The script never
// accepts terms: without LHC_PROFILE, or if the dialog shows, it skips the builder shots (exit 0)
// and the committed PNGs are kept.
//
// The builder keeps the form in localStorage (key fhirQuestionnaire) and offers "start from where you
// left off"; the script clears that first. The R4 export goes to build/lhc-export-stage1.json and is
// compared with examples/lhc-export-stage1.json (a mismatch means the builder's output changed).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { launch, shot, DECKS, EXAMPLES, VIEWPORT } from './lib.mjs';

// formbuilder.lhcforms.nlm.nih.gov does not resolve; this is the live URL
// (redirects to https://lhncbc.nlm.nih.gov/formbuilder/).
const LHC = 'https://formbuilder.nlm.nih.gov/';
const STAGE1 = path.join(EXAMPLES, 'pathology-walkthrough-stage1.json');

// 1. Opening dialog, in a fresh browser (never accepted there).
{
  const { browser, page } = await launch();
  try {
    await page.goto(LHC, { waitUntil: 'networkidle' });
    await page.getByText('I accept the LOINC Terms of Use.').waitFor();
    await page.waitForTimeout(500);
    await shot(page, 'questionnaires/01-lhc-terms.png');
  } finally {
    await browser.close();
  }
}

const PROFILE = process.env.LHC_PROFILE;
if (!PROFILE) {
  console.log('SKIP builder shots (questionnaires/10-17): set LHC_PROFILE to a Chromium profile dir to capture them');
  process.exit(0);
}

// ---------- helpers ----------

// Click option `option` of the button-style radio group labelled `group` (e.g. "Allow repeating question?").
async function radio(page, group, option) {
  const found = await page.evaluate(([group, option]) => {
    document.querySelectorAll('[data-pick]').forEach((e) => e.removeAttribute('data-pick'));
    for (const l of document.querySelectorAll('label')) {
      if (!l.offsetParent || l.innerText.trim() !== group) continue;
      for (let a = l.parentElement, i = 0; a && i < 6; a = a.parentElement, i++) {
        const opt = [...a.querySelectorAll('label')].find((x) => x !== l && x.offsetParent
          && x.innerText.trim().replace(/\s*\(\d\)$/, '') === option);
        if (opt) { opt.setAttribute('data-pick', '1'); return true; }
      }
    }
    return false;
  }, [group, option]);
  if (!found) throw new Error(`radio "${group}" / "${option}" not found`);
  await page.locator('[data-pick]').click();
  await page.waitForTimeout(300);
}

const node = (page, text) => page.locator('.node-content-wrapper').filter({
  has: page.locator('.node-display-field', { hasText: new RegExp(`^${text.replace(/[()]/g, '\\$&')}$`) }),
}).first();

async function select(page, text) {
  await node(page, text).click();
  await page.waitForTimeout(700);
}

// Tree node "..." (More options) menu, e.g. "Insert a new child item".
async function treeMenu(page, text, item) {
  await select(page, text);
  await node(page, text).getByRole('button').first().click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitem', { name: item }).click();
  await page.waitForTimeout(800);
}

async function basics(page, text, type) {
  await page.locator('#text').fill(text);
  await page.locator('select[name=type]').first().selectOption(type);
  await page.waitForTimeout(500);
}

// Type the UCUM code and Tab out (no pick from the list): code = what you typed, display = UCUM name.
async function unit(page, code) {
  const f = page.locator('input[id^=units]').first();
  await f.click();
  await f.pressSequentially(code, { delay: 80 });
  await page.waitForTimeout(1200);
  await f.press('Escape');
  await f.press('Tab');
  await page.waitForTimeout(500);
}

async function linkId(page, id) {
  const f = page.locator('#linkId');
  if (!(await f.isVisible())) {
    await page.getByRole('button', { name: 'Advanced fields' }).click();
    await page.waitForTimeout(500);
  }
  await f.fill(id);
  await f.press('Tab');
  await page.waitForTimeout(300);
}

// Scroll so that `loc` sits `y` px below the top of the viewport; park the mouse (no tooltips).
async function frame(page, loc, y = 20) {
  await page.mouse.move(VIEWPORT.width - 5, VIEWPORT.height - 5);
  const box = await loc.first().evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((top) => window.scrollTo(0, top), Math.max(0, box - y));
  await page.waitForTimeout(400);
}

const rowLabel = (page, text) => page.locator('label', { hasText: new RegExp(`^\\s*${text.replace(/[?()]/g, '\\$&')}\\s*$`) });

// This script never accepts the terms. If the profile hasn't accepted them, skip (exit 0) and
// keep the committed PNGs.
async function skipIfTermsShown(page, ctx) {
  if (!(await page.locator('#acceptLoinc').isVisible().catch(() => false))) return;
  console.log('SKIP builder shots: the LOINC Terms of Use dialog is showing in LHC_PROFILE. Accept it '
    + 'by hand in that profile (HEADED=1), then re-run.');
  await ctx.close();
  process.exit(0);
}

async function start(page) {
  await page.goto(LHC, { waitUntil: 'networkidle' });
  await skipIfTermsShown(page, ctx);
  await page.evaluate(() => { localStorage.removeItem('fhirQuestionnaire'); localStorage.removeItem('state'); });
  await page.reload({ waitUntil: 'networkidle' });
  await skipIfTermsShown(page, ctx);
  const dismiss = page.getByRole('button', { name: 'Dismiss' }); // NIH banner
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
  await page.getByText('How do you want to create your form?').waitFor();
}

// ---------- the walkthrough ----------

const ctx = await chromium.launchPersistentContext(path.resolve(PROFILE), {
  headless: !process.env.HEADED, viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true,
});
const page = ctx.pages()[0] || (await ctx.newPage());
try {
  await start(page);
  await page.getByRole('button', { name: 'Continue' }).click(); // Start from scratch (default)
  await page.locator('#title0').fill('Pathology results');
  await frame(page, page.getByText('Form level attributes'), 60);
  await shot(page, 'questionnaires/10-lhc-new-form.png');
  await page.getByRole('button', { name: 'Create questions' }).last().click();
  await page.waitForTimeout(1000);

  await basics(page, 'Pathology', 'group'); await linkId(page, 'pam-pathology');
  await treeMenu(page, 'Pathology', 'Insert a new child item');
  await basics(page, 'Haemoglobin (Hb)', 'decimal'); await unit(page, 'g/L'); await linkId(page, 'pam-hb');
  await treeMenu(page, 'Haemoglobin (Hb)', 'Insert a new item after this');
  await basics(page, 'Ferritin', 'decimal'); await unit(page, 'ug/L'); await linkId(page, 'pam-ferritin');
  await treeMenu(page, 'Ferritin', 'Insert a new item after this');
  await basics(page, 'Date of latest Hb', 'date'); await linkId(page, 'pam-hb-date');
  await treeMenu(page, 'Date of latest Hb', 'Insert a new item after this');
  await basics(page, 'Results from an external lab', 'group');
  await radio(page, 'Allow repeating question?', 'Yes'); await linkId(page, 'pam-ext');
  await treeMenu(page, 'Results from an external lab', 'Insert a new child item');
  await basics(page, 'Test', 'coding');
  await radio(page, 'Create answer list', 'Yes');
  await radio(page, 'Answer list source', 'Answer options');
  const answers = [['718-7', 'Haemoglobin (Hb)'], ['2276-4', 'Ferritin']];
  for (const [i, [code, display]] of answers.entries()) {
    if (i) { await page.getByRole('button', { name: 'Add another answer' }).click(); await page.waitForTimeout(400); }
    await page.locator(`input[id^="answerOption.${i}.valueCoding.system"]`).fill('http://loinc.org');
    await page.locator(`input[id^="answerOption.${i}.valueCoding.display"]`).fill(display);
    await page.locator(`input[id^="answerOption.${i}.valueCoding.code"]`).fill(code);
  }
  await linkId(page, 'pam-ext-test');
  await treeMenu(page, 'Test', 'Insert a new item after this');
  await basics(page, 'Result', 'decimal'); await linkId(page, 'pam-ext-value');
  await treeMenu(page, 'Result', 'Insert a new item after this');
  await basics(page, 'Collected', 'date'); await linkId(page, 'pam-ext-date');

  // Item editor: Hb, decimal with UCUM unit (whole tree visible on the left).
  await select(page, 'Haemoglobin (Hb)');
  await frame(page, page.getByText('Questions Tree'), 10);
  await shot(page, 'questionnaires/11-lhc-item-editor.png');
  // Advanced fields: Link Id.
  await frame(page, page.locator('#linkId'), 300);
  await shot(page, 'questionnaires/12-lhc-link-id.png');
  // Answer options with the LOINC system.
  await select(page, 'Test');
  await frame(page, rowLabel(page, 'Data type'), 280);
  await shot(page, 'questionnaires/13-lhc-answer-options.png');
  // Repeating group.
  await select(page, 'Results from an external lab');
  await frame(page, page.getByText('Questions Tree'), 10);
  await shot(page, 'questionnaires/14-lhc-repeating-group.png');

  // Preview.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByText('Preview of Questionnaire').waitFor();
  await page.waitForTimeout(2000);
  // Open the Test answer list so the LOINC options show.
  await page.locator('[role=dialog]').getByPlaceholder('Select one').first().click();
  await page.waitForTimeout(800);
  await shot(page, 'questionnaires/15-lhc-preview.png');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.waitForTimeout(500);

  // Export menu, then the R4 download.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Export' }).click();
  await page.waitForTimeout(400);
  await page.getByText('Export to file in FHIR R4 format').hover();
  await shot(page, 'questionnaires/16-lhc-export-menu.png');
  const dl = page.waitForEvent('download', { timeout: 15000 });
  await page.getByText('Export to file in FHIR R4 format').click();
  const download = await dl;
  const out = path.join(DECKS, 'build', 'lhc-export-stage1.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await download.saveAs(out);
  const ref = path.join(EXAMPLES, 'lhc-export-stage1.json');
  const same = fs.existsSync(ref)
    && JSON.stringify(JSON.parse(fs.readFileSync(out, 'utf8'))) === JSON.stringify(JSON.parse(fs.readFileSync(ref, 'utf8')));
  console.log(`export ${download.suggestedFilename()} -> build/lhc-export-stage1.json: ${same ? 'same as' : 'DIFFERS FROM'} examples/lhc-export-stage1.json`);

  // Fallback: start screen, Start with existing form -> Import from local file (stage 1 JSON).
  await start(page);
  await page.getByText('Start with existing form').click();
  await page.getByText('Import from local file').click();
  await page.mouse.move(VIEWPORT.width - 5, VIEWPORT.height - 5);
  await shot(page, 'questionnaires/17-lhc-import-existing.png');
  const fc = page.waitForEvent('filechooser', { timeout: 10000 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await (await fc).setFiles(STAGE1);
  await page.getByText('Form level attributes').waitFor();
  const title = await page.locator('#title0').inputValue();
  console.log(`import stage1: title "${title}"`);
} finally {
  await ctx.close();
}
