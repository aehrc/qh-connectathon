# Track 1 kick-off decks — design

Date: 2026-10-28 (connectathon is 29–30 Oct 2026; Track 1 kick-off is **29 Oct, 11:30–13:00**,
in the Track 1 room). Track leads: Jim Steel, Leonie Dickson (AEHRC), Leon Cavalli (QH).

## Why

The 8 Oct pre-connectathon webinar sold the idea (PAM forms and dashboard rebuilt with FHIR).
At the connectathon, participants need to **get started on the scenarios in
[`Scenarios.md`](../../../2026-10-29/1-FHIR-For-Users/Scenarios.md)** — so these decks go one
level deeper: the actual JSON, FHIRPath, queries and code, step by step, on the real tools.

They are presented once at the kick-off, then **participants refer back to them on GitHub**
during the two days, without a presenter. Every walkthrough must therefore stand on its own.

## Kick-off running order

1. **Leon — the PAM problem space.** His material (adapted from the webinar). *Not built here.*
2. **Scenarios deck** — the menu.
3. **SMART apps deck** — then the apps cohort splits off and starts.
4. **Questionnaires deck**
5. **Prepopulation deck**
6. **Write-back deck**

SMART apps goes before the forms decks because (a) Smart Forms is itself a SMART app — launch
context and tokens are what prepopulation runs on, so forms people benefit too; (b) the forms
decks then read as one continuous build; (c) the apps cohort gets the most build time.
Technical decks are ~15 min each (about 90 min total with Leon and scenarios); live demos
alongside.

## Deliverables

1. **Five Marp decks** (Markdown), one per item 2–6 above.
2. **Built outputs:** HTML (for GitHub Pages, the primary way participants read them) and
   PPTX/PDF for presenting.
3. **Published on GitHub Pages** under `https://aehrc.github.io/qh-connectathon/` (e.g.
   `/decks/`), linked from the site index and the track README.
4. **Presenter walkthrough guide** for Jim: click-by-click instructions for each site used in
   the demos (LHC Form Builder, fhirpath-lab, Smart Forms on GitHub Pages / smartforms.csiro.au,
   Meld launcher, CodeSandbox starter), with exact inputs to paste, expected results, and
   gotchas/fallbacks. Markdown in the repo beside the decks.

## Content

### Common to all decks

* Self-contained: every step has the exact JSON / FHIRPath / query / code on the slide and the
  URL to open. **Real screenshots** of the tools at each key step (captured with Playwright where
  possible). A "▶ Demo" marker where the presenter switches to the browser.
* Each technical deck ends with **"Now you try"**: the matching scenarios (IDs from
  `Scenarios.md`), the repo files to start from, and links.
* All examples use the PAM case and the Meld sandbox `QHConnectathon2026`:
  open endpoint `https://gw.interop.community/QHConnectathon2026/open`,
  secured `https://gw.interop.community/QHConnectathon2026/data`.
* Synthetic data only. **No Metro North dashboard screenshots** (that's why the webinar
  `slides/` folder is git-ignored; the new decks live in a separate, committed folder).
* Look: the webinar deck's palette as a Marp theme — navy `0A2033`, teal `00738F` / bright teal
  `00A9CE`, orange `B9531A` for demo markers, body text `3D4F5E`, light background `F6F8F9`;
  Calibri-like sans; monospace code blocks.

### Running example (forms decks): Pathology

The three forms decks build up **one cut-down version of the `pam-pathology` module**
(`questionnaires/modules/pam-pathology.json`), then point at the real module for comparison.

### Deck: Scenarios

* Strands as in `Scenarios.md`: A (questionnaire modules, incl. A10 assembly), B (SMART apps),
  C (end to end), D (REDCap + FHIR).
* Per strand: short scenario cards — ID, title, ★ level, "you'll touch: …".
* Shared conventions and the draft FHIR mapping (one slide; link to `FHIR-Mapping-DRAFT.md`
  and the module conventions in `questionnaires/README.md`).
* "Where things are": Meld URLs, Smart Forms / dashboard on Pages, GitHub repo, the
  Storybook/CodeSandbox/Postman links from the official programme. Note strand D's dependency on
  a REDCap instance with external modules.
* Ends by pointing to the order of the technical decks (apps first, then forms).

### Deck: SMART apps

* Concepts: EHR launch sequence (launch → authorize → token → FHIR calls), Meld's launcher and
  app registration, scopes.
* **Client IDs come from Jim.** Participants don't register apps in Meld themselves: they send
  Jim their app's launch URI and redirect URI (e.g. their CodeSandbox preview URL), and he
  registers it and gives them a client ID. The deck says exactly what to send and where to put
  the client ID in the starter.
* Meld gotchas (from `Demo-Environment.md`): SMART v1 scopes only; redirect URIs comma-separated;
  requested scopes ⊆ registered; encode `|` as `%7C` on the secured endpoint; launch with a
  patient selected.
* Code: walk through the programme's CodeSandbox starter
  (`https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q`) — `FHIR.oauth2.authorize` →
  `FHIR.oauth2.ready()` → `client.request`.
