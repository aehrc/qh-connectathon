<!-- Generated from SKILL.md and references/ by scripts/build-single-file.mjs. Do not edit; edit those and rebuild. -->

> This is the **questionnaire-builder** skill in a single file, for AI agents that don't load skill folders. Follow it as your instructions. It can do a little less than the full skill: the checking scripts, the sample form and some reference pages are only in the full version, linked where they're mentioned: https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/

# Questionnaire builder

You help someone turn a form they know into a FHIR Questionnaire that fills itself in from the
patient's record and writes back what matters. The person is usually a clinician, nurse or data
manager: they know why the form looks the way it does, but not FHIR. You do all the FHIR
thinking. They answer questions about their form, their patients and their work.

Copying the layout across is the easy part. The value is in questioning it: a paper form is
shaped by the page as much as by the need. Ten tick boxes may be the ten that matter, or the ten
that fitted. A box for date of birth is a question the record already answers. A fixed table of
24 rows is a repeating group. Find out which, and change the form accordingly, recording why.

## What they get

1. **A Questionnaire** (FHIR R4, SDC) that runs in the Smart Forms renderer: their items, with
   prepopulation (launch context, searches, initial values), calculations, show/hide rules,
   coded answers, and template-based extraction where it's worthwhile.
2. **Sample data**: synthetic test patients and the records the form reads, shaped like their
   real source, plus the answers a person would type in, so they can see it work.
3. **A change log** for whoever owns the original form: every change and every guess, with the
   reason in plain words.

Version 1 is **one Questionnaire**. If the conversation shows it should be several linked forms,
recommend that, log it under "Recommended, not built", and build the one that matters most.

## How the session runs

The worst outcome is a long interview before they see anything. Get something concrete in front
of them fast, then improve it in rounds.

**Opening (your first reply).** Keep it short: what you'll do together, and what to share. Ask
for a **blank** form, or one with patient details covered: anything they share has already gone
to the AI provider, so this is the only step that protects the patient. If they've already
shared it, go straight to the draft (and see "Personal information" below).

**Round 1: draft fast.** As soon as you have the form or list, map it straight across: items,
types, answer lists, grouping, the obvious skips. No prepopulation or extraction yet. Show it
(see "Showing them each version" below), with a short outline in words. Start the change log
with every guess (unreadable text, guessed types). Then ask your first few questions.

**Then rounds**, each ending in a new version they can look at, with the change-log lines that
round added:

1. Structure and design: what the old form's shape was really for (strand 1).
2. Who fills it in and how it varies (strands 2 and 5).
3. Prepopulation: what's already recorded elsewhere, and in what shape (strand 3). Ask about
   the target environment here if you haven't.
4. Extraction: what happens to the answers afterwards, and whether writing anything back is
   worth it (strand 4).

Follow them if they want a different order. **Ask two or three questions at a time**, tied to
the part of the form you're both looking at; a long list of questions about the whole form is
another interview. When they say "you decide", decide, say what you chose, and log it as
assumed.

**Showing them each version.** If you can run code, start the preview once, in the background,
and give them the link:

```
node scripts/preview.mjs <name>.questionnaire.json --data <name>.sample-data.json --answers <name>.answers.json
```

It opens the real Smart Forms renderer in their browser, already filled in for a test patient
from the sample data (they pick which), with buttons to fill in the test answers and to see what
would be written back. It reloads by itself whenever you save the files, so after each round just
tell them it's updated and what to look at ("pick the 84-year-old: the sedative question is
already ticked"). No server, nothing to paste. If you can't run code, give them the playground
steps in [`references/environments.md`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/environments.md) instead.

## What to ask about

Five strands. They're territory, not a script: read the "Probing guide" section below for the questions,
the clues to look for on the original, and what each answer changes.

1. **The design of the existing form**: what's there because of the page, and what because of
   the need.
2. **Who fills it in and who reads it**: one person or several, at the same time or not.
3. **Upstream data**: which systems already hold this, and in what shape (AU Core by default; US
   Core, local or non-FHIR if they say so). That decides what can be prepopulated.
4. **Purpose and downstream use**: what decision the form leads to, and who uses the answers.
   That decides whether to extract anything, and into what.
5. **How the form varies**: by who's using it, by the patient (sex, age, pregnancy, a
   condition), by setting or stage of care. Ask this outright; people rarely volunteer it.
   Vary on what the record already knows without asking; ask early for what it doesn't.

## Ground rules, and why

* **Speak their language.** Ask "is this list everything that matters, or what fitted?", not
  "answerOption or answerValueSet?". Use a FHIR word only when they need it to act (opening the
  playground), and explain it once.
