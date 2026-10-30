// Structural checks on a Questionnaire and on a sample-data Bundle.
// Each returns {errors, warnings}; an issue is {code, message, linkId?, path?}.

// The connectathon's shared test patients: other people use them, so sample data must never touch them.
const SHARED_PATIENT = /^(Patient\/)?pam-(\d{3}|demo)$/;

function* walkItems(items, depth = 0) {
  for (const item of items || []) {
    yield item;
    yield* walkItems(item.item, depth + 1);
  }
}

// Every {language, expression} in that language anywhere in the resource.
function* expressionsIn(node, language) {
  if (Array.isArray(node)) {
    for (const n of node) yield* expressionsIn(n, language);
  } else if (node && typeof node === 'object') {
    if (node.language === language && typeof node.expression === 'string') yield node.expression;
    for (const v of Object.values(node)) yield* expressionsIn(v, language);
  }
}

// Free-text items on these topics should usually be coded (a heuristic: it only warns).
const CLINICAL_TOPIC = /\b(medications?|medicines?|drugs?|conditions?|diagnos[ie]s|problems?|procedures?|operations?|surger(y|ies)|allerg(y|ies)|reactions?|pathology)\b/i;

// How many codes or names an expression compares against: `code = '…'`, `code in ('…' | …)`, `contains('…')`.
function listedLiterals(expression) {
  const equals = expression.match(/\bcode\s*(=|~)\s*'[^']*'/g)?.length ?? 0;
  const inList = [...expression.matchAll(/\bin\s*\(([^)]*)\)/g)].reduce((n, m) => n + (m[1].match(/'[^']*'/g)?.length ?? 0), 0);
  const contains = expression.match(/\bcontains\(\s*'[^']*'\s*\)/g)?.length ?? 0;
  return Math.max(equals, inList, contains);
}

// More questions than this, in sections, is too long for one scrolling page.
const LONG_FORM = 15;

const hasItemControl = (item, code) => (item.extension || []).some((e) =>
  e.url === 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl'
  && e.valueCodeableConcept?.coding?.some((c) => c.code === code));

function* references(node) {
  if (Array.isArray(node)) {
    for (const n of node) yield* references(n);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'reference' && typeof v === 'string') yield v;
      else yield* references(v);
    }
  }
}

export function lintQuestionnaire(q) {
  const errors = [];
  const warnings = [];
  if (q?.resourceType !== 'Questionnaire') {
    errors.push({ code: 'not-questionnaire', message: `Expected a Questionnaire, got ${q?.resourceType ?? 'nothing'}.` });
    return { errors, warnings };
  }

  const items = [...walkItems(q.item)];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.linkId)) {
      errors.push({ code: 'duplicate-linkid', linkId: item.linkId, message: `linkId "${item.linkId}" is used more than once.` });
    }
    seen.add(item.linkId);
  }
  for (const item of items) {
    for (const ew of item.enableWhen || []) {
      if (!seen.has(ew.question)) {
        errors.push({ code: 'enablewhen-target', linkId: item.linkId,
          message: `"${item.linkId}" depends on "${ew.question}", which isn't in the form.` });
      }
    }
    if ((item.type === 'choice' || item.type === 'open-choice' || item.type === 'coding')
        && !item.answerOption && !item.answerValueSet
        && !(item.extension || []).some((e) => e.url?.endsWith('sdc-questionnaire-answerExpression'))) {
      warnings.push({ code: 'choice-no-answers', linkId: item.linkId,
        message: `"${item.linkId}" is a choice with no answers to choose from.` });
    }
  }

  for (const item of items) {
    if ((item.type === 'string' || item.type === 'text') && CLINICAL_TOPIC.test(item.text || '')) {
      warnings.push({ code: 'free-text-clinical', linkId: item.linkId,
        message: `"${item.linkId}" ("${item.text}") is free text; medicines, conditions, procedures, allergies and pathology should be coded answers from a value set.` });
    }
  }

  const questionCount = items.filter((i) => i.type !== 'group' && i.type !== 'display').length;
  const sectionCount = items.filter((i) => i.type === 'group').length;
  const navigable = items.some((i) => hasItemControl(i, 'tab-container') || hasItemControl(i, 'page'));
  if (questionCount > LONG_FORM && sectionCount >= 2 && !navigable) {
    warnings.push({ code: 'long-no-tabs',
      message: `${questionCount} questions in ${sectionCount} sections on one long page; put the sections in tabs (a group with itemControl tab-container).` });
  }

  for (const expression of expressionsIn(q, 'text/fhirpath')) {
    if (listedLiterals(expression) >= 3) {
      warnings.push({ code: 'code-list', message: `"${expression}" tests a list of codes or names; test membership of a value set (memberOf) instead.` });
    }
  }

  for (const query of expressionsIn(q, 'application/x-fhir-query')) {
    if (query.includes('|')) {
      warnings.push({ code: 'raw-pipe', message: `Query "${query}" has a raw "|": some servers reject it (HTTP 400). Write %7C.` });
    }
  }

  if (q.meta?.profile?.length) {
    warnings.push({ code: 'meta-profile', path: 'Questionnaire', message: 'The Questionnaire declares meta.profile; some servers (Meld) reject it.' });
  }
  for (const c of q.contained || []) {
    if (c.meta?.profile?.length) {
      warnings.push({ code: 'meta-profile', path: `contained/${c.id}`,
        message: `Template ${c.id} declares meta.profile: extracted resources would carry it, and some servers (Meld) reject it.` });
    }
  }
  return { errors, warnings };
}

export function lintBundle(bundle, { prefix }) {
  const errors = [];
  const warnings = [];
  if (bundle?.resourceType !== 'Bundle' || bundle.type !== 'transaction') {
    errors.push({ code: 'bundle-shape', message: 'Sample data must be a transaction Bundle.' });
    return { errors, warnings };
  }
  for (const [i, entry] of (bundle.entry || []).entries()) {
    const r = entry.resource || {};
    const path = `entry[${i}]`;
    if (entry.request?.method !== 'PUT') {
      errors.push({ code: 'bundle-shape', path, message: `${path} must use PUT so it can be reloaded and cleaned up by id.` });
    }
    if (r.resourceType === 'Patient' && SHARED_PATIENT.test(r.id || '')) {
      errors.push({ code: 'shared-patient', path, message: `${path} is the shared patient ${r.id}: other people use it.` });
    } else if (!(r.id || '').startsWith(prefix)) {
      errors.push({ code: 'id-prefix', path, message: `${path} (${r.resourceType}/${r.id}) doesn't start with "${prefix}".` });
    }
    for (const ref of references(r)) {
      if (SHARED_PATIENT.test(ref)) {
        errors.push({ code: 'shared-patient', path, message: `${path} refers to the shared patient ${ref}: other people use it.` });
      }
    }
  }
  return { errors, warnings };
}
