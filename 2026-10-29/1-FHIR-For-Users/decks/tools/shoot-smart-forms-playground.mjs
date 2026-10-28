// Smart Forms playground screenshots: render, pre-populate, extract, write back, close the loop.
//
// Uses the PATCHED Smart Forms on GitHub Pages, not https://smartforms.csiro.au/playground:
// the public build sends a Cache-Control request header that Meld's CORS policy rejects, so
// it can't even list patients from the Meld open endpoint (see Presenter-Guide.md, Surprises).
//
// Writes one Observation to the open endpoint (the write-back step), so it runs
// examples/reset-demo.sh before and after to keep pam-demo at its baseline.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { launch, shot, OPEN, EXAMPLES } from './lib.mjs';

const PLAYGROUND = 'https://aehrc.github.io/qh-connectathon/smart-forms/playground';

// Close any snackbars (bottom left) so they don't cover the form, and let fades finish.
async function settle(page) {
  for (const x of await page.locator('.notistack-SnackbarContainer button').all()) await x.click().catch(() => {});
  await page.waitForTimeout(1200);
}

function resetDemo() {
  execFileSync(path.join(EXAMPLES, 'reset-demo.sh'), { stdio: 'inherit' });
}

resetDemo();
const { browser, page } = await launch(); // fresh context = empty localStorage = default settings
try {
  await page.goto(PLAYGROUND, { waitUntil: 'networkidle' });

  // 1. Settings (gear, top right): source FHIR server = Meld open endpoint, patient = pam-demo.
  await page.locator('[data-test="launch-settings-button-playground"]').click();
  const dlg = page.locator('[role=dialog]');
  await dlg.locator('input').first().fill(OPEN);
  await page.locator('[data-test="validate-url-button-playground"]').first().click(); // the "?" icon
  await dlg.getByText('URL validated').waitFor();
  await page.locator('[data-test="set-fhir-server-button-playground"]').click();
  await dlg.locator('[role=combobox]').first().click();
  const demi = page.getByRole('option', { name: 'Demi Formsdemo' });
  await demi.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page, 'prepop/06-playground-patient-list.png'); // pam-demo is at the end of the list
  await demi.click();
  await dlg.getByText('pam-demo').waitFor();
  await page.getByRole('listbox').waitFor({ state: 'detached' }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, 'prepop/07-playground-settings.png');
  await dlg.getByRole('button', { name: 'Save', exact: true }).click();

  // Questionnaires deck: the stage 1 form (what LHC Form Builder produces) rendered.
  async function pickForm(id) {
    const picker = page.locator('.MuiAutocomplete-input');
    await picker.click();
    await picker.fill(id);
    await page.getByRole('option', { name: id, exact: true }).click();
    await page.getByText('Resolvable URL').waitFor();
  }
  await pickForm('pathology-walkthrough-stage1');
  await page.getByRole('button', { name: 'Build form' }).first().click();
  await page.locator('#decimal-pam-hb').waitFor();
  await settle(page);
  await shot(page, 'questionnaires/02-playground-stage1.png');
  await page.getByRole('button', { name: 'Destroy form' }).click();

  // 2. Pick the walkthrough form from the forms server (= Meld open endpoint in this build).
  await pickForm('pathology-walkthrough');
  await shot(page, 'prepop/08-playground-pick-form.png');

  // 3. Build form: empty until you pre-populate.
  await page.getByRole('button', { name: 'Build form' }).first().click();
  await page.locator('#decimal-pam-hb').waitFor();
  await settle(page);
  await shot(page, 'prepop/09-playground-built.png');

  // 4. Populate > Pre-populate: runs the x-fhir-queries against Meld, then initialExpressions.
  async function prepopulate() {
    await page.getByRole('button', { name: 'Populate' }).click();
    await page.getByRole('menuitem', { name: /Pre-populate/ }).click();
    await page.waitForFunction(() => document.querySelector('#decimal-pam-hb')?.value !== '');
    await settle(page);
  }
  await prepopulate();
  await shot(page, 'prepop/10-playground-prepopulated.png');

  // Write-back deck. 5. Fill one external result: Hb 98 on 27/10/2026 (same as sample-qr.json).
  await page.locator('#choice-pam-ext-test').click();
  await page.getByRole('option', { name: 'Haemoglobin (Hb)' }).click();
  await page.locator('#decimal-pam-ext-value').fill('98');
  await page.locator('#date-pam-ext-date').click();
  await page.locator('#date-pam-ext-date').pressSequentially('27/10/2026');
  await page.locator('#date-pam-ext-date').press('Tab');
  await page.waitForTimeout(500);
  await shot(page, 'writeback/06-playground-filled.png');

  // 6. Extract > Template-based $extract.
  await page.getByRole('button', { name: 'Extract', exact: true }).first().click();
  await page.getByRole('menuitem', { name: /^Template-based \$extract \[/ }).waitFor();
  await shot(page, 'writeback/07-playground-extract-menu.png');
  await page.getByRole('menuitem', { name: /^Template-based \$extract \[/ }).click();
  await page.getByText('Successful template-based extraction').waitFor();

  // 7. Advanced props > EXTRACT > TemplateExtractResult: the transaction Bundle.
  await page.getByRole('button', { name: 'Advanced props' }).click();
  await page.getByRole('button', { name: 'Extract', exact: true }).last().click();
  await page.getByRole('heading', { name: 'templateExtractResult' }).waitFor();
  await settle(page);
  // Scroll the JSON view to the end, where the Observation's code/subject/value/date are.
  await page.getByRole('heading', { name: 'templateExtractResult' }).locator('xpath=following::pre[1]').evaluate((el) => {
    for (let e = el; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 10) { e.scrollTop = e.scrollHeight; break; }
  }).catch(() => {});
  await page.waitForTimeout(300);
  await shot(page, 'writeback/08-playground-extracted-bundle.png');

  // 8. Review write back items > Write back: POSTs the Bundle to the source FHIR server.
  await page.getByRole('button', { name: 'Review write back items' }).click();
  await page.locator('[role=dialog]').getByText('Select items to write back').waitFor();
  await page.waitForTimeout(1000);
  await shot(page, 'writeback/09-playground-write-back-dialog.png');
  await page.getByRole('button', { name: /Write back \(1 entr/i }).click();
  await page.getByText(/Write back to .* successful/).first().waitFor();
  await page.waitForTimeout(800);
  await shot(page, 'writeback/10-playground-write-back-ok.png');

  // 9. Close the loop: pre-populate again; latest Hb is now the written-back 98 (27/10/2026).
  await page.getByRole('button', { name: 'Show editor' }).click().catch(() => {});
  await prepopulate();
  await page.waitForFunction(() => document.querySelector('#decimal-pam-hb')?.value === '98');
  await settle(page);
  await shot(page, 'writeback/11-playground-close-the-loop.png');
} finally {
  await browser.close();
  resetDemo();
}