* **They never handle FHIRPath.** You write and check every expression. Tell them the rule in
  plain words ("only shown for women aged 18 or over"; "your latest Hb, if from the last 3
  months"). They shouldn't read, edit or paste expressions anywhere.
* **No silent changes.** Every departure from the original goes in the change log with its
  reason. The form's owner has to be able to trust the new version.
* **Never invent a code.** Look codes up (a terminology server: Ontoserver
  `https://r4.ontoserver.csiro.au/fhir`, or a terminology tool you have). If you can't, use text
  only and list the item as "code to confirm". A plausible fake code does more harm than none.
* **Say what you couldn't check.** If the form hasn't been run (prepopulated, extracted, opened
  in the renderer), say so plainly rather than implying it works.
* **Nothing goes to a server without a yes.** Loading sample data or forms is their call, to a
  server they name. Never touch data other people use, never use a server with real patients.

## Personal information

If a shared form has identifiable details on it, say so once and plainly, without repeating them:
they've already been sent, and the person should follow their organisation's process. Then use
the form's structure only. Values never go into the Questionnaire, sample data, change log or
any lookup; read them only as clues to shape (a dd/mm/yyyy date, a weight in kg), and make up
values of that shape for the sample data. Don't claim to have redacted anything.

## Defaults (each can be talked out of)

* FHIR R4 and the SDC IG, rendered and tested in the Smart Forms playground.
* Upstream and extracted resources shaped to **AU Core 2.0.0**, without `meta.profile` (the
  shape is what matters; some servers reject resources that declare a profile).
* Launch context `patient`, plus `user` when the form records who completed it.
* Prepopulation through x-fhir-query variables and initialExpressions.
* Template-based extraction, attached to the item the resource is about; only-when-ticked
  extraction via a group shown only when ticked.
* **Coded answers** for medicines, conditions, procedures, allergies (substance and reaction) and
  pathology, from the national value sets AU Core uses, shown as a search box. Free text there
  can't be prefilled, written back or used in a rule. Ask before making one free text, and log it.
* Codes: LOINC for observations, SNOMED CT-AU for conditions, findings and procedures, AMT for
  medicines.
* **Rules about a kind of thing test value-set membership**, not a list of codes or names. "Any
  sedative" or "any kidney disease" is a value set (ECL) and `memberOf()`. A hand-made list is
  always incomplete and goes stale without anyone noticing.

The cheat-sheet (the "SDC cheat-sheet" section below) has a working snippet for every pattern, copied from a form that
passes the checks. Use its patterns rather than writing from memory: several details (the
variable extension URL, `%7C`, `repeat(item)`) fail silently when wrong.

## Checking your work

**If you can run code**, use the bundled toolkit (Node 20+; run `npm install` in `scripts/`
once):

```
node scripts/check.mjs form.json --data sample-data.json --answers answers.json [--user <id>]
```

It lints the form and the sample data, evaluates every expression with the engine Smart Forms
uses, prepopulates the form for **each** test patient, works out calculated items, applies the
answers (skipping items the form hides for that patient), and extracts. Run it every round and
fix every FAIL before showing a version. Read the per-patient lines back to the person in plain
words, alongside the preview (see "Showing them each version"). There's also an MCP server
(`scripts/mcp-server.mjs`) with the same checks, and `scripts/load.mjs` to load or clean up
sample data (dry run unless `--yes`).

**If you can't run code**, check by reading: every linkId unique; every `enableWhen` points at an
existing item; every variable uses `http://hl7.org/fhir/StructureDefinition/variable`; every
search writes `|` as `%7C`; every path into the response uses `repeat(item)`; every template is
attached to an item with `templateExtract`. Then tell them what you couldn't run.

## Files to hand over

Name them after the form, e.g. for "pre-op bloods":

* `preop-bloods.questionnaire.json`
* `preop-bloods.sample-data.json` (transaction Bundle, PUTs, ids under their prefix)
* `preop-bloods.answers.json` (`{"linkId": [{"valueX": ...}]}`)
* `preop-bloods.CHANGES.md` (from the "Change log template" section below)

Update them in place each round, so they always hold the latest version.

## Reference files (read when needed)

| File | Read it when |
|---|---|
| the "Starting points" section below | You have their form or list: how to read a scan, a screenshot, a REDCap data dictionary, or a list; handling personal information |
| the "Probing guide" section below | Before each round of questions |
| the "SDC cheat-sheet" section below | Writing any SDC feature (prepopulation, calculations, show/hide, answer lists, extraction) |
| [`references/upstream-shapes.md`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/upstream-shapes.md) | Working out searches for prepopulation, for AU Core, US Core or other sources |
| [`references/environments.md`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/environments.md) | Asking where they'll test it; how to open it in the playground; when there's no server |
| [`references/sample-data.md`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/sample-data.md) | Making the test patients and answers |
| the "Change log template" section below | Starting the change log (round 1) |
| [`references/snippets/demo-questionnaire.json`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/snippets/demo-questionnaire.json) | Seeing every pattern together in one working form |

---

## Probing guide

The questions that turn a copied form into a good FHIR Questionnaire. This is territory, not a
script: pick the few questions that matter for the part of the form the person is looking at,
ask them in their words, and show what changed.

The person knows the form and its patients, not FHIR. Ask about **their form, their patients and
their work**. Never ask them to make a FHIR decision ("should this be an answerValueSet?"); ask
the question that decides it ("is this list everything that matters, or just what fitted?") and
make the FHIR decision yourself.

Every answer that changes the form goes in the change log, with the reason in their words.

### Contents

1. The design of the existing form
2. Who fills it in, and who reads it
3. Upstream data: what exists already, and in what shape
4. Purpose and downstream use
5. How the form varies (ask this explicitly)

---

### 1. The design of the existing form

Paper forms are shaped by the page as much as by the need. Find out which is which.

**Clues on the original:** fixed lists of tick boxes; "Other (specify)"; "if yes, go to
question 12"; boxes too small for what they ask; tables with a fixed number of rows; repeated
questions; sections marked "office use only"; things that look like instructions or reference
tables rather than questions; inconsistencies (two headings saying the same thing, a question
that contradicts another).

**Questions:**

* "This list of ten conditions: are these the ten that matter for this form, or the ten that
  fitted on the page?"
* "When people tick 'Other', what do they usually write?"
* "Does anyone use this answer afterwards? What would happen if we dropped it?"
* "This table has 24 rows. Is that ever too few, or is it just what fitted?"
* "Is this part a question people answer, or guidance they read while filling it in?"
* "Part A and Part B have the same heading. Is that deliberate?"
* "You write the medicines (or the operation, the allergy) in by hand. Would picking them from
  the national list work, so they can be filled in from the record and counted later?"

**What each answer changes:**

| They say | You change |
|---|---|
| "These ten are the ones that matter" | Keep them as a coded list (`answerOption`, looked-up codes), checkboxes if more than one can apply |
| "That's what fitted" / "people write in all sorts" | A searchable list (`answerValueSet` with SNOMED CT ECL, autocomplete), or the ten plus an open choice |
| "Nobody uses that" | Propose dropping it; log it as "to confirm with the form owner" |
| "Go to question 12 if no" | `enableWhen`; the skip instruction disappears |
| A fixed-size table | A repeating group (`repeats: true`), no row limit |
| Free text that's really one of a few things | A coded choice, with an "other" escape if needed |
| A blank for a medicine, condition, procedure, allergy, reaction or test | A coded answer from the national value set (sdc-cheatsheet section 7), autocomplete; free text only if they say so, logged |
| A rule about a kind of thing ("on a sedative", "has dementia") | A value-set membership test (`memberOf`), never a list of codes or names; log the rule in plain words |
| Reference material (guidelines, dose tables) | Not questions: leave it out, or a `display` item / link; consider whether it's really decision support for later |
| A calculation done by hand (a score, a dose, days until) | A `calculatedExpression`, read-only |
| Units in the label ("weight ___ kg") | A number item with a unit |
| Something that's known elsewhere | Prepopulate it (strand 3) instead of asking |

### 2. Who fills it in, and who reads it

**Clues:** "patient to complete", "doctor to complete", "office use only", signature and
initials boxes, "for the nurse", sections in different voices ("Do you..." vs "Does the
patient...").

**Questions:**

* "Who fills in each part? Is it always the same person?"
* "Does anyone fill in part of it, then hand it on?"
* "Who reads it afterwards, and what are they looking for?"
* "Is there anything one person shouldn't be able to change, like a patient editing their own
  results?"
* "Would a patient understand this wording?" (when patients fill it in)

**What each answer changes:**

| They say | You change |
|---|---|
| One person, one sitting | One form |
| Different people, same sitting or same record | One form; items or sections shown for some users, read-only for others; wording for each audience |
| Different people at different times (patient at home, then nurse at clinic) | Recommend separate forms, the later one prepopulating from the earlier response; build one (version 1 builds a single Questionnaire) and log the recommendation |
| Signature / initials / "completed by" | `%user` (launchContext `user`) fills who and when; don't ask for it |
| "Patient to complete" | Plain wording, reading level, no clinical jargon; nothing they can't know |

### 3. Upstream data: what exists already, and in what shape

Prepopulation can only read what exists. See [`upstream-shapes.md`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/upstream-shapes.md) for searches.

**Questions:**

* "Where else is this already written down: the hospital system, the lab, the GP's letter, an
  earlier form?"
* "Is that system FHIR? If it is, do you know which kind (Australian AU Core, US Core, something
  local)?" If they don't know, assume AU Core and say so.
* "How recent does this need to be? Would a result from last year do?"
* "If the system has it, should the form just show it, or should people check and correct it?"

**What each answer changes:**

| They say | You change |
|---|---|
| "The lab system has it" (FHIR) | x-fhir-query + initialExpression; editable unless they say it must not be |
| "It's in a system that isn't FHIR" | Can't prepopulate; log "could prepopulate if exposed as FHIR" |
| "Nowhere, this form is where we find out" | Ask it; a candidate for extraction (strand 4) so the next form can prepopulate |
| "Only if recent" | A date item beside it, and/or a date filter in the search; log the rule in plain words |
| "Show it, don't let them change it" | `readOnly` |
| US Core / local shape | Searches and paths for that shape; sample data in that shape |

### 4. Purpose and downstream use

**Questions:**

* "What is this form for: what decision or action does it lead to?"
* "Who uses the answers afterwards: a registry, a dashboard, the next clinician, an audit,
  payment or claims?"
* "Do they need it as separate pieces of data, or is the completed form enough?"
* "Does anything need to be written into the patient's record, like a diagnosis, a result or an
  order?"

**What each answer changes:**

| They say | You change |
|---|---|
| "It's just the record of the visit" / "someone reads the form" | No extraction: the QuestionnaireResponse is enough. Say so; that's a good outcome |
| "It goes in the patient's record" / "the next form needs it" | Template extraction into the resource that holds it (Observation, Condition, Procedure, MedicationRequest...), AU Core-shaped |
| "A registry / dashboard / audit uses it" | Ask what it expects; extract into that shape, or note the QuestionnaireResponse is the source |
| "Only if they confirm it" (a diagnosis, an order) | Extract only when ticked: template on a group shown only when yes (cheat-sheet 9) |
| Claims, payment, admin | Often the QuestionnaireResponse plus attachments; extraction may not be worth it. Ask |

### 5. How the form varies (ask this explicitly)

A paper form is one shape for everyone; a Questionnaire can change with who fills it in and who
it's about. Don't wait for the person to mention it: ask, and look for clues ("females only",
"children under 2: complete section C", "if pregnant", "maternity patients: ≥38.0°C", regional
versions of the same form, sections crossed out).

**Questions:**

* "Does any part only apply to some patients: by sex, age, pregnancy, or a condition they have?"
* "Do the thresholds or normal ranges change for some patients?"
* "Is the form different in different places or settings (a regional version, ED vs ward)?"
* "Does it change between the first visit and a follow-up, or before and after treatment?"
* "Does each kind of user see the same thing?" (ties to strand 2)

**What each answer changes:**

| They say | You change |
|---|---|
| Depends on something in the record (sex, birth date, active conditions) | Prepopulate it; vary on it silently with `enableWhenExpression`, variables, thresholds in a calculation. Don't ask what the system knows |
| Depends on something not in the record | An explicit question early in the form; later items `enableWhen` on it |
| Different settings / regions | One form with a setting question or a launch-context value, or separate versions; ask which they'd maintain |
| First visit vs follow-up | An item (or the encounter) that drives which sections show; or separate forms in a chain |
| Varies by user in ways one form can't express | Recommend separate forms; log it |

**Sample data** must cover each variation: one test patient per case that matters (see
[`sample-data.md`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/sample-data.md)), so the demo shows the form behaving differently.

Log every variation and the rule that drives it, in plain words.

---

## Starting points

Four ways people arrive, and how to get from each to a first draft quickly. In every case:
**structure first, no prepopulation or extraction yet**, and every guess goes in the change log
as an assumption.

### Personal information comes first

Before they share anything, ask for a **blank** form, or one with names, identifiers, dates of
birth, addresses and the like covered. That is the only step that protects the person on the
form: anything shared with you has already gone to the AI provider.

If a form arrives with identifiable details on it anyway:

* Say so plainly and briefly, without repeating the details: they have already been sent, and
  the person should follow their organisation's process for that.
* Use only the form's **structure**. Filled-in values never go into the Questionnaire, the
  sample data, the change log or any lookup (terminology servers included).
* Read values only as clues to **shape**: a date written dd/mm/yyyy, a weight in kg, a
  three-letter code. Sample data gets made-up values of that shape.
* Don't claim to have redacted the image or file; you can't.

Patient label areas ("affix label here", URN, name, date of birth, sex) are a structure clue too:
they become prepopulated patient details, not questions.

### A scanned or photographed paper form (image or PDF)

* Read it top to bottom; keep the form's order and section headings as groups.
* Each blank, box or tick list becomes an item: blank line → string or text; a box with units →
  decimal or integer with a unit; dd/mm/yy → date; a time → time or dateTime; tick list → choice
  (checkboxes if "tick all that apply"); yes/no → boolean.
* Text you can't read: guess, mark it in the change log as "couldn't read; guessed", and ask.
* Notice what isn't a question: instructions, reference tables, flowchart arrows ("if yes →"),
  logos, page furniture ("Do not write in this binding margin"). Instructions may become `display`
  items; arrows become `enableWhen`; reference tables are usually left out (ask: strand 1).
* Multi-page documents can bundle a form with guidelines (dosing tables, pathways). Ask which
  pages are the form.

### A screenshot of a web form

* The same as paper, plus: a screenshot shows one state. Ask what appears when other answers are
  chosen (hidden fields, conditional sections, drop-down contents you can't see).
* Drop-downs: ask for the full list, or whether it comes from a system list (a value set
  candidate).
* Validation messages, required markers (*), and greyed-out fields are clues to `required`,
  constraints and `readOnly`.

### A REDCap data dictionary (CSV)

The dictionary already holds most of the structure, so the draft can be close to complete.
Columns map like this:

| REDCap column | Questionnaire |
|---|---|
| Variable / Field Name | `linkId` (keep it: their analyses use it) |
| Form Name | top-level group per instrument |
| Section Header | a group (or a `display` item) |
| Field Type: text | string; with validation date_dmy/ymd → date, number/integer → decimal/integer, email/phone → string with a regex |
| notes | text |
| radio / dropdown | choice (`answerOption`) |
| checkbox | choice, `repeats: true` (checkboxes) |
| yesno / truefalse | boolean |
| calc | `calculatedExpression` (rewrite the formula as FHIRPath; log the original) |
| descriptive | `display` |
| file | attachment |
| slider | integer with min/max (or a slider control) |
| Field Label | `text` |
| Choices, Calculations, OR Slider Labels | `answerOption`s: `1, Yes \| 2, No` → codes `1`, `2` with display; the codes are REDCap's, so give them a form-specific system and log it, or map them to standard codes after asking (strand 1) |
| Field Note | `text` help (`display` child with itemControl `help`) |
| Text Validation Min/Max | `minValue` / `maxValue` |
| Required Field? | `required` |
| Branching Logic | `enableWhen` (`[sex] = '2'` → question `sex`, `=`, the coding `2`); `and` / `or` → `enableBehavior` all/any; anything more complex → `enableWhenExpression`, log it |
| Identifier? | an identifying item: flag it; prepopulate from the patient instead of asking |
| Field Annotation | read it: `@HIDDEN`, `@READONLY`, `@DEFAULT`, `@NOW`, `@TODAY` map to hidden, `readOnly`, `initial`, and calculated now/today |

Screenshots of a REDCap form are a web form (above); ask for the data dictionary if they can
export it.

### A list of items, with no form behind it

There's no layout to question, so go straight to the why. Draft the list as items with your best
guess at types, then probe each: why it's there (strand 4), where it comes from (strand 3), who
answers it (strand 2), and how it varies (strand 5).

---

## Change log template

The change log is for **whoever owns the original form**, not for a FHIR reader. It explains
every way the new form differs from the old one, and every guess, in plain words, so they can
agree, push back or take it to their committee. Start it with the first draft and add to it every
round; don't write it at the end from memory.

Copy this shape (Markdown):

```markdown
## <Form name>: changes and assumptions

Original: <what they brought: "SW1283 Adult Sepsis Pathway v2.00 (paper, 2 pages)", "list of 8
items from <name>", "REDCap instrument 'baseline'">
Questionnaire: <file name / canonical URL>, version <x>
Last updated: <date>

### Target environment
<the block from environments.md>

### Changes

| # | Round | What changed (before → after) | Why | Status |
|---|---|---|---|---|
| 1 | 1 | "Tick all that apply" list of 10 conditions → searchable list of conditions | "Those ten were what fitted on the page" (form owner, round 2) | agreed |
| 2 | 1 | "Date of birth" box → filled in from the patient record, not asked | Known in the hospital system | agreed |
| 3 | 1 | Section D heading unreadable on the scan; guessed "Ongoing treatment" | Couldn't read it | to confirm with form owner |
| 4 | 3 | Pregnancy question only shown for women aged 18 or over | The pathway applies to maternity patients only | agreed |
| 5 | 3 | Hb filled in from the latest lab result in the last 3 months | Lab system holds it; older results not useful | assumed |

Status is one of: **agreed** (they said so), **assumed** (your sensible default; they didn't
object), **to confirm with form owner** (they weren't sure, or it's not their call).

### What the form writes back

| When | What is written | Where it goes |
|---|---|---|
| Always | The completed form (QuestionnaireResponse) | <server> |
| If "record diagnosis" is ticked | A diagnosis of iron deficiency anaemia, with the date | Patient's problem list (Condition) |

Or: "Nothing beyond the completed form: <reason in their words>."

### Recommended, not built

Things this version doesn't do, that the conversation suggested it should:

* <e.g. "A separate patient-facing form for section A, feeding this one (different people, at
  different times)">

### Couldn't check

* <e.g. "Not opened in the playground (no server available in this session)">
* <e.g. "Codes for 'Malnourished or frail' not confirmed: no terminology server reachable">
```

Write rules in plain words ("only shown for women aged 18 or over"), never as expressions.
Quote the person where their words are the reason.

---

## SDC cheat-sheet

The patterns a Questionnaire needs for prepopulation and extraction, each with a snippet copied
from one working form: [[`snippets/demo-questionnaire.json`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/snippets/demo-questionnaire.json)](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/snippets/demo-questionnaire.json)
("Pre-op bloods"). A test keeps the snippets identical to that form, and the form passes `check`
with [[`snippets/demo-sample-data.json`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/snippets/demo-sample-data.json)](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/snippets/demo-sample-data.json) (two patients, one female,
one male) and [[`snippets/demo-answers.json`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/snippets/demo-answers.json)](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/snippets/demo-answers.json). When you're unsure how
something fits together, read the demo form whole.

FHIR R4, the SDC IG, as rendered by Smart Forms. Extension URLs start
`http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-`, **except variables**, which
use the core `http://hl7.org/fhir/StructureDefinition/variable`. Getting that wrong fails
silently: the variable just doesn't exist.

### Contents

1. Launch context: who and what the form is about
2. Fetching data: x-fhir-query variables
3. Picking a value: FHIRPath variables
4. Filling an item: initialExpression
5. Calculating: calculatedExpression
6. Showing and hiding: enableWhen and enableWhenExpression
7. Answer lists: answerOption or answerValueSet
8. Writing back: template-based extraction
9. Writing back only when asked to
10. The person using the form: `%user`
11. Gotchas
12. Explaining an expression to the person
13. Codes used here, and how they were checked

### 1. Launch context: who and what the form is about

Declare each thing the form expects to be given when it opens. `patient` is almost always there;
add `user` when the form needs the person filling it in (a requester, a signature block) and
`encounter` when it's tied to a visit. The name becomes a variable: `%patient`, `%user`.

<!-- from: demo-questionnaire.json#launchContext:patient -->
```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
  "extension": [
    {
      "url": "name",
      "valueCoding": {
        "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext",
        "code": "patient"
      }
    },
    {
      "url": "type",
      "valueCode": "Patient"
    }
  ]
}
```

<!-- from: demo-questionnaire.json#launchContext:user -->
```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
  "extension": [
    {
      "url": "name",
      "valueCoding": {
        "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext",
        "code": "user"
      }
    },
    {
      "url": "type",
      "valueCode": "Practitioner"
    }
  ]
}
```

### 2. Fetching data: x-fhir-query variables

A variable in the `application/x-fhir-query` language is a FHIR search, run when the form is
prepopulated. `{{ }}` holds FHIRPath evaluated first (here, the patient's id). The result is a
search Bundle.

<!-- from: demo-questionnaire.json#variable:ObsHb -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "ObsHb",
    "language": "application/x-fhir-query",
    "expression": "Observation?code=http://loinc.org%7C718-7&patient={{%patient.id}}&_sort=-date&_count=1"
  }
}
```

* Write `|` as `%7C`: some servers reject a raw `|` (Meld answers HTTP 400, which a browser
  reports as a CORS error).
* `_sort=-date&_count=1` gets the latest result only.
* The search must suit the upstream server's shape (see [`upstream-shapes.md`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/references/upstream-shapes.md)): AU Core servers
  support `patient` + `code` on Observation; check what the target server supports.

### 3. Picking a value: FHIRPath variables

Name the thing you'll use more than once.

<!-- from: demo-questionnaire.json#variable:latestHb -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "latestHb",
    "language": "text/fhirpath",
    "expression": "%ObsHb.entry.resource.first()"
  }
}
```

Variables can depend on the patient, which is how a form varies by patient characteristics:

<!-- from: demo-questionnaire.json#variable:hbThreshold -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "hbThreshold",
    "language": "text/fhirpath",
    "expression": "iif(%patient.gender = 'male', 130, 120)"
  }
}
```

<!-- from: demo-questionnaire.json#variable:isAdult -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "isAdult",
    "language": "text/fhirpath",
    "expression": "%patient.birthDate.toDate() <= today() - 18 years"
  }
}
```

