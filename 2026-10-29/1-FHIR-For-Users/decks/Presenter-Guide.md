# Presenter guide: Track 1 kick-off demos

Click-by-click notes for the live demos. The Meld open endpoint, fhirpath-lab and the Smart Forms
playground were checked live on 28 Oct 2026 (headless Chromium 1600×900). **The NLM Form Builder
was checked only up to its opening dialog, and the CodeSandbox starter not at all** (sections 1
and 6). Screenshots are in `img/` and are re-captured with `make shots`.
Paths are relative to `decks/`.

**Before each demo session**

1. `./examples/reset-demo.sh`: puts `pam-demo` back to its baseline (latest Hb 104 g/L on
   14 Oct). Every write-back demo adds an Observation, which changes "latest Hb".
2. `make verify` should end with `all 16 checks passed`.
3. Use a browser profile where you've already accepted the NLM Form Builder's LOINC terms (see 1).

Demo patient: **Demi Formsdemo**, id `pam-demo` (F, 1961-04-09). Baseline: Hb 112 (2 Sep),
**Hb 104 (14 Oct, latest)**, ferritin 18 (14 Oct), height 164 cm, weight 71.4 kg.

---

## 1. NLM Form Builder (LHC-Forms): Questionnaires deck

**URL:** https://formbuilder.nlm.nih.gov/ (redirects to `https://lhncbc.nlm.nih.gov/formbuilder/`).
`formbuilder.lhcforms.nlm.nih.gov` doesn't resolve. Version on 28 Oct: 12.10.0.

**Status: not verified past the opening dialog.** The builder opens with *Accept Terms of Use*
(LOINC). Accepting licence terms is your call, so the automation stopped there. The steps below
come from the builder's source code (`lhncbc/formbuilder-lhcforms`, master, 22 Oct 2026), **not
from a live run**. Walk through them once before the session and correct this section.

Verified live:

1. Open the URL. A modal *Accept Terms of Use* appears: tick **I accept the LOINC Terms of Use.**
   (optional second box: *enable SNOMED CT terminology support*), then **Accept**.
   (`img/questionnaires/01-lhc-terms.png`)
2. Behind it: *How do you want to create your form?* with **Start from scratch** (selected) /
   **Start with existing form**, and **Continue**.

From the source (unverified):

3. *Start with existing form* offers **Import from local file**, **Import from FHIR server**,
   **Import from LOINC**. So you can import `examples/pathology-walkthrough-stage1.json` as a
   fallback, or import it from the Meld open endpoint as a FHIR server.
4. Top menu after starting: **Export** with *Export to file in FHIR R4 format* (also R5, STU3,
   LHC-Forms internal), *Create a new questionnaire on a FHIR server...*, *Update the questionnaire
   on the server*; **Import** with *Import from file...*, *Import from a FHIR server...*, LOINC
   search; **Preview**.
5. Item editor widgets in the source include a quantity-unit picker (UCUM), answer options
   (`answer-option-methods`), linkId editing (`editable-link-id`), min/max occurs (repeats),
   enableWhen, an observation-extract option and a variable/expression editor.

What to build (= `examples/pathology-walkthrough-stage1.json`):

| linkId | text | type | details |
|---|---|---|---|
| `pam-pathology` | Pathology | group | |
| `pam-hb` | Haemoglobin (Hb) | decimal | unit `g/L` (UCUM) |
| `pam-ferritin` | Ferritin | decimal | unit `ug/L` (UCUM; displayed µg/L) |
| `pam-hb-date` | Date of latest Hb | date | |
| `pam-ext` | Results from an external lab | group | **repeats** |
| `pam-ext-test` | Test | choice | answer options, system `http://loinc.org`: `718-7` Haemoglobin (Hb), `2276-4` Ferritin |
| `pam-ext-value` | Result | decimal | |
| `pam-ext-date` | Collected | date | |

The stage 1 file has no `required` items. If you show *required* in the builder, it'll differ
from the file.

**Gotchas to check on the dry run:** whether the builder assigns its own linkIds (you'll need to
type ours); how it writes units (the `questionnaire-unit` extension vs something else); whether
answer options keep `system`; what the R4 export adds (e.g. `lformsVersion`, ids, `meta.tag`).

