# Questionnaire builder skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent-neutral skill that turns an existing form (scan, screenshot, REDCap dictionary)
or a list of items into a FHIR Questionnaire with prepopulation and extraction, questioning the
form's design along the way. It also produces sample data and a change log.

**Architecture:** The deliverable is mostly prose: a `SKILL.md` that holds the flow and rules,
plus reference files the agent loads when needed. An optional Node toolkit (`scripts/`) does the
checking:
- lint
- FHIRPath evaluation with fhirpath.js
- population and template extraction with the Smart Forms libraries, against a local sample
  Bundle or a FHIR server
- load and cleanup

An optional MCP server wraps the same functions. A build script generates a single-file version
for agents that don't load skill folders. The skill's behaviour is tested with fresh subagents
acting as participants.

**Tech Stack:**
- Markdown (Agent Skills format)
- Node ≥ 20, ES modules, `node:test`
- `fhirpath` (R4 model)
- `@aehrc/sdc-populate` 4.7.2
- `@aehrc/sdc-template-extract` 1.0.16
- `@modelcontextprotocol/sdk` 1.x

**Spec:** `docs/superpowers/specs/2026-10-30-questionnaire-builder-skill-design.md` (read it
first; this plan argues from it).

## Global Constraints

- Skill root: `2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/` (below: `S/`). Skill
  name `questionnaire-builder`.
- `SKILL.md` frontmatter has exactly `name` and `description`. The skill must work with **no code
  execution and no network**. The scripts are optional and never required.
- Audience: not necessarily a FHIR person. Questions are about their form, their patients and their
  workflow. No FHIR lecture; explain a FHIR term only when it has to be used.
- Flow: draft fast (structure only, no prepopulation or extraction) → probe in rounds, a few
  questions at a time, each ending in a visible new version → the change log grows each round.
  Round order: structure and design → users → prepopulation → extraction. The person can redirect.
- Four strands:
  - design of the existing form
  - who fills it in and who reads it
  - upstream data and its shape
  - purpose and downstream use
- Plus **how the form varies**, asked explicitly: by user, by patient characteristics (sex, age
  band, pregnancy, known condition), and by context (setting, stage of care).
- Defaults, each overridable:
  - FHIR R4 + SDC
  - AU Core 2.0.0 with **no `meta.profile`**
  - launchContext `patient` (+ `user`), x-fhir-query variables
  - template-based extraction (`sdc-questionnaire-templateExtract`, contained templates,
    `templateExtractValue`)
  - LOINC, SNOMED CT-AU and AMT codes from Ontoserver lookups, or flagged as unverified; never
    invented silently
  - `%7C` for `|` in queries
  - `repeat(item)` over a QuestionnaireResponse
  - SMART v1 scopes
- Target environment is a setting, not fixed. Documented example: Meld
  `https://gw.interop.community/QHConnectathon2026/open` plus the playground
  `https://aehrc.github.io/qh-connectathon/smart-forms/`. There is a fallback for when no FHIR
  server is available.
- PII:
  - The opening asks for a blank or covered form.
  - If identifiable details arrive anyway, the skill says so (they have already gone to the AI
    provider; follow the local process), uses structure only, reads values as shape clues only,
    and never repeats them.
  - It never claims to redact the image.
  - No patient data in terminology requests.
- Sample data:
  - a transaction Bundle using PUT, with ids under a participant prefix (default `<initials>-`)
  - a cleanup Bundle of DELETEs
  - covers the form's variation (for example a female and a male patient)
  - never touches `pam-001`..`pam-040`, `pam-demo` or anything it didn't create
  - nothing is loaded without the person's say-so
- One Questionnaire in version 1. Separate or chained forms are recommended and logged, not built.
- Non-goals: a renderer, REDCap export, authoring new value sets or CodeSystems, CQL,
  definition-based or StructureMap extraction.

## Review Focus

1. **A round-1 draft with no prepopulation or extraction.** `check` must report "nothing to
   populate or extract" and pass, not crash. Test in Task 4.
2. **An expression using a variable that's undefined at its scope** (item-level variable used
   elsewhere, a misspelt `%latestHb`). It must be a FAIL that names the linkId and the variable,
   not an exception. Test in Task 2.
