# Smart Forms for the track 1 sandbox

The CSIRO [Smart Forms](https://github.com/aehrc/smart-forms) app, configured for the Meld
sandbox (SMART v1 scopes) and served from GitHub Pages:

**https://aehrc.github.io/qh-connectathon/smart-forms/**

| File | Purpose |
|---|---|
| `smart-forms-sandbox.patch` | (1) Lets Smart Forms run under a sub-path (Vite `base`, router `basename`, `config.json` URL, SMART redirect URI) — upstream assumes the domain root. (2) Opens a default questionnaire at launch when the server can't supply one in `fhirContext` (Meld has no `launch/questionnaire` scope). (3) Optionally opens a new response straight after launch, skipping the existing-responses page. (4) Encodes `\|` as `%7C` in every request URL and drops the `Cache-Control` header — see below. |
| `config.json` | Runtime config: Ontoserver, CSIRO forms server, Meld client ID, v1 launch scopes, `launchQuestionnaire` (canonical URL, optionally `\|version`) to open at launch, and `openNewResponseOnLaunch` to go straight into a new pre-populated response. |
| `build.sh` | Clones Smart Forms at a pinned commit, applies the patch, builds into `dist/`. |

Deploy with [`../deploy-pages.sh`](../deploy-pages.sh).

## Meld app registration

* Launch URI: `https://aehrc.github.io/qh-connectathon/smart-forms/launch`
* Redirect URI: `https://aehrc.github.io/qh-connectathon/smart-forms/`
* Scopes: `launch launch/patient openid fhirUser profile online_access patient/*.read patient/*.write patient/*.* user/*.read`

Redirect URIs are comma-separated in Meld.

## Choosing the questionnaire at launch

Meld can't put a questionnaire in the standard launch context (`fhirContext`), so the patched app
falls back, in order, to:

1. a **`questionnaire` custom-context value** in the token response — in Meld, add it under
   *Custom Context* on the launch scenario (key `questionnaire`, value a canonical URL, optionally
   `|version`);
2. a `?questionnaire=` parameter on the launch URI;
3. `launchQuestionnaire` from `config.json` (the PAM starter form).

The questionnaire is fetched from the forms server by canonical URL. Launch URI form of option 2:

`https://aehrc.github.io/qh-connectathon/smart-forms/launch?questionnaire=<canonical url>`

## Meld gotchas handled by the patch

* A raw `|` in a query string gets a 400 with no CORS headers (reported by the browser as CORS).
  The patch encodes `|` as `%7C` in every request, including fhirclient's (built with
  `FHIRCLIENT_PURE` so it uses `window.fetch`).
* `Cache-Control` isn't an allowed CORS request header, so the patch doesn't send it.
