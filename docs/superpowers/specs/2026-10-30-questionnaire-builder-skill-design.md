# Questionnaire builder skill: design

Jim's own contribution to Track 1 (FHIR for Users) of the FHIR in Queensland Health
Connectathon, 29–30 Oct 2026.

## Intent

Participants arrive with a form they already use, or a list of things they want to ask, and want
it as a FHIR Questionnaire. Copying the layout across is easy. The value is in questioning the
design: a paper form's shape often reflects the page, not the clinical need. A list of 10 tick-box
conditions might be there because those 10 matter, or only because 10 fitted.

The skill is an AI-agent skill that does the FHIR thinking. It asks the person who knows the form
plain clinical and workflow questions, and it turns their answers into design decisions. Those
decisions cover structure, prepopulation and extraction.

## Who uses it

Someone who knows the form and why it exists, such as a clinician, nurse or data manager. They are
**not necessarily a FHIR person**. The skill speaks their language and keeps FHIR detail out of
the questions. It explains FHIR terms only when it has to.

They use an AI agent, not necessarily Claude Code.

## Starting points

The skill handles all four:

1. **Paper form.** A scan or photo.
2. **Web form.** A screenshot.
3. **REDCap form.** A data dictionary (CSV) or screenshots. The data dictionary already holds
   types, choices and branching logic, so less has to be guessed.
4. **A list of items** with no existing form behind it. There is no old layout to question, so the
   probing moves straight to why each item is there and where its data comes from.

## What they walk away with

* **A Questionnaire** that runs in the Smart Forms playground, including:
  * prepopulation extensions: launchContext, x-fhir-query variables, initialExpression
  * extraction extensions: template-based by default
  * answer bindings with real codes
  * enableWhen and calculations where the form needs them
* **Sample data**: a test patient, plus the upstream resources the prepopulation reads. It is
  shaped like the real upstream source, so they can demonstrate the form.
* **A change log**: every change from the original form and every assumption, each with the reason
  for it. It is written so the person can take it back to whoever owns the original form. It is
  built up during the session, not written at the end.

## The demo it should enable (in this order)

1. Their form opens for a test patient and **fills itself in** from that patient's records.
2. They complete it and show the **resources it writes back**.

## The flow

The first wince to avoid is a long wait before anything concrete appears to react to. So:

1. **Draft fast.** Read the form or list. Map it straight into a Questionnaire, keeping its items,
   types, choices and obvious grouping. Add no prepopulation or extraction yet. Get it in front of
   them in the playground within minutes. Start the change log with anything already assumed, such
   as unreadable text or guessed answer types.
2. **Probe in rounds.** Each round ends in a new version they can see. The questions come a few at
   a time, tied to the part of the form they're looking at. They are never one long interview
   about the whole form.
3. **The change log grows each round.**

Rough order of rounds: structure and design first, then users, then prepopulation, then
extraction. Prepopulation comes before extraction because the demo leads with it. The person can
redirect at any point.

## What the skill probes: four strands

These are territory for the agent, not a script to read out.

1. **The design of the existing form.**
   * Why does each item look the way it does?
   * Is a fixed list there for clinical relevance or for lack of space? The answer decides between
     a short coded list, a searchable value set (for example SNOMED CT-AU via ECL) and free text.
   * Free text that should be coded, or coded fields that are really free text.
   * Items nobody uses.
   * Items that duplicate what's known elsewhere.
   * Units, ranges and validation.
   * Layout that only existed because of paper, such as "if yes, go to question 12", which becomes
     enableWhen.
   * Items that could be calculated.
2. **Who fills it in and who reads it.**
   * Is there more than one audience, such as patient, nurse and doctor?
   * If so, which fits best:
     * one form that varies (enableWhen, hidden or read-only items)
     * separate forms that share modules
     * a chain, where one form's response prepopulates the next
   * Wording and reading level for each audience.
   * Which fields a given user mustn't edit.
   * See also "How the form varies" below; varying by user is one case of it.
3. **Upstream data: what exists, and its shape.**
   * Which systems already hold this information?
   * What shape is it in: AU Core, US Core/USCDI, a local FHIR profile, non-FHIR, or nothing?
     **AU Core is the default, not an assumption**; the conversation can override it.
   * The answer decides the x-fhir-query searches and FHIRPath. It also decides which items can't
     be prepopulated and why, which goes in the change log.
