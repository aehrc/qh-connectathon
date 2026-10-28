# Track 1 Kick-off Decks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five self-contained Marp decks (scenarios, SMART apps, questionnaires, prepopulation, write-back) plus a presenter guide for the Track 1 kick-off, readable on GitHub and GitHub Pages.

**Architecture:** One `decks/` folder in the track with a shared Marp theme, a Makefile, verified FHIR example artifacts (`decks/examples/`), Playwright capture scripts producing screenshots (`decks/img/`), and one Markdown file per deck. Every FHIRPath expression, query and JSON snippet shown on a slide comes from `decks/examples/` and is checked by `decks/examples/verify.mjs` against the Meld open endpoint.

**Tech Stack:** Marp CLI (`/opt/homebrew/bin/marp`), Node 26, `fhirpath` (npm) for expression checks, Playwright (npm, browsers already cached in `~/Library/Caches/ms-playwright`), curl.

**Spec:** `docs/superpowers/specs/2026-10-28-track1-kickoff-decks-design.md`

## Global Constraints

- All paths below are relative to `2026-10-29/1-FHIR-For-Users/` unless they start with `docs/`.
- Meld open endpoint `https://gw.interop.community/QHConnectathon2026/open`; secured `https://gw.interop.community/QHConnectathon2026/data`.
- Synthetic data only. No Metro North dashboard screenshots; nothing copied from `slides/`.
- Palette: navy `#0A2033`, teal `#00738F`, bright teal `#00A9CE`, orange `#B9531A` (demo markers), body `#3D4F5E`, light bg `#F6F8F9`, muted `#5B6B78`, card outline `#D5DEE4`.
- Don't modify existing Meld resources (`pam-001`…`pam-040`, loaded questionnaires) or `apps/smart-forms/`, `apps/pam-dashboard/`. Adding new resources to the open endpoint is allowed.
- Demo patient id: `pam-demo`. Cut-down form canonical: `https://aehrc.github.io/qh-connectathon/track1/Questionnaire/pathology-walkthrough|0.1.0`, keeping the real module's linkIds (`pam-pathology`, `pam-hb`, `pam-ferritin`, `pam-hb-date`, `pam-ext`, `pam-ext-test`, `pam-ext-value`, `pam-ext-date`) and variable names (`latestHb`, `latestFerritin`).
- SMART deck: participants get client IDs from Jim (send launch URI + redirect URI); SMART v1 scopes only; `|` → `%7C` on the secured endpoint; launch with a patient selected.
- Demo tools: **Smart Forms playground** (`https://smartforms.csiro.au/playground`) for rendering, prepopulation and write-back/extract demos; **fhirpath-lab.com only for building/testing FHIRPath expressions**; LHC Form Builder for authoring.
- Every walkthrough slide shows the exact URL to open and the exact text to paste. Each technical deck ends with "Now you try" naming scenario IDs from `Scenarios.md` and repo files.
- Never push to `gh-pages` or `origin` without Jim's explicit OK.

## Review Focus

1. **Expression drift** — a FHIRPath shown on a slide that differs from the one verified. Expect: `verify.mjs` checks every expression file referenced by slides; decks include expressions only by copying from `examples/` (Task 2 test `verify.mjs` + Task 9 grep check).
2. **Raw `|` on the secured endpoint** — participants copy a query with `|` into an app hitting `/data` and get a fake CORS error. Expect: SMART deck code uses `%7C`; Task 4 check greps the SMART deck for `/data` URLs containing a raw `|`.
3. **Edge / phone width reading on Pages** — wide code blocks overflow. Expect: theme sets code font so a 100-char line fits at 1280 px; Task 1 preview check.
4. **Tool UI changed since screenshots** — LHC Form Builder / fhirpath-lab update their UI. Expect: capture scripts are re-runnable (`make shots`), and the presenter guide notes the fallback for each step.
5. **Demo patient polluted by repeated demos** — write-back demos keep adding Observations to `pam-demo`, changing "latest Hb". Expect: `examples/reset-demo.sh` deletes Observations for `pam-demo` and reloads the baseline (Task 2).

---

### Task 1: Scaffold, theme and build

**Files:**
- Create: `decks/README.md`, `decks/Makefile`, `decks/theme/track1.css`, `decks/00-sample.md` (deleted at end of task), `decks/.gitignore` (`build/`, `node_modules/`), `decks/package.json`

