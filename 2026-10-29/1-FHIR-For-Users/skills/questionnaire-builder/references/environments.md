# Target environment

Where the form will be opened, prepopulated and tested. Ask once, early ("Where will you try this
out?"), fill in this block, and keep it in the change log so the next session starts from it.

```
Target environment
  FHIR server (data + forms):  <base URL, or "none">
  Auth:                        <open | SMART client id ... | none>
  Renderer / playground:       <URL>
  Terminology server:          <URL> (default https://r4.ontoserver.csiro.au/fhir)
  Shared data to avoid:        <patients or ids other people use>
  Sample-data id prefix:       <e.g. js->
```

## Example: the QH Connectathon setup (29–30 Oct 2026)

These may not stay up after the event; check before relying on them.

```
Target environment
  FHIR server (data + forms):  https://gw.interop.community/QHConnectathon2026/open (Meld sandbox, open endpoint)
  Auth:                        open (SMART v1 scopes only for apps)
  Renderer / playground:       https://aehrc.github.io/qh-connectathon/smart-forms/ → GO TO PLAYGROUND
  Terminology server:          https://r4.ontoserver.csiro.au/fhir
  Shared data to avoid:        pam-001 .. pam-040, pam-demo
  Sample-data id prefix:       <your initials>-
```

Gotchas there: write `|` as `%7C`; Meld rejects resources with `meta.profile`; the public
playground (smartforms.csiro.au) can't reach Meld (a CORS header), the patched one above can;
add `&_format=json` to open a search in a browser.

## Trying a form in the Smart Forms playground

1. Open the playground. Settings (gear) → *Source FHIR Server URL*: the target server; validate
   with the **?** icon, then save.
2. Pick a test patient (from the sample data you loaded).
3. Paste the Questionnaire JSON into the editor (or pick it from the server), then **Build form**.
4. **Populate → Pre-populate** (it doesn't prepopulate on Build).
5. Fill in the rest. **Extract → Template-based $extract**; the result is under *Advanced
   props → Extract*.

## When there's no FHIR server

The form can still be checked and shown:

* **Offline check**: `node scripts/check.mjs form.json --data sample-data.json --answers answers.json`
  runs prepopulation and extraction against the sample data with the Smart Forms libraries,
  with no server.
* **Looking at it**: the public playground (`https://smartforms.csiro.au/playground`) renders a
  pasted Questionnaire. Its default server (`https://hapi.fhir.org/baseR4`) is public: you can load
  synthetic sample data there to see prepopulation, but anything there is visible to everyone
  and may be deleted at any time. Never put real data on it.
* **No code execution at all**: write the files, and give the person the steps above to try them.
  Say plainly what you couldn't check.

## Loading and cleaning up

`node scripts/load.mjs sample-data.json --server <base> --prefix <p>` shows what it would send;
add `--yes` to send it. `--cleanup` deletes only ids under the prefix. Only load when the person
has said yes, and never to a server holding real patients.
