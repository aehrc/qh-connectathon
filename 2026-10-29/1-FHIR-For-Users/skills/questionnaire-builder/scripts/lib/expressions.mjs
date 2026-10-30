// Find every FHIRPath expression in a Questionnaire and evaluate it with fhirpath.js (the engine
// Smart Forms uses), with variables scoped the way SDC scopes them: root variables are visible
// everywhere, an item's variables to that item and its descendants.
//
// x-fhir-query expressions aren't run here (that needs data: see sdc.mjs); only their {{ }} parts
// are evaluated, giving the query that would be sent. A query variable's value comes from env
// (e.g. env.ObsHb = the search Bundle) or is empty. Template paths (templateExtractValue /
// templateExtractContext) are only syntax-checked: they need a QuestionnaireResponse to run.
import fhirpath from 'fhirpath';
import r4 from 'fhirpath/fhir-context/r4/index.js';

const SDC = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-';
// SDC variables use the core FHIR extension, not an sdc-questionnaire-* one.
const VARIABLE = 'http://hl7.org/fhir/StructureDefinition/variable';
const ITEM_KINDS = ['initialExpression', 'calculatedExpression', 'enableWhenExpression', 'answerExpression',
  'itemPopulationContext'];
const TEMPLATE_KINDS = ['templateExtractValue', 'templateExtractContext'];
const QUERY = 'application/x-fhir-query';

function itemExpressions(extensions, linkId) {
  const out = [];
  for (const e of extensions || []) {
    if (e.url === VARIABLE) {
      const { name, language, expression } = e.valueExpression;
      out.push({ kind: language === QUERY ? 'x-fhir-query' : 'variable', linkId, name, language, expression });
    }
  }
  for (const e of extensions || []) {
    const kind = ITEM_KINDS.find((k) => e.url === `${SDC}${k}`);
    if (kind) {
      const { language, expression } = e.valueExpression;
      out.push({ kind, linkId, name: null, language, expression });
    }
  }
  return out;
}

function* templatePaths(node) {
  if (Array.isArray(node)) {
    for (const n of node) yield* templatePaths(n);
  } else if (node && typeof node === 'object') {
    for (const e of Array.isArray(node.extension) ? node.extension : []) {
      const kind = TEMPLATE_KINDS.find((k) => e.url === `${SDC}${k}`);
      if (kind) yield { kind, linkId: null, name: null, language: 'text/fhirpath', expression: e.valueString };
    }
    for (const v of Object.values(node)) yield* templatePaths(v);
  }
}

// Expressions in evaluation order, each tagged with the item it belongs to.
function* walk(items, parentLinkIds = []) {
  for (const item of items || []) {
    const scope = [...parentLinkIds, item.linkId];
    yield { scope, exprs: itemExpressions(item.extension, item.linkId) };
    yield* walk(item.item, scope);
  }
}

export function collectExpressions(q) {
  const out = itemExpressions(q.extension, null);
  for (const { exprs } of walk(q.item)) out.push(...exprs);
  out.push(...templatePaths(q.contained || []));
  return out;
}

const run = (expression, context, env) => fhirpath.evaluate(context, expression, env, r4);

function substitute(query, context, env) {
  return query.replace(/\{\{(.+?)\}\}/g, (_, expr) => run(expr, context, env).join(','));
}

function evaluateOne(expr, context, env) {
  try {
    if (expr.kind === 'x-fhir-query') return { expr, ok: true, value: [substitute(expr.expression, context, env)] };
    return { expr, ok: true, value: run(expr.expression, context, env) };
  } catch (e) {
    const where = expr.linkId ? `item "${expr.linkId}"` : (expr.name ? `variable "${expr.name}"` : 'the form');
    return { expr, ok: false, error: `${where}: ${e.message}` };
  }
}

// Evaluate the expressions of one scope, adding its variables to env (a copy) for its descendants.
function evaluateScope(exprs, context, env, results) {
  const scoped = { ...env };
  for (const expr of exprs) {
    const r = evaluateOne(expr, context, scoped);
    results.push(r);
    if (expr.kind === 'variable') scoped[expr.name] = r.ok ? r.value : [];
    if (expr.kind === 'x-fhir-query' && !(expr.name in scoped)) scoped[expr.name] = [];
  }
  return scoped;
}

export function evaluateExpressions(q, { context, env = {} } = {}) {
  const resource = context ?? {};
  const results = [];
  const rootEnv = evaluateScope(itemExpressions(q.extension, null), resource, { resource, ...env }, results);

  const visit = (items, scopeEnv) => {
    for (const item of items || []) {
      const itemEnv = evaluateScope(itemExpressions(item.extension, item.linkId), resource, scopeEnv, results);
      visit(item.item, itemEnv);
    }
  };
  visit(q.item, rootEnv);

  for (const expr of templatePaths(q.contained || [])) {
    try {
      fhirpath.compile(expr.expression, r4);
      results.push({ expr, ok: true, value: null });
    } catch (e) {
      results.push({ expr, ok: false, error: `template path "${expr.expression}": ${e.message}` });
    }
  }
  return results;
}
