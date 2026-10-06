# Smart Forms for the track 3 sandbox

The CSIRO [Smart Forms](https://github.com/aehrc/smart-forms) app, configured for the Meld
sandbox (SMART v1 scopes) and served from GitHub Pages:

**https://aehrc.github.io/qh-connectathon/smart-forms/**

| File | Purpose |
|---|---|
| `smart-forms-base-path.patch` | Lets Smart Forms run under a sub-path (Vite `base`, router `basename`, `config.json` URL, SMART redirect URI). Upstream assumes it is served at the domain root. |
| `config.json` | Runtime config: Ontoserver, CSIRO forms server, Meld client ID, v1 launch scopes. |
| `build.sh` | Clones Smart Forms at a pinned commit, applies the patch, builds into `dist/`. |

Deploy with [`../deploy-pages.sh`](../deploy-pages.sh).

## Meld app registration

* Launch URI: `https://aehrc.github.io/qh-connectathon/smart-forms/launch`
* Redirect URI: `https://aehrc.github.io/qh-connectathon/smart-forms/`
* Scopes: `launch launch/patient openid fhirUser profile online_access patient/*.read patient/*.write patient/*.* user/*.read`

Redirect URIs are comma-separated in Meld.