* First app: fetch the current patient's Hb Observations (the same LOINC 718-7 search the forms
  decks use) and show them — the start of B1.
* Now you try: B1–B9; pointer to `apps/pam-dashboard` as a fuller example; Postman collection.

### Deck: Questionnaires (LHC Form Builder)

* Walkthrough in LHC Form Builder building a "Pathology results" form: Hb and ferritin as
  decimals with UCUM units, a date; a repeating "Results from an external lab" group (test as
  a choice with LOINC answer options, value, date).
* Concepts as they come up: Questionnaire vs QuestionnaireResponse, linkId, item types,
  `repeats`, `answerOption` codings, units extension, `required`, `enableWhen`.
* Export the JSON; compare with the real module; load it to the Meld open endpoint and render it
  in Smart Forms (or the Storybook / LHC preview).
* Now you try: A-strand modules, conventions, `build.py`.

### Deck: Prepopulation

* `launchContext` (patient) and an x-fhir-query variable:
  `Observation?code=http://loinc.org|718-7&patient={{%patient.id}}&_sort=-date&_count=1`.
* Run that query against the Meld open endpoint for a synthetic patient; paste the Bundle into
  fhirpath-lab.com; build the expression up step by step: `entry.resource` → `.value` (Quantity)
  → `.value.value`; then the date with `.effective.toString().substring(0, 10)`.
* Put it in `initialExpression`; show the form pre-populated in the **Smart Forms playground**
  (`https://smartforms.csiro.au/playground`), pointed at the Meld open endpoint and the demo
  patient. (Per Jim: the playground is the demo tool for prepopulation and write-back;
  fhirpath-lab is used only for building and testing FHIRPath expressions.) Launching from Meld
  is mentioned as the "real EHR" path, not demoed step by step.
* Brief: `calculatedExpression` (the same FHIRPath machinery), shared variables on the root form.
* Now you try: A1, A5, A6.

### Deck: Write-back

* Template-based `$extract`: the repeating external-lab group with `templateExtract` → one
  Observation per repeat, using the contained template in the real module.
* Walk through the template's `templateExtractValue` expressions (code from the chosen LOINC
  coding, `valueQuantity` with UCUM unit, `effectiveDateTime`, subject from `%patient`).
* Test the expressions in fhirpath-lab against a sample QuestionnaireResponse (fhirpath-lab is for
  expressions only).
* Fill in the form in the **Smart Forms playground**, run the extract there, see the extracted
  Observations, save them to the Meld open endpoint; close the loop — the new Hb appears the
  next time the form pre-populates.
* Pointer to the larger A6 (Condition) and A7 (MedicationRequest) templates in the repo.
* Now you try: A5–A9, C1.

## Constraints

* Scenarios and SMART apps decks ready for the 11:30 kick-off on 29 Oct; the rest can follow
  after lunch.
* Must work for participants on non-QH networks with Edge; nothing to install to read the decks.
* Facts about tools must be verified against the live sites (LHC Form Builder, fhirpath-lab,
  Smart Forms, Meld), not assumed — Playwright exploration is welcome.
* Don't change the live demo environment in ways that break the existing webinar demos
  (Smart Forms config, dashboard, loaded questionnaires/data). Adding new resources to the Meld
  open endpoint is fine.

## Non-goals

* Leon's PAM problem-space deck.
* Changing the scenarios themselves.
* Editable-in-PowerPoint decks (Marp PPTX is fine).

## Decided by Claude (check these)

* Decks live in `2026-10-29/1-FHIR-For-Users/decks/` (committed), separate from the ignored
  `slides/`; with a Makefile like Track 2's (`html`, `pptx`, `pdf`, `preview`).
* Published to Pages by extending `apps/deploy-pages.sh` to copy the built HTML + images to
  `/decks/`, and linked from `apps/site-index.html` and the track README.
* Presenter guide at `decks/Presenter-Guide.md`.
* Work split across subagents (one per deck, after a shared theme and tool exploration pass).
* The cut-down pathology form **keeps the real module's linkIds and variable names**
  (`pam-hb`, `%latestHb`, `pam-ext`, …) so comparisons line up and the write-back deck reuses
  the real contained template.
* `deploy-pages.sh` is extended to copy `/decks/`; it republishes the committed
  `apps/smart-forms/dist` unchanged. **Nothing is pushed to gh-pages without Jim's OK.**
* Forms demos use a **new dedicated synthetic demo patient** (so write-back doesn't change the
  webinar patients or the B6 charts). Meld launch scenarios for it (custom context
  `questionnaire` = the cut-down form) are optional, created by Jim in the Meld UI if wanted —
  the demos run in the Smart Forms playground, which doesn't need them.
* Build order (also the priority order): scenarios → SMART apps → questionnaires →
  prepopulation → write-back → presenter guide → Pages publishing. Per Jim, any deck not ready
  for 11:30 is simply presented after lunch on day 1 (the track runs all day Thu and Fri), so
  quality and verified content beat finishing everything tonight.

## Left to the builder

Slide-level structure and wording, exact screenshot choices, theme CSS details, how the
Playwright exploration is organised.
