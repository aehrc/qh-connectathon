// Population and template extraction with the libraries the Smart Forms renderer uses, so a pass
// here means the same behaviour in the playground.
//
// Library calls (checked against the installed versions):
// * @aehrc/sdc-populate 4.7.2 populateQuestionnaire({questionnaire, fetchResourceCallback(query, config),
//   fetchResourceRequestConfig: {sourceServerUrl}, patient, user?}) -> {populateSuccess, populateResult:
//   {populatedResponse, issues?}}. The callback returns the resource JSON (an axios-style {data} also works).
// * @aehrc/sdc-template-extract 1.0.16 inAppExtract(qr, questionnaire, null) -> {extractSuccess,
//   extractResult: {extractedBundle, issues} | OperationOutcome}.
//
// Both are loaded through require(): sdc-template-extract 1.0.16's ES-module build imports a directory
// (fhirpath/fhir-context/r4), which Node's ESM loader rejects.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { populateQuestionnaire } = require('@aehrc/sdc-populate');
const { inAppExtract, extractResultIsOperationOutcome } = require('@aehrc/sdc-template-extract');

const TEMPLATE_EXTRACT = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtract';

export async function runPopulate(q, { fetchFn, patient, user }) {
  const { populateSuccess, populateResult } = await populateQuestionnaire({
    questionnaire: structuredClone(q),
    fetchResourceCallback: (query) => fetchFn(query),
    fetchResourceRequestConfig: { sourceServerUrl: 'local' },
    patient,
    user,
  });
  return {
    ok: Boolean(populateSuccess && populateResult),
    response: populateResult?.populatedResponse ?? null,
    issues: populateResult?.issues?.issue ?? [],
  };
}

async function extract(qr, q) {
  const { extractSuccess, extractResult } = await inAppExtract(structuredClone(qr), structuredClone(q), null);
  if (!extractSuccess || extractResultIsOperationOutcome(extractResult)) {
    const issues = extractResultIsOperationOutcome(extractResult) ? extractResult.issue : extractResult?.issues?.issue;
    return { ok: false, resources: [], issues: issues ?? [] };
  }
  return { ok: true, resources: (extractResult.extractedBundle.entry || []).map((e) => e.resource), issues: [] };
}

// Which templates (by contained id) are attached to items or to the root.
function templateIds(q) {
  const ids = [];
  const fromExtensions = (exts) => {
    for (const e of exts || []) {
      if (e.url !== TEMPLATE_EXTRACT) continue;
      const ref = e.extension?.find((x) => x.url === 'template')?.valueReference?.reference;
      if (ref) ids.push(ref.replace(/^#/, ''));
    }
  };
  const walk = (items) => items?.forEach((i) => { fromExtensions(i.extension); walk(i.item); });
  fromExtensions(q.extension);
  walk(q.item);
  return ids;
}

// A copy of the form with only one template left attached.
function onlyTemplate(q, keep) {
  const copy = structuredClone(q);
  const strip = (node) => {
    if (!node.extension) return;
    node.extension = node.extension.filter((e) => e.url !== TEMPLATE_EXTRACT
      || e.extension?.find((x) => x.url === 'template')?.valueReference?.reference === `#${keep}`);
  };
  const walk = (items) => items?.forEach((i) => { strip(i); walk(i.item); });
  strip(copy);
  walk(copy.item);
  return copy;
}

// A template that yields nothing usually means its templateExtractValue paths match no answers
// (a wrong linkId, or a path written from the wrong item), so each one is extracted on its own.
export async function runExtract(qr, q) {
  const all = await extract(qr, q);
  const warnings = all.issues.map((i) => ({ code: 'extract-issue', message: i.diagnostics || i.details?.text || JSON.stringify(i) }));
  if (all.ok) {
    for (const id of templateIds(q)) {
      const one = await extract(qr, onlyTemplate(q, id));
      if (!one.ok || one.resources.length === 0) {
        warnings.push({ code: 'empty-template', path: id,
          message: `Template ${id} produced nothing: its paths may not match any answers.` });
      }
    }
  }
  return { ok: all.ok, resources: all.resources, warnings };
}
