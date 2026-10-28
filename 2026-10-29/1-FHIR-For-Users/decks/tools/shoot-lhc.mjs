// NLM (LHC) Form Builder: landing page only.
//
// The builder opens with a "LOINC Terms of Use" dialog that must be accepted before anything
// else works. Accepting licence terms is a decision for a person, so this script does NOT click
// "I accept"; it only captures the dialog. The builder steps (new form, items, export) are
// described in Presenter-Guide.md and are to be screenshotted by Jim (or automated here once
// he decides the script may accept the terms on his behalf).
import { launch, shot } from './lib.mjs';

// formbuilder.lhcforms.nlm.nih.gov does not resolve; this is the live URL
// (redirects to https://lhncbc.nlm.nih.gov/formbuilder/).
const LHC = 'https://formbuilder.nlm.nih.gov/';

const { browser, page } = await launch();
try {
  await page.goto(LHC, { waitUntil: 'networkidle' });
  await page.getByText('I accept the LOINC Terms of Use.').waitFor();
  await page.waitForTimeout(500);
  await shot(page, 'questionnaires/01-lhc-terms.png');
} finally {
  await browser.close();
}