Screenshots to take on the dry run, into `img/questionnaires/`:

* `questionnaires/10-lhc-item-editor.png` (screenshot by Jim): a decimal item with its UCUM unit.
* `questionnaires/11-lhc-answer-options.png` (screenshot by Jim): `pam-ext-test` answer options with the LOINC system.
* `questionnaires/12-lhc-repeating-group.png` (screenshot by Jim): `pam-ext` group set to repeat.
* `questionnaires/13-lhc-preview.png` (screenshot by Jim): Preview.
* `questionnaires/14-lhc-export.png` (screenshot by Jim): Export menu, *Export to file in FHIR R4 format*.

**Fallback:** skip the builder and show `examples/pathology-walkthrough-stage1.json`, then render
it in the Smart Forms playground (section 4, pick `pathology-walkthrough-stage1`,
`img/questionnaires/02-playground-stage1.png`).

---

## 2. Meld open endpoint in a browser: Prepopulation and SMART decks

**URL to paste** (latest Hb for pam-demo):

```
https://gw.interop.community/QHConnectathon2026/open/Observation?code=http://loinc.org%7C718-7&patient=pam-demo&_sort=-date&_count=1&_format=json
```

Expected: a searchset Bundle, `total: 2`, one entry `Observation/pam-demo-hb-2`, value 104 g/L,
`effectiveDateTime` `2026-10-14T08:45:00+10:00` (`img/prepop/01-query-in-browser.png`).
SMART deck variant without `_count=1` (both Hb results): `img/smart/01-hb-search-open.png`.

Gotchas:

* **`|` must be typed as `%7C`.** A raw `|` gets HTTP 400 with an empty body, on `/open` as well
  as `/data`. `code=718-7` (no system) also works.
* **Add `&_format=json`.** Without it the browser gets XML (`application/fhir+xml`) and
  Chrome/Edge download a file instead of showing it.
* `total` counts all matches (2); `_count=1` only limits the page. `_sort=-date` puts the latest first.

---

## 3. fhirpath-lab: building and testing expressions (only expressions)

**URL:** https://fhirpath-lab.com/FhirPath

Layout (wide window): left = *Context Expression (optional)*, *Fhirpath Expression*, *RESULTS*;
right = *Test Resource JSON* editor. Engine defaults to **R4 / fhirpath.js** (shows
`fhirpath.js-4.5.1 (r4b)`). **Results don't update while you type**: click **▶** (top right;
tooltip "press alt+g to go") or press Ctrl+Enter.

To paste a resource: click in *Test Resource JSON*, Ctrl+A, paste. The header then says
*(local resource JSON)*.

### Prepopulation (paste the Bundle from section 2)

1. Copy the JSON from the browser tab in section 2 and paste it into *Test Resource JSON*.
   Leave *Context Expression* empty. To copy it in Chrome/Edge, click in the page, then Ctrl+A,
   Ctrl+C. The page text starts at `{`; the *Pretty-print* checkbox isn't part of it. Meld already
   indents the JSON.
2. Expression `entry.resource` → ▶ → the Observation `pam-demo-hb-2`
   (`img/prepop/02-fhirpath-lab-entry-resource.png`).
3. `entry.resource.value` → ▶ → a Quantity: `{"value":104,"unit":"g/L","system":"http://unitsofmeasure.org","code":"g/L"}`
   (`img/prepop/03-fhirpath-lab-value.png`).
4. `entry.resource.value.value` → ▶ → `104` (`img/prepop/04-fhirpath-lab-value-value.png`).
5. `entry.resource.effective.toString().substring(0, 10)` → ▶ → `2026-10-14` (String)
   (`img/prepop/05-fhirpath-lab-hb-date.png`).

In the form these become `%latestHb.entry.resource.value.value` and
`%latestHb.entry.resource.effective.toString().substring(0, 10)`.

### Write-back (paste `examples/sample-qr.json`)

1. Paste `examples/sample-qr.json` into *Test Resource JSON*. Its full text:

<details><summary>examples/sample-qr.json</summary>

