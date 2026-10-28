// fhirpath-lab screenshots for the prepopulation and write-back decks.
// Prepop: the live Hb query Bundle for pam-demo, expression built up step by step.
// Write-back: sample-qr.json with a context expression on the pam-ext repeat.
// Expressions are taken from examples/expressions.json (never retyped here).
import { launch, shot, readExample, openSearch } from './lib.mjs';

const LAB = 'https://fhirpath-lab.com/FhirPath';
const expr = Object.fromEntries(JSON.parse(readExample('expressions.json')).map((e) => [e.id, e.expression]));
const EXT_CONTEXT = "repeat(item).where(linkId='pam-ext')";

const { browser, page } = await launch();

// The three ace editors on the page, in order: context, expression, resource JSON.
async function setLab({ context = '', expression, resource }) {
  await page.evaluate(([c, e, r]) => {
    const [ctx, ex, res] = [...document.querySelectorAll('.ace_editor')].map((el) => window.ace.edit(el));
    ctx.setValue(c, 1);
    ex.setValue(e, 1);
    if (r !== null) res.setValue(r, -1);
  }, [context, expression, resource ?? null]);
  await page.locator('button[title="press alt+g to go"]').click(); // the ▶ button
  await page.waitForTimeout(2000);
}

await page.goto(LAB, { waitUntil: 'networkidle' });
await page.waitForSelector('.ace_editor');

// --- Prepopulation -------------------------------------------------------
const bundle = await openSearch(expr['query-latest-hb'].replace('{{%patient.id}}', 'pam-demo'));
const bundleJson = JSON.stringify(bundle, null, 2);

await setLab({ expression: expr['fp-entry-resource'], resource: bundleJson });
await shot(page, 'prepop/02-fhirpath-lab-entry-resource.png');
await setLab({ expression: expr['fp-value'] });
await shot(page, 'prepop/03-fhirpath-lab-value.png');
await setLab({ expression: expr['fp-value-value'] });
await shot(page, 'prepop/04-fhirpath-lab-value-value.png');
await setLab({ expression: expr['fp-hb-date'] });
await shot(page, 'prepop/05-fhirpath-lab-hb-date.png');

// --- Write-back ----------------------------------------------------------
const qr = readExample('sample-qr.json');
await setLab({ context: EXT_CONTEXT, expression: expr['ext-code'], resource: qr });
await shot(page, 'writeback/01-fhirpath-lab-ext-code.png');
await setLab({ context: EXT_CONTEXT, expression: expr['ext-value'] });
await shot(page, 'writeback/02-fhirpath-lab-ext-value.png');
await setLab({ context: EXT_CONTEXT, expression: expr['ext-unit'] });
await shot(page, 'writeback/03-fhirpath-lab-ext-unit.png');
await setLab({ context: EXT_CONTEXT, expression: expr['ext-date'] });
await shot(page, 'writeback/04-fhirpath-lab-ext-date.png');
await setLab({ context: EXT_CONTEXT, expression: expr['ext-subject'] });
await shot(page, 'writeback/05-fhirpath-lab-ext-subject.png');

await browser.close();