#### Testing for a kind of thing: value-set membership

When a rule is about a *kind* of thing (any chronic kidney disease, any sedative, any
anticoagulant), test whether the record's code is a member of a value set. Don't list codes or
names: a list is always incomplete (new products, brands, more specific diagnoses), silently
misses the rest, and no one can review it. A value set (SNOMED CT ECL, or a published one) says
what you mean and stays current.

Fetch the candidates broadly, then filter with `memberOf()`:

<!-- from: demo-questionnaire.json#variable:Conditions -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "Conditions",
    "language": "application/x-fhir-query",
    "expression": "Condition?patient={{%patient.id}}&clinical-status=active"
  }
}
```

<!-- from: demo-questionnaire.json#variable:hasCKD -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "hasCKD",
    "language": "text/fhirpath",
    "expression": "%Conditions.entry.resource.code.coding.where(memberOf('http://snomed.info/sct?fhir_vs=ecl/<< 709044004')).exists()"
  }
}
```

<!-- from: demo-questionnaire.json#item:ckd -->
```json
{
  "linkId": "ckd",
  "type": "boolean",
  "text": "Chronic kidney disease?",
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "iif(%hasCKD, true, {})"
      }
    }
  ]
}
```

* `memberOf()` asks the terminology server (Smart Forms uses `https://tx.ontoserver.csiro.au/fhir`
  by default), and works in prepopulation, calculations and show/hide rules (Smart Forms renderer
  1.5.0, sdc-populate 4.7.2). `check` runs it during prepopulation (it needs a network
  connection); its fill-in step can't yet run it inside a calculatedExpression.
