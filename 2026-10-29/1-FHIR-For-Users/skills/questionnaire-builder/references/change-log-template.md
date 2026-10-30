# Change log template

The change log is for **whoever owns the original form**, not for a FHIR reader. It explains
every way the new form differs from the old one, and every guess, in plain words, so they can
agree, push back or take it to their committee. Start it with the first draft and add to it every
round; don't write it at the end from memory.

Copy this shape (Markdown):

```markdown
# <Form name>: changes and assumptions

Original: <what they brought: "SW1283 Adult Sepsis Pathway v2.00 (paper, 2 pages)", "list of 8
items from <name>", "REDCap instrument 'baseline'">
Questionnaire: <file name / canonical URL>, version <x>
Last updated: <date>

## Target environment
<the block from environments.md>

## Changes

| # | Round | What changed (before → after) | Why | Status |
|---|---|---|---|---|
| 1 | 1 | "Tick all that apply" list of 10 conditions → searchable list of conditions | "Those ten were what fitted on the page" (form owner, round 2) | agreed |
| 2 | 1 | "Date of birth" box → filled in from the patient record, not asked | Known in the hospital system | agreed |
| 3 | 1 | Section D heading unreadable on the scan; guessed "Ongoing treatment" | Couldn't read it | to confirm with form owner |
| 4 | 3 | Pregnancy question only shown for women aged 18 or over | The pathway applies to maternity patients only | agreed |
| 5 | 3 | Hb filled in from the latest lab result in the last 3 months | Lab system holds it; older results not useful | assumed |

Status is one of: **agreed** (they said so), **assumed** (your sensible default; they didn't
object), **to confirm with form owner** (they weren't sure, or it's not their call), **local by
choice** (they kept a local list or code instead of the national standard: give their reason, and
the national mapping if there is one).

## What the form writes back

| When | What is written | Where it goes |
|---|---|---|
| Always | The completed form (QuestionnaireResponse) | <server> |
| If "record diagnosis" is ticked | A diagnosis of iron deficiency anaemia, with the date | Patient's problem list (Condition) |

Or: "Nothing beyond the completed form: <reason in their words>."

## Recommended, not built

Things this version doesn't do, that the conversation suggested it should:

* <e.g. "A separate patient-facing form for section A, feeding this one (different people, at
  different times)">

## Couldn't check

* <e.g. "Not opened in the playground (no server available in this session)">
* <e.g. "Codes for 'Malnourished or frail' not confirmed: no terminology server reachable">
```

Write rules in plain words ("only shown for women aged 18 or over"), never as expressions.
Quote the person where their words are the reason.