```json
{
  "resourceType": "QuestionnaireResponse",
  "status": "completed",
  "questionnaire": "https://aehrc.github.io/qh-connectathon/track1/Questionnaire/pathology-walkthrough|0.1.0",
  "subject": {
    "reference": "Patient/pam-demo"
  },
  "authored": "2026-10-28T10:30:00+10:00",
  "item": [
    {
      "linkId": "pam-pathology",
      "text": "Pathology",
      "item": [
        {
          "linkId": "pam-hb",
          "text": "Haemoglobin (Hb)",
          "answer": [
            {
              "valueDecimal": 104
            }
          ]
        },
        {
          "linkId": "pam-ferritin",
          "text": "Ferritin",
          "answer": [
            {
              "valueDecimal": 18
            }
          ]
        },
        {
          "linkId": "pam-hb-date",
          "text": "Date of latest Hb",
          "answer": [
            {
              "valueDate": "2026-10-14"
            }
          ]
        },
        {
          "linkId": "pam-ext",
          "text": "Results from an external lab",
          "item": [
            {
              "linkId": "pam-ext-test",
              "text": "Test",
              "answer": [
                {
                  "valueCoding": {
                    "system": "http://loinc.org",
                    "code": "718-7",
                    "display": "Haemoglobin (Hb)"
                  }
                }
              ]
            },
            {
              "linkId": "pam-ext-value",
              "text": "Result",
              "answer": [
                {
                  "valueDecimal": 98
                }
              ]
            },
            {
              "linkId": "pam-ext-date",
              "text": "Collected",
              "answer": [
                {
                  "valueDate": "2026-10-27"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

</details>

2. *Context Expression*: `repeat(item).where(linkId='pam-ext')`. Results then show
   *Context: QuestionnaireResponse.item[0].item[3]*. The template's expressions run on the
   `pam-ext` repeat, as the extract does for an item with `templateExtract`
   (`expressions.json` id `ext-context`).
3. Expressions (from `examples/expressions.json`), each followed by ▶:

| Expression | Result | Screenshot |
|---|---|---|
| `item.where(linkId='pam-ext-test').answer.value` | Coding `http://loinc.org` `718-7` Haemoglobin (Hb) | `writeback/01-fhirpath-lab-ext-code.png` |
| `item.where(linkId='pam-ext-value').answer.value` | `98` | `writeback/02-fhirpath-lab-ext-value.png` |
| `iif(item.where(linkId='pam-ext-test').answer.value.code = '718-7', 'g/L', iif(item.where(linkId='pam-ext-test').answer.value.code = '2276-4', 'µg/L', iif(item.where(linkId='pam-ext-test').answer.value.code = '2502-3', '%', 'mg/L')))` | `g/L` | `writeback/03-fhirpath-lab-ext-unit.png` |
| `item.where(linkId='pam-ext-date').answer.value.toString()` | `2026-10-27` | `writeback/04-fhirpath-lab-ext-date.png` |
| `%resource.subject.reference` | `"Patient/pam-demo"` | `writeback/05-fhirpath-lab-ext-subject.png` |

