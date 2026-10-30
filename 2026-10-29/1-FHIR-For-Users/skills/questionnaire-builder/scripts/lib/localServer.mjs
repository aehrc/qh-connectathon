// Answer FHIR reads and searches from a sample Bundle, offline, so population can be checked with
// no server. Only the search parameters prepopulation queries commonly use are understood; any other
// parameter is ignored and recorded in fetch.unsupported, so a report can say the result may differ
// on a real server.

const DATE_FIELDS = ['effectiveDateTime', 'effectivePeriod.start', 'onsetDateTime', 'authoredOn', 'recordedDate',
  'issued', 'occurrenceDateTime', 'performedDateTime', 'date'];
const IGNORED = new Set(['_format', '_pretty', '_summary', '_elements']);

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const dateOf = (r) => DATE_FIELDS.map((f) => get(r, f)).find(Boolean) || '';
const refMatches = (ref, value) => ref === value || ref === `Patient/${value}` || ref?.endsWith(`/${value}`);

// "system|code", "code" or "|code" against a list of Codings.
function tokenMatches(codings, token) {
  const [system, code] = token.includes('|') ? token.split('|') : [null, token];
  return (codings || []).some((c) => c.code === code && (system === null || system === '' || c.system === system));
}

const codingsOf = (concepts) => [concepts].flat().filter(Boolean).flatMap((cc) => cc.coding || []);

const MATCHERS = {
  _id: (r, v) => v.split(',').includes(r.id),
  patient: (r, v) => refMatches(r.subject?.reference ?? r.patient?.reference, v),
  subject: (r, v) => refMatches(r.subject?.reference, v),
  code: (r, v) => v.split(',').some((t) => tokenMatches(codingsOf(r.code), t)),
  category: (r, v) => v.split(',').some((t) => tokenMatches(codingsOf(r.category), t)),
  'clinical-status': (r, v) => v.split(',').some((t) => tokenMatches(codingsOf(r.clinicalStatus), t)),
  status: (r, v) => v.split(',').includes(r.status),
};

function parse(query) {
  let q = query.trim();
  if (/^https?:\/\//.test(q)) {
    const u = new URL(q);
    const segs = u.pathname.split('/').filter(Boolean);
    const at = segs.findIndex((s) => /^[A-Z]/.test(s));
    q = segs.slice(at).join('/') + u.search;
  }
  q = q.replace(/^\//, '');
  const [path, search = ''] = q.split('?');
  // Split on & before decoding, so encoded characters stay inside their value.
  const params = search ? search.split('&').filter(Boolean).map((kv) => {
    const i = kv.indexOf('=');
    return [decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))];
  }) : [];
  return { path, params };
}

export function makeLocalFetch(bundle) {
  const resources = (bundle.entry || []).map((e) => e.resource).filter(Boolean);
  const unsupported = new Set();

  const fetchFn = async (query) => {
    const { path, params } = parse(query);
    const [type, id] = path.split('/');
    if (id) {
      const found = resources.find((r) => r.resourceType === type && r.id === id);
      if (!found) throw new Error(`Not in the sample data: ${type}/${id}`);
      return found;
    }
    let hits = resources.filter((r) => r.resourceType === type);
    let sort = null;
    let count = null;
    for (const [name, value] of params) {
      if (name === '_sort') sort = value;
      else if (name === '_count') count = Number(value);
      else if (MATCHERS[name]) hits = hits.filter((r) => MATCHERS[name](r, value));
      else if (!IGNORED.has(name)) unsupported.add(name);
    }
    if (sort === 'date' || sort === '-date') {
      hits = [...hits].sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
      if (sort === '-date') hits.reverse();
    }
    if (count !== null) hits = hits.slice(0, count);
    return {
      resourceType: 'Bundle', type: 'searchset', total: hits.length,
      entry: hits.map((r) => ({ fullUrl: `${r.resourceType}/${r.id}`, resource: r })),
    };
  };
  Object.defineProperty(fetchFn, 'unsupported', { get: () => [...unsupported] });
  return fetchFn;
}

// The same interface against a real FHIR server.
export function makeServerFetch(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  return async (query) => {
    const url = /^https?:\/\//.test(query) ? query : `${base}/${query.replace(/^\//, '')}`;
    const withFormat = url.replace(/\|/g, '%7C') + (url.includes('?') ? '&' : '?') + '_format=json';
    const res = await fetch(withFormat, { headers: { Accept: 'application/fhir+json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${withFormat}`);
    return res.json();
  };
}
