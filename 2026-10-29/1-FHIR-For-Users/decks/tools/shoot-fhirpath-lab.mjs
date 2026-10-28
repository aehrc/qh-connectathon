// fhirpath-lab screenshots for the prepopulation and write-back decks.
// Prepop: the live Hb query Bundle for pam-demo, expression built up step by step.
// Write-back: sample-qr.json with a context expression on the pam-ext repeat.
// Expressions and expected results come from examples/expressions.json (never retyped here);
// each screenshot is taken only after fhirpath-lab shows the expected result.
import { launch, shot, readExample, openSearch } from './lib.mjs';

const LAB = 'https://fhirpath-lab.com/FhirPath';
const entries = Object.fromEntries(JSON.parse(readExample('expressions.json')).map((e) => [e.id, e]));
const EXT_CONTEXT = "repeat(item).where(linkId='pam-ext')";

// Strings that must appear in the RESULTS panel for an expected value:
// primitives as text; for objects, their top-level primitive values (e.g. id, code, value).
function needles(expected) {
  return expected.flatMap((v) =>
    v !== null && typeof v === 'object'
      ? Object.values(v).filter((x) => x === null || typeof x !== 'object').map(String)
      : [String(v)],
  );
}

// Text of the RESULTS panel only (the expressions above it are excluded).
const resultsText = () =>
  page.evaluate(() => {
    const t = document.querySelector('.results')?.parentElement?.innerText ?? '';
    return t.slice(t.indexOf('RESULTS'));
  });

const { browser, page } = await launch();
try {
  // The three ace editors on the page, in order: context, expression, resource JSON.
  async function run(id, { context = '', resource = null } = {}) {
    const { expression, expected } = entries[id];
    const before = await resultsText();
    await page.evaluate(([c, e, r]) => {
      const [ctx, ex, res] = [...document.querySelectorAll('.ace_editor')].map((el) => window.ace.edit(el));
      ctx.setValue(c, 1);
      ex.setValue(e, 1);
      if (r !== null) res.setValue(r, -1);
    }, [context, expression, resource]);
    await page.locator('button[title="press alt+g to go"]').click(); // the ▶ button
    const want = needles(expected);
    try {
      await page.waitForFunction(
        ([before, want]) => {
          const t = document.querySelector('.results')?.parentElement?.innerText ?? '';
          const r = t.slice(t.indexOf('RESULTS'));
          return r !== before && want.every((w) => r.includes(w));
        },
        [before, want],
        { timeout: 20000 },
      );
    } catch {
      throw new Error(`${id}: results never showed ${JSON.stringify(want)}; got:\n${await resultsText()}`);
    }
    await page.waitForTimeout(300); // let the panel finish laying out
  }

  await page.goto(LAB, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ace_editor');

  // --- Prepopulation -------------------------------------------------------
  const bundle = await openSearch(entries['query-latest-hb'].expression.replace('{{%patient.id}}', 'pam-demo'));
  const bundleJson = JSON.stringify(bundle, null, 2);

  await run('fp-entry-resource', { resource: bundleJson });
  await shot(page, 'prepop/02-fhirpath-lab-entry-resource.png');
  await run('fp-value');
  await shot(page, 'prepop/03-fhirpath-lab-value.png');
  await run('fp-value-value');
  await shot(page, 'prepop/04-fhirpath-lab-value-value.png');
  await run('fp-hb-date');
  await shot(page, 'prepop/05-fhirpath-lab-hb-date.png');

  // --- Write-back ----------------------------------------------------------
  const qr = readExample('sample-qr.json');
  await run('ext-code', { context: EXT_CONTEXT, resource: qr });
  await shot(page, 'writeback/01-fhirpath-lab-ext-code.png');
  await run('ext-value', { context: EXT_CONTEXT });
  await shot(page, 'writeback/02-fhirpath-lab-ext-value.png');
  await run('ext-unit', { context: EXT_CONTEXT });
  await shot(page, 'writeback/03-fhirpath-lab-ext-unit.png');
  await run('ext-date', { context: EXT_CONTEXT });
  await shot(page, 'writeback/04-fhirpath-lab-ext-date.png');
  await run('ext-subject', { context: EXT_CONTEXT });
  await shot(page, 'writeback/05-fhirpath-lab-ext-subject.png');
} finally {
  await browser.close();
}