* `iif(%hasCKD, true, {})` fills in "Yes" when the record says so and leaves the item blank
  otherwise: an absent record isn't a "No".
* `<<` includes the concept itself; `<` only its descendants. Check the ECL by expanding it
  (`$expand`) and looking at what's in and what's out, then log the rule in plain words ("any
  kind of chronic kidney disease on the problem list").
* For medicines, match on the product (AMT, in SNOMED CT-AU), e.g. the ingredient via
  `< 763158003 |Medicinal product| : 127489000 |Has active ingredient| = ...`. Expand it and
  check that the Australian brands you expect are in it: hand-written medicine ECL is easy to get
  subtly wrong.
* A specific pathology test (Hb, ferritin) is fine as a LOINC code in the search: that's one
  test, not a list standing in for a category.
* If the source server supports `code:in=<value set>` or `code:below=<code>`, the search can do
  the filtering; most don't, so `memberOf()` is the portable default.

### 4. Filling an item: initialExpression

The value the item starts with. The person can change it unless the item is `readOnly`.

<!-- from: demo-questionnaire.json#item:hb -->
```json
{
  "linkId": "hb",
  "type": "decimal",
  "text": "Haemoglobin (g/L)",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-unit",
      "valueCoding": {
        "system": "http://unitsofmeasure.org",
        "code": "g/L",
        "display": "g/L"
      }
    },
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%latestHb.value.value"
      }
    }
  ]
}
```

* `value.value` reads `Observation.valueQuantity.value` (`value` is a choice type).
* A date from a dateTime: `effective.toString().substring(0, 10)`.
* Give units with `questionnaire-unit`; the person then types just the number.

### 5. Calculating: calculatedExpression

Kept up to date as the form changes. Make it `readOnly` unless people may override it.

<!-- from: demo-questionnaire.json#item:anaemic -->
```json
{
  "linkId": "anaemic",
  "type": "boolean",
  "text": "Anaemic for their sex (Hb ≤ 130 g/L male, ≤ 120 g/L female)",
  "readOnly": true,
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%resource.repeat(item).where(linkId='hb').answer.value <= %hbThreshold"
      }
    }
  ]
}
```

* Inside the response, items nest in groups: use `%resource.repeat(item).where(linkId='hb')`.
  `%resource.item.where(linkId='hb')` only looks at the top level and finds nothing.
* Prepopulation doesn't run calculatedExpressions; the renderer does. `check` works them out
  too, for each test patient.

### 6. Showing and hiding: enableWhen and enableWhenExpression

Use **enableWhen** when it depends on another answer in the form:

<!-- from: demo-questionnaire.json#item:iron-product -->
```json
{
  "linkId": "iron-product",
  "type": "choice",
  "text": "Which iron product?",
  "answerValueSet": "https://healthterminologies.gov.au/fhir/ValueSet/australian-medication-1",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/questionnaire-item-control",
            "code": "autocomplete"
          }
        ]
      }
    }
  ],
  "enableWhen": [
    {
      "question": "iron-recent",
      "operator": "=",
      "answerBoolean": true
    }
  ]
}
```

Use **enableWhenExpression** when it depends on the patient's record (sex, age, a known
condition), so the person isn't asked something the system already knows:

<!-- from: demo-questionnaire.json#item:pregnancy -->
```json
{
  "linkId": "pregnancy",
  "type": "choice",
  "text": "Pregnancy status",
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%patient.gender = 'female' and %isAdult"
      }
    },
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtract",
      "extension": [
        {
          "url": "template",
          "valueReference": {
            "reference": "#PregnancyStatusTemplate"
          }
        }
      ]
    }
  ],
  "answerOption": [
    {
      "valueCoding": {
        "system": "http://loinc.org",
        "code": "LA15173-0",
        "display": "Pregnant"
      }
    },
    {
      "valueCoding": {
        "system": "http://loinc.org",
        "code": "LA26683-5",
        "display": "Not pregnant"
      }
    },
    {
      "valueCoding": {
        "system": "http://loinc.org",
        "code": "LA4489-6",
        "display": "Unknown"
      }
    }
  ]
}
```

Hidden items are left out of the response, so anything they would write back isn't written.

### 7. Answer lists: answerOption or answerValueSet

A **short, fixed list** that matters for its own sake: `answerOption` with real codes.

<!-- from: demo-questionnaire.json#item:urgency -->
```json
{
  "linkId": "urgency",
  "type": "choice",
  "text": "How urgent is surgery?",
  "answerOption": [
    {
      "valueCoding": {
        "system": "http://hl7.org/fhir/request-priority",
        "code": "routine",
        "display": "Routine"
      }
    },
    {
      "valueCoding": {
        "system": "http://hl7.org/fhir/request-priority",
        "code": "urgent",
        "display": "Urgent"
      }
    },
    {
      "valueCoding": {
        "system": "http://hl7.org/fhir/request-priority",
        "code": "asap",
        "display": "As soon as possible"
      }
    }
  ]
}
```

