# Decision log template

The decision log records **the decisions that led to the current design**, so anyone can see why
the form is the way it is and revisit a decision when circumstances change. It's written for
whoever owns the form (and whoever inherits it), not for a FHIR reader.

A decision is any choice that shaped the design:
* a departure from the original form;
* a standard or value set chosen, or a local list kept;
* what to prefill, and from where;
* what to write back, or not;
* who sees what;
* a guess you had to make;
* something deliberately left out.

For each one, record:
* what was decided;
* what it was **instead of** (the original's way, or the alternative you weighed);
* **why**, in the words of whoever decided;
* **what would make it worth revisiting**.

Start the log with the first draft and add to it as each decision is made. Don't reconstruct it
at the end from memory: the reasons are what get lost.

Copy this shape (Markdown):

```markdown
# <Form name>: decision log

Original: <what they brought: "SW1283 Adult Sepsis Pathway v2.00 (paper, 2 pages)", "list of 8
items from <name>", "REDCap instrument 'baseline'">
Questionnaire: <file name / canonical URL>, version <x>
Last updated: <date>

## Target environment
<the block from environments.md>

## Decisions

| # | Decision | Instead of | Why (who, when) | Status | Revisit if |
|---|---|---|---|---|---|
| 1 | Conditions picked from the national clinical condition list (searchable) | Ten tick boxes on the paper form | "Those ten were what fitted on the page" (form owner, round 2) | agreed | Reporting needs exactly those ten categories |
| 2 | Date of birth filled in from the patient record, not asked | A box on the form | The hospital system already holds it (round 1) | assumed | The form is used where the record isn't available |
| 3 | Section D heading read as "Ongoing treatment" | (unreadable on the scan) | Best reading of the scan (round 1) | to confirm with form owner | The form owner reads it differently |
| 4 | Pregnancy question shown only for women aged 18 or over | Asked of everyone | The pathway only applies to adult maternity patients (form owner, round 3) | agreed | The pathway extends to adolescents |
| 5 | Hb filled in from the latest lab result in the last 3 months | Typed in by the nurse | Lab results are in the record; older ones aren't useful for this decision (round 3) | assumed | Results arrive from a lab that doesn't send to this system |
| 6 | Indigenous status kept as the unit's own yes/no question, mapped to the national code | The national five-way question | "The state registry still takes our format" (data manager, round 2) | local by choice | The registry accepts the national codes |
| 7 | Nothing written back except the completed form | Writing the score to the record | "Nobody else uses the score" (form owner, round 4) | agreed | Another service starts using the score |

Status is one of:
* **agreed**: they said so.
* **assumed**: your sensible default; they didn't object.
* **to confirm with form owner**: they weren't sure, or it's not their call.
* **local by choice**: they kept a local list or code instead of the national standard. Give
  their reason, and the national mapping if there is one.

## What the form writes back

| When | What is written | Where it goes |
|---|---|---|
| Always | The completed form (QuestionnaireResponse) | <server> |
| If "record diagnosis" is ticked | A diagnosis of iron deficiency anaemia, with the date | Patient's problem list (Condition) |

Or: "Nothing beyond the completed form: <reason in their words>." (And that's a decision in the
table too.)

## Deferred: recommended, not built

Decisions to come back to: things this version doesn't do that the conversation suggested it
should, each with why it was deferred.

* <e.g. "A separate patient-facing form for section A, feeding this one (different people, at
  different times). Deferred: one form first.">

## Couldn't check

* <e.g. "Not opened in the playground (no server available in this session)">
* <e.g. "Codes for 'Malnourished or frail' not confirmed: no terminology server reachable">
```

Write rules in plain words ("only shown for women aged 18 or over"), never as expressions.
Quote the person where their words are the reason. When a decision is reversed, don't delete it:
mark the old row "replaced by #n", so the history of the reasoning stays visible.
