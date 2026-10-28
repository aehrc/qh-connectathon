---
marp: true
theme: track1
paginate: true
title: Track 1 write-back
style: |
  .split { display: grid; grid-template-columns: 700px minmax(0, 1fr); gap: 28px; align-items: start; }
  .split > div:first-child img { width: 700px; }
  .split code, .split a { overflow-wrap: anywhere; }
  .split pre code { font-size: 15px; }
  .split p, .split li { font-size: 0.85em; }
  .split ol, .split ul { margin-top: 0; }
  .flow { display: grid; grid-template-columns: 1fr 40px 1fr 40px 1fr 40px 1fr; align-items: center; margin: 0.4em 0 0.6em; }
  .flow > div { background: #fff; border: 1px solid #D5DEE4; border-radius: 8px; padding: 10px 12px; font-size: 0.72em; min-height: 150px; }
  .flow > span { text-align: center; color: #00A9CE; font-size: 1.4em; font-weight: 700; }
  .flow h3 { margin: 0 0 0.2em; color: #00738F; }
  pre.wrap, pre.wrap code { white-space: pre-wrap; overflow-wrap: normal; word-break: normal; }
  pre.wrap .nb { white-space: nowrap; }
---

<!-- _class: title -->
<!-- _paginate: false -->

# Write-back

## From answers to FHIR resources on the server

Track 1: FHIR for Users. FHIR in Queensland Health Connectathon, 29–30 Oct 2026
Jim Steel, Leonie Dickson (AEHRC), Leon Cavalli (QH)

---

## Where we are

The Prepopulation deck **read** the latest Hb, ferritin and Hb date from the server into the form.

This deck goes the other way: a result the nurse **types in** (from an external lab) becomes an **Observation on the FHIR server**. Next time the form pre-populates, it finds that result.

- Same form: `decks/examples/pathology-walkthrough.json`, group **Results from an external lab** (`pam-ext`)
- Demo patient: **Demi Formsdemo**, `pam-demo` (synthetic): latest Hb **104 g/L** (14 Oct 2026)
- We'll enter an external Hb of **98 g/L** collected **27 Oct 2026**
- FHIR server: Meld open endpoint `https://gw.interop.community/QHConnectathon2026/open`

---

## From answers to resources

<div class="flow">

<div>

### QuestionnaireResponse
The answers. Test **Haemoglobin (Hb)**, Result **98**, Collected **2026-10-27**.

</div>
<span>→</span>
<div>

### $extract
Template-based: copies a **template** resource from the form and fills it in with FHIRPath over the answers.

</div>
<span>→</span>
<div>

### transaction Bundle
One entry per resource made, each with `request` **POST Observation**.

</div>
<span>→</span>
<div>

### FHIR server
The app POSTs the Bundle to the server base URL. The server creates the Observation.

</div>

</div>

- The **form** says what to make: a template plus expressions. No code in the app.
- The **app** (Smart Forms) runs the extract and sends the Bundle ("write back").
- SDC also defines **Observation-based**, **definition-based** and **StructureMap-based** extract. We use **templates**: what you write is what comes out.

---

<style scoped>p, li { font-size: 0.9em; }</style>

## The form side: `templateExtract` on the group

On the repeating group `pam-ext` (from `pathology-walkthrough.json`, reformatted, child items abridged):

```json
{
  "linkId": "pam-ext",
  "text": "Results from an external lab",
  "type": "group",
  "extension": [ {
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtract",
    "extension": [ { "url": "template", "valueReference": { "reference": "#PAMExternalResultTemplate" } } ]
  } ],
  "repeats": true,
  "item": [ ... pam-ext-test (choice), pam-ext-value (decimal), pam-ext-date (date) ... ]
}
```

- `#PAMExternalResultTemplate` points at a resource in the Questionnaire's **`contained`** list.
- `repeats: true`: the nurse can add several results. **Each repeat makes one Observation.**

---

<style scoped>pre, pre code { font-size: 15px; }</style>

## The template: a contained Observation (1/2)

In the Questionnaire's `contained` list. Answer-dependent parts carry a **`templateExtractValue`** FHIRPath:

```json
{
  "resourceType": "Observation",
  "id": "PAMExternalResultTemplate",
  "status": "final",
  "category": [ { "coding": [ { "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory", "display": "Laboratory" } ] } ],
  "code": { "coding": [ { "extension": [ {
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
    "valueString": "item.where(linkId='pam-ext-test').answer.value" } ] } ] },
  "subject": { "_reference": { "extension": [ {
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
    "valueString": "%resource.subject.reference" } ] } },
  "_effectiveDateTime": { "extension": [ {
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
    "valueString": "item.where(linkId='pam-ext-date').answer.value.toString()" } ] },
  "valueQuantity": "... next slide ..."
}
```


---

<style scoped>pre, pre code { font-size: 14px; }</style>

## The template (2/2): `valueQuantity`

<pre class="wrap"><code>"valueQuantity": {
  "_value": { "extension": [ {
    "url": <span class="nb">"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",</span>
    "valueString": <span class="nb">"item.where(linkId='pam-ext-value').answer.value"</span> } ] },
  "system": "http://unitsofmeasure.org",
  "_code": { "extension": [ {
    "url": <span class="nb">"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",</span>
    "valueString": <span class="nb">"iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'718-7',</span> 'g/L', <span class="nb">iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'2276-4',</span> 'ug/L', <span class="nb">iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'2502-3',</span> '%', 'mg/L')))" } ] },
  "_unit": { "extension": [ {
    "url": <span class="nb">"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",</span>
    "valueString": <span class="nb">"iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'718-7',</span> 'g/L', <span class="nb">iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'2276-4',</span> 'µg/L', <span class="nb">iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'2502-3',</span> '%', 'mg/L')))" } ] }
}</code></pre>

- `system` is fixed (UCUM). `_code` gives the UCUM code (`ug/L`), `_unit` the display (`µg/L`): they differ only for ferritin.
- The unit comes from the **chosen test**, so the Result field in the form has no unit of its own.

---

<style scoped>pre, pre code { font-size: 16px; }</style>

## The `_` trick: extensions on primitives

In FHIR JSON a **primitive** (string, decimal, code, dateTime...) can't hold an extension itself, so its extensions go in a **sibling property with a leading `_`**:

<div class="cards" style="grid-template-columns: 1fr 1.3fr;">

<div>

### Ordinary Observation
```json
"valueQuantity": { "value": 98 }
```

</div>

<div>

### Template
```json
"valueQuantity": {
  "_value": { "extension": [ {
    "url": "...templateExtractValue",
    "valueString": "..." } ] } }
```

</div>

</div>

- In the template the primitive has **no value yet**, only the extension that computes it: `_value`, `_code`, `_unit`, `_reference`, `_effectiveDateTime`.
- A **complex** element (a `Coding`) takes the extension directly: `"coding": [ { "extension": [...] } ]`. The answer's whole Coding replaces it.
- The extract removes the `templateExtractValue` extensions and fills in the values.

---

## How the extract runs

For **each repeat** of the group that has the `templateExtract`:

1. Copy the template.
2. Evaluate each `templateExtractValue` expression with **that repeat** (the `pam-ext` item in the QuestionnaireResponse) as the context. `%resource` is the **whole QuestionnaireResponse**.
3. Put the result in place of the extension. (Per SDC, an expression that returns nothing leaves the element out.)
4. Add the result to a **transaction Bundle** as an entry with `request: { method: POST, url: Observation }`.

Next: check each of these in fhirpath-lab before the form ever runs.

---

<!-- _class: demo -->
<style scoped>p, li { font-size: 0.88em; } ol { margin-top: 0; }</style>

## Test the expressions in fhirpath-lab

Open **https://fhirpath-lab.com/FhirPath** (only for testing expressions; the extract runs in Smart Forms).

1. **Test Resource JSON** (right): click in it, **Ctrl+A**, paste the sample QuestionnaireResponse (next slide, or [`examples/sample-qr.json`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/decks/examples/sample-qr.json)). The header changes to *(local resource JSON)*.
2. **Context Expression**: paste
   ```
   repeat(item).where(linkId='pam-ext')
   ```
   The `pam-ext` repeat, as in the extract. Results show *Context: QuestionnaireResponse.item[0].item[3]*.
3. **Fhirpath Expression**: paste one template expression at a time, then **▶** (top right) or **Ctrl+Enter**. **Results don't update as you type.** `%resource` is the pasted QR. Engine: default **R4 / fhirpath.js**.

---

<style scoped>pre, pre code { font-size: 14px; line-height: 1.3; }</style>

## The sample QuestionnaireResponse to paste

What Smart Forms makes for our answers (`examples/sample-qr.json`, compacted):

```json
{
  "resourceType": "QuestionnaireResponse",
  "status": "completed",
  "questionnaire": "https://aehrc.github.io/qh-connectathon/track1/Questionnaire/pathology-walkthrough|0.1.0",
  "subject": { "reference": "Patient/pam-demo" },
  "authored": "2026-10-28T10:30:00+10:00",
  "item": [ { "linkId": "pam-pathology", "text": "Pathology", "item": [
    { "linkId": "pam-hb", "text": "Haemoglobin (Hb)", "answer": [ { "valueDecimal": 104 } ] },
    { "linkId": "pam-ferritin", "text": "Ferritin", "answer": [ { "valueDecimal": 18 } ] },
    { "linkId": "pam-hb-date", "text": "Date of latest Hb", "answer": [ { "valueDate": "2026-10-14" } ] },
    { "linkId": "pam-ext", "text": "Results from an external lab", "item": [
      { "linkId": "pam-ext-test", "text": "Test", "answer": [ { "valueCoding":
          { "system": "http://loinc.org", "code": "718-7", "display": "Haemoglobin (Hb)" } } ] },
      { "linkId": "pam-ext-value", "text": "Result", "answer": [ { "valueDecimal": 98 } ] },
      { "linkId": "pam-ext-date", "text": "Collected", "answer": [ { "valueDate": "2026-10-27" } ] }
    ] }
  ] } ]
}
```

The `pam-ext` repeat is `item[0].item[3]`: that's what the context expression finds. Or copy [`examples/sample-qr.json`](https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/decks/examples/sample-qr.json) from GitHub (Raw).

---

<!-- _class: demo -->

## Code: `item.where(linkId='pam-ext-test').answer.value`

<div class="split">

<div>

![fhirpath-lab: the pam-ext-test answer is a LOINC Coding](img/writeback/01-fhirpath-lab-ext-code.png)

</div>

<div>

Context: the `pam-ext` repeat (previous slide).

From the repeat → its `pam-ext-test` child → the answer's value.

Result: a **Coding**

```
{ "system": "http://loinc.org",
  "code": "718-7",
  "display": "Haemoglobin (Hb)" }
```

It becomes `code.coding[0]` of the Observation.

</div>

</div>

---

<!-- _class: demo -->

## Value: `item.where(linkId='pam-ext-value').answer.value`

<div class="split">

<div>

![fhirpath-lab: the pam-ext-value answer is 98](img/writeback/02-fhirpath-lab-ext-value.png)

</div>

<div>

Same context.

Result: **`98`** (decimal).

It becomes `valueQuantity.value`.

`value` finds `valueDecimal` (the answer is a choice element, like `value[x]` in the Prepopulation deck).

</div>

</div>

---

<!-- _class: demo -->
<style scoped>.split { grid-template-columns: 560px minmax(0, 1fr); } .split > div:first-child img { width: 560px; }</style>

## Unit: a nested `iif`

<div class="split">

<div>

![fhirpath-lab: the unit expression gives g/L](img/writeback/03-fhirpath-lab-ext-unit.png)

</div>

<div>

Paste the `_unit` expression:

<pre class="wrap"><code><span class="nb">iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'718-7',</span> 'g/L', <span class="nb">iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'2276-4',</span> 'µg/L', <span class="nb">iif(item.where(linkId='pam-ext-test').answer.value.code</span> = <span class="nb">'2502-3',</span> '%', 'mg/L')))</code></pre>

Result: **`g/L`** (String).

Hb → g/L, ferritin → µg/L, TSAT `2502-3` → %, else mg/L (as in the real module). `_code` is the same with `ug/L`.

</div>

</div>

---

<!-- _class: demo -->

## Date

`item.where(linkId='pam-ext-date').answer.value.toString()`

<div class="split">

<div>

![fhirpath-lab: the date expression gives 2026-10-27](img/writeback/04-fhirpath-lab-ext-date.png)

</div>

<div>

Result: **`2026-10-27`** (String).

The answer is a FHIR `date`; `.toString()` gives the text to put into `effectiveDateTime` (a date alone is a valid dateTime).

</div>

</div>

---

<!-- _class: demo -->

## Subject: `%resource.subject.reference`

<div class="split">

<div>

![fhirpath-lab: %resource.subject.reference gives Patient/pam-demo](img/writeback/05-fhirpath-lab-ext-subject.png)

</div>

<div>

`%resource` is the **whole QuestionnaireResponse**, not the repeat, so this reaches up to the QR's own `subject`.

Result: **`"Patient/pam-demo"`** (string).

It becomes `subject.reference`. The QR's subject is the patient the form was filled for (`%patient` at populate time).

</div>

</div>

---

<!-- _class: demo -->
<style scoped>p, li { font-size: 0.88em; } ol { margin-top: 0; }</style>

## Smart Forms playground: build and pre-populate

Same steps as the Prepopulation deck. Open **https://aehrc.github.io/qh-connectathon/smart-forms/** → **GO TO PLAYGROUND** (left sidebar).

1. **Gear** (top right). *Source FHIR Server URL*: `https://gw.interop.community/QHConnectathon2026/open` → click **?** (*URL validated*) → **SAVE URL AS SOURCE FHIR SERVER**.
2. *Selected Patient*: **Demi Formsdemo** (last in the list) → **SAVE**.
3. *Or... pick a Questionnaire from our Forms Server*: **pathology-walkthrough** → **BUILD FORM ▶**.
4. **POPULATE ▾** → **Pre-populate (Replace whole form)**: Hb **104**, ferritin **18**, date **14/10/2026**.

Write-back goes to the same Source FHIR server. The public **https://smartforms.csiro.au/playground** works for other servers but **can't reach Meld** (CORS).

---

<!-- _class: demo -->

## Fill in an external result

<div class="split">

<div>

![Playground: external lab result Hb 98 on 27/10/2026](img/writeback/06-playground-filled.png)

</div>

<div>

Under *Results from an external lab*:

5. **Test**: Haemoglobin (Hb)
6. **Result**: `98`
7. **Collected**: type `27/10/2026` (DD/MM/YYYY)

**+ ADD ITEM** adds another repeat: each one becomes its own Observation.

</div>

</div>

---

<!-- _class: demo -->

## Extract

<div class="split">

<div>

![Playground: TemplateExtractResult with the Observation](img/writeback/08-playground-extracted-bundle.png)

</div>

<div>

8. **EXTRACT ▾** (top left) → **Template-based $extract**. Snackbar: *Successful template-based extraction*.
9. **ADVANCED PROPS** (right panel header) → tab **EXTRACT** → **TemplateExtractResult**.

The extracted Bundle: next slide.

The **QR** tab next to it shows the QuestionnaireResponse (same answers as `sample-qr.json`).

</div>

</div>

---

<style scoped>pre, pre code { font-size: 16px; }</style>

## The extracted transaction Bundle

**TemplateExtractResult** for our answers (abridged: `status`, `category` and the entry's `fullUrl`/ids not shown):

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [ {
    "resource": {
      "resourceType": "Observation",
      "code": { "coding": [ { "system": "http://loinc.org", "code": "718-7", "display": "Haemoglobin (Hb)" } ] },
      "subject": { "reference": "Patient/pam-demo" },
      "valueQuantity": { "system": "http://unitsofmeasure.org", "value": 98, "unit": "g/L", "code": "g/L" },
      "effectiveDateTime": "2026-10-27"
    },
    "request": { "method": "POST", "url": "Observation" }
  } ]
}
```

The values fhirpath-lab gave; no `templateExtractValue` left. Two repeats → two entries.

---

<!-- _class: demo -->

## Write back

<div class="split">

<div>

![Playground: Select items to write back to patient record](img/writeback/09-playground-write-back-dialog.png)

</div>

<div>

10. **REVIEW WRITE BACK ITEMS** (bottom right). Dialog: *Haemoglobin (Hb)*, Observation, **new**.
11. **WRITE BACK (1 ENTRY)**.

Snackbar: *Write back to https://gw.interop.community/QHConnectathon2026/open successful. See Network tab for response*

The playground POSTs the Bundle to the Source FHIR server; the Observation gets a server id.

</div>

</div>

---

<!-- _class: demo -->

## Close the loop

<div class="split">

<div>

![Playground: re-populated, Hb 98 on 27/10/2026](img/writeback/11-playground-close-the-loop.png)

</div>

<div>

12. **POPULATE ▾** → **Pre-populate (Replace whole form)** again.

- Haemoglobin: **98** g/L (was 104)
- Date of latest Hb: **27/10/2026**
- Ferritin: still **18**

The `latestHb` query (`_sort=-date&_count=1`) now finds the new Observation: 27 Oct is later than 14 Oct.

What the form wrote, the form reads back.

</div>

</div>

---

## Bigger templates in the real modules

Same pattern: `templateExtract` on an item, a template in `contained`, `templateExtractValue` on the parts that come from answers.

<div class="cards">

<div>

### A6 Diagnosis → Condition
`questionnaires/modules/pam-diagnosis.json`, on the choice item `pam-diagnosis`, template `#PAMDiagnosisTemplate`.
A Condition for the chosen diagnosis (SNOMED CT-AU), with fixed clinical/verification status and category. The code is `answer.value`: the template sits on a question, not a group (Gotchas).

</div>

<div>

### A7 Treatment → MedicationRequest
`questionnaires/modules/pam-treatment.json`, group `pam-iv-iron`, template `#PAMIVIronTemplate`.
Fixed status, intent and IV route; medication from the chosen product; dose (`doseQuantity` in mg); `subject` and `authoredOn` computed.

</div>

</div>

The real `pam-pathology.json` has the same `PAMExternalResultTemplate` as our walkthrough. A6 and A7 are starting points: test new expressions in fhirpath-lab first.

---

<style scoped>li { font-size: 0.86em; }</style>

## Gotchas

- **Test with a context.** Template expressions are relative to the repeat. In fhirpath-lab set the Context Expression `repeat(item).where(linkId='pam-ext')`, or the template expressions find nothing.
- **`%resource` is the QuestionnaireResponse**, not the repeat. Use it for things outside the group, like `subject`.
- **`_` for primitives:** `"_value": { "extension": [...] }` on a primitive, the extension directly on a complex element (`Coding`).
- **Template reference** must match the contained id with `#`: `#PAMExternalResultTemplate`.
- **`templateExtract` on a question, not a group** (a trap we fell into): the context is that question's QR item, so A6's code is `answer.value`. Our first `item.where(...)` gave a Condition with no code.
- **Playground:** the extract result is under **ADVANCED PROPS → EXTRACT → TemplateExtractResult**; write-back goes to the **Source FHIR Server** in the gear settings.
- **Shared data:** the open endpoint and `pam-demo` are shared. Every write-back stays and can become everyone's "latest Hb".
- **Nothing extracted?** Check the group has answers, the `template` reference resolves, and each expression returns a value in fhirpath-lab.

---

<!-- _class: tryit -->
<style scoped>.cards { grid-template-columns: repeat(3, 1fr); gap: 12px; } .cards > * { font-size: 0.66em; padding: 8px 12px; }</style>

## Write-back scenarios

<div class="cards">

<div>

### A5 Pathology Results ★★
Observations for results entered by hand (e.g. external lab): more tests, units.
`questionnaires/modules/pam-pathology.json`

</div>

<div>

### A6 Diagnosis ★★★
Condition (SNOMED CT-AU); Flag for limited consent; Goal for a target Hb.
`questionnaires/modules/pam-diagnosis.json`

</div>

<div>

### A7 Treatment + Ganzoni ★★★
MedicationRequest (IV iron); ServiceRequest or Appointment for the infusion.
`questionnaires/modules/pam-treatment.json`

</div>

<div>

### A8 Patient Education ★
Communication / Procedure (education given).
`questionnaires/modules/pam-education.json`

</div>

<div>

### A9 Follow-up + Status ★★
Task (follow-up); EpisodeOfCare status.
`questionnaires/modules/pam-follow-up.json`

</div>

<div>

### C1 Closed loop
Fill in A6/A7 in Smart Forms, extract the resources, and watch B4/B6 update.

</div>

</div>

<div class="small">

Start from `decks/examples/pathology-walkthrough.json` and `decks/examples/sample-qr.json`. Paths are under `2026-10-29/1-FHIR-For-Users/` in [github.com/aehrc/qh-connectathon](https://github.com/aehrc/qh-connectathon). Test expressions in [fhirpath-lab.com](https://fhirpath-lab.com), extract and write back in the [playground](https://aehrc.github.io/qh-connectathon/smart-forms/).

</div>
