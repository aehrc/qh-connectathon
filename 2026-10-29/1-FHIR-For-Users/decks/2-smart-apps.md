---
marp: true
theme: track1
paginate: true
title: Track 1 SMART apps
style: |
  .flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; margin: 0.4em 0 0.6em; }
  .flow > div {
    position: relative; background: #fff; border: 1px solid var(--outline);
    border-top: 6px solid var(--teal); border-radius: 8px; padding: 8px 14px; font-size: 0.68em;
  }
  .flow > div:not(:last-child)::after {
    content: "\2192"; position: absolute; right: -24px; top: 38%;
    color: var(--teal-bright); font-size: 1.6em; font-weight: 700;
  }
  .flow h3 { margin: 0 0 0.2em; color: var(--teal); }
  .flow p { margin: 0.2em 0; }
  .split { display: grid; grid-template-columns: 640px minmax(0, 1fr); gap: 28px; align-items: start; }
  .split > div:first-child img { width: 640px; }
  .split code, .split a { overflow-wrap: anywhere; }
  .split p, .split li { font-size: 0.85em; }
  .split ol, .split ul { margin-top: 0; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .two pre code { font-size: 15px; }
  .two p, .two li { font-size: 0.8em; }
---

<!-- _class: title -->
<!-- _paginate: false -->

# SMART apps

## Launch from the EHR, read the patient's record

Track 1: FHIR for Users. FHIR in Queensland Health Connectathon, 29–30 Oct 2026
Jim Steel, Leonie Dickson (AEHRC), Leon Cavalli (QH)

---

## What you'll have by the end of this deck

- How an **EHR launch** works: launch → authorize → token (with the patient) → FHIR calls
- Your app **hosted where Meld can launch it**: CodeSandbox, GitHub Pages or any public HTTPS host
- A **client ID** for it, registered in the Meld sandbox
- The **starter app** (on CodeSandbox), fixed for Meld, launched with a patient
- A first app: **the current patient's Hb results**, the start of scenario **B1**

Forms people: **Smart Forms is itself a SMART app.** The launch context and token in this deck are what prepopulation runs on.

Sandbox: Meld `QHConnectathon2026`. Secured endpoint (apps): `https://gw.interop.community/QHConnectathon2026/data`. Open endpoint (no login, for testing): `https://gw.interop.community/QHConnectathon2026/open`.

---

## The EHR launch, in four steps

<div class="flow">

<div>

### 1. Launch
The EHR (Meld) opens your **launch URI** with `?iss=<FHIR server>&launch=<opaque id>`.

</div>

<div>

### 2. Authorize
Your app sends the browser to the server's **authorize** endpoint: client ID, scopes, redirect URI, `launch`.

</div>

<div>

### 3. Token
The server sends the browser back to your **redirect URI** with `?code=...`. The app swaps the code for an **access token** plus the context: **`patient`**.

</div>

<div>

### 4. FHIR calls
Every request carries `Authorization: Bearer <token>`. Reads are limited by the **scopes** granted.

</div>

</div>

**fhirclient.js does all four.** `FHIR.oauth2.init()` = step 2 on the first visit, step 3 when it comes back. Then `client.patient.id` is the launch patient and `client.request(...)` adds the token.

Endpoints come from `https://gw.interop.community/QHConnectathon2026/data/.well-known/smart-configuration`.

---

<style scoped>pre, pre code { font-size: 16px; }</style>

## What comes back in step 3

The token response (shape, values shortened):

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "launch openid fhirUser patient/*.read patient/*.write",
  "patient": "pam-001",
  "id_token": "eyJ0eXAiOi..."
}
```

| In fhirclient | Comes from |
|---|---|
| `client.patient.id` | `patient` in the token response: the patient selected at launch |
| `client.patient.read()` | `GET Patient/<that id>` |
| `client.request("Observation?...")` | `GET <iss>/Observation?...` with the Bearer token |
| `client.user.fhirUser` | the `id_token` (needs `openid fhirUser`) |

---

## Meld: our EHR for the two days

Meld (`https://meld.interop.community`, sandbox **QHConnectathon2026**) plays the EHR:

