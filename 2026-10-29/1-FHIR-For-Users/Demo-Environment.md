# Demo and sandbox environment

Status: **working** — all three webinar demos run from the Meld sandbox (checked 6 Oct).

## Components

| Component | What | Status |
|---|---|---|
| FHIR server + SMART launcher | [Meld](https://meld.interop.community) sandbox `QHConnectathon2026` (under evaluation) | Created |
| Open (unauthenticated) endpoint | `https://gw.interop.community/QHConnectathon2026/open` | Working |
| Forms renderer | CSIRO Smart Forms, patched for Meld and hosted on GitHub Pages: https://aehrc.github.io/qh-connectathon/smart-forms/ ([`apps/smart-forms`](apps/smart-forms/)) | Working: launch, pre-population, calculations, write-back |
| Forms playground | The same patched build: https://aehrc.github.io/qh-connectathon/smart-forms/ → **Go to playground**. Use it, not `smartforms.csiro.au/playground`, with Meld (see below) | Working: render, pre-populate, extract, write back (28 Oct) |
| Form authoring | NLM Form Builder (LHC-Forms): https://formbuilder.nlm.nih.gov/ (accept the LOINC terms on first use, per browser profile) | Working (28 Oct) |
| Terminology | Ontoserver `https://r4.ontoserver.csiro.au/fhir` (SNOMED CT-AU, AMT, LOINC) | Available |
| PAM questionnaire | Modular SDC form, assembled locally and stored on the Meld open endpoint, which is Smart Forms' forms server ([`questionnaires/`](questionnaires/)) | Loaded |
| Dashboard app | fhirclient.js SMART app, PAM 15/16 outcomes: https://aehrc.github.io/qh-connectathon/pam-dashboard/ ([`apps/pam-dashboard`](apps/pam-dashboard/)) | Working |
| SMART starter (GitHub Pages template) | No-build patient app (B1) + the dashboard in `population/`, client IDs in `config.js`: https://github.com/aehrc/qh-connectathon-smart-starter (source [`apps/smart-starter`](apps/smart-starter/)) | Patient app: EHR launch from Meld tested 28 Oct (same URL as launch and redirect URI is accepted); population app: tested without login only |
| Synthetic PAM data | 40 patients, waitlist, referrals, labs, treatment ([`data/`](data/)) | Loaded in Meld |
| Kick-off decks | Five Marp decks and a presenter guide; HTML on GitHub Pages under https://aehrc.github.io/qh-connectathon/decks/ ([`decks/`](decks/)) | Built from the repo |

## Meld: things we learned

* **SMART v1 scopes only.** Supported: `patient/*.read`, `patient/*.write`, `patient/*.*`,
  `user/*.read`, `launch`, `launch/patient`, `openid`, `fhirUser`, `profile`,
  `online_access`, `offline_access`. Not supported: v2 scopes (`.rs`, `.cruds`),
  `launch/questionnaire`, resource-specific user scopes such as `user/Practitioner.read`.
  The public `smartforms.csiro.au` app requests v2 scopes, so it fails with `invalid_scope`;
  hence a self-built Smart Forms with its own config.
* **Redirect URIs in the app registration are comma-separated**, not space-separated.
* The scopes the app requests must be a subset of those registered for the app.
* **Both endpoints reject a raw `|` in the query string** (e.g. `code=http://loinc.org|718-7`,
  `questionnaire=url|version`) with HTTP 400 and no body (checked 28 Oct; the open endpoint used
  to accept it). On the secured endpoint the 400 has no CORS headers, so an app sees a CORS error.
  Browsers don't encode `|`, so write `%7C`, or leave the system out (`code=718-7`).
* **In a browser, add `&_format=json`** to a search URL. Without it Meld returns XML and Chrome and
  Edge download a file instead of showing it.
* **Meld doesn't support `Questionnaire?url=<canonical>|<version>`** (with `%7C`: no matches,
  checked 28 Oct). Search with `url=<canonical>` alone, or `url=<canonical>&version=<version>`.
* **The public Smart Forms playground (`smartforms.csiro.au/playground`) can't reach Meld**: it
  sends `Cache-Control: no-cache`, which Meld's CORS preflight doesn't allow, so it lists no
  patients. Use the patched playground: https://aehrc.github.io/qh-connectathon/smart-forms/
  → **Go to playground**.
* **No `launch/questionnaire` / `fhirContext`**, but a launch scenario's **Custom Context** values are
  passed in the token response. Our patched Smart Forms opens the questionnaire named by a
  `questionnaire` custom-context value (canonical URL, e.g.
  `https://aehrc.github.io/qh-connectathon/track1/Questionnaire/pam-treatment|0.1.0`), falling back to
  the full PAM form. One scenario per module lets each team launch straight into its own module.
* **Apps must be launched with a patient selected** — without one, Meld's launcher stops on a blank page.

## Smart Forms build

```sh
git clone https://github.com/aehrc/smart-forms && cd smart-forms
npm install && npm run build-all-deps-first-run
cd apps/smart-forms-app && npm run build
```

(The published Docker image is not on Docker Hub and the repo Dockerfile fails because the
workspace packages aren't built first, so build with npm and serve `dist/` with nginx using
the repo's `default.conf`.)

Runtime `config.json` for Meld:

```json
{
  "terminologyServerUrl": "https://r4.ontoserver.csiro.au/fhir",
  "formsServerUrl": "https://smartforms.csiro.au/api/fhir",
  "defaultClientId": "<client id from the Meld app registration>",
  "launchScopes": "launch openid fhirUser online_access patient/*.read patient/*.write user/*.read",
  "registeredClientIdsUrl": null
}
```

Meld app registration: launch URI `<smart-forms-origin>/launch`, redirect URI
`<smart-forms-origin>` (the app redirects to `window.location.origin`).

## Known issue: Chrome Local Network Access

Launching from Meld (public HTTPS) to Smart Forms on `http://localhost` is blocked by Chrome:
*"The connection is blocked because it was initiated by a public page to connect to devices
or servers on your local network."* Allowing it in site settings didn't help. Options:

1. Host Smart Forms (and the dashboard app) at a public HTTPS address — **done: GitHub Pages**.
2. Disable `chrome://flags/#local-network-access-check` on the presenter's machine (demo only).

## Open decisions

* ~~Where to host the track 1 apps~~ — **GitHub Pages** (`gh-pages` branch, published by
  [`apps/deploy-pages.sh`](apps/deploy-pages.sh)).
* Meld vs our own stack (HAPI + Smart Forms + assemble service + SMART launcher) for the
  connectathon itself.
* A REDCap instance that allows external modules, for strand D.