`%resource` = the pasted resource (the QR); it works without setting anything.
fhirpath-lab note: *variables are not supported in the context expression*. Other `%names` used
in the main expression appear on a **Variables** tab (left), where you type their values (per
fhirpath-lab's source; not tried live).

Fallback: `make verify` runs the same expressions locally (fhirpath.js 5.2.2) with the same results.

---

## 4. Smart Forms playground: render, prepopulate, extract, write back

**Use the patched build: https://aehrc.github.io/qh-connectathon/smart-forms/playground**

* That deep link works in a browser, and so does a page refresh on it. GitHub Pages has no
  `/playground` file, though: it answers **HTTP 404** and serves the app's `404.html` SPA
  fallback, which renders the playground. Verified with Chromium on 28 Oct: status 404, page shows
  *Playground [^1.5.0]*, same after reload. curl and link checkers report 404.
* **Reliable route if the deep link misbehaves** (e.g. a proxy that replaces 404 pages): open
  **https://aehrc.github.io/qh-connectathon/smart-forms/** (HTTP 200). It goes to
  *dashboard/questionnaires*. Click **GO TO PLAYGROUND** in the left sidebar.
* The demos use **the patched build already deployed on `gh-pages`**
  (`apps/smart-forms`, `apps/deploy-pages.sh`). No rebuild or redeploy is needed. Don't redeploy
  before the session: a redeploy that changes `config.json` (forms server = Meld open endpoint)
  would break the picker in step 4.

**Not** `https://smartforms.csiro.au/playground`: the public build can't read anything from
Meld (see Surprises 1). The patched build is the same playground (header *Playground [^1.5.0]*).
Its forms server is the Meld open endpoint, so our questionnaires are in its picker.
Settings persist in the browser's localStorage.

1. Click the **gear** (top right) → *Launch Context Settings*.
2. *Source FHIR Server URL*: replace `https://hapi.fhir.org/baseR4` with
   `https://gw.interop.community/QHConnectathon2026/open`. Click the **?** icon at the right of the
   field (validates; shows *URL validated* and a green tick), then **SAVE URL AS SOURCE FHIR SERVER**.
   The SAVE URL button stays disabled until you validate.
3. *Selected Patient* dropdown → **Demi Formsdemo** (the **last** of 42 names; scroll down)
   (`img/prepop/06-playground-patient-list.png`). Shows ID `pam-demo`, female, 1961-04-09.
   *Selected Encounter*: "No encounters available for this patient" (fine).
   → **SAVE** (`img/prepop/07-playground-settings.png`). The header shows *Patient: Demi Formsdemo*.
4. *Or... pick a Questionnaire from our Forms Server*: click the box, choose
   **pathology-walkthrough** (or type it). Shows ID, title, canonical URL, version 0.1.0,
   resolvable URL (`img/prepop/08-playground-pick-form.png`). → **BUILD FORM ▶** (under the details).
5. The form renders **empty**; nothing is prepopulated automatically (`img/prepop/09-playground-built.png`).
6. **POPULATE ▾** → **Pre-populate (Replace whole form)**. Hb **104** g/L, ferritin **18** µg/L,
   date of latest Hb **14/10/2026** (`img/prepop/10-playground-prepopulated.png`). Network:
   `GET .../open/Observation?code=http://loinc.org%7C718-7&patient=pam-demo&_sort=-date&_count=1` → 200
   (the patched build encodes the `|`).

Write-back, continuing from 6:

7. *Results from an external lab*: Test = **Haemoglobin (Hb)**, Result **98**, Collected
   **27/10/2026** (type DD/MM/YYYY) (`img/writeback/06-playground-filled.png`). The *Result* field has no unit
   (the template computes it).
8. **EXTRACT ▾** → **Template-based $extract [^1.0.16]** (`img/writeback/07-playground-extract-menu.png` was meant to
   show the open menu but the capture missed it: it shows the filled form, as in 06; not used in the decks).
   Snackbar: *Successful template-based extraction. See Advanced Properties > Extracted to view
   extracted bundle.* (The other entries: Observation-based, Definition-based are greyed out,
   StructureMap-based struck through, plus *Template-based $extract (modified only)*.)
9. **ADVANCED PROPS** (right panel header) → tab **EXTRACT** → **TemplateExtractResult**: a
   `transaction` Bundle with one `POST Observation`: LOINC 718-7, subject `Patient/pam-demo`,
   valueQuantity 98 g/L (UCUM), `effectiveDateTime` `2026-10-27`
   (`img/writeback/08-playground-extracted-bundle.png`).
   The **QR** tab shows the QuestionnaireResponse (same content as `examples/sample-qr.json`;
   see Surprises 7).
10. **REVIEW WRITE BACK ITEMS** (bottom right) → dialog *Select items to write back to patient
    record*: Haemoglobin (Hb), Observation, `new` (`img/writeback/09-playground-write-back-dialog.png`)
    → **WRITE BACK (1 ENTRY)**. Snackbar: *Write back to https://gw.interop.community/QHConnectathon2026/open
    successful. See Network tab for response* (`img/writeback/10-playground-write-back-ok.png`).
    It POSTs the Bundle to the source FHIR server; the new Observation gets a server id (e.g. `694`).
11. Close the loop: **POPULATE ▾ → Pre-populate** again. Hb **98**, date **27/10/2026**; ferritin
    still 18 (`img/writeback/11-playground-close-the-loop.png`).
12. Afterwards: `./examples/reset-demo.sh`.

Alternative to step 4: paste a Questionnaire's JSON into the editor on the right (or drop a file
on the dashed box), then click **BUILD FORM** in the right panel's header.
**DESTROY FORM** returns to the picker.