- **FHIR server**: the 40 synthetic PAM patients (`pam-001`..`pam-040`) and the demo patient `pam-demo`
- **Launcher**: picks a patient and opens your app's launch URI with `iss` and `launch`
- **Authorization server**: knows each registered app (client ID, launch URI, redirect URIs, scopes)

You **don't register apps yourself**: Jim registers yours and gives you a client ID (next slide).

**Launch with a patient selected.** Without one, Meld's launcher stops on a blank page.

---

## Where your app lives

Meld launches your app by opening its **launch URI** in the browser, so the app needs a **public HTTPS address**. Chrome blocks a launch from Meld to `http://localhost`.

<div class="cards">
<div>

**CodeSandbox** (easiest for the starter)
Edit in the browser; your fork is hosted for you at its preview URL. Sign in with GitHub or Google.

</div>
<div>

**GitHub Pages** (easiest for plain HTML/JS apps like `apps/pam-dashboard`)
A public repo; every commit is published at `https://<you>.github.io/<repo>/`.

</div>
<div>

**Something else?** Fine too: Netlify, Vercel, Azure Static Web Apps, your own server… Anything that serves your files over public HTTPS works.

</div>
</div>

Wherever it lives, you then send Jim its URLs for a client ID (*Get a client ID from Jim*). Step-by-step for the first two next.

---

<style scoped>p, li { font-size: 0.8em; }</style>
<!-- _class: reference -->

## Hosting on CodeSandbox

1. Open the starter: `https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q` and **sign in** (GitHub or Google account).
2. **Fork** it (top right). Your copy has its own editor URL; bookmark it.
3. In the preview pane, **open the preview in a new tab**. That tab's address (e.g. `https://abc123.csb.app/`) is your app's URL: copy it exactly, **with the trailing `/`**.
4. Send Jim that URL as launch **and** redirect URI (*Get a client ID from Jim*), and put the client ID he sends back in `src/index.js`.
5. Edits save as you type and the hosted URL serves the latest version: no deploy step.
6. **Launch from Meld**, not from the preview pane: the app needs Meld's `iss` and `launch` parameters. To try queries without a launch, use the no-login URL on the *Run it* slide.

---

<style scoped>p, li { font-size: 0.75em; } pre, pre code { font-size: 15px; }</style>
<!-- _class: reference -->

## Hosting on GitHub Pages

1. On github.com: **New repository**, **Public** (Pages on a free account needs a public repo), tick **Add a README**.
2. **Add file → Upload files**: your app's files with `index.html` at the top. For a population app, start from `index.html` and `launch.html` in [`apps/pam-dashboard`](https://github.com/aehrc/qh-connectathon/tree/main/2026-10-29/1-FHIR-For-Users/apps/pam-dashboard). **Commit**.
3. **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, branch **`main`**, folder **`/ (root)`**, **Save**.
4. After a minute or so the Pages settings show your URL: `https://<you>.github.io/<repo>/`. Send Jim the URLs (*Get a client ID from Jim*).
5. Edit in the browser (pencil icon) or push with git; every commit republishes in about a minute (progress under **Actions**).

**The React starter** needs a build first. Add `"homepage": "."` to `package.json`, then:

```
npm install
npm run build      # react-scripts 4 on Node 17+: NODE_OPTIONS=--openssl-legacy-provider npm run build
```

and upload the **contents** of `build/`, not the folder itself.

---

## Get a client ID from Jim

1. Get your app's public URL (CodeSandbox, GitHub Pages or your own host).
2. Send Jim:

```
Team / app name:  B1 Hb viewer (your names)
Launch URI:       https://abc123.csb.app/
Redirect URI:     https://abc123.csb.app/
Scopes:           launch openid fhirUser patient/*.read patient/*.write
```

3. Put the client ID he sends back in **`src/index.js`**: `clientId: '<client id from Jim>'`.

**Launch URI and redirect URI are the same page.** The starter calls `FHIR.oauth2.init()`, which handles both visits, and fhirclient's default `redirectUri` is `"."`, the page itself. Copy the URL exactly, **with the trailing `/`**. Moved host? Send Jim the new URL. More than one redirect URI? Comma-separated.

