# PAM outcomes dashboard (SMART app)

A deliberately small SMART on FHIR app that rebuilds the dashboard's outcome charts (PAM 15 and 16):
initial vs post-treatment Hb and ferritin, by sex, from **one FHIR search**:

```
GET Observation?code=http://loinc.org|718-7,http://loinc.org|2276-4
    &date=ge2025-07-01&date=le2026-06-30&_include=Observation:subject
```

Plain HTML + [fhirclient.js](https://github.com/smart-on-fhir/client-js) + Plotly, no build step.
The rest of the dashboard is scaffolding for scenarios B1–B9.

* **Launched from the sandbox:** `https://aehrc.github.io/qh-connectathon/pam-dashboard/launch.html`
  (scopes `launch openid fhirUser online_access user/*.read` — a population view needs user-level access).
* **No login (testing):** `https://aehrc.github.io/qh-connectathon/pam-dashboard/?server=https://gw.interop.community/QHConnectathon2026/open`

## Meld app registration

* Launch URI: `https://aehrc.github.io/qh-connectathon/pam-dashboard/launch.html`
* Redirect URI: `https://aehrc.github.io/qh-connectathon/pam-dashboard/`
* Scopes: `launch openid fhirUser profile online_access user/*.read`
* Put the client ID in `launch.html` (`CLIENT_ID`) and redeploy with `../deploy-pages.sh`.

Note: `|` in search parameters is sent as `%7C` because Meld's gateway rejects a raw `|`.
