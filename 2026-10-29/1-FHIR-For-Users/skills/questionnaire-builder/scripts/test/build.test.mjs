import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSingleFile } from '../build-single-file.mjs';

const skillDir = new URL('../../', import.meta.url);
const read = (f) => readFileSync(new URL(f, skillDir), 'utf8');

test('the single file starts with the generated-file header', () => {
  assert.match(buildSingleFile(), /^<!-- Generated from SKILL\.md/);
});

test('it holds every section of SKILL.md and the inlined references', () => {
  const out = buildSingleFile();
  for (const h of read('SKILL.md').match(/^## .+$/gm)) assert.ok(out.includes(h), h);
  for (const f of ['probing.md', 'starting-points.md', 'decision-log-template.md', 'sdc-cheatsheet.md']) {
    const first = read(`references/${f}`).match(/^# .+$/m)[0];
    assert.ok(out.includes(`#${first}`), `${f} inlined (as ${first})`);
  }
  assert.doesNotMatch(out, /^name: questionnaire-builder$/m);
});

test('references that are not inlined become links to GitHub, and none stay relative', () => {
  const out = buildSingleFile();
  assert.match(out, /https:\/\/github\.com\/aehrc\/qh-connectathon\/blob\/main\/2026-10-29\/1-FHIR-For-Users\/skills\/questionnaire-builder\/references\/upstream-shapes\.md/);
  assert.doesNotMatch(out, /\]\((?!https?:)[^)]*references\//);
  assert.doesNotMatch(out, /(?<!\[)`references\/(upstream-shapes|environments|sample-data)\.md`(?!\]\()/);
});

test('building twice gives the same output, and the committed file is up to date', () => {
  assert.equal(buildSingleFile(), buildSingleFile());
  assert.equal(read('dist/questionnaire-builder.md'), buildSingleFile());
});