---

## Scopes on Meld: SMART v1 only

| Scope | Gives |
|---|---|
| `launch` | EHR launch: the patient (and context) from the launcher |
| `openid fhirUser` | who the user is (`client.user`) |
| `patient/*.read` | read anything **about the launch patient** |
| `patient/*.write` | create and update for that patient (the starter's "Update" form) |
| `user/*.read` | read **everything** the user can see: population views (B2–B8) |

Also supported: `patient/*.*`, `launch/patient`, `profile`, `online_access`, `offline_access`.
**Not** supported: v2 scopes (`patient/*.rs`, `.cruds`), `launch/questionnaire`, resource-specific user scopes such as `user/Practitioner.read`.

**The scopes you request must be a subset of the scopes registered** for your client ID, or the launch fails with `invalid_scope`. So send Jim every scope you'll want.

---

## The starter: what's in it

`https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q`: Create React App (React 17, `react-scripts` 4).

| File | Does |
|---|---|
| `src/index.js` | `FHIR.oauth2.init({ clientId, scope })`, then renders `<App client={client} />` |
| `src/App.jsx` | reads the launch patient, shows it with `PatientVisualizer`, a form to update the name |
| `package.json` | `fhirclient` (^2.4, today 2.6.3), `fhir-visualizers` 0.0.6, `react-bootstrap`, `react-hook-form` |

Three things to change for Meld: **1.** `clientId` belongs to another registration: use yours from Jim. **2.** `scope` `launch/patient openid profile` asks for **no data**. **3.** In `App.jsx`, `useEffect` runs on every render (a request loop) and the update mutates React state.

---

<style scoped>pre, pre code { font-size: 16px; }</style>

## Fix 1 and 2: `src/index.js`

```js
const smartLaunch = () => {
  // Authorize application
  FHIR.oauth2
    .init({
      clientId: '<client id from Jim>',                              // was another app's id
      scope: 'launch openid fhirUser patient/*.read patient/*.write' // was 'launch/patient openid profile'
    })
    .then(client => {
      ReactDOM.render(<App client={client} />, rootElement);
    })
    .catch(err => { rootElement.textContent = String(err); });      // added: show errors
};

smartLaunch();
```

<div class="small">

- **`launch`**, not `launch/patient`: Meld starts an **EHR** launch; `launch/patient` asks for a patient picker in a standalone launch. (fhirclient adds `launch` itself only if the scope has no "launch" in it.)
- **`patient/*.read`** to read the record; **`patient/*.write`** only because the starter's form updates the Patient.

</div>

---

<style scoped>pre, pre code { font-size: 16px; }</style>

## Fix 3: `src/App.jsx`

```jsx
  useEffect(() => {
    client.patient.read().then((patient) => setPatient(patient));
  }, [client]);   // added: without it the effect runs after every render -> read -> setPatient
                  // -> render -> read ... (a request loop)
```

```jsx
  const onSubmit = data => {
    const np = JSON.parse(JSON.stringify(patient));  // was: let np = patient (changes the state object)
    np.name[0].given[0] = data.fname;
    np.name[0].family = data.lname;
    client.update(np).then(setPatient);   // the server's copy: a new object, so React re-renders
  };
```

`setPatient` with the same object it already holds doesn't re-render, so the old code changed the name in memory but not on screen.

**Please don't rename the shared patients** (`pam-001`..`pam-040`, `pam-demo`): other teams use them. Remove the form, or try it on a Patient you created.

---

<!-- _class: demo -->
<style scoped>pre, pre code { font-size: 13px; } .split > div:first-child img { width: auto; max-height: 280px; } .split { grid-template-columns: auto minmax(0, 1fr); }</style>

## First app: try the query in your browser

The patient's Hb results, newest first. Paste into Edge or Chrome (or [open it](https://gw.interop.community/QHConnectathon2026/open/Observation?code=http://loinc.org%7C718-7&patient=pam-demo&_sort=-date&_format=json)):

```
https://gw.interop.community/QHConnectathon2026/open/Observation?code=http://loinc.org%7C718-7&patient=pam-demo&_sort=-date&_format=json
```

<div class="split">

<div>

![All Hb results for pam-demo on the open endpoint](img/smart/01-hb-search-open.png)

</div>

<div>

- LOINC **718-7**: Haemoglobin, `system|code` with `|` as **`%7C`**
- No `_count=1` (the form's query has it): we want **all** results; `&_format=json` only for the browser
- `"total": 2`: `pam-demo-hb-2` **104 g/L** (14 Oct 2026), `pam-demo-hb-1` **112 g/L** (2 Sep 2026)
- `pam-demo` is shared: if someone has done the write-back demo you'll see their result (e.g. 98 g/L, 27 Oct) as the latest, and more than 2 results

</div>

</div>

---

<style scoped>pre, pre code { font-size: 16px; } li { font-size: 0.9em; }</style>

## First app: `src/HbResults.jsx` (new file)

```jsx
import React, { useEffect, useState } from 'react';
import { ObservationsVisualizer } from 'fhir-visualizers';
import { Spinner } from 'react-bootstrap';

export default function HbResults({ client }) {
  const [hb, setHb] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    client
      .request(`Observation?code=http://loinc.org%7C718-7&patient=${client.patient.id}&_sort=-date`,
        { flat: true })
      .then(setHb)
      .catch(setError);
  }, [client]);
  if (error) return <p className="text-danger">{String(error)}</p>;
  if (!hb) return <Spinner animation="border" />;
  return <ObservationsVisualizer title="Haemoglobin" rows={hb} />;
}
```

- `client.patient.id`: the launch patient. `client.request` adds the token.
- `{ flat: true }`: an array of Observations, not the Bundle (first page; `pageLimit: 0` for all).

---

<style scoped>pre, pre code { font-size: 15px; }</style>

## Wire it in, and what you'll see

<div class="two">

<div>

In `src/App.jsx`:

```jsx
import HbResults from './HbResults';
...
      <Container>
        {pat}
      </Container>
      <Container>
        <HbResults client={client} />
      </Container>
