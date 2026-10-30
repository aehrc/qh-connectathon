// One report over everything the toolkit can check: structure, sample data, expressions, and (with
// sample data or a server) population and extraction for each test patient. Lines start with
// PASS / FAIL / WARN / SKIP so a person can scan them; any FAIL fails the report.
import { lintQuestionnaire, lintBundle } from './lint.mjs';
import { collectExpressions, evaluateExpressions } from './expressions.mjs';
import { makeLocalFetch, makeServerFetch } from './localServer.mjs';
import { runPopulate, runExtract } from './sdc.mjs';
import { fillIn, isEnabled } from './fill.mjs';

const SDC = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-';
const POPULATING = new Set(['x-fhir-query', 'initialExpression', 'itemPopulationContext']);

// [{name, types}] for each launch context the form declares.
function launchContexts(q) {
  return (q.extension || []).filter((e) => e.url === `${SDC}launchContext`).map((e) => ({
    name: e.extension?.find((x) => x.url === 'name')?.valueCoding?.code,
    types: (e.extension || []).filter((x) => x.url === 'type').map((x) => x.valueCode),
  })).filter((c) => c.name);
}

// The contexts sdc-populate can be given, besides the patient.
const SUPPLIED = ['user', 'encounter'];
const refersTo = (r, patient) => [r.patient, r.subject, r.beneficiary].some((ref) => ref?.reference === `Patient/${patient.id}`);

// Pick each declared context for this patient from the sample data: the declared type, preferring
// one linked to the patient (a parent's RelatedPerson, the patient's Encounter). A Patient-typed
// user is the patient themselves. Without a declared user, any Practitioner (the old default).
function contextsFor(q, resources, patient, userId) {
  const declared = launchContexts(q);
  const out = {};
  const missing = [];
  for (const { name, types } of declared) {
    if (name === 'patient') continue;
    if (!SUPPLIED.includes(name)) {
      missing.push({ name, types, reason: "the offline check can only supply patient, user and encounter" });
      continue;
    }
    if (name === 'user' && types.includes('Patient') && (!userId || userId === patient.id)) {
      out.user = patient;
      continue;
    }
    const candidates = resources.filter((r) => types.includes(r.resourceType) && r.resourceType !== 'Patient'
      && (name !== 'user' || !userId || r.id === userId));
    const pick = candidates.find((r) => refersTo(r, patient)) ?? candidates[0];
    if (pick) out[name] = pick;
    else missing.push({ name, types, reason: `no ${types.join(' or ')} in the sample data` });
  }
  if (!declared.some((c) => c.name === 'user')) {
    const practitioner = resources.find((r) => r.resourceType === 'Practitioner' && (!userId || r.id === userId));
    if (practitioner) out.user = practitioner;
  }
  return { contexts: out, missing };
}

// Display items whose visibility depends on a rule: "under-5 shown", "under-5 hidden".
function displayStates(q, response, env) {
  const out = [];
  const walk = (items) => {
    for (const qi of items || []) {
      const ruled = qi.enableWhen?.length || qi.extension?.some((e) => e.url === `${SDC}enableWhenExpression`);
      if (qi.type === 'display' && ruled) out.push(`${qi.linkId} ${isEnabled(qi, response, env) ? 'shown' : 'hidden'}`);
      walk(qi.item);
    }
  };
  walk(q.item);
  return out;
}

const issueLines = ({ errors, warnings }) => [
  ...errors.map((i) => `FAIL ${i.message}`),
  ...warnings.map((i) => `WARN ${i.message}`),
];

function show(answer) {
  if (!answer) return '(empty)';
  const [key, v] = Object.entries(answer).find(([k]) => k.startsWith('value')) || [];
  if (!key) return '(empty)';
  if (key === 'valueCoding') return v.display ? `${v.code} (${v.display})` : v.code;
  if (key === 'valueQuantity') return `${v.value} ${v.unit ?? v.code ?? ''}`.trim();
  if (key === 'valueReference') return v.reference ?? v.display;
  return String(v);
}

function* answered(items, notes = {}) {
  for (const i of items || []) {
    if (i.answer?.length) yield `${i.linkId} = ${i.answer.map(show).join(', ')}${notes[i.linkId] ? ` (${notes[i.linkId]})` : ''}`;
    yield* answered(i.item, notes);
  }
}

function describe(r) {
  const code = r.code?.coding?.[0]?.code ?? r.code?.text;
  return code ? `${r.resourceType} (${code})` : r.resourceType;
}

// Without --prefix, take the sample data's own prefix from its first Patient: "js-f1" -> "js-".
function inferPrefix(bundle) {
  const id = bundle.entry?.find((e) => e.resource?.resourceType === 'Patient')?.resource.id ?? '';
  return id.includes('-') ? id.slice(0, id.indexOf('-') + 1) : id;
}

