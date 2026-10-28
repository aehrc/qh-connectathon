// The Hb search on the Meld open endpoint, as a browser shows it.
// Meld returns HTTP 400 for a raw '|' in the query string, so the URL uses %7C.
// Without &_format=json a browser gets XML (application/fhir+xml) and Chrome/Edge download it
// instead of showing it.
import { launch, shot, readExample, OPEN } from './lib.mjs';

const expr = Object.fromEntries(JSON.parse(readExample('expressions.json')).map((e) => [e.id, e.expression]));
const { browser, page } = await launch();

async function showJson(url, rel) {
  await page.goto(`${url}&_format=json`, { waitUntil: 'networkidle' });
  await shot(page, rel);
}

try {
  // Prepopulation deck: the x-fhir-query from the form, for pam-demo.
  const hbQuery = expr['query-latest-hb'].replace('{{%patient.id}}', 'pam-demo').replaceAll('|', '%7C');
  await showJson(`${OPEN}/${hbQuery}`, 'prepop/01-query-in-browser.png');

  // SMART deck: all Hb results for the patient (what the first app fetches).
  await showJson(`${OPEN}/Observation?code=http://loinc.org%7C718-7&patient=pam-demo&_sort=-date`, 'smart/01-hb-search-open.png');
} finally {
  await browser.close();
}
