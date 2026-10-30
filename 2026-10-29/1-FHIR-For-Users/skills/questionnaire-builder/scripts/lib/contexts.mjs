// Which launch contexts a form declares, and which sample-data resources stand in for them for one
// test patient. Shared by check.mjs and preview.mjs so both fill the form in the same way.
const SDC = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-';

// [{name, types}] for each launch context the form declares.
export function launchContexts(q) {
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
export function contextsFor(q, resources, patient, userId) {
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