3. **A raw `|` or a `//` scheme in an x-fhir-query**, and `{{%patient.id}}` substitution. Lint
   warns about the raw `|`. The local search resolves the substituted query. Tests in Tasks 1
   and 3.
4. **Sample data that touches shared patients, or ids without the prefix.** `lintBundle` gives an
   error, and `load` refuses. Tests in Tasks 1 and 5.
5. **A template whose `templateExtractValue` paths match nothing**, so extraction yields empty or
   missing resources. `check` must warn about each template that produced no resource or an empty
   one. Test in Task 3.

---

## File structure

```
S/
  SKILL.md                      flow, strands, rules; points into reference/
  README.md                     what it is; install (Claude Code, claude.ai, other agents); scripts
  reference/
    starting-points.md          reading scans, screenshots, REDCap dictionaries, lists
    probing.md                  four strands + variation: questions and what each answer changes
    sdc-cheatsheet.md           SDC patterns with snippets (verified by snippets/ + check)
    upstream-shapes.md          AU Core vs US Core vs local: searches and FHIRPath per common item
    environments.md             target environment setting; connectathon example; no-server fallback
    sample-data.md              Bundle conventions, prefix, cleanup, covering variation
    change-log-template.md      the change log's shape
    snippets/
      demo-questionnaire.json   one small form that exercises every cheat-sheet pattern
      demo-sample-data.json     its sample Bundle (two patients: female, male)
  examples/
    pathology-request/          worked example (Task 9)
  scripts/
    package.json
    lib/lint.mjs                lintQuestionnaire, lintBundle
    lib/expressions.mjs         collectExpressions, evaluateExpressions
    lib/localServer.mjs         makeLocalFetch (search a sample Bundle offline)
    lib/sdc.mjs                 runPopulate, runExtract
    lib/check.mjs               checkAll (the combined report)
    check.mjs                   CLI
    load.mjs                    CLI: load / cleanup with --yes
    mcp-server.mjs              optional MCP wrapper
    build-single-file.mjs       generates ../dist/questionnaire-builder.md
    test/*.test.mjs
  dist/questionnaire-builder.md generated single-file version (committed)
```

---

### Task 1: Toolkit scaffold and lint

**Files:**
- Create: `S/scripts/package.json`, `S/scripts/lib/lint.mjs`, `S/scripts/test/lint.test.mjs`,
  `S/scripts/test/fixtures/` (small Questionnaire and Bundle JSON per test)
- Modify: `.gitignore` (add `**/skills/questionnaire-builder/scripts/node_modules/`)

**Interfaces:**
- Produces:
  - `lintQuestionnaire(q: object) -> {errors: Issue[], warnings: Issue[]}`
  - `lintBundle(bundle: object, {prefix: string}) -> {errors: Issue[], warnings: Issue[]}`
  - `Issue = {code: string, message: string, linkId?: string, path?: string}`

- [ ] **Step 1:** Create `package.json`:
  - `"type": "module"`, `"private": true`
  - `scripts.test = "node --test test/"`
  - dependencies: `fhirpath@^5.2.2`, `@aehrc/sdc-populate@4.7.2`,
    `@aehrc/sdc-template-extract@1.0.16`, `@modelcontextprotocol/sdk@^1.32.2`

  Run `npm install` in `S/scripts`. Expected: no errors.
- [ ] **Step 2: Write failing tests** in `lint.test.mjs`:
  - `resourceType !== 'Questionnaire'` → error `not-questionnaire`
  - duplicate linkId → error `duplicate-linkid` with that linkId
  - `enableWhen.question` naming a missing linkId → error `enablewhen-target`
  - choice item with neither `answerOption` nor `answerValueSet` → warning `choice-no-answers`
  - x-fhir-query containing a raw `|` → warning `raw-pipe` (message mentions `%7C`)
  - `meta.profile` present on the Questionnaire or any contained template → warning
    `meta-profile`
  - `lintBundle` with an entry id not starting with the prefix → error `id-prefix`
  - `lintBundle` with an entry id, or any `reference`, matching `/^(Patient\/)?pam-(\d{3}|demo)$/`
    → error `shared-patient`
  - `lintBundle` with `type !== 'transaction'`, or a non-PUT request → error `bundle-shape`
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement `lib/lint.mjs`. Walk items recursively. Find references by walking
  every object key named `reference`.
