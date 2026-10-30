import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBundle, cleanupBundle } from '../load.mjs';

const put = (resource) => ({ resource, request: { method: 'PUT', url: `${resource.resourceType}/${resource.id}` } });
const sample = () => ({ resourceType: 'Bundle', type: 'transaction', entry: [
  put({ resourceType: 'Patient', id: 'js-f1' }),
  put({ resourceType: 'Observation', id: 'js-hb1', subject: { reference: 'Patient/js-f1' } }),
] });
const recorder = () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, method: init?.method, body: init?.body && JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ resourceType: 'Bundle', type: 'transaction-response', entry: [] }) };
  };
  return { calls, fetchFn };
};
const opts = (fetchFn, extra = {}) => ({ server: 'https://example.org/fhir', prefix: 'js-', fetchFn, ...extra });

test('without yes, nothing is sent and the plan is returned', async () => {
  const { calls, fetchFn } = recorder();
  const r = await loadBundle(sample(), opts(fetchFn));
  assert.equal(calls.length, 0);
  assert.equal(r.sent, false);
  assert.deepEqual(r.plan, ['PUT Patient/js-f1', 'PUT Observation/js-hb1']);
});

test('with yes, the transaction is POSTed to the server base', async () => {
  const { calls, fetchFn } = recorder();
  const r = await loadBundle(sample(), opts(fetchFn, { yes: true }));
  assert.equal(r.sent, true);
  assert.deepEqual(calls.map((c) => [c.url, c.method, c.body.type]), [['https://example.org/fhir', 'POST', 'transaction']]);
});

test('a bundle that touches a shared patient is refused and nothing is sent', async () => {
  const { calls, fetchFn } = recorder();
  const b = sample();
  b.entry[1].resource.subject.reference = 'Patient/pam-001';
  await assert.rejects(loadBundle(b, opts(fetchFn, { yes: true })), /pam-001/);
  assert.equal(calls.length, 0);
});

test('cleanup deletes only ids with the prefix, children before the patient', async () => {
  const { calls, fetchFn } = recorder();
  const b = sample();
  b.entry.push({ resource: { resourceType: 'Organization', id: 'shared-org' }, request: { method: 'PUT', url: 'Organization/shared-org' } });
  const r = await cleanupBundle(b, opts(fetchFn, { yes: true }));
  assert.deepEqual(r.plan, ['DELETE Observation/js-hb1', 'DELETE Patient/js-f1']);
  assert.deepEqual(calls[0].body.entry.map((e) => `${e.request.method} ${e.request.url}`), r.plan);
});
