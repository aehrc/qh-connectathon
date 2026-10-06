# Smart Forms for the track 3 sandbox

The CSIRO [Smart Forms](https://github.com/aehrc/smart-forms) app, configured for the Meld
sandbox (SMART v1 scopes) and served from GitHub Pages:

**https://aehrc.github.io/qh-connectathon/smart-forms/**

| File | Purpose |
|---|---|
| `smart-forms-sandbox.patch` | (1) Lets Smart Forms run under a sub-path (Vite `base`, router `basename`, `config.json` URL, SMART redirect URI) — upstream assumes the domain root. (2) Opens a default questionnaire at launch when the server can't supply one in `fhirContext` (Meld has no `launch/questionnaire` scope). (3) Optionally opens a new response straight after launch, skipping the existing-responses page. (4) Encodes `\|` as `%7C` in every request URL — Meld's gateway rejects a raw `\|` with a CORS-less 400. |
| `config.json` | Runtime config: Ontoserver, CSIRO forms server, Meld client ID, v1 launch scopes, `launchQuestionnaire` (canonical URL, optionally `\|version`) to open at launch, and `openNewResponseOnLaunch` to go straight into a new pre-populated response. |
| `build.sh` | Clones Smart Forms at a pinned commit, applies the patch, builds into `dist/`. |

Deploy with [`../deploy-pages.sh`](../deploy-pages.sh).

## Meld app registration

* Launch URI: `https://aehrc.github.io/qh-connectathon/smart-forms/launch`
* Redirect URI: `https://aehrc.github.io/qh-connectathon/smart-forms/`
* Scopes: `launch launch/patient openid fhirUser profile online_access patient/*.read patient/*.write patient/*.* user/*.read`

Redirect URIs are comma-separated in Meld.

## Choosing the questionnaire at launch

Meld can't put a questionnaire in the launch context, so the patched app opens
`launchQuestionnaire` from `config.json`, fetched from the forms server by canonical URL. To
open a different form from a particular Meld app registration or scenario, add it to the
launch URI:

`https://aehrc.github.io/qh-connectathon/smart-forms/launch?questionnaire=<canonical url>`

## Known issue

With Meld, the *existing responses* list fails (preflight 400, reported as CORS). Not yet
diagnosed; `openNewResponseOnLaunch` bypasses that page. Creating, pre-populating and saving
responses work.
