import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintQuestionnaire, lintBundle } from '../lib/lint.mjs';

const q = (item, extra = {}) => ({ resourceType: 'Questionnaire', status: 'draft', item, ...extra });
const codes = (issues) => issues.map((i) => i.code);

test('a non-Questionnaire is an error', () => {
  assert.deepEqual(codes(lintQuestionnaire({ resourceType: 'Patient' }).errors), ['not-questionnaire']);
});

test('a clean Questionnaire has no issues', () => {
  const r = lintQuestionnaire(q([{ linkId: 'a', text: 'A', type: 'string' }]));
  assert.deepEqual(r, { errors: [], warnings: [] });
});

test('duplicate linkIds are an error naming the linkId, nested items included', () => {
  const r = lintQuestionnaire(q([
    { linkId: 'g', type: 'group', item: [{ linkId: 'a', type: 'string' }] },
    { linkId: 'a', type: 'string' },
  ]));
  assert.deepEqual(r.errors.map((e) => [e.code, e.linkId]), [['duplicate-linkid', 'a']]);
});

test('enableWhen naming a missing linkId is an error', () => {
  const r = lintQuestionnaire(q([
    { linkId: 'a', type: 'boolean' },
    { linkId: 'b', type: 'string', enableWhen: [{ question: 'nope', operator: '=', answerBoolean: true }] },
  ]));
  assert.deepEqual(r.errors.map((e) => [e.code, e.linkId]), [['enablewhen-target', 'b']]);
});

test('a choice item with no answers is a warning', () => {
  const r = lintQuestionnaire(q([{ linkId: 'c', type: 'choice' }]));
  assert.deepEqual(r.warnings.map((e) => [e.code, e.linkId]), [['choice-no-answers', 'c']]);
  assert.deepEqual(lintQuestionnaire(q([{ linkId: 'c', type: 'choice', answerValueSet: 'http://x' }])).warnings, []);
  assert.deepEqual(lintQuestionnaire(q([{ linkId: 'c', type: 'coding', answerOption: [{ valueCoding: { code: 'x' } }] }])).warnings, []);
});

const XQ = 'http://hl7.org/fhir/StructureDefinition/variable';
const xq = (expression) => ({ url: XQ, valueExpression: { name: 'v', language: 'application/x-fhir-query', expression } });

test('a raw | in an x-fhir-query is a warning that mentions %7C', () => {
  const r = lintQuestionnaire(q([], { extension: [xq('Observation?code=http://loinc.org|718-7&patient={{%patient.id}}')] }));
  assert.deepEqual(codes(r.warnings), ['raw-pipe']);
  assert.match(r.warnings[0].message, /%7C/);
  assert.deepEqual(lintQuestionnaire(q([], { extension: [xq('Observation?code=http://loinc.org%7C718-7')] })).warnings, []);
});

test('meta.profile on the Questionnaire or a contained template is a warning', () => {
  const r1 = lintQuestionnaire(q([], { meta: { profile: ['http://x'] } }));
  assert.deepEqual(codes(r1.warnings), ['meta-profile']);
  const r2 = lintQuestionnaire(q([], { contained: [{ resourceType: 'Observation', id: 't', meta: { profile: ['http://y'] } }] }));
  assert.deepEqual(r2.warnings.map((w) => [w.code, w.path]), [['meta-profile', 'contained/t']]);
});

const bundle = (entries, extra = {}) => ({ resourceType: 'Bundle', type: 'transaction', entry: entries, ...extra });
const put = (resource) => ({ resource, request: { method: 'PUT', url: `${resource.resourceType}/${resource.id}` } });

test('a clean sample Bundle has no issues', () => {
  const b = bundle([put({ resourceType: 'Patient', id: 'js-f1' }),
    put({ resourceType: 'Observation', id: 'js-hb1', subject: { reference: 'Patient/js-f1' } })]);
  assert.deepEqual(lintBundle(b, { prefix: 'js-' }), { errors: [], warnings: [] });
});

test('an id without the prefix is an error', () => {
  const r = lintBundle(bundle([put({ resourceType: 'Patient', id: 'f1' })]), { prefix: 'js-' });
  assert.deepEqual(codes(r.errors), ['id-prefix']);
});