export async function checkAll({ questionnaire: q, sampleBundle, server, patientId, userId, prefix, answers }) {
  const sections = [];
  const add = (name, lines) => sections.push({ name, pass: !lines.some((l) => l.startsWith('FAIL')), lines });

  const structure = issueLines(lintQuestionnaire(q));
  add('Form structure', structure.length ? structure : ['PASS no structural problems']);
  if (q?.resourceType !== 'Questionnaire') return { pass: false, sections };

  if (sampleBundle) {
    const p = prefix ?? inferPrefix(sampleBundle);
    const lines = issueLines(lintBundle(sampleBundle, { prefix: p }));
    add('Sample data', lines.length ? lines : [`PASS ${sampleBundle.entry?.length ?? 0} resources, all under "${p}"`]);
  }

  const resources = (sampleBundle?.entry || []).map((e) => e.resource);
  const patients = resources.filter((r) => r.resourceType === 'Patient' && (!patientId || r.id === patientId));

  // Expressions: evaluated once with placeholder launch contexts, to catch syntax and scoping mistakes.
  const env = Object.fromEntries(launchContexts(q).map((c) => [c.name, {}]));
  Object.assign(env, { patient: patients[0] ?? {}, ...(patients[0] ? contextsFor(q, resources, patients[0], userId).contexts : {}) });
  const results = evaluateExpressions(q, { env });
  const failed = results.filter((r) => !r.ok);
  add('Expressions', results.length === 0 ? ['PASS no expressions yet']
    : [...failed.map((r) => `FAIL ${r.error}`), `${failed.length ? 'INFO' : 'PASS'} ${results.length - failed.length} of ${results.length} expressions evaluate`]);

  const exprs = collectExpressions(q);
  const populates = exprs.some((e) => POPULATING.has(e.kind));
  const extracts = exprs.some((e) => e.kind.startsWith('templateExtract'));
  if (!populates && !extracts) {
    add('Population and extraction', ['PASS nothing to populate or extract yet']);
    return { pass: sections.every((s) => s.pass), sections };
  }
  if (!sampleBundle && !server) {
    add('Population and extraction', ['SKIP no sample data or server given (use --data or --server)']);
    return { pass: sections.every((s) => s.pass), sections };
  }

  const fetchFn = server ? makeServerFetch(server) : makeLocalFetch(sampleBundle);
  const pop = [];
  const ext = [];
  if (!patients.length) pop.push('FAIL no Patient in the sample data to populate for');
  const reported = new Set();
  for (const patient of patients) {
    const { contexts, missing } = contextsFor(q, resources, patient, userId);
    for (const m of missing) {
      if (reported.has(m.name)) continue;
      reported.add(m.name);
      pop.push(`WARN launch context "${m.name}" (${m.types.join(', ')}): ${m.reason}, so anything that uses %${m.name} wasn't checked`);
    }
    const r = await runPopulate(q, { fetchFn, patient, ...contexts });
    if (!r.ok) {
      pop.push(`FAIL ${patient.id}: population failed${r.issues.length ? `: ${r.issues.map((i) => i.diagnostics).join('; ')}` : ''}`);
      continue;
    }
    const env = { ...r.context, patient, ...contexts };
    const filled = fillIn(r.response, q, { answers: answers ?? {}, env });
    const notes = Object.fromEntries([
      ...Object.keys(answers ?? {}).map((k) => [k, 'typed in']),
      ...filled.calculated.map((k) => [k, 'calculated']),
    ]);
    const shown = [...answered(filled.response.item, notes), ...displayStates(q, filled.response, env)];
    pop.push(`PASS ${patient.id}: ${shown.length ? shown.join(', ') : 'no items filled'}`);
    // A missing context is reported once above; don't repeat it as undefined-variable noise per patient.
    const missingNames = missing.map((m) => m.name);
    for (const i of r.issues) {
      const message = i.diagnostics ?? i.details?.text ?? '';
      if (missingNames.some((n) => message.includes(`undefined environment variable: ${n}`))) continue;
      pop.push(`WARN ${patient.id}: ${message}`);
    }

    if (extracts) {
      const qr = { ...filled.response, subject: filled.response.subject ?? { reference: `Patient/${patient.id}` } };
      const x = await runExtract(qr, q);
      ext.push(x.ok ? `PASS ${patient.id}: ${x.resources.length ? x.resources.map(describe).join(', ') : 'no resources'}`
        : `FAIL ${patient.id}: extraction failed`);
      for (const w of x.warnings) ext.push(`WARN ${patient.id}: ${w.message}`);
    }
  }
  for (const name of fetchFn.unsupported ?? []) {
    pop.push(`WARN search parameter "${name}" isn't understood offline and was ignored; a real server may return different results`);
  }
  add('Population', pop);
  if (extracts) add('Extraction', ext);
  return { pass: sections.every((s) => s.pass), sections };
}
