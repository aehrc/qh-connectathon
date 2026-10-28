#!/usr/bin/env node
// Check that the decks and examples/expressions.json can't drift apart (no network).
//
//   node examples/verify-slides.mjs
//
// 1. Every expressions.json entry's "expression" appears verbatim in at least one deck,
//    unless the entry says "slides": false (verified, but deliberately not on a slide).
// 2. Every FHIRPath-looking code span in the decks is a verified text: an expression, or an
//    "inForm" text (e.g. the %latestHb.-prefixed form of a verified expression).
//    FHIRPath-looking = contains entry.resource, item.where(, answer.value, %resource. or
//    repeat(item). Which spans are checked:
//    - fenced code blocks and <pre> blocks: every such line. If the line is a JSON
//      "expression" / "valueString" member, its string value is checked; otherwise the trimmed
//      line. Any "expression": "..." value in a code block is checked too (FHIRPath or query).
//    - inline `code` outside those blocks: only spans of 15+ characters that don't contain
//      "..." or "…" (shorter spans and elided fragments such as `item.where(...)` are prose).
// Deck text is compared after stripping HTML tags, decoding &lt; &gt; &amp; &quot; &#39; and
// turning a table's \| back into |.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DECKS = join(HERE, '..');
const FHIRPATH = /entry\.resource|item\.where\(|answer\.value|%resource\.|repeat\(item\)/;

const norm = (s) => s.replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&').replace(/\\\|/g, '|');

const entries = JSON.parse(readFileSync(join(HERE, 'expressions.json'), 'utf8'));
const verified = new Set(entries.flatMap((e) => [e.expression, e.inForm?.text].filter(Boolean)));
const decks = readdirSync(DECKS).filter((f) => /^[0-9].*\.md$/.test(f)).sort()
  .map((f) => ({ f, text: readFileSync(join(DECKS, f), 'utf8') }));

let failures = 0, checked = 0;
const fail = (msg) => { failures++; console.log(`FAIL ${msg}`); };

// --- 1. expressions.json -> decks ------------------------------------------------------------
const deckText = decks.map((d) => norm(d.text)).join('\n');
for (const e of entries) {
  if (e.slides === false) { console.log(`SKIP ${e.id}  ("slides": false)`); continue; }
  checked++;
  deckText.includes(e.expression) ? console.log(`PASS ${e.id}  on a slide`)
    : fail(`${e.id}  not found verbatim in any deck: ${e.expression}`);
}

// --- 2. decks -> expressions.json ------------------------------------------------------------
for (const { f, text } of decks) {
  const lines = text.split('\n');
  const prose = [];
  let fence = null; // closing marker while inside a ``` block or a <pre> block
  lines.forEach((raw, i) => {
    const where = `${f}:${i + 1}`;
    if (!fence) {
      if (/^\s*```/.test(raw)) { fence = '```'; return; }
      if (/<pre[\s>]/.test(raw)) {
        if (!/<\/pre>/.test(raw)) fence = '</pre>';
        return codeLine(norm(raw), where);
      }
      return prose.push({ raw, where });
    }
    if (fence === '```' && /^\s*```/.test(raw)) { fence = null; return; }
    if (fence === '</pre>' && /<\/pre>/.test(raw)) fence = null;
    codeLine(norm(raw), where);
  });
  for (const { raw, where } of prose) {
    for (const [, span] of raw.matchAll(/`([^`]+)`/g)) {
      const s = norm(span);
      if (s.length < 15 || /\.\.\.|…/.test(s) || !FHIRPATH.test(s)) continue;
      check(s, where);
    }
  }
}

function codeLine(line, where) {
  const member = line.match(/"(expression|valueString)":\s*"([^"]*)"/);
  if (member && (member[1] === 'expression' || FHIRPATH.test(member[2]))) return check(member[2], where);
  if (FHIRPATH.test(line)) check(line.trim(), where);
}

function check(s, where) {
  checked++;
  verified.has(s) ? console.log(`PASS ${where}  ${s.length > 70 ? `${s.slice(0, 67)}...` : s}`)
    : fail(`${where}  not in expressions.json (expression or inForm text): ${s}`);
}

console.log(failures ? `\n${failures} failure(s)` : `\nverify-slides ok: ${checked} checks`);
process.exit(failures ? 1 : 0);
