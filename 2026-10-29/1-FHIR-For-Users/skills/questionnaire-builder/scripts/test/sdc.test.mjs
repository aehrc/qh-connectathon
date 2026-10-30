import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeLocalFetch } from '../lib/localServer.mjs';
import { runPopulate, runExtract } from '../lib/sdc.mjs';

const load = (f) => JSON.parse(readFileSync(new URL(`fixtures/${f}`, import.meta.url)));
const q = load('pop-q.json');
const data = load('pop-data.json');
const patient = data.entry[0].resource;
const answerOf = (items, linkId) => {
  for (const i of items || []) {
    if (i.linkId === linkId) return i.answer?.[0];
    const a = answerOf(i.item, linkId);
    if (a) return a;
  }
};

test('local search returns the latest matching Observation, with %7C or a raw |', async () => {
  const fetch = makeLocalFetch(data);
  for (const sep of ['%7C', '|']) {
    const b = await fetch(`Observation?code=http://loinc.org${sep}718-7&patient=t-f1&_sort=-date&_count=1`);
    assert.equal(b.resourceType, 'Bundle');
    assert.deepEqual(b.entry.map((e) => e.resource.id), ['t-hb-new']);
  }
});

test('local search handles an encoded scheme and Type/id reads', async () => {
  const fetch = makeLocalFetch(data);
  const b = await fetch('Observation?code=http%3A%2F%2Floinc.org%7C718-7&subject=Patient/t-f1');
  assert.equal(b.entry.length, 2);
  assert.equal((await fetch('Patient/t-f1')).gender, 'female');
});

test('local search records parameters it does not understand', async () => {
  const fetch = makeLocalFetch(data);
  await fetch('Observation?patient=t-f1&value-quantity=gt100');
  assert.deepEqual(fetch.unsupported, ['value-quantity']);
});

test('population fills the Hb item from the latest result', async () => {
  const r = await runPopulate(q, { fetchFn: makeLocalFetch(data), patient });
  assert.equal(r.ok, true);
  assert.equal(answerOf(r.response.item, 'hb').valueDecimal, 98);
});

test('extraction writes one Hb Observation for the patient, and warns about the empty template', async () => {
  const { response } = await runPopulate(q, { fetchFn: makeLocalFetch(data), patient });
  response.subject = { reference: 'Patient/t-f1' };
  const r = await runExtract(response, q);
  assert.equal(r.ok, true);
  const hb = r.resources.filter((x) => x.code?.coding?.[0]?.code === '718-7');
  assert.equal(hb.length, 1);
  assert.equal(hb[0].code.coding[0].code, '718-7');
  assert.equal(hb[0].valueQuantity.value, 98);
  assert.equal(hb[0].subject.reference, 'Patient/t-f1');
  assert.deepEqual(r.warnings.map((w) => [w.code, w.path]), [['empty-template', 'EmptyTemplate']]);
});

test('a template on an item nobody answered is not reported as empty', async () => {
  const { response } = await runPopulate(q, { fetchFn: makeLocalFetch(data), patient });
  const r = await runExtract({ ...response, subject: { reference: 'Patient/t-f1' } }, q);
  assert.ok(!r.warnings.some((w) => w.path === 'OptionalTemplate'), JSON.stringify(r.warnings));
});