**Interfaces:**
- Produces: theme name `track1` (Marp `theme: track1`); slide classes `title` (dark navy title slide), `section` (dark divider), `demo` (orange "▶ Demo" eyebrow via `<!-- _class: demo -->`), `tryit` ("Now you try"); helper classes `.cards` (grid of scenario cards), `.small`; Make targets `html`, `pdf`, `pptx`, `preview`, `shots`, `verify`, `check`; output `decks/build/<deck>.html`, `decks/build/img/…`.

- [ ] **Step 1:** Write the theme and Makefile. Makefile builds every `decks/[0-9]*.md` with `marp --theme-set theme/track1.css --allow-local-files --html`; `html` also copies `img/` to `build/img/`; `check` = build all HTML + fail if any `![...](img/x)` reference is missing on disk.
- [ ] **Step 2:** Write `00-sample.md` exercising every class (title, section, demo, tryit, cards, a 100-char code line, an image).
- [ ] **Step 3:** Run `make check preview`. Expected: exit 0, PNGs in `build/preview/`. Look at the PNGs: navy title, orange demo eyebrow, code line not clipped.
- [ ] **Step 4:** Delete `00-sample.md`, commit (`Track 1 decks: Marp theme and build`).

### Task 2: Verified FHIR examples and demo patient

**Files:**
- Create: `decks/examples/pathology-walkthrough.json` (Questionnaire, cut-down `pam-pathology`: Hb, ferritin, Hb date, repeating `pam-ext` group with `templateExtract` + contained `PAMExternalResultTemplate` copied from the real module), `decks/examples/pathology-walkthrough-stage1.json` (no prepop/extract — what the LHC Form Builder walkthrough produces), `decks/examples/pam-demo-bundle.json` (Patient `pam-demo` + baseline Hb, ferritin, height, weight Observations), `decks/examples/sample-qr.json` (QuestionnaireResponse with one external result), `decks/examples/expressions.json` (every FHIRPath/query shown in a deck: `{id, expression, context, expected}`), `decks/examples/verify.mjs`, `decks/examples/load.sh`, `decks/examples/reset-demo.sh`

**Interfaces:**
- Produces: expression ids used by decks — `query-latest-hb`, `fp-entry-resource`, `fp-value`, `fp-value-value`, `fp-hb-date`, `ext-code`, `ext-value`, `ext-unit`, `ext-date`, `ext-subject`; file names above.

- [ ] **Step 1:** Write `verify.mjs`: for each entry in `expressions.json`, fetch/construct its context (`bundle:query-latest-hb` = live GET of the query for `pam-demo` on the open endpoint; `qr:sample` = `sample-qr.json` item context), evaluate with `fhirpath` + R4 model, assert deep-equal to `expected`; also assert `pathology-walkthrough.json` linkIds ⊇ the Global Constraints list. Exit non-zero on any mismatch.
- [ ] **Step 2:** Run `node verify.mjs` before loading anything. Expected: FAIL (patient `pam-demo` not found / query returns empty).
- [ ] **Step 3:** Write the JSON files and `load.sh` (PUT bundle + both Questionnaires to the open endpoint), `reset-demo.sh` (delete `Observation?patient=pam-demo` then re-run `load.sh`). Run `./load.sh`.
- [ ] **Step 4:** Run `node verify.mjs`. Expected: all ids PASS (e.g. `fp-value-value` → `[<baseline Hb>]`, `ext-unit` → `['g/L']`).
- [ ] **Step 5:** Commit (`Track 1 decks: verified walkthrough examples and demo patient`).

### Task 3: Tool exploration, screenshots and guide notes

**Files:**
- Create: `decks/tools/shoot-*.mjs` (one per site: `lhc`, `fhirpath-lab`, `smart-forms-playground`, `codesandbox`), `decks/img/<deck>/<nn>-<step>.png`, `decks/Presenter-Guide.md` (raw notes per site)

**Interfaces:**
- Consumes: Task 2 example files and the `pam-demo` patient.
- Produces: screenshot paths `img/questionnaires/…`, `img/prepop/…`, `img/writeback/…`, `img/smart/…`; guide sections per site (URL, clicks, exact inputs, expected result, gotchas, fallback).

