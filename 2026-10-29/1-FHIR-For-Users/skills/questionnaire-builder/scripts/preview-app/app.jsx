// The browser side of scripts/preview.mjs: the real Smart Forms renderer, showing the form
// prepopulated for a test patient, with what it would write back. The server does the
// prepopulation and extraction (the same code as check.mjs); this page only renders.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  BaseRenderer, RendererThemeProvider, buildForm, getResponse, useRendererQueryClient,
} from '@aehrc/smart-forms-renderer';

const TX = 'https://tx.ontoserver.csiro.au/fhir';
const json = async (r) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
};
const remembered = () => new URLSearchParams(location.search).get('patient');

function summary(r) {
  const coding = r.code?.coding?.[0] ?? r.medicationCodeableConcept?.coding?.[0];
  const what = coding?.display ?? coding?.code ?? r.code?.text ?? '';
  const value = r.valueQuantity ? `${r.valueQuantity.value} ${r.valueQuantity.unit ?? ''}`
    : r.valueCodeableConcept?.coding?.[0]?.display ?? r.valueString ?? r.valueBoolean ?? r.valueInteger ?? '';
  const when = r.effectiveDateTime ?? r.onsetDateTime ?? r.recordedDate ?? r.authoredOn ?? r.occurrenceDateTime ?? '';
  return [what, value !== '' ? `= ${value}` : '', when ? `(${when})` : ''].filter(Boolean).join(' ');
}

function WrittenBack({ result }) {
  if (!result) return null;
  if (result.error) return <p className="err">Couldn't extract: {result.error}</p>;
  return (
    <div className="written">
      <h2>What would be written back</h2>
      {result.resources.length === 0 ? <p>Nothing, with these answers.</p> : (
        <ul>
          {result.resources.map((r, i) => (
            <li key={i}>
              <details>
                <summary><b>{r.resourceType}</b> {summary(r)}</summary>
                <pre>{JSON.stringify(r, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
      {result.warnings?.map((w, i) => <p key={i} className="warn">{w.message}</p>)}
    </div>
  );
}

// The form, built with the patient's launch context (and the prepopulation searches' results), so
// calculations and show/hide rules see %patient, %user and the fetched data as in a real launch.
function Form({ form }) {
  const [ready, setReady] = useState(false);
  const queryClient = useRendererQueryClient();
  useEffect(() => {
    setReady(false);
    buildForm({
      questionnaire: form.questionnaire, questionnaireResponse: form.response,
      terminologyServerUrl: TX, additionalContext: form.context,
    }).then(() => setReady(true));
  }, [form.key]);
  if (!ready) return <p>Building the form…</p>;
  return (
    <RendererThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BaseRenderer />
      </QueryClientProvider>
    </RendererThemeProvider>
  );
}

function App() {
  const [state, setState] = useState(null);
  const [patient, setPatient] = useState(remembered());
  const [form, setForm] = useState(null); // {key, questionnaire, response, context, issues}
  const [written, setWritten] = useState(null);
  const [error, setError] = useState(null);

  const load = async (id, withAnswers = false) => {
    setWritten(null);
    setError(null);
    try {
      const r = await json(await fetch(`/api/populate?patient=${encodeURIComponent(id)}${withAnswers ? '&answers=1' : ''}`));
      setForm({ key: `${id}-${Date.now()}`, questionnaire: r.questionnaire, response: r.response, context: r.context, issues: r.issues });
      const url = new URL(location.href);
      url.searchParams.set('patient', id);
      history.replaceState(null, '', url);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetch('/api/state').then(json).then((s) => {
      setState(s);
      const id = s.patients.some((p) => p.id === patient) ? patient : s.patients[0]?.id;
      setPatient(id);
      if (id) load(id);
    }).catch((e) => setError(e.message));
    // Reload when the agent saves a new version of the form, data or answers.
    const events = new EventSource('/api/events');
    events.addEventListener('changed', () => location.reload());
    return () => events.close();
  }, []);

  const writeBack = async () => {
    try {
      setWritten(await json(await fetch('/api/extract', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(getResponse()),
      })));
    } catch (e) {
      setWritten({ error: e.message });
    }
  };

  if (error && !state) return <p className="err">{error}</p>;
  if (!state) return <p>Loading…</p>;
  return (
    <>
      <header>
        <div>
          <h1>{state.title}</h1>
          <p className="files">{state.files.join(' · ')}</p>
        </div>
        <label>Test patient{' '}
          <select value={patient ?? ''} onChange={(e) => { setPatient(e.target.value); load(e.target.value); }}>
            {state.patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        {state.hasAnswers && <button onClick={() => load(patient, true)}>Fill in the test answers</button>}
        <button onClick={writeBack}>What would be written back</button>
      </header>
      {error && <p className="err">{error}</p>}
      {form?.issues?.length > 0 && (
        <details className="warn"><summary>{form.issues.length} prepopulation message(s)</summary>
          <ul>{form.issues.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </details>
      )}
      <WrittenBack result={written} />
      <main>
        {form && <Form key={form.key} form={form} />}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