```

For `pam-demo`, `client.request` returns (checked with fhirclient 2.6.3):

```
pam-demo-hb-2  2026-10-14T08:45:00+10:00  104 g/L
pam-demo-hb-1  2026-09-02T09:15:00+10:00  112 g/L
```

</div>

<div>

`ObservationsVisualizer` (fhir-visualizers 0.0.6) shows a table: code, value, effective, issued, id. It **reverses** the rows, so newest-first in gives oldest-first on screen.

Your own table instead, newest first:

```jsx
<table className="table table-sm">
  <tbody>
    {hb.map((o) => (
      <tr key={o.id}>
        <td>{o.effectiveDateTime?.substring(0, 10)}</td>
        <td>{o.valueQuantity?.value} {o.valueQuantity?.unit}</td>
      </tr>
    ))}
  </tbody>
</table>
```

</div>

</div>

---

<style scoped>pre, pre code { font-size: 15px; } p { font-size: 0.85em; }</style>

## Run it

**From Meld (the real thing):** launch your app from the sandbox with a patient selected. It opens your launch URI with `?iss=https://gw.interop.community/QHConnectathon2026/data&launch=...`, goes to Meld's login and authorize page, then comes back with `?code=...&state=...` and shows the patient and their Hb.

**Without Meld (while you code):** fhirclient's `fhirServiceUrl` and `patientId` URL parameters skip OAuth and use the open endpoint:

```
https://abc123.csb.app/?fhirServiceUrl=https://gw.interop.community/QHConnectathon2026/open&patientId=pam-demo
```