- [ ] **Step 5:** Run `npm test`. Expected: all lint tests PASS.
- [ ] **Step 6: Commit** `skill toolkit: package and lint`.

### Task 2: FHIRPath expression collection and evaluation

**Files:**
- Create: `S/scripts/lib/expressions.mjs`, `S/scripts/test/expressions.test.mjs`

**Interfaces:**
- Consumes: none.
- Produces:
  - `collectExpressions(q) -> Expr[]`, where
    `Expr = {kind, linkId|null, name|null, language, expression}`
    - `kind` is one of: `variable`, `initialExpression`, `calculatedExpression`,
      `enableWhenExpression`, `answerExpression`, `itemPopulationContext`,
      `templateExtractValue`, `templateExtractContext`, `x-fhir-query`
    - Template paths are collected from contained resources, with `linkId` null.
  - `evaluateExpressions(q, {context: object, env: object}) -> Result[]`, where
    `Result = {expr: Expr, ok: boolean, value?: any[], error?: string}`

- [ ] **Step 1: Write failing tests:**
  - A Questionnaire with root variable `latestHb` (text/fhirpath over `%ObsHb`) and an item
    `initialExpression` `%latestHb.value.value`. `collectExpressions` returns both, with kind and
    linkId.
  - Evaluation with `env = {patient: <Patient>, ObsHb: <Bundle with one Observation value 98>}`:
    the initialExpression result has `value` deep-equal to `[98]`. Root variables are evaluated
    first and in order, and are visible to items.
  - An item-level variable is visible to that item and its children, but not to a sibling. The
    sibling's use gives `ok:false` with an `error` that names the variable.
  - A misspelt `%latestHB` gives `ok:false` with an error naming `latestHB` and the item's linkId.
    No throw.
  - `x-fhir-query` expressions are collected, not evaluated. Their `{{…}}` parts are evaluated
    and returned as `value: [<substituted query>]`.
  - A Questionnaire with no expressions gives `[]`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Use `fhirpath.evaluate(resource, expr, env, r4)` with the R4 model.
  `%resource` is the QuestionnaireResponse when one is given, else `{}`. Detect an undefined
  `%var` by catching fhirpath's error. Map the error to the name and linkId.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** `skill toolkit: FHIRPath collection and evaluation`.

### Task 3: Offline search, population and extraction

**Files:**
- Create: `S/scripts/lib/localServer.mjs`, `S/scripts/lib/sdc.mjs`, `S/scripts/test/sdc.test.mjs`

**Interfaces:**
- Consumes: Task 2 is not needed. Populate and extract use the libraries directly.
- Produces:
  - `makeLocalFetch(bundle) -> (query: string) => Promise<object>`. It resolves `Type/id` to the
    resource, and `Type?params` to a searchset Bundle. Supported params:
    - `_id`, `patient`, `subject`
    - `code` (`system|code`, comma lists, `%7C` and `%3A%2F%2F` decoded)
    - `clinical-status`, `status`, `category`
    - `_sort=-date` / `date` (on `effectiveDateTime`, `onset`, `authoredOn`), `_count`

    Unknown params are ignored and recorded in `fetch.unsupported`.
  - `makeServerFetch(baseUrl) -> same signature`. It uses `fetch`, adds `_format=json`, and
    encodes `|` as `%7C`.
  - `runPopulate(q, {fetchFn, patient, user?}) -> {ok, response, issues}`
  - `runExtract(qr, q) -> {ok, resources: object[], warnings: Issue[]}`

- [ ] **Step 1: Confirm the library calls.** Check `populateQuestionnaire`'s params (see
  `@aehrc/sdc-populate` dist `index.d.ts`, `PopulateQuestionnaireParams`):
  `{questionnaire, fetchResourceCallback(query, config), fetchResourceRequestConfig:
  {sourceServerUrl}, patient, user?}`. Also check what shape `fetchResourceCallback` must return
  in 4.7.2 (resource JSON vs an axios-like `{data}`). Check `inAppExtract(qr, q, null)` from
  `@aehrc/sdc-template-extract`. The solutions fork used it in
  `solutions/A9-follow-up/verify.mjs`. Record the findings as a comment at the top of `sdc.mjs`.
