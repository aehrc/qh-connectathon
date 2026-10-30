import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkAll } from '../lib/check.mjs';

const ref = (f) => new URL(`../../references/${f}`, import.meta.url);
const json = (f) => JSON.parse(readFileSync(ref(f)));
const demo = json('snippets/demo-questionnaire.json');

test('the demo form passes check with its sample data and answers', async () => {
  const r = await checkAll({ questionnaire: demo, sampleBundle: json('snippets/demo-sample-data.json'),
    userId: 'demo-dr1', answers: json('snippets/demo-answers.json') });
  const lines = r.sections.flatMap((s) => s.lines).join('\n');
  assert.equal(r.pass, true, lines);
  assert.doesNotMatch(lines, /WARN|FAIL/);
  assert.match(lines, /demo-f1: .*anaemic = true/);
  assert.match(lines, /demo-m1: .*anaemic = false/);
  assert.match(lines, /PASS demo-f1: Observation \(82810-3\), Condition \(87522002\)/);
});

// "item:<linkId>", "variable:<name>", "launchContext:<name>" or "contained:<id>" in the demo form.
function select(selector) {
  const [kind, key] = selector.split(':');
  const walk = (items) => {
    for (const i of items || []) {
      if (i.linkId === key) return i;
      const found = walk(i.item);
      if (found) return found;
    }
  };
  if (kind === 'item') return walk(demo.item);
  if (kind === 'contained') return demo.contained.find((c) => c.id === key);
  if (kind === 'variable') return demo.extension.find((e) => e.valueExpression?.name === key);
  if (kind === 'launchContext') return demo.extension.find((e) => e.extension?.[0]?.valueCoding?.code === key);
  throw new Error(`unknown selector ${selector}`);
}

test('every snippet in the cheat-sheet is copied exactly from the demo form', () => {
  const md = readFileSync(ref('sdc-cheatsheet.md'), 'utf8');
  const blocks = [...md.matchAll(/<!-- from: demo-questionnaire\.json#(\S+) -->\s*```json\n([\s\S]*?)```/g)];
  assert.ok(blocks.length >= 8, `only ${blocks.length} snippets found`);
  for (const [, selector, body] of blocks) {
    assert.deepEqual(JSON.parse(body), select(selector), selector);
  }
});
