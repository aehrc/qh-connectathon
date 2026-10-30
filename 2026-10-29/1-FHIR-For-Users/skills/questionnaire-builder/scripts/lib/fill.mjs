// Stand in for the person filling in a prepopulated form, so extraction can be checked: add typed-in
// answers, work out calculated items, and drop items the form would hide (enableWhen /
// enableWhenExpression), as the renderer does.
import fhirpath from 'fhirpath';
import r4 from 'fhirpath/fhir-context/r4/index.js';

const SDC = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-';
const VALUE_KEY = { decimal: 'valueDecimal', integer: 'valueInteger', boolean: 'valueBoolean', string: 'valueString',
  text: 'valueString', date: 'valueDate', dateTime: 'valueDateTime', choice: 'valueCoding', coding: 'valueCoding' };

const expressionOf = (item, kind) => item.extension?.find((e) => e.url === `${SDC}${kind}`)?.valueExpression?.expression;
const run = (expression, env) => fhirpath.evaluate(env.resource, expression, env, r4);

function* qItems(items) {
  for (const i of items || []) {
    yield i;
    yield* qItems(i.item);
  }
}

function findAnswer(items, linkId) {
  for (const i of items || []) {
    if (i.linkId === linkId) return i.answer;
    const a = findAnswer(i.item, linkId);
    if (a) return a;
  }
  return undefined;
}

// Rebuild the response following the form's structure, so new answers land in the right groups.
function rebuild(qItemList, rItems, answerFor) {
  const out = [];
  for (const qi of qItemList || []) {
    const existing = (rItems || []).find((r) => r.linkId === qi.linkId);
    const children = rebuild(qi.item, existing?.item, answerFor);
    const answer = answerFor(qi) ?? existing?.answer;
    if (!answer?.length && !children.length) continue;
    const item = { ...(existing || { linkId: qi.linkId, text: qi.text }) };
    if (answer?.length) item.answer = answer;
    else delete item.answer;
    if (children.length) item.item = children;
    else delete item.item;
    out.push(item);
  }
  return out;
}

export function withAnswers(response, q, answers) {
  return { ...response, item: rebuild(q.item, response.item, (qi) => answers[qi.linkId]) };
}

const valueOf = (answer) => {
  const key = Object.keys(answer || {}).find((k) => k.startsWith('value'));
  return key ? answer[key] : undefined;
};

function compare(actual, operator, expected) {
  if (actual && typeof actual === 'object') {
    const same = actual.code === expected?.code && (!expected?.system || actual.system === expected.system);
    return operator === '!=' ? !same : operator === '=' && same;
  }
  switch (operator) {
    case '=': return actual === expected;
    case '!=': return actual !== expected;
    case '>': return actual > expected;
    case '<': return actual < expected;
    case '>=': return actual >= expected;
    case '<=': return actual <= expected;
    default: return false;
  }
}

function enabled(qi, response, env) {
  const expr = expressionOf(qi, 'enableWhenExpression');
  if (expr) {
    try {
      return run(expr, { ...env, resource: response })[0] === true;
    } catch {
      return true; // a broken expression is reported elsewhere; don't hide the item because of it
    }
  }
  if (!qi.enableWhen?.length) return true;
  const results = qi.enableWhen.map((ew) => {
    const answers = findAnswer(response.item, ew.question) || [];
    if (ew.operator === 'exists') return (answers.length > 0) === ew.answerBoolean;
    const expected = valueOf(Object.fromEntries(Object.entries(ew).filter(([k]) => k.startsWith('answer'))
      .map(([k, v]) => [k.replace(/^answer/, 'value'), v])));
    return answers.some((a) => compare(valueOf(a), ew.operator, expected));
  });
  return qi.enableBehavior === 'any' ? results.some(Boolean) : results.every(Boolean);
}

function calculate(response, q, env) {
  const values = {};
  for (const qi of qItems(q.item)) {
    const expr = expressionOf(qi, 'calculatedExpression');
    if (!expr) continue;
    try {
      const [v] = run(expr, { ...env, resource: response });
      if (v !== undefined && v !== null) values[qi.linkId] = [{ [VALUE_KEY[qi.type] ?? 'valueString']: v }];
    } catch {
      // reported by the expression check
    }
  }
  return values;
}

function prune(response, q, env) {
  const disabled = new Set([...qItems(q.item)].filter((qi) => !enabled(qi, response, env)).map((qi) => qi.linkId));
  const keep = (items) => (items || []).filter((i) => !disabled.has(i.linkId))
    .map((i) => (i.item ? { ...i, item: keep(i.item) } : i));
  return { ...response, item: keep(response.item) };
}

// Returns the filled-in response and the linkIds whose values were calculated.
export function fillIn(response, q, { answers = {}, env = {} } = {}) {
  let r = withAnswers(response, q, answers);
  let calculated = {};
  for (let pass = 0; pass < 3; pass++) {
    calculated = calculate(r, q, env);
    r = prune(withAnswers(r, q, calculated), q, env);
  }
  return { response: r, calculated: Object.keys(calculated) };
}