4. **Purpose and downstream use.**
   * What is the form for?
   * Who uses the answers afterwards: a registry, a dashboard, the next clinician, an audit,
     billing?
   * The answer decides **whether extraction is worthwhile at all**; sometimes the
     QuestionnaireResponse is enough. When it is worthwhile, the answer decides which resources to
     write and in what shape, so they match what the consumer expects (for example AU Core
     Observation, Condition, MedicationRequest, or a registry's profile).

### How the form varies (asked explicitly, across the strands)

A paper form is one fixed shape for everybody. A Questionnaire can change with who is filling it
in and who it's about, so the skill **asks directly** how the form should vary. It doesn't wait
for the person to mention it. It looks for clues on the original, such as "females only",
"children under 2: complete section C", "if pregnant", "doctor to complete", or crossed-out
sections. It asks about variation along each of these:

* **Who is using it:** patient, nurse, doctor, admin. Items shown, hidden, read-only, or worded
  differently.
* **Patient characteristics:** sex, age band (infant, child, adult, older adult), pregnancy, or a
  known condition. For example, questions or sections that apply only to some patients, sex- or
  age-specific thresholds (such as Hb cut-offs by sex in the PAM forms), or different answer
  lists for children.
* **Context:** setting or encounter type, and stage of care (first visit vs follow-up, before vs
  after treatment).

What each answer changes:

* Where the characteristic is already in the patient's record (sex, birth date, active
  conditions), it's prepopulated and drives the variation silently: `enableWhenExpression`,
  calculated variables, thresholds in FHIRPath. The person isn't asked for something the system
  knows. This ties into the upstream strand.
* Where it isn't in the record, it becomes an explicit item early in the form, with `enableWhen`
  depending on it.
* Variation by user that can't be expressed in one form becomes the separate- or chained-forms
  recommendation (see "More than one form").
* The sample data covers the variation, for example one adult female and one adult male test
  patient (or an infant, where age matters). The demo can then show the form behaving differently
  for each.
* Each variation, and the rule that drives it, goes in the change log.

## Format and where it runs (my call)

* **Open Agent Skills format.** A folder with `SKILL.md` (frontmatter `name` and `description`)
  plus reference files, all in plain markdown. Claude Code and claude.ai (uploaded as a skill) read
  it, as do other agents that support the format. For any other agent, `SKILL.md` can be pasted in
  as instructions, and the README says how.
* **It must work with no code execution and no network.** Then the agent writes the JSON and tells
  the person how to load and test it by hand: paste into the playground, PUT to Meld. It also says
  plainly what it couldn't check.
* **Optional helpers (Jim agreed)** for agents that can run code. None is ever required.
  * A small **`check`** script (Node):
    * evaluates the Questionnaire's FHIRPath with fhirpath.js, the engine Smart Forms uses, with
      the SDC variables (`%resource`, `%patient`, `%questionnaire`, launch contexts)
    * runs **population** and **template extraction** with the Smart Forms libraries
      (`@aehrc/sdc-populate`, `@aehrc/sdc-template-extract`) against the sample data
    * lints JSON and structure

    It lets the agent check each round before showing it. It doesn't drive the playground; the
    playground is for the person to look at.
  * An optional **MCP wrapper** around the same script, for agents that support MCP.
  * A load and cleanup script for the sample data and the Questionnaire. It runs only with the
    person's say-so.
* **No FHIRPath for people (Jim):** the person is never asked to write, read or edit FHIRPath.
  The agent writes and checks every expression, and explains what an item fills in from in plain
  words; that plain-words rule goes in the change log. (This replaces an earlier idea of giving
  participants fhirpath-lab links.)
* **Images (my call):** it assumes the agent can read images. If it can't, it asks the person to
  type out the form.
* **Agents without skill-folder support (my call):** a generated single-file version
  (`SKILL.md` plus the essential reference) to paste in. It can do less than the full skill.
* **Location:** `2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/` in this repo.
  Participants get it from GitHub (a zip of the folder, or a raw link).

## When it's used (Jim)

A **takeaway**, used after the connectathon, not live at the event. So the whole structure is
worth building. The Meld sandbox and the patched playground may not stay up. That means the test
environment is a **target-environment setting**, which the skill asks about or reads from a config
section, rather than fixed endpoints. The connectathon setup is the documented example. When no
FHIR server is available, a fallback still works: the public Smart Forms playground, with the
sample data supplied by hand or held in the form.

## Personal information (Jim)

The skill avoids personally identifiable information.

* **Before anything is shared:** the opening asks for a blank form, or one with names,
  identifiers, dates of birth and so on covered. This is the only step that actually protects the
  person on the form, because anything shared has already gone to the AI provider.