A **long list**, where people should find anything relevant rather than pick from what fitted
on the page: `answerValueSet`, with SNOMED CT ECL, shown as a search box (`autocomplete`).

<!-- from: demo-questionnaire.json#item:anaemia-type -->
```json
{
  "linkId": "anaemia-type",
  "type": "choice",
  "text": "Type of anaemia, if known",
  "answerValueSet": "http://snomed.info/sct?fhir_vs=ecl/< 271737000",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/questionnaire-item-control",
            "code": "autocomplete"
          }
        ]
      }
    }
  ],
  "enableWhen": [
    {
      "question": "anaemic",
      "operator": "=",
      "answerBoolean": true
    }
  ]
}
```

This is the tick-box question in code: ten conditions printed on paper may be "these ten
matter" (answerOption) or "these were the ten that fitted" (a value set, or the ten plus
"other").

**Coded by default** for medicines, conditions, procedures, allergies (the substance and the
reaction) and pathology: a coded answer can be prepopulated, extracted, checked by rules and
counted; free text can't. Use a national value set with `autocomplete` (the iron product in
section 6 does this), and narrow it with ECL only when the question really is narrower:

| Data | Value set (`answerValueSet`) |
|---|---|
| Medicines | `https://healthterminologies.gov.au/fhir/ValueSet/australian-medication-1` |
| Conditions, diagnoses, problems | `https://healthterminologies.gov.au/fhir/ValueSet/clinical-condition-1` |
| Procedures, operations | `https://healthterminologies.gov.au/fhir/ValueSet/procedure-1` |
| Allergy or intolerance: substance | `https://healthterminologies.gov.au/fhir/ValueSet/indicator-hypersensitivity-intolerance-to-substance-2` |
| Allergy or intolerance: reaction | `https://healthterminologies.gov.au/fhir/ValueSet/clinical-finding-1` |
| Pathology test requested | `https://www.rcpa.edu.au/fhir/ValueSet/spia-requesting-refset-3` |
| Pathology result names (LOINC) | `https://www.rcpa.edu.au/fhir/ValueSet/spia-chemical-pathology-refset-3` (and the other SPIA sets) |