(Use your preview URL. No client ID or token needed; don't ship it.)

**Opened the preview with neither?** `init()` fails with *No server url found*: there's no `iss`.

---

## Gotchas on Meld

<div class="cards" style="grid-template-columns: 1fr 1fr 1fr;">

<div>

### `|` → `%7C`
A raw `|` in a query gets **HTTP 400** with no CORS headers: the browser says **CORS error**. fhirclient doesn't encode it. Write `%7C`.

</div>

<div>

### Pick a patient
Launch without a patient selected and Meld stops on a **blank page**.

</div>

<div>

### Scopes ⊆ registered
Request only scopes registered for your client ID, v1 only, or you get `invalid_scope`.

</div>

<div>

### Redirect URIs
Must match **exactly**, trailing `/` included. Several go **comma-separated** in the registration.

</div>

<div>

### `_format=json`
In the browser's address bar, or Meld sends XML and the browser downloads a file.

</div>

<div>

### Relaunch in a new tab
`init()` revives the session in `sessionStorage` **before** it looks at a new `iss`/`launch`: in the same tab (also after a `?fhirServiceUrl=` test) you get the **old** session and patient.

</div>

</div>

---

<style scoped>table { font-size: 0.7em; } p { font-size: 0.9em; }</style>

## No build step: `apps/pam-dashboard`

A fuller example in the repo: plain HTML + fhirclient.js (from a CDN) + Plotly. **PAM 15/16 outcomes**: initial vs post-treatment Hb and ferritin by sex, from one FHIR search.

| | Starter (this deck) | Dashboard |
|---|---|---|
| View | one patient (B1) | the population (B2–B8) |
| Scope | `launch openid fhirUser patient/*.read patient/*.write` | `launch openid fhirUser online_access user/*.read` |
| Pages | one: `init()` | two: `launch.html` calls `FHIR.oauth2.authorize()`, `index.html` calls `FHIR.oauth2.ready()` |
| Fetch | first page | `client.request(query, { pageLimit: 0, flat: true })`: all pages |

Try it: `https://aehrc.github.io/qh-connectathon/pam-dashboard/`. No login: add `?server=https://gw.interop.community/QHConnectathon2026/open`.

---

<style scoped>p { font-size: 0.8em; } pre, pre code { font-size: 16px; }</style>

## Your own population app (B2–B8) on Meld

**How it launches today:** an **EHR launch from Meld with any patient selected**; the app ignores the patient and reads the population with `user/*.read`. A standalone launch doesn't work on Meld yet (see `apps/pam-dashboard/README.md`; how a dashboard should launch is part of B9).

Copy `apps/pam-dashboard/` and **host it on a public HTTPS address**: GitHub Pages works as is (see *Hosting on GitHub Pages*), or any other static host. Then send Jim a **different** registration from the starter's:

```
Team / app name:  B6 outcomes (your names)
Launch URI:       https://<your host>/<folder>/launch.html
Redirect URI:     https://<your host>/<folder>/
Scopes:           launch openid fhirUser online_access user/*.read
```

Put the client ID in **`launch.html`** (`const CLIENT_ID = '...'`). Launch and redirect URI differ here because the app uses `authorize()` on `launch.html` and `ready()` on `index.html`.

---

<!-- _class: tryit -->

## Strand B: SMART apps

<div class="small">

| Start with | Scenario | From |
|---|---|---|
| **B1** Patient summary ★ | Hb and ferritin trend with thresholds, pathway, days to surgery | this deck's starter + `HbResults` |
| **B3** KPI tiles ★, **B5** Referral profile ★ | counts and breakdowns over the population | `apps/pam-dashboard` |
| **B2** Worklist ★★, **B4** Referrals ★★, **B6** Outcomes ★★, **B7** Demographics ★★, **B8** Filters ★★ | EpisodeOfCare, Task, ServiceRequest, Patient searches | `apps/pam-dashboard` |
| **B9** Analytics ★★★ | ViewDefinitions, Bulk `$export`, Measure | ask a track lead |

</div>

<div class="small">

- Scenarios: `2026-10-29/1-FHIR-For-Users/Scenarios.md` (strand B) and the data mapping in `FHIR-Mapping-DRAFT.md`
- Starter: `https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q`. Host on CodeSandbox, GitHub Pages or anywhere public HTTPS. Client ID: **send Jim your launch and redirect URI**
- Dashboard: `https://aehrc.github.io/qh-connectathon/pam-dashboard/` (code in `apps/pam-dashboard/`)
- How SMART launch works, request by request: [SMART App Launch Postman collection](https://www.postman.com/planetary-crescent-937142/smart-app-launch-hl7-au-connectathon/collection/xbq559p/smart-app-launch-introduction)
- Forms people: **Questionnaires** deck next

</div>
