import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { checkAll } from '../lib/check.mjs';

const path = (f) => new URL(`fixtures/${f}`, import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(path(f)));
const text = (report) => report.sections.flatMap((s) => s.lines).join('\n');

test('a structure-only draft with no data passes and says there is nothing to populate or extract', async () => {
  const r = await checkAll({ questionnaire: load('draft-q.json') });
  assert.equal(r.pass, true);
  assert.match(text(r), /nothing to populate or extract/);
});

test('population runs for every patient in the sample data, so variation shows up', async () => {
  const r = await checkAll({ questionnaire: load('sex-q.json'), sampleBundle: load('sex-data.json'), prefix: 't-' });
  assert.equal(r.pass, true, text(r));
  const lines = text(r);
  assert.match(lines, /t-f1.*anaemic = true/);
  assert.match(lines, /t-m1.*anaemic = true/);
  assert.match(lines, /t-f1.*hb = 98/);
  assert.match(lines, /t-m1.*hb = 125/);
});

test('--patient limits population to one patient', async () => {
  const r = await checkAll({ questionnaire: load('sex-q.json'), sampleBundle: load('sex-data.json'), patientId: 't-m1', prefix: 't-' });
  assert.doesNotMatch(text(r), /t-f1/);
});

test('lint errors make the report fail', async () => {
  const q = load('draft-q.json');
  q.item.push({ linkId: 'name', type: 'string' });
  const r = await checkAll({ questionnaire: q });
  assert.equal(r.pass, false);
  assert.match(text(r), /FAIL.*name/);
});

test('an empty template is a warning in the report', async () => {
  const r = await checkAll({ questionnaire: load('pop-q.json'), sampleBundle: load('pop-data.json'), prefix: 't-' });
  assert.match(text(r), /WARN.*EmptyTemplate/);
});

const cli = new URL('../check.mjs', import.meta.url).pathname;
test('the CLI exits 1 with a one-line message on a missing file', () => {
  try {
    execFileSync('node', [cli, 'no-such.json'], { stdio: 'pipe' });
    assert.fail('should have exited non-zero');
  } catch (e) {
    assert.equal(e.status, 1);
    const err = e.stderr.toString().trim();
    assert.equal(err.split('\n').length, 1, err);
    assert.match(err, /no-such\.json/);
  }
});

test('the CLI prints the report and exits 0 on a pass', () => {
  const out = execFileSync('node', [cli, path('sex-q.json'), '--data', path('sex-data.json'), '--prefix', 't-']).toString();
  assert.match(out, /PASS/);
});

test('answers are added to each populated response before extraction', async () => {
  const r = await checkAll({ questionnaire: load('pop-q.json'), sampleBundle: load('pop-data.json'), prefix: 't-',
    answers: { optional: [{ valueString: 'typed in' }] } });
  assert.match(text(r), /PASS t-f1: .*Observation \(optional\)/);
  assert.doesNotMatch(text(r), /OptionalTemplate/);
});

test('the CLI takes --answers from a file', () => {
  const out = execFileSync('node', [cli, path('pop-q.json'), '--data', path('pop-data.json'), '--answers', path('pop-answers.json')]).toString();
  assert.match(out, /Observation \(optional\)/);
});

test('typed-in answers skip items that are hidden for that patient or by another answer', async () => {
  const r = await checkAll({ questionnaire: load('sex-q.json'), sampleBundle: load('sex-data.json'), prefix: 't-',
    answers: { 'female-only': [{ valueString: 'x' }], gate: [{ valueBoolean: false }], gated: [{ valueString: 'y' }] } });
  const lines = text(r);
  assert.match(lines, /PASS t-f1: .*Observation \(female-only\)/);
  assert.doesNotMatch(lines, /PASS t-m1: .*female-only/);
  assert.doesNotMatch(lines, /gated = y/);
});

test('calculated items are shown for each patient', async () => {
  const r = await checkAll({ questionnaire: load('sex-q.json'), sampleBundle: load('sex-data.json'), prefix: 't-' });
  assert.match(text(r), /t-f1: .*hb-plus = 99 \(calculated\)/);
  assert.match(text(r), /t-m1: .*hb-plus = 126 \(calculated\)/);
});
