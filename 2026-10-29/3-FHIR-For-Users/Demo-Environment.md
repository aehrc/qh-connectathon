# Demo and sandbox environment

Status: **working** — all three webinar demos run from the Meld sandbox (checked 6 Oct).

## Components

| Component | What | Status |
|---|---|---|
| FHIR server + SMART launcher | [Meld](https://meld.interop.community) sandbox `QHConnectathon2026` (under evaluation) | Created |
| Open (unauthenticated) endpoint | `https://gw.interop.community/QHConnectathon2026/open` | Working |
| Forms renderer | CSIRO Smart Forms, patched for Meld and hosted on GitHub Pages: https://aehrc.github.io/qh-connectathon/smart-forms/ ([`apps/smart-forms`](apps/smart-forms/)) | Working: launch, pre-population, calculations, write-back |
| Terminology | Ontoserver `https://r4.ontoserver.csiro.au/fhir` (SNOMED CT-AU, AMT, LOINC) | Available |
| PAM questionnaire | Modular SDC form, assembled locally and stored on the Meld open endpoint, which is Smart Forms' forms server ([`questionnaires/`](questionnaires/)) | Loaded |
| Dashboard app | fhirclient.js SMART app, PAM 15/16 outcomes: https://aehrc.github.io/qh-connectathon/pam-dashboard/ ([`apps/pam-dashboard`](apps/pam-dashboard/)) | Working |
| Synthetic PAM data | 40 patients, waitlist, referrals, labs, treatment ([`data/`](data/)) | Loaded in Meld |

## Meld: things we learned

* **SMART v1 scopes only.** Supported: `patient/*.read`, `patient/*.write`, `patient/*.*`,
  `user/*.read`, `launch`, `launch/patient`, `openid`, `fhirUser`, `profile`,
  `online_access`, `offline_access`. Not supported: v2 scopes (`.rs`, `.cruds`),
  `launch/questionnaire`, resource-specific user scopes such as `user/Practitioner.read`.
  The public `smartforms.csiro.au` app requests v2 scopes, so it fails with `invalid_scope`;
  hence a self-built Smart Forms with its own config.
* **Redirect URIs in the app registration are comma-separated**, not space-separated.
* The scopes the app requests must be a subset of those registered for the app.
* **The secured endpoint rejects a raw `|` in the query string** (e.g. `code=http://loinc.org|718-7`,
  `questionnaire=url|version`) with HTTP 400 and no CORS headers, which browsers report as a CORS
  error. Browsers don't encode `|`, so apps must send it as `%7C`. The open endpoint accepts both.
* **No `launch/questionnaire` / `fhirContext`**, so Smart Forms can't be told which form to open;
  our patched build falls back to a configured default (see [`apps/smart-forms`](apps/smart-forms/)).

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

* ~~Where to host the track 3 apps~~ — **GitHub Pages** (`gh-pages` branch, published by
  [`apps/deploy-pages.sh`](apps/deploy-pages.sh)).
* Meld vs our own stack (HAPI + Smart Forms + assemble service + SMART launcher) for the
  connectathon itself.
* A REDCap instance that allows external modules, for strand D.
