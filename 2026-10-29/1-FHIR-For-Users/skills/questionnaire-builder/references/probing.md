# Probing guide

The questions that turn a copied form into a good FHIR Questionnaire. This is territory, not a
script: pick the few questions that matter for the part of the form the person is looking at,
ask them in their words, and show what changed.

The person knows the form and its patients, not FHIR. Ask about **their form, their patients and
their work**. Never ask them to make a FHIR decision ("should this be an answerValueSet?"); ask
the question that decides it ("is this list everything that matters, or just what fitted?") and
make the FHIR decision yourself.

Every answer that changes the form goes in the change log, with the reason in their words.

## Contents

1. The design of the existing form
2. Who fills it in, and who reads it
3. Upstream data: what exists already, and in what shape
4. Purpose and downstream use
5. How the form varies (ask this explicitly)

---

## 1. The design of the existing form

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

**What each answer changes:**

| They say | You change |
|---|---|
| "These ten are the ones that matter" | Keep them as a coded list (`answerOption`, looked-up codes), checkboxes if more than one can apply |
| "That's what fitted" / "people write in all sorts" | A searchable list (`answerValueSet` with SNOMED CT ECL, autocomplete), or the ten plus an open choice |
| "Nobody uses that" | Propose dropping it; log it as "to confirm with the form owner" |
| "Go to question 12 if no" | `enableWhen`; the skip instruction disappears |
| A fixed-size table | A repeating group (`repeats: true`), no row limit |
| Free text that's really one of a few things | A coded choice, with an "other" escape if needed |
| Reference material (guidelines, dose tables) | Not questions: leave it out, or a `display` item / link; consider whether it's really decision support for later |
| A calculation done by hand (a score, a dose, days until) | A `calculatedExpression`, read-only |
| Units in the label ("weight ___ kg") | A number item with a unit |
| Something that's known elsewhere | Prepopulate it (strand 3) instead of asking |

## 2. Who fills it in, and who reads it

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

## 3. Upstream data: what exists already, and in what shape

Prepopulation can only read what exists. See `upstream-shapes.md` for searches.

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

## 4. Purpose and downstream use

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

## 5. How the form varies (ask this explicitly)

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
`sample-data.md`), so the demo shows the form behaving differently.

Log every variation and the rule that drives it, in plain words.
