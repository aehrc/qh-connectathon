# Starting points

Four ways people arrive, and how to get from each to a first draft quickly. In every case:
**structure first, no prepopulation or extraction yet**, and every guess goes in the decision log
as an assumption.

## Personal information comes first

Before they share anything, ask for a **blank** form, or one with names, identifiers, dates of
birth, addresses and the like covered. That is the only step that protects the person on the
form: anything shared with you has already gone to the AI provider.

If a form arrives with identifiable details on it anyway:

* Say so plainly and briefly, without repeating the details: they have already been sent, and
  the person should follow their organisation's process for that.
* Use only the form's **structure**. Filled-in values never go into the Questionnaire, the
  sample data, the decision log or any lookup (terminology servers included).
* Read values only as clues to **shape**: a date written dd/mm/yyyy, a weight in kg, a
  three-letter code. Sample data gets made-up values of that shape.
* Don't claim to have redacted the image or file; you can't.

Patient label areas ("affix label here", URN, name, date of birth, sex) are a structure clue too:
they become prepopulated patient details, not questions.

## A scanned or photographed paper form (image or PDF)

* Read it top to bottom; keep the form's order and section headings as groups. Headings,
  numbered parts and separate pages are its sections: in a long form, each becomes a tab (see
  the SDC cheat-sheet, section 6).
* Each blank, box or tick list becomes an item: blank line → string or text; a box with units →
  decimal or integer with a unit; dd/mm/yy → date; a time → time or dateTime; tick list → choice
  (checkboxes if "tick all that apply"); yes/no → boolean.
* Text you can't read: guess, mark it in the decision log as "couldn't read; guessed", and ask.
* Notice what isn't a question: instructions, reference tables, flowchart arrows ("if yes →"),
  logos, page furniture ("Do not write in this binding margin"). Instructions may become `display`
  items; arrows become `enableWhen`; reference tables are usually left out (ask: strand 1).
* Multi-page documents can bundle a form with guidelines (dosing tables, pathways). Ask which
  pages are the form.

## A screenshot of a web form

* The same as paper, plus: a screenshot shows one state. Ask what appears when other answers are
  chosen (hidden fields, conditional sections, drop-down contents you can't see).
* Drop-downs: ask for the full list, or whether it comes from a system list (a value set
  candidate).
* Validation messages, required markers (*), and greyed-out fields are clues to `required`,
  constraints and `readOnly`.

## A REDCap data dictionary (CSV)

The dictionary already holds most of the structure, so the draft can be close to complete.
Columns map like this:

| REDCap column | Questionnaire |
|---|---|
| Variable / Field Name | `linkId` (keep it: their analyses use it) |
| Form Name | top-level group per instrument (several instruments: a tab each) |
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

## A list of items, with no form behind it

There's no layout to question, so go straight to the why. Draft the list as items with your best
guess at types, then probe each: why it's there (strand 4), where it comes from (strand 3), who
answers it (strand 2), and how it varies (strand 5).