- [ ] **Step 1:** Install Playwright into `decks/` (`npm i -D playwright fhirpath`; browsers cached). Explore each site headed/headless and record in the guide what actually works (e.g. LHC Form Builder: import JSON? units? answer options with system? export R4; fhirpath-lab: how to paste a resource and set context/variables; Smart Forms playground: how to load a Questionnaire, point it at the Meld open endpoint, pick patient `pam-demo`, see prepopulation, run extract and view/save the extracted resources; CodeSandbox starter: what files and which client id/iss it uses). Note anything that contradicts the spec in the guide under "Surprises".
- [ ] **Step 2:** Write capture scripts reproducing each walkthrough step, 1600×900 viewport. Meld launcher steps (only needed for the SMART deck) need Jim's login: don't automate; mark them "screenshot by Jim" in the guide.
- [ ] **Step 3:** Run `make shots`. Expected: every PNG listed in the guide exists, non-blank (> 20 KB).
- [ ] **Step 4:** Report "Surprises" back to the controller before deck tasks start. Commit (`Track 1 decks: screenshots and tool notes`).

### Task 4: Scenarios deck — `decks/1-scenarios.md`

- [ ] **Step 1:** Write the deck per spec "Deck: Scenarios" (all IDs A1–A11, B1–B9, C1–C2, D1–D4 with ★ levels exactly as in `Scenarios.md`; conventions/mapping slide; "where things are" with the Meld URLs and the programme's Storybook / CodeSandbox `smart-on-fhir-0rd1q` / Postman links; strand D REDCap dependency; closing slide giving the deck order).
- [ ] **Step 2:** Check: `grep -oE '\b[A-D][0-9]+\b' 1-scenarios.md | sort -u` equals the same over `../Scenarios.md`; `make check preview`; view PNGs (cards don't overflow).
- [ ] **Step 3:** Commit.

### Task 5: SMART apps deck — `decks/2-smart-apps.md`

- [ ] **Step 1:** Write the deck per spec "Deck: SMART apps", including the "ask Jim for a client ID" slide (what to send: launch URI, redirect URI; where the client id goes in the starter) and first app = current patient's Hb Observations, using `query-latest-hb` without `_count=1` and with `%7C`.
- [ ] **Step 2:** Check: `grep -nE 'QHConnectathon2026/data[^ ]*\|' 2-smart-apps.md` returns nothing; code snippets match the starter as recorded in the guide; `make check preview`.
- [ ] **Step 3:** Commit.

### Task 6: Questionnaires deck — `decks/3-questionnaires.md`

- [ ] **Step 1:** Write per spec "Deck: Questionnaires", walking LHC Form Builder to produce exactly `pathology-walkthrough-stage1.json` (as the guide found the tool actually behaves), with screenshots from `img/questionnaires/`, then load and render it.
- [ ] **Step 2:** Check: JSON on slides matches `stage1` (same linkIds/types); `make check preview`. Commit.

### Task 7: Prepopulation deck — `decks/4-prepopulation.md`

- [ ] **Step 1:** Write per spec "Deck: Prepopulation" using expression ids `query-latest-hb`, `fp-entry-resource`, `fp-value`, `fp-value-value`, `fp-hb-date` and their verified results, with `img/prepop/` screenshots.
- [ ] **Step 2:** Check (as Task 9's grep), `make check preview`. Commit.

### Task 8: Write-back deck — `decks/5-write-back.md`

- [ ] **Step 1:** Write per spec "Deck: Write-back" using ids `ext-*`, `sample-qr.json`, and `img/writeback/`; include the reset note for presenters only in the guide, not the deck.
- [ ] **Step 2:** Check, `make check preview`. Commit.

### Task 9: Presenter guide, cross-checks, publishing prep

**Files:**
- Modify: `decks/Presenter-Guide.md` (finish: per deck, a run sheet — before-session checklist incl. `reset-demo.sh`, step list with exact inputs, expected result, fallback), `decks/README.md` (list decks, build, links), `README.md` (track contents table: add `decks/`), `apps/deploy-pages.sh` (copy `decks/build/*.html` + `decks/build/img` to `$SITE/decks/`), `apps/site-index.html` (link to the decks)

- [ ] **Step 1:** Add `make verify-slides`: for every `expressions.json` entry, check the expression string appears verbatim in at least one deck, and every FHIRPath-looking code span in decks (`entry.resource…`, `item.where(…`) appears in `expressions.json`. Run it; Expected: PASS.
- [ ] **Step 2:** Finish the guide and READMEs; run `make check verify` again.
- [ ] **Step 3:** Update deploy script and site index; run `bash -n apps/deploy-pages.sh`. **Do not run the deploy.**
- [ ] **Step 4:** Commit; ask Jim before deploying or pushing.