- [ ] **Step 2: Write failing tests**, using `test/fixtures/pop-q.json` (launchContext patient,
  x-fhir-query variable `ObsHb` =
  `Observation?code=http://loinc.org%7C718-7&patient={{%patient.id}}&_sort=-date&_count=1`,
  an item with initialExpression, a contained Observation template extracted from that item)
  and `fixtures/pop-data.json` (patient `t-f1`, two Hb Observations 98 and 112, latest 98):
  - `makeLocalFetch` returns the latest Observation for that query, both with `%7C` and with a
    raw `|`.
  - `runPopulate` with the local fetch gives a response whose item answer is `98`.
  - `runExtract` on that response gives exactly one Observation, with code 718-7, value 98, and
    subject referencing `Patient/t-f1`.
  - Review Focus 5: a template whose `templateExtractValue` path matches nothing gives a
    `warnings` entry `empty-template` naming the template id.
- [ ] **Step 3:** Run. Expected: FAIL.
- [ ] **Step 4:** Implement both files. Detect an empty template by comparing the template ids
  referenced by `templateExtract` extensions with the resources returned.
- [ ] **Step 5:** Run. Expected: PASS.
- [ ] **Step 6: Commit** `skill toolkit: offline search, population and extraction`.

### Task 4: `check` CLI

**Files:**
- Create: `S/scripts/lib/check.mjs`, `S/scripts/check.mjs`, `S/scripts/test/check.test.mjs`

**Interfaces:**
- Consumes: `lintQuestionnaire`, `lintBundle`, `evaluateExpressions`, `makeLocalFetch`,
  `makeServerFetch`, `runPopulate`, `runExtract`.
- Produces:
  - `checkAll({questionnaire, sampleBundle?, server?, patientId?, userId?, prefix?}) -> Report`,
    where `Report = {pass: boolean, sections: [{name, pass, lines: string[]}]}`
  - CLI:
    `node check.mjs <questionnaire.json> [--data sample.json | --server <base>]
    [--patient <id>] [--user <id>] [--prefix <p>] [--json]`.
    Exit code 0 on pass, 1 on fail. It prints PASS/FAIL/WARN lines in plain English and, with
    `--json`, the Report.

    Population runs for **every** Patient in the sample Bundle when `--patient` is omitted, so
    variation (female vs male) shows up in the report.

- [ ] **Step 1: Write failing tests:**
  - Review Focus 1: a structure-only Questionnaire with no data gives `pass:true` and a line
    containing `nothing to populate or extract`.
  - The Task 3 fixtures with two patients (female and male, with a sex-specific threshold
    `calculatedExpression`) give per-patient population lines showing different results.
  - Lint errors make `pass:false`.
  - The CLI exits 1 on a missing file, with a one-line message and no stack trace.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS. Also run
  `node check.mjs test/fixtures/pop-q.json --data test/fixtures/pop-data.json` and read the output
  as a non-FHIR person would. Fix anything unclear.
- [ ] **Step 5: Commit** `skill toolkit: check CLI`.

### Task 5: `load` CLI (load and cleanup)

**Files:**
- Create: `S/scripts/load.mjs`, `S/scripts/test/load.test.mjs`

**Interfaces:**
- Consumes: `lintBundle`.
- Produces:
  - `node load.mjs <bundle.json> --server <base> --prefix <p> [--yes]`
  - `node load.mjs --cleanup <bundle.json> --server <base> --prefix <p> [--yes]`

  Without `--yes` it prints what it would send and exits 0. It refuses (exit 1) on any
  `lintBundle` error. Cleanup DELETEs only ids with the prefix.

- [ ] **Step 1: Write failing tests**, with `fetch` stubbed via an injected function, using
  exported `loadBundle(bundle, {server, prefix, yes, fetchFn})` and
  `cleanupBundle(bundle, {server, prefix, yes, fetchFn})`:
  - Without `yes`, `fetchFn` is not called.
  - Review Focus 4: a bundle referencing `Patient/pam-001` throws or returns an error, and
    `fetchFn` is not called.
  - Cleanup sends `DELETE` only for prefixed ids.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `skill toolkit: load and cleanup`.