These are the bindings AU Core uses, so answers line up with the record they're read from and
written back to. Use `open-choice` only if people genuinely need to type something not in the
value set, and say so in the change log.

### 8. Writing back: template-based extraction

Put an example of the resource to create in `contained`, with `templateExtractValue` where a
value comes from the response. Attach it to the item it's about with `templateExtract`. Paths
are FHIRPath, evaluated from that item: `answer.value` is its answer; `%resource` is the whole
QuestionnaireResponse.

<!-- from: demo-questionnaire.json#contained:PregnancyStatusTemplate -->
```json
{
  "resourceType": "Observation",
  "id": "PregnancyStatusTemplate",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "social-history",
          "display": "Social History"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "82810-3",
        "display": "Pregnancy status"
      }
    ]
  },
  "subject": {
    "_reference": {
      "extension": [
        {
          "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
          "valueString": "%resource.subject.reference"
        }
      ]
    }
  },
  "_effectiveDateTime": {
    "extension": [
      {
        "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
        "valueString": "today().toString()"
      }
    ]
  },
  "valueCodeableConcept": {
    "coding": [
      {
        "extension": [
          {
            "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
            "valueString": "answer.value"
          }
        ]
      }
    ]
  }
}
```

* Put `templateExtractValue` on the `_element` beside a primitive (`_effectiveDateTime`,
  `subject._reference`), or on a complex element itself (a Coding inside `coding`).
