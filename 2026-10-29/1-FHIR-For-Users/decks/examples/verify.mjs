#!/usr/bin/env node
// Verify every FHIRPath expression and FHIR query shown on the Track 1 decks.
//
//   node examples/verify.mjs [base]     (default base: the Meld open endpoint)
//
// For each entry in expressions.json:
//   context "query:open"            -> GET <base>/<expression> ({{%patient.id}} and ${client.patient.id}
//                                      -> pam-demo, | -> %7C; a full https URL is fetched as is);
//                                      result = ["Observation/<id>", ...] of the returned entries
//   context "bundle:<query id>"     -> FHIRPath over the Bundle that query returned
//   context "qr:resource"           -> FHIRPath over the whole sample-qr.json (as fhirpath-lab's
//                                      Context Expression is evaluated)
//   context "qr:sample"             -> FHIRPath over the repeat of the pam-ext group in
//                                      sample-qr.json, with %resource = the QuestionnaireResponse
// and deep-compare the result with "expected". `meta` is dropped from returned resources
// (the server rewrites versionId/lastUpdated on every load).
// If an entry has "inForm", that exact text must appear in the named Questionnaire
// (so the slide, the verified expression and the form can't drift apart).
// Also checks that pathology-walkthrough.json keeps the real module's linkIds and variables.
// Exits non-zero on any failure.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import fhirpath from 'fhirpath';
import r4 from 'fhirpath/fhir-context/r4/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'https://gw.interop.community/QHConnectathon2026/open').replace(/\/$/, '');
const PATIENT_ID = 'pam-demo';
const load = (f) => JSON.parse(readFileSync(join(HERE, f), 'utf8'));

const REQUIRED_LINKIDS = ['pam-pathology', 'pam-hb', 'pam-ferritin', 'pam-hb-date',
  'pam-ext', 'pam-ext-test', 'pam-ext-value', 'pam-ext-date'];
const REQUIRED_VARIABLES = ['latestHb', 'latestFerritin'];

let failures = 0;
const pass = (id, msg) => console.log(`PASS ${id}${msg ? `  ${msg}` : ''}`);
const fail = (id, msg) => { failures++; console.log(`FAIL ${id}  ${msg}`); };
const show = (v) => JSON.stringify(v);

function stripMeta(v) {
  if (Array.isArray(v)) return v.map(stripMeta);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === 'meta' && 'resourceType' in v) continue;
      out[k] = stripMeta(x);
    }
    return out;
  }
  return v;
}

function collect(node, pred, out = []) {
  if (Array.isArray(node)) node.forEach((n) => collect(n, pred, out));
  else if (node && typeof node === 'object') {
    if (pred(node)) out.push(node);
    Object.values(node).forEach((n) => collect(n, pred, out));
  }
  return out;
}

// Every string value anywhere in a resource (expressions, valueStrings, ...).
const allStrings = (r) => {
  const out = [];
  (function walk(n) {
    if (typeof n === 'string') out.push(n);
    else if (n && typeof n === 'object') Object.values(n).forEach(walk);
  })(r);
  return out;
};

const queryCache = new Map();
async function runQuery(entry) {
  if (queryCache.has(entry.id)) return queryCache.get(entry.id);
  // Meld (both endpoints, as of 28 Oct 2026) answers HTTP 400 to a raw '|', so send it as %7C.
  // {{%patient.id}} (x-fhir-query) and ${client.patient.id} (fhirclient code on the SMART deck) -> pam-demo.
  // An expression that is already a full URL (pasted into a browser on a slide) is fetched as is.
  const q = entry.expression.replace('{{%patient.id}}', PATIENT_ID)
    .replace('${client.patient.id}', PATIENT_ID).replace(/\|/g, '%7C');
  const url = /^https?:\/\//.test(q) ? q : `${BASE}/${q}`;
  const res = await fetch(url, { headers: { Accept: 'application/fhir+json' } });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  const bundle = await res.json();
  queryCache.set(entry.id, bundle);
  return bundle;
}

// --- 1. the walkthrough form keeps the real module's linkIds and variable names -------------
const form = load('pathology-walkthrough.json');
const linkIds = new Set(collect(form.item, (n) => typeof n.linkId === 'string').map((n) => n.linkId));
const missing = REQUIRED_LINKIDS.filter((l) => !linkIds.has(l));
missing.length ? fail('form-linkids', `pathology-walkthrough.json lacks ${missing.join(', ')}`)
  : pass('form-linkids', `${REQUIRED_LINKIDS.length} linkIds present`);
const varNames = new Set(collect(form, (n) => n.url === 'http://hl7.org/fhir/StructureDefinition/variable')
  .map((n) => n.valueExpression?.name));
const missingVars = REQUIRED_VARIABLES.filter((v) => !varNames.has(v));
missingVars.length ? fail('form-variables', `pathology-walkthrough.json lacks ${missingVars.join(', ')}`)
  : pass('form-variables', REQUIRED_VARIABLES.join(', '));

// --- 2. expressions ---------------------------------------------------------------------------
const qr = load('sample-qr.json');
const extRepeats = collect(qr.item, (n) => n.linkId === 'pam-ext');
const entries = load('expressions.json');
const byId = new Map(entries.map((e) => [e.id, e]));

for (const e of entries) {
  try {
    if (e.inForm) {
      const strings = allStrings(load(e.inForm.file));
      if (!strings.some((s) => s === e.inForm.text)) {
        fail(e.id, `"${e.inForm.text}" not found verbatim in ${e.inForm.file}`);
        continue;
      }
    }
    let actual;
    if (e.context === 'query:open') {
      const bundle = await runQuery(e);
      actual = (bundle.entry || []).map((x) => `${x.resource.resourceType}/${x.resource.id}`);
    } else if (e.context.startsWith('bundle:')) {
      const q = byId.get(e.context.slice('bundle:'.length));
      if (!q) throw new Error(`unknown query ${e.context}`);
      const bundle = await runQuery(q);
      actual = stripMeta(fhirpath.evaluate(bundle, e.expression, {}, r4));
    } else if (e.context === 'qr:resource') {
      actual = fhirpath.evaluate(qr, e.expression, { resource: qr, rootResource: qr }, r4);
    } else if (e.context === 'qr:sample') {
      if (extRepeats.length !== 1) throw new Error(`sample-qr.json has ${extRepeats.length} pam-ext repeats, want 1`);
      actual = fhirpath.evaluate(
        extRepeats[0],
        { base: 'QuestionnaireResponse.item', expression: e.expression },
        { resource: qr, rootResource: qr },
        r4,
      );
    } else {
      throw new Error(`unknown context ${e.context}`);
    }
    isDeepStrictEqual(actual, e.expected) ? pass(e.id, show(actual))
      : fail(e.id, `expected ${show(e.expected)}\n       got      ${show(actual)}`);
  } catch (err) {
    fail(e.id, err.message);
  }
}

console.log(failures ? `\n${failures} failure(s)` : `\nall ${entries.length + 2} checks passed`);
process.exit(failures ? 1 : 0);