### Task 6: Optional MCP wrapper

**Files:**
- Create: `S/scripts/mcp-server.mjs`, `S/scripts/test/mcp.test.mjs`

**Interfaces:**
- Consumes: `evaluateExpressions`, `checkAll`.
- Produces: a stdio MCP server named `questionnaire-builder` with tools:
  - `evaluate_fhirpath {expression, resource, variables?}` → `{value}` or `{error}`
  - `check_questionnaire {questionnaire, sampleBundle?, server?, patientId?}` → Report

  It has no write tools; loading stays in the CLI, behind `--yes`.

- [ ] **Step 1: Write a failing test.** Spawn the server and talk to it with the SDK's client over
  stdio. `tools/list` returns both tools. `evaluate_fhirpath` with `Patient.gender` on
  `{resourceType:'Patient', gender:'female'}` returns `['female']`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement with `McpServer` + `StdioServerTransport`.
  **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `skill toolkit: optional MCP server`.

### Task 7: SDC cheat-sheet, upstream shapes, environments, sample-data guide

**Files:**
- Create:
  - `S/reference/sdc-cheatsheet.md`, `S/reference/upstream-shapes.md`
  - `S/reference/environments.md`, `S/reference/sample-data.md`
  - `S/reference/snippets/demo-questionnaire.json`, `S/reference/snippets/demo-sample-data.json`
  - `S/scripts/test/snippets.test.mjs`

**Interfaces:**
- Consumes: `checkAll`.
- Produces: the snippet files that `SKILL.md` and the example cite.

- [ ] **Step 1: Write a failing test.** `checkAll` on `demo-questionnaire.json` with
  `demo-sample-data.json` passes, with no errors.
  - Every snippet in `sdc-cheatsheet.md` comes from the demo Questionnaire. The test extracts each
    fenced `json` block tagged `<!-- from: demo-questionnaire.json#<linkId or extension> -->` and
    checks it appears verbatim, by deep-equal of the parsed fragment, in the demo file.
- [ ] **Step 2: Write the demo Questionnaire.** A small "pre-op bloods" form exercising:
  - launchContext `patient` and `user`
  - x-fhir-query variables (Hb and ferritin, with `%7C` and `_sort=-date&_count=1`)
  - initialExpression
  - calculatedExpression: an anaemia flag with sex-specific Hb thresholds from `%patient.gender`,
    **the threshold values taken from `questionnaires/` modules in this repo** (grep `gender`)
  - `enableWhenExpression` on age (an item only for adults)
  - plain `enableWhen`
  - `answerValueSet` with ECL
  - `answerOption` with codes
  - a read-only item
  - template extraction of one Observation and one Condition (AU Core shapes, no `meta.profile`)

  The sample data has one female and one male adult, prefix `demo-`. Codes are checked with
  Ontoserver (`https://r4.ontoserver.csiro.au/fhir`, `$lookup` and `$expand`); record each check
  in a comment block in the cheat-sheet.
- [ ] **Step 3:** Run the test. Expected: PASS.
- [ ] **Step 4: Write the four reference files.**
  - **Cheat-sheet:** one short section per pattern. Each section gives when to use it, the snippet
    and the gotcha. Include the Presenter Guide "Surprises" that apply
    (`decks/Presenter-Guide.md`): `repeat(item)`, `%7C`, launchContext names, and
    `ifNoneExist` dropped by Smart Forms. Include how to build a fhirpath-lab link for a person.
    Confirm the link format by opening fhirpath-lab.com headless (Playwright from
    `decks/node_modules`). If an inline resource can't be passed, document linking a resource by
    server URL instead.
  - **upstream-shapes.md:** a table per common item (demographics, height and weight, Hb and
    ferritin, conditions, medications, allergies) giving the AU Core search plus FHIRPath, the
    US Core difference, and a "local or non-FHIR: can't prepopulate; log it" row.
  - **environments.md:**
    - a "target environment" block the skill fills in (server base, auth, playground URL, terminology
      server)
    - the connectathon example, with its gotchas
    - the no-server fallback: the public Smart Forms playground plus pasted sample data, or
      `check --data` offline
    - how to open a Questionnaire in the playground
  - **sample-data.md:**
    - prefix rules, PUT transaction, cleanup Bundle
    - cover each variation with a patient
    - synthetic values only; shape taken from the form, never values
