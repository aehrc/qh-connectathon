import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPreview } from '../preview.mjs';

// Copies of the demo form, so the reload test can touch them.
const SNIPPETS = fileURLToPath(new URL('../../references/snippets/', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'qb-preview-'));
for (const f of ['demo-questionnaire.json', 'demo-sample-data.json', 'demo-answers.json']) copyFileSync(join(SNIPPETS, f), join(dir, f));
const preview = await startPreview({
  formPath: join(dir, 'demo-questionnaire.json'),
  dataPath: join(dir, 'demo-sample-data.json'),
  answersPath: join(dir, 'demo-answers.json'),
  port: 0,
});
after(() => preview.close());
const get = async (path) => (await fetch(preview.url + path)).json();

test('the page loads the bundled renderer', async () => {
  const html = await (await fetch(preview.url)).text();
  assert.match(html, /<script type="module" src="\/app\/app\.js">/);
  assert.equal((await fetch(`${preview.url}/app/app.js`)).status, 200);
});

test('state lists every test patient and says whether there are test answers', async () => {
  const s = await get('/api/state');
  assert.match(s.title, /^Pre-op bloods/);
  assert.deepEqual(s.patients.map((p) => p.id), ['demo-f1', 'demo-m1']);
  assert.match(s.patients[0].label, /demo-f1.*female/);
  assert.equal(s.hasAnswers, true);
});

const answer = (items, linkId) => {
  for (const i of items || []) {
    if (i.linkId === linkId) return i.answer?.[0];
    const a = answer(i.item, linkId);
    if (a) return a;
  }
  return undefined;
};

test('populate prefills the form for the chosen patient from the sample data', async () => {
  const r = await get('/api/populate?patient=demo-f1');
  assert.equal(r.questionnaire.resourceType, 'Questionnaire');
  assert.equal(answer(r.response.item, 'hb').valueDecimal, 112);
  assert.equal(answer(r.response.item, 'ida-confirm'), undefined);
  assert.equal(r.context.patient.id, 'demo-f1');
  assert.equal(r.context.user?.id, 'demo-dr1');
});

test('populate with answers=1 adds the test answers', async () => {
  const r = await get('/api/populate?patient=demo-f1&answers=1');
  assert.equal(answer(r.response.item, 'ida-confirm').valueBoolean, true);
});

test('an unknown patient is a 404 with a message', async () => {
  const res = await fetch(`${preview.url}/api/populate?patient=nobody`);
  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /nobody/);
});

test('extract returns what the response would write back', async () => {
  const { response } = await get('/api/populate?patient=demo-f1&answers=1');
  const res = await fetch(`${preview.url}/api/extract`, { method: 'POST', body: JSON.stringify(response) });
  const r = await res.json();
  assert.ok(r.resources.some((x) => x.resourceType === 'Condition' && x.code.coding[0].code === '87522002'), JSON.stringify(r));
});

test('saving a new version of the form sends a reload event', async () => {
  const res = await fetch(`${preview.url}/api/events`);
  const reader = res.body.getReader();
  const form = join(dir, 'demo-questionnaire.json');
  setTimeout(() => writeFileSync(form, readFileSync(form)), 200);
  let text = '';
  const deadline = Date.now() + 5000;
  while (!text.includes('event: changed') && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    text += new TextDecoder().decode(value);
  }
  await reader.cancel();
  assert.match(text, /event: changed/);
});