test('touching a shared patient is an error, by id or by reference', () => {
  const r1 = lintBundle(bundle([put({ resourceType: 'Patient', id: 'pam-001' })]), { prefix: 'pam-' });
  assert.ok(codes(r1.errors).includes('shared-patient'));
  const r2 = lintBundle(bundle([put({ resourceType: 'Observation', id: 'js-o', subject: { reference: 'Patient/pam-demo' } })]), { prefix: 'js-' });
  assert.deepEqual(codes(r2.errors), ['shared-patient']);
});

test('a non-transaction Bundle or a non-PUT entry is an error', () => {
  assert.deepEqual(codes(lintBundle(bundle([], { type: 'collection' }), { prefix: 'js-' }).errors), ['bundle-shape']);
  const post = { resource: { resourceType: 'Patient', id: 'js-1' }, request: { method: 'POST', url: 'Patient' } };
  assert.deepEqual(codes(lintBundle(bundle([post]), { prefix: 'js-' }).errors), ['bundle-shape']);
});

const fp = (name, expression) => ({ url: XQ, valueExpression: { name, language: 'text/fhirpath', expression } });

test('an expression testing three or more listed codes or names is a code-list warning', () => {
  const listed = [
    "%Meds.entry.resource.medication.coding.where(code = '111' or code = '222' or code = '333').exists()",
    "%Conds.entry.resource.code.coding.where(code in ('111' | '222' | '333')).exists()",
    "%Meds.entry.resource.medication.text.where(contains('temazepam') or contains('zopiclone') or contains('zolpidem')).exists()",
  ];
  for (const e of listed) {
    const r = lintQuestionnaire(q([{ linkId: 'a', type: 'boolean' }], { extension: [fp('x', e)] }));
    assert.deepEqual(codes(r.warnings), ['code-list'], e);
  }
  const fine = [
    "%Conds.entry.resource.code.coding.where(memberOf('http://snomed.info/sct?fhir_vs=ecl/<< 709044004')).exists()",
    "%Obs.entry.resource.where(code.coding.code = '718-7' or code.coding.code = '30313-1').exists()",
  ];
  for (const e of fine) {
    assert.deepEqual(lintQuestionnaire(q([{ linkId: 'a', type: 'boolean' }], { extension: [fp('x', e)] })).warnings, [], e);
  }
});

test('a free-text item about medicines, conditions, procedures, allergies or pathology is a free-text-clinical warning', () => {
  for (const text of ['Current medications', 'Allergies and reactions', 'Previous operations', 'Diagnosis', 'Pathology tests ordered']) {
    const r = lintQuestionnaire(q([{ linkId: 'a', type: 'string', text }]));
    assert.deepEqual(r.warnings.map((w) => [w.code, w.linkId]), [['free-text-clinical', 'a']], text);
  }
  assert.deepEqual(lintQuestionnaire(q([{ linkId: 'a', type: 'text', text: 'Comments' }])).warnings, []);
  assert.deepEqual(lintQuestionnaire(q([{ linkId: 'a', type: 'choice', text: 'Current medications',
    answerValueSet: 'https://healthterminologies.gov.au/fhir/ValueSet/australian-medication-1' }])).warnings, []);
});

const tabControl = { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
  valueCodeableConcept: { coding: [{ system: 'http://hl7.org/fhir/questionnaire-item-control', code: 'tab-container' }] } };
const questions = (prefix, n) => Array.from({ length: n }, (_, i) => ({ linkId: `${prefix}${i}`, type: 'string', text: `Q${i}` }));

test('a long form with sections but no tabs or pages is a long-no-tabs warning', () => {
  const sections = [
    { linkId: 's1', type: 'group', text: 'One', item: questions('a', 9) },
    { linkId: 's2', type: 'group', text: 'Two', item: questions('b', 9) },
  ];
  assert.deepEqual(codes(lintQuestionnaire(q(sections)).warnings), ['long-no-tabs']);
  const tabbed = [{ linkId: 'tabs', type: 'group', extension: [tabControl], item: sections }];
  assert.deepEqual(lintQuestionnaire(q(tabbed)).warnings, []);
  assert.deepEqual(lintQuestionnaire(q(questions('c', 10))).warnings, []);
});