* **If identifiable details arrive anyway**, the skill says so plainly. It tells the person the
  details have already been sent and they should follow their local process. Then it:
  * uses only the form's structure; filled-in values never go into the Questionnaire, sample
    data, change log or terminology lookups
  * reads values only as clues to shape: a dd/mm/yyyy date, a weight in kg. The sample data gets
    synthetic values of that shape.
  * doesn't repeat the details back
* It doesn't claim to redact the image itself.

## More than one form (Jim)

Version 1 delivers **one Questionnaire**. When the users strand points to separate forms sharing
modules, or to a chain where one form's response fills in the next, the skill recommends it,
explains why, and records it in the change log. It doesn't build the modular or chained forms.

## Defaults (each overridable by the conversation)

These match the Track 1 decks and the PAM forms, so the participant's slides and the skill agree:

* FHIR R4, the SDC IG, rendered and tested in the Smart Forms playground
  (`https://aehrc.github.io/qh-connectathon/smart-forms/`) against Meld sandbox `QHConnectathon2026`.
* Upstream and extracted resources conform to AU Core 2.0.0, with no `meta.profile` (Meld rejects
  it).
* Prepopulation uses launchContext `patient` (plus `user` where needed) and x-fhir-query variables.
* Extraction is template-based (`sdc-questionnaire-templateExtract`, contained templates,
  `templateExtractValue`).
* Codes are LOINC, SNOMED CT-AU and AMT. Use the SPIA pathology codes where they apply. Codes come
  from a terminology lookup (Ontoserver) or are flagged as unverified. They are never invented
  silently.
* The Meld gotchas the decks already teach:
  * `%7C` for `|`
  * `repeat(item)` in FHIRPath over a QuestionnaireResponse
  * SMART v1 scopes only

## Sample data

* One or more test patients, plus the upstream resources the prepopulation reads, shaped like the
  upstream source identified in strand 3.
* Delivered as a FHIR transaction Bundle using PUT, with ids under a prefix the participant chooses
  (default `<initials>-`). Each run then makes and cleans up only its own data.
* The skill **never writes to or changes** the shared patients (`pam-001`..`pam-040`, `pam-demo`)
  or anything it didn't create. It asks before loading anything to Meld. It gives a cleanup Bundle
  (DELETEs) alongside.

## Non-goals

* Not a form renderer or a form-builder UI. The playground (and LHC Forms, if they like) does that.
* Not REDCap export or round-tripping. Reading a REDCap data dictionary is in; writing one isn't.
* Not authoring new value sets or CodeSystems beyond choosing existing codes or an ECL expression.
* Not CQL. Not definition-based or StructureMap extraction, beyond a mention if template extraction
  can't do something.
* Not deciding on the participant's behalf whether their organisation should change its form. It
  proposes and records; they decide.

## Anti-goals (a failure even if it technically works)

* A long interview before they see anything.
* A FHIR lecture. Questions are about their form, their patients and their workflow.
* Silent changes. Every departure from the original form is in the change log, with its reason.
* Made-up codes presented as real.
* Damage to shared Meld data, or writes to Meld without asking.
* A Questionnaire that only works in theory. If it hasn't been opened in the playground, or its
  expressions checked, it says so.

## Structure of the skill (for the builder to refine)

* `SKILL.md`: the flow, the four strands, the rules above. Short enough that an agent follows it.
* `reference/`, loaded when needed:
  * reading each kind of starting point (scan, screenshot, REDCap dictionary, list)
  * the probing guide per strand, with the design questions and what each answer changes
  * an SDC cheat-sheet: launchContext, x-fhir-query, initialExpression, calculatedExpression,
    enableWhen, answerValueSet, templateExtract, with small working snippets that follow
    Smart Forms' behaviour and the "Surprises" in the Presenter Guide
  * an upstream-shapes note: AU Core vs US Core search and FHIRPath differences for common items
    (Patient demographics, Observation, Condition, MedicationStatement/Request, AllergyIntolerance)
  * a change-log template
* `examples/`: one short worked example, from a small paper form to a draft, a probed version and
  the change log. Pathology/PAM, to match the decks.
* `scripts/` (optional helpers above).
* `README.md`: what it is, how to install it in Claude Code and claude.ai, and how to use it with
  another agent.

## Left to the builder

* The exact wording of `SKILL.md`, and how much goes in it vs `reference/`.
* Which helpers are worth writing.
* The worked example's form.
* Whether to also present it in a deck slide or the Presenter Guide. That is a separate decision
  for Jim.