The JSON editor takes the right half of the screen. I found no button that hides it; the icons
at the top right are readOnly display, quantity comparator, *show all items regardless of
enableWhen* and **Format JSON**. **ADVANCED PROPS** replaces it with the store viewer, and **SHOW
EDITOR** brings it back. For a cleaner view of the prepopulated form, zoom the browser or crop.

**Fallbacks:** if the patched build is down, `https://fhir-in-qh.smartforms.io/playground` (the
2025 connectathon build, *Playground [^1.0.0-alpha.107]*) can list Meld patients, but it sends a
raw `|`, so prepopulation fails unless the x-fhir-query uses `%7C` or a code without its system
(Surprises 2). Last resort: show the screenshots.

---

## 5. Meld launcher: SMART deck (screenshot by Jim)

Not automated (needs your Meld login). Screenshots to take, into `img/smart/`:

* `smart/10-meld-apps.png` (screenshot by Jim): the sandbox's Apps page with the app registration.
* `smart/11-meld-launch-patient.png` (screenshot by Jim): launch dialog with a patient selected (no patient = blank page).
* `smart/12-meld-app-registration.png` (screenshot by Jim): app registration form (launch URI, comma-separated redirect URIs, SMART v1 scopes).

---

## 6. CodeSandbox SMART starter: SMART deck (screenshot by Jim)

**URL:** https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q

**Not checked.** CodeSandbox (page and API) shows a Cloudflare bot check (*Performing security
verification*) to automated browsers, so the files, client id, `iss`, scope and redirect URI
**are unknown**. `tools/shoot-codesandbox.mjs` only reports whether the check is still there.
What's known from the 2025 Questionnaire track README
(`github.com/fongsean/questionnaire_track_fhir_in_qh`): *"A simple demo app that launches a
Questionnaire via SMART on FHIR. This app uses the SMART on FHIR JavaScript client library"*
(fhirclient). Its preview `https://0rd1q.csb.app/` is a create-react-app shell.

To do by hand before the SMART deck is finalised: open it logged in or as a normal browser user,
note the files and the `FHIR.oauth2.authorize({...})` options (`clientId`, `iss` /
`fhirServiceUrl`, `scope`, `redirectUri`), and take:

* `smart/20-codesandbox-files.png` (screenshot by Jim): file tree with the entry file open.
* `smart/21-codesandbox-authorize.png` (screenshot by Jim): the `FHIR.oauth2.authorize` call.
* `smart/22-codesandbox-preview.png` (screenshot by Jim): the preview pane / preview URL.

---

## Screenshot index