- [ ] **Step 5: Commit** `skill reference: SDC cheat-sheet, upstream shapes, environments, sample data`.

### Task 8: Probing guide, starting points, change log, SKILL.md, README

**Files:**
- Create: `S/reference/probing.md`, `S/reference/starting-points.md`,
  `S/reference/change-log-template.md`, `S/SKILL.md`, `S/README.md`

**Interfaces:**
- Consumes: the reference files from Task 7 (by path).
- Produces: `SKILL.md`, which Tasks 10 and 11 consume.

- [ ] **Step 1: `probing.md`.** One section per strand plus "How the form varies", all from the
  spec. Each gives:
  - the questions in plain language
  - the clues to look for on the original form
  - a table mapping each answer to the change in the Questionnaire

  Include the spec's tick-box example (clinical relevance vs space) and its three outcomes: a short
  coded list, a value set with ECL, or free text.
- [ ] **Step 2: `starting-points.md`.**
  - **Scan or photo:** read it, list unreadable parts as assumptions.
  - **Screenshot:** watch for hidden or conditional fields that aren't visible; ask about them.
  - **REDCap data dictionary CSV:** a column-to-Questionnaire mapping (field type, choices,
    branching logic → enableWhen, validation → type and constraints, calculated fields).
  - **A list:** no layout, so go straight to the why.

  Plus the PII handling from the spec, verbatim in intent.
