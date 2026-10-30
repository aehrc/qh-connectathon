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

// Which templates (by contained id) are attached, and to which item (null: the root).
function attachments(q) {
  const out = [];
  const fromExtensions = (exts, linkId) => {
    for (const e of exts || []) {
      if (e.url !== TEMPLATE_EXTRACT) continue;
      const ref = e.extension?.find((x) => x.url === 'template')?.valueReference?.reference;
      if (ref) out.push({ id: ref.replace(/^#/, ''), linkId });
    }
  };
  const walk = (items) => items?.forEach((i) => { fromExtensions(i.extension, i.linkId); walk(i.item); });
  fromExtensions(q.extension, null);
  walk(q.item);
  return out;
}

function answered(items, linkId) {
  for (const i of items || []) {
    if (linkId === null || i.linkId === linkId) {
      const has = (it) => it.answer?.length || it.item?.some(has) || it.answer?.some((a) => a.item?.some(has));
      if (has(i)) return true;
    }
    if (answered(i.item, linkId) || i.answer?.some((a) => answered(a.item, linkId))) return true;
  }
  return false;
}

// The template with its templateExtract* instructions taken out: what it gives if no value is filled in.
function fixedPart(node) {
  if (Array.isArray(node)) return node.map(fixedPart).filter((v) => v !== undefined);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'id' || k === 'extension') continue;
    const kept = fixedPart(v);
    const empty = kept === undefined || (typeof kept === 'object' && Object.keys(kept).length === 0);
    if (!empty) out[k] = kept;
  }
  return Object.keys(out).length ? out : undefined;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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

// A template whose item was answered but which filled in none of its values usually has
// templateExtractValue paths that match no answers (a wrong linkId, or a path written from the wrong
// item). Each answered template is extracted on its own to find those. Templates on unanswered items
// are skipped: producing nothing there is normal (e.g. a Condition only written when "yes" is ticked).
export async function runExtract(qr, q) {
  const all = await extract(qr, q);
  const warnings = all.issues.map((i) => ({ code: 'extract-issue', message: i.diagnostics || i.details?.text || JSON.stringify(i) }));
  if (all.ok) {
    for (const { id, linkId } of attachments(q)) {
      if (!answered(qr.item, linkId)) continue;
      const template = q.contained?.find((c) => c.id === id);
      const one = await extract(qr, onlyTemplate(q, id));
      const filled = one.resources.some((r) => !same(fixedPart(r), fixedPart(template)));
      if (!one.ok || !filled) {
        warnings.push({ code: 'empty-template', path: id,
          message: `Template ${id} filled in none of its values${linkId ? ` from "${linkId}"` : ''}: its paths may not match any answers.` });
      }
    }
  }
  return { ok: all.ok, resources: all.resources, warnings };
}
