import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectExpressions, evaluateExpressions } from '../lib/expressions.mjs';

const SDC = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/';
const variable = (name, expression, language = 'text/fhirpath') =>
  ({ url: 'http://hl7.org/fhir/StructureDefinition/variable', valueExpression: { name, language, expression } });
const ext = (kind, expression) =>
  ({ url: `${SDC}sdc-questionnaire-${kind}`, valueExpression: { language: 'text/fhirpath', expression } });

const patient = { resourceType: 'Patient', id: 't-f1', gender: 'female' };
const obsHb = { resourceType: 'Bundle', type: 'searchset', entry: [{ resource: {
  resourceType: 'Observation', id: 'hb1', valueQuantity: { value: 98, unit: 'g/L' } } }] };

const hbForm = () => ({
  resourceType: 'Questionnaire',
  extension: [
    variable('ObsHb', 'Observation?code=http://loinc.org%7C718-7&patient={{%patient.id}}', 'application/x-fhir-query'),
    variable('latestHb', '%ObsHb.entry.resource.first()'),
  ],
  item: [{ linkId: 'hb', type: 'decimal', extension: [ext('initialExpression', '%latestHb.value.value')] }],
});

test('collectExpressions finds root variables, queries and item expressions with kind and linkId', () => {
  const got = collectExpressions(hbForm()).map((e) => [e.kind, e.linkId, e.name]);
  assert.deepEqual(got, [['x-fhir-query', null, 'ObsHb'], ['variable', null, 'latestHb'], ['initialExpression', 'hb', null]]);
});

test('root variables are evaluated in order and visible to items', () => {
  const results = evaluateExpressions(hbForm(), { env: { patient, ObsHb: obsHb } });
  const init = results.find((r) => r.expr.kind === 'initialExpression');
  assert.equal(init.ok, true);
  assert.deepEqual(init.value, [98]);
});

test('an x-fhir-query is not evaluated, but its {{ }} parts are substituted', () => {
  const results = evaluateExpressions(hbForm(), { env: { patient, ObsHb: obsHb } });
  const query = results.find((r) => r.expr.kind === 'x-fhir-query');
  assert.deepEqual(query.value, ['Observation?code=http://loinc.org%7C718-7&patient=t-f1']);
});

test('an item variable is visible to the item and its children, not to a sibling', () => {
  const form = {
    resourceType: 'Questionnaire',
    item: [
      { linkId: 'g', type: 'group', extension: [variable('two', '2')],
        item: [{ linkId: 'child', type: 'integer', extension: [ext('calculatedExpression', '%two + 1')] }] },
      { linkId: 'sib', type: 'integer', extension: [ext('calculatedExpression', '%two + 2')] },
    ],
  };
  const results = evaluateExpressions(form, { env: {} });
  const child = results.find((r) => r.expr.linkId === 'child');
  const sib = results.find((r) => r.expr.linkId === 'sib');
  assert.deepEqual(child.value, [3]);
  assert.equal(sib.ok, false);
  assert.match(sib.error, /two/);
});

test('a misspelt variable is a failure naming it and the item, not a throw', () => {
  const form = hbForm();
  form.item[0].extension = [ext('initialExpression', '%latestHB.value.value')];
  const r = evaluateExpressions(form, { env: { patient, ObsHb: obsHb } }).find((x) => x.expr.linkId === 'hb');
  assert.equal(r.ok, false);
  assert.match(r.error, /latestHB/);
  assert.match(r.error, /hb/);
});

test('template paths are collected and syntax-checked', () => {
  const form = { resourceType: 'Questionnaire', contained: [{ resourceType: 'Observation', id: 't1',
    valueQuantity: { extension: [{ url: `${SDC}sdc-questionnaire-templateExtractValue`, valueString: "item.where(linkId='hb').answer.value" }] },
    status: 'final', note: [{ extension: [{ url: `${SDC}sdc-questionnaire-templateExtractValue`, valueString: 'item.(' }] }] }] };
  const results = evaluateExpressions(form, { env: {} });
  assert.deepEqual(results.map((r) => [r.expr.kind, r.ok]), [['templateExtractValue', true], ['templateExtractValue', false]]);
});

test('a form with no expressions gives no results', () => {
  assert.deepEqual(evaluateExpressions({ resourceType: 'Questionnaire', item: [{ linkId: 'a', type: 'string' }] }, { env: {} }), []);
});