- [ ] **Step 3: `change-log-template.md`.** Per entry:
  - round
  - what changed (original vs new)
  - why (the person's answer or the assumption)
  - status: agreed, assumed, or to confirm with the form owner

  It is written for the form's owner, not a FHIR reader. It ends with sections for "Recommended,
  not built" (multi-form) and "Couldn't check".
- [ ] **Step 4: `SKILL.md`**, under ~250 lines:
  - **Frontmatter:** `name: questionnaire-builder`, and a `description` that names its triggers
    (FHIR Questionnaire, SDC, form, paper form, REDCap, prepopulation, extraction, Smart Forms).
  - **Body:**
    - the opening (PII ask, what they've brought, the target environment)
    - the flow and rhythm
    - the four strands plus variation, as territory, pointing to `probing.md`
    - the defaults
    - the deliverables (Questionnaire, sample Bundle + cleanup, change log)
    - "if you can run code: `check`; if not, say what you couldn't check"
    - the anti-goals as rules
    - when to load each reference file
- [ ] **Step 5: `README.md`.**
  - what it is (two lines)
  - install:
    - Claude Code: copy the folder to `.claude/skills/` or `~/.claude/skills/`
    - claude.ai: zip it and upload under Settings → Capabilities → Skills
    - other agents: their skills folder, or paste `dist/questionnaire-builder.md`
  - using the scripts and the MCP server
  - a link to the worked example
  - where to send feedback
- [ ] **Step 6: Commit** `skill: SKILL.md, probing guide, starting points, change log`.

### Task 9: Worked example (pathology request)

**Files:**
- Create in `S/examples/pathology-request/`:
  - `form.png`, a synthetic **blank** paper form. Render `form.html` with Playwright and keep
    both. It has 10 tick-box conditions, "Females only:" and "Under 16:" sections, a handwritten-
    style "Hb ___ g/L, date ___", and a "Doctor to complete" box.
  - `walkthrough.md`, a condensed session: opening → v1 draft → rounds → final
  - `v1-draft.json`, `v4-final.json`
  - `sample-data.json`, `cleanup.json`
  - `CHANGELOG.md`
- Create: `S/scripts/test/example.test.mjs`

**Interfaces:**
- Consumes: `checkAll`, and the skill as written in Task 8.

- [ ] **Step 1: Write a failing test.**
  - `checkAll` passes on `v1-draft.json` with no data.
  - It passes on `v4-final.json` with `sample-data.json`, and population differs between the
    female and the male patient.
  - Extraction yields at least one Observation and one Condition.
  - `lintBundle(sample-data, {prefix:'ex-'})` has no errors.
- [ ] **Step 2: Produce the example by following `SKILL.md` yourself**, with a subagent playing a
  pre-admission nurse who answers in character. Save the condensed transcript as
  `walkthrough.md`. Any place where `SKILL.md` was unclear gets fixed in `SKILL.md` and noted in
  the commit message.
- [ ] **Step 3:** Run the test. Expected: PASS.
- [ ] **Step 4: Check it in the playground** (headless Playwright, fresh context, no terms
  dialogs accepted). Open `v4-final.json` in the patched playground, with the sample data
  loaded to Meld under prefix `ex-` **only if Jim has approved loading**. Otherwise open it in
  the playground without prepopulation and say so in the README. Save `playground.png`.
- [ ] **Step 5: Commit** `skill: worked example (pathology request)`.

### Task 10: Single-file build

**Files:**
- Create: `S/scripts/build-single-file.mjs`, `S/scripts/test/build.test.mjs`,
  `S/dist/questionnaire-builder.md`

**Interfaces:**
- Consumes: `SKILL.md` and `reference/*.md`.
- Produces: `dist/questionnaire-builder.md`. It contains the `SKILL.md` body (no frontmatter),
  then `probing.md`, `starting-points.md`, `change-log-template.md` and `sdc-cheatsheet.md`
  inline, under headings. Links to other reference files become links to GitHub `main`
  (`https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/...`).
  A header line says it's generated and can do less than the full skill.

- [ ] **Step 1: Write a failing test.**
  - The output starts with the generated-file header.
  - It contains every `##` heading of `SKILL.md`.
  - It has no relative `reference/` links left.
  - Re-running produces identical output.
  - The committed `dist` file equals the fresh build, so CI catches drift.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. Add an npm script `build`. **Step 4:** Run →
  PASS.
- [ ] **Step 5: Commit** `skill: single-file build for agents without skill folders`.

### Task 11: Behavioural test with fresh agents, then fix-ups

**Files:**
- Create: `S/scripts/test/behaviour/` with `scenarios.md` and `results.md`
- Modify: `SKILL.md`, `reference/*`, as the results require

- [ ] **Step 1: Write `scenarios.md`.** Three scenarios. For each, a role-played participant
  brief and pass criteria, taken from the spec.
  - **(a) A scanned form with a patient's name and DOB on it.** Pass if the skill flags the PII
    before anything else, never repeats it, and uses no values from it.
  - **(b) A REDCap data dictionary CSV** (write a 12-field one with branching logic). Pass if
    branching becomes enableWhen and the dictionary's choices become coded options, with the codes
    flagged unverified or looked up.
  - **(c) A plain list of 8 items.** Pass if the skill asks why each is there and where its data
    lives.

  In all three, the skill must also:
  - show a draft in its first or second reply
  - ask no more than ~3 questions per turn
  - ask about variation explicitly
  - keep the change log
  - never invent a code silently
- [ ] **Step 2:** Run each scenario with a fresh subagent given only `SKILL.md` and the skill
  folder. A second subagent plays the participant. Then run scenario (c) once more, given only
  `dist/questionnaire-builder.md`. Record pass or fail per criterion in `results.md`.
- [ ] **Step 3:** Fix `SKILL.md` and the references for every failed criterion. Rebuild `dist`.
  Re-run the failed scenarios until they pass.
- [ ] **Step 4:** Run `npm test` in `S/scripts`. Expected: all PASS.
- [ ] **Step 5: Commit** `skill: behavioural scenarios and fixes`.

### Task 12: Link it in and open the PR

**Files:**
- Modify: `2026-10-29/1-FHIR-For-Users/README.md` (one line under resources, linking the skill
  and its README)

- [ ] **Step 1:** Add the link. Run `npm test` once more. Expected: PASS.
- [ ] **Step 2:** Commit. Push branch `questionnaire-skill`. Open a PR against `main` whose body
  lists:
  - what was verified (tests, behavioural results, playground)
  - what wasn't
  - the calls Jim should check

  **Don't merge.** Jim merges.