| File | Shows |
|---|---|
| `questionnaires/01-lhc-terms.png` | NLM Form Builder opening dialog (LOINC Terms of Use) |
| `questionnaires/02-playground-stage1.png` | Stage 1 form rendered in the playground |
| `prepop/01-query-in-browser.png` | Latest-Hb search on the open endpoint, JSON in the browser |
| `prepop/02-fhirpath-lab-entry-resource.png` | fhirpath-lab: `entry.resource` on the Bundle |
| `prepop/03-fhirpath-lab-value.png` | `entry.resource.value` → Quantity |
| `prepop/04-fhirpath-lab-value-value.png` | `entry.resource.value.value` → 104 |
| `prepop/05-fhirpath-lab-hb-date.png` | `...effective.toString().substring(0, 10)` → 2026-10-14 |
| `prepop/06-playground-patient-list.png` | Playground settings: patient list, Demi Formsdemo last |
| `prepop/07-playground-settings.png` | Settings: Meld open endpoint validated, pam-demo selected |
| `prepop/08-playground-pick-form.png` | pathology-walkthrough picked from the forms server |
| `prepop/09-playground-built.png` | Form built, empty |
| `prepop/10-playground-prepopulated.png` | After Pre-populate: 104, 18, 14/10/2026 |
| `writeback/01-fhirpath-lab-ext-code.png` | `ext-code` on sample-qr.json, pam-ext context → LOINC 718-7 |
| `writeback/02-fhirpath-lab-ext-value.png` | `ext-value` → 98 |
| `writeback/03-fhirpath-lab-ext-unit.png` | `ext-unit` → g/L |
| `writeback/04-fhirpath-lab-ext-date.png` | `ext-date` → 2026-10-27 |
| `writeback/05-fhirpath-lab-ext-subject.png` | `%resource.subject.reference` → Patient/pam-demo |
| `writeback/06-playground-filled.png` | External result Hb 98 on 27/10/2026 entered |
| `writeback/07-playground-extract-menu.png` | Meant to be the EXTRACT menu; the menu wasn't captured, so it shows the filled form as in 06 (not used in decks) |
| `writeback/08-playground-extracted-bundle.png` | TemplateExtractResult: the Observation |
| `writeback/09-playground-write-back-dialog.png` | Write-back review dialog |
| `writeback/10-playground-write-back-ok.png` | Write-back success snackbar |
| `writeback/11-playground-close-the-loop.png` | Re-populated: latest Hb 98, 27/10/2026 |
| `smart/01-hb-search-open.png` | All Hb Observations for pam-demo on the open endpoint |

---

## Surprises

1. **The public Smart Forms playground (`smartforms.csiro.au/playground`) can't use Meld.** It
   sends `Cache-Control: no-cache` on FHIR requests. Meld's CORS preflight doesn't allow that header
   (`access-control-allow-headers: X-FHIR-Starter,authorization,Prefer,Origin,Accept,X-Requested-With,Content-Type,...`),
   so `Patient?_count=100` fails (`net::ERR_FAILED`) and the settings dialog says *No patients
   available*. No patient means no prepopulation, and write-back would hit the same problem.
   Only `metadata` works, so the URL still validates. Our patched build
   (`aehrc.github.io/qh-connectathon/smart-forms/playground`, already deployed on gh-pages)
   drops that header and encodes `|`. Everything in section 4 works there. That URL is served
   via the Pages 404 SPA fallback (HTTP 404, renders fine in browsers). The reliable route is
   `/smart-forms/` → **GO TO PLAYGROUND**.
2. **Raw `|` in the x-fhir-query:** tested on the unpatched 2025 build
   (`fhir-in-qh.smartforms.io/playground`, which can list Meld patients): `code=http://loinc.org|718-7`
   → request fails (400, reported as CORS), form stays empty. **Both workarounds work** there:
   `code=http://loinc.org%7C718-7` → 200, Hb 104; `code=718-7` → 200, Hb 104 (tested on temporary
   copies; `examples/` unchanged). With the patched build no workaround is needed.
3. **Opening a Meld search URL in a browser downloads a file** (XML) unless you add `&_format=json`.
4. **LHC Form Builder URL** in the brief (`formbuilder.lhcforms.nlm.nih.gov`) doesn't resolve; use
   `https://formbuilder.nlm.nih.gov/`. It opens with a LOINC Terms of Use dialog; the builder
   flow wasn't verified live (section 1).
5. **CodeSandbox blocks automated browsers** (Cloudflare check, also on its API), so the starter's
   code and client settings are unverified (section 6).
6. **fhirpath-lab doesn't evaluate as you type** (▶ / Ctrl+Enter), and its fhirpath.js is 4.5.1
   (r4b) vs 5.2.2 in `make verify`. Results are the same for all our expressions.
7. The playground's QuestionnaireResponse matches `sample-qr.json` in items and answers but has
   `status: in-progress`, no `authored`, `subject` with `type: "Patient"` and
   `display: "Demi Formsdemo"`, and `meta.source: https://smartforms.csiro.au`. The extracted
   Observation is as expected (`effectiveDateTime: "2026-10-27"`, date only).
8. The playground doesn't prepopulate on Build. You have to choose *POPULATE → Pre-populate*.
   No SMART launch is needed: the settings dialog's patient picker sets `%patient`.
