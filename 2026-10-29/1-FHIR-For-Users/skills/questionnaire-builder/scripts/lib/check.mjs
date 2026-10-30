// One report over everything the toolkit can check: structure, sample data, expressions, and (with
// sample data or a server) population and extraction for each test patient. Lines start with
// PASS / FAIL / WARN / SKIP so a person can scan them; any FAIL fails the report.
import { lintQuestionnaire, lintBundle } from './lint.mjs';
import { collectExpressions, evaluateExpressions } from './expressions.mjs';
import { makeLocalFetch, makeServerFetch } from './localServer.mjs';
import { runPopulate, runExtract } from './sdc.mjs';

const SDC = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-';
const POPULATING = new Set(['x-fhir-query', 'initialExpression', 'itemPopulationContext']);

function launchContextNames(q) {
  return (q.extension || []).filter((e) => e.url === `${SDC}launchContext`)
    .map((e) => e.extension?.find((x) => x.url === 'name')?.valueCoding?.code).filter(Boolean);
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

function* answered(items) {
  for (const i of items || []) {
    if (i.answer?.length) yield `${i.linkId} = ${i.answer.map(show).join(', ')}`;
    yield* answered(i.item);
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

export async function checkAll({ questionnaire: q, sampleBundle, server, patientId, userId, prefix }) {
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
  const user = resources.find((r) => r.resourceType === 'Practitioner' && (!userId || r.id === userId));

  // Expressions: evaluated once with placeholder launch contexts, to catch syntax and scoping mistakes.
  const env = Object.fromEntries(launchContextNames(q).map((n) => [n, {}]));
  Object.assign(env, { patient: patients[0] ?? {}, ...(user ? { user } : {}) });
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
  for (const patient of patients) {
    const r = await runPopulate(q, { fetchFn, patient, user });
    if (!r.ok) {
      pop.push(`FAIL ${patient.id}: population failed${r.issues.length ? `: ${r.issues.map((i) => i.diagnostics).join('; ')}` : ''}`);
      continue;
    }
    const filled = [...answered(r.response.item)];
    pop.push(`PASS ${patient.id}: ${filled.length ? filled.join(', ') : 'no items filled'}`);
    for (const i of r.issues) pop.push(`WARN ${patient.id}: ${i.diagnostics ?? i.details?.text}`);

    if (extracts) {
      const qr = { ...r.response, subject: r.response.subject ?? { reference: `Patient/${patient.id}` } };
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