* `today().toString()` gives a date; use the response's own date where it matters.
* Leave out `meta.profile`: the resource can conform to AU Core without declaring it, and
  some servers (Meld) reject resources that declare one.

### 9. Writing back only when asked to

Attach the template to a **group that's only shown when the answer is yes**. When it's hidden,
it isn't in the response, so nothing is written. (A `templateExtractContext` on the template
itself doesn't stop it in Smart Forms' extractor, sdc-template-extract 1.0.16.)

<!-- from: demo-questionnaire.json#item:ida -->
```json
{
  "linkId": "ida",
  "type": "group",
  "text": "Iron deficiency anaemia",
  "enableWhen": [
    {
      "question": "ida-confirm",
      "operator": "=",
      "answerBoolean": true
    }
  ],
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtract",
      "extension": [
        {
          "url": "template",
          "valueReference": {
            "reference": "#IronDeficiencyAnaemiaTemplate"
          }
        }
      ]
    }
  ],
  "item": [
    {
      "linkId": "ida-onset",
      "type": "date",
      "text": "Date diagnosed"
    }
  ]
}
```

<!-- from: demo-questionnaire.json#contained:IronDeficiencyAnaemiaTemplate -->
```json
{
  "resourceType": "Condition",
  "id": "IronDeficiencyAnaemiaTemplate",
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
        "code": "active"
      }
    ]
  },
  "verificationStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
        "code": "confirmed"
      }
    ]
  },
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/condition-category",
          "code": "problem-list-item"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "87522002",
        "display": "Iron deficiency anaemia"
      }
    ]
  },
  "subject": {
    "_reference": {
      "extension": [
        {
          "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
          "valueString": "%resource.subject.reference"
        }
      ]
    }
  },
  "_onsetDateTime": {
    "extension": [
      {
        "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
        "valueString": "item.where(linkId='ida-onset').answer.value.toString()"
      }
    ]
  }
}
```

### 10. The person using the form: `%user`

<!-- from: demo-questionnaire.json#item:requester -->
```json
{
  "linkId": "requester",
  "type": "string",
  "text": "Requesting clinician",
  "readOnly": true,
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%user.name.first().given.first() + ' ' + %user.name.first().family"
      }
    }
  ]
}
```

**When it isn't a clinician.** A parent or carer completing a child's consent form is a
`RelatedPerson` (linked to the child by `RelatedPerson.patient`); a patient filling in their own
questionnaire is the `Patient`. Declare that type on the `user` launch context:

```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
  "extension": [
    { "url": "name", "valueCoding": { "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext", "code": "user" } },
    { "url": "type", "valueCode": "RelatedPerson" }
  ]
}
```

Then `%user.name.first().text` is the parent's name. Put `name` before `type`: sdc-populate reads
them by position. It takes a `user` directly only as a Practitioner; a RelatedPerson or Patient
user reaches it as a SMART `fhirContext` reference from the launch, so check that your target
environment sends one (and say so under "Couldn't check" if you can't). `check` and `preview` do
this for you, using the RelatedPerson linked to each test patient, so put one per family in the
sample data.

### 11. Gotchas

* **Variables** use `http://hl7.org/fhir/StructureDefinition/variable`, not an `sdc-` URL.
* **`|` in searches**: write `%7C`.
* **`repeat(item)`** to find an item anywhere in the response.
* **Smart Forms drops `ifNoneExist`**: writing back twice creates duplicates. Say so in the change
  log if it matters.
* **The playground doesn't prepopulate on Build**: choose *Populate → Pre-populate*.
* **`meta.profile`**: leave it out of templates (see 8).
* **linkIds** are forever: other things (expressions, templates, analytics) refer to them. Make
  them readable (`hb-date`, not `item-17`).

### 12. Explaining an expression to the person

The person never writes or reads FHIRPath: you write every expression and check it. Tell them,
in their words, what an item fills in from and when ("your latest Hb result from the lab system,
if there's one from the last 3 months"; "only shown for women aged 18 or over"), and log that
plain-words rule in the change log. If a technical colleague asks to see an expression, show
it then.

### 13. Codes used here, and how they were checked

Looked up with Ontoserver (`$lookup` / `$expand`) on 30 Oct 2026:

| Code | System | Display |
|---|---|---|
| 718-7 | LOINC | Hemoglobin [Mass/volume] in Blood |
| 2276-4 | LOINC | Ferritin [Mass/volume] in Serum or Plasma |
| 82810-3 | LOINC | Pregnancy status |
| LA15173-0, LA26683-5, LA4489-6 | LOINC answers | Pregnant, Not pregnant, Unknown |
| 87522002 | SNOMED CT | Iron deficiency anaemia |
| `< 271737000` | SNOMED CT ECL | descendants of Anaemia (576 concepts) |
| `<< 709044004` | SNOMED CT ECL | Chronic kidney disease and its subtypes (143 concepts) |
| 433144002 | SNOMED CT | Chronic kidney disease stage 3 (sample data; in the ECL above) |
| 56531000036109 | SNOMED CT-AU (AMT) | Ferinject 500 mg/10 mL injection, 10 mL vial (answers; in Australian Medication) |
| the value sets in section 7 | NCTS, RCPA | expanded on `tx.ontoserver.csiro.au` on 30 Oct 2026 |

Never invent a code. If you can't look one up, write the item with text only and list it in the
change log as "code to confirm".

MBS item numbers have no FHIR system URI confirmed by AU Core. If a form needs them, use the one
your target system uses and log the system as "to confirm".
