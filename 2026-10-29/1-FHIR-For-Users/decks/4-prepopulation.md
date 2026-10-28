---
marp: true
theme: track1
paginate: true
title: Track 1 prepopulation
style: |
  section pre { font-size: 18px; line-height: 1.4; flex-shrink: 0; }
  .split { display: grid; grid-template-columns: 700px minmax(0, 1fr); gap: 28px; align-items: start; }
  .split > div:first-child img { width: 700px; }
  section img.emoji { border: none; }
  .split code, .split a { overflow-wrap: anywhere; }
  .split pre code { font-size: 15px; }
  .split p, .split li { font-size: 0.85em; }
  .split ol, .split ul { margin-top: 0; }
---

<!-- _class: title -->
<!-- _paginate: false -->

# Prepopulation

## Fill the form from the patient's record

Track 1: FHIR for Users. FHIR in Queensland Health Connectathon, 29–30 Oct 2026
Jim Steel, Leonie Dickson (AEHRC), Leon Cavalli (QH)

---

## Where we are

The Questionnaires deck built the structure of a cut-down **Pathology results** form (`decks/examples/pathology-walkthrough-stage1.json`). Nothing in it is filled in yet.

In this deck the form fills in **the latest Hb, ferritin and date of the latest Hb** from the patient's Observations on the FHIR server, so the nurse doesn't retype them.

- Finished form: `decks/examples/pathology-walkthrough.json`
- Same linkIds and variable names as the real module (`pam-hb`, `%latestHb`, ...)
- Demo patient: **Demi Formsdemo**, `pam-demo` (synthetic): latest Hb **104 g/L** (14 Oct 2026), ferritin **18 µg/L**
- FHIR server: Meld open endpoint `https://gw.interop.community/QHConnectathon2026/open`

---

## How prepopulation works: four pieces

<div class="cards" style="grid-template-columns: 1fr 1fr;">

<div>

### 1. Launch context
The form declares that it needs a **patient**. The app supplies it as `%patient`. *Extension:* `sdc-questionnaire-launchContext`

</div>

<div>

### 2. x-fhir-query variable
A FHIR search, filled in with `{{%patient.id}}`, run when the form is populated. The result Bundle becomes a variable, e.g. `%latestHb`.

</div>

<div>

### 3. FHIRPath
Picks the value you want out of that Bundle: `%latestHb.entry.resource.value.value`

</div>

<div>

### 4. initialExpression
Puts the FHIRPath result into an item as its starting answer. The user can still change it.

</div>

</div>

Build order in this deck: **run the query → build the FHIRPath in fhirpath-lab → put it in the form → populate in Smart Forms.**

---

<style scoped>pre, pre code { font-size: 16px; }</style>

## 1. Launch context: "this form needs a patient"

On the **root** of the Questionnaire (from `pathology-walkthrough.json`, reformatted to fit):

```json
"extension": [
  {
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
    "extension": [
      {
        "url": "name",
        "valueCoding": { "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext", "code": "patient" }
      },
      { "url": "type", "valueCode": "Patient" }
    ]
  }
]
```

Expressions can now use `%patient` (the Patient resource), e.g. `%patient.id` is `pam-demo`.

---

<style scoped>pre, pre code { font-size: 15px; }</style>

## 2. The query: an x-fhir-query variable

On the module's **top-level group** `pam-pathology` (the module convention):

```json
{
  "linkId": "pam-pathology",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/variable",
      "valueExpression": {
        "name": "latestHb",
        "language": "application/x-fhir-query",
        "expression": "Observation?code=http://loinc.org|718-7&patient={{%patient.id}}&_sort=-date&_count=1"
      }
    },
```

The second variable, `latestFerritin`, is the same with LOINC `2276-4` (Ferritin):

```
Observation?code=http://loinc.org|2276-4&patient={{%patient.id}}&_sort=-date&_count=1
```

---

## Reading the query

```
Observation?code=http://loinc.org|718-7&patient={{%patient.id}}&_sort=-date&_count=1
```

| Part | Means |
|---|---|
| `Observation?` | search Observations |
| `code=http://loinc.org\|718-7` | LOINC 718-7, Haemoglobin [Mass/volume] in Blood (`system\|code`) |
| `patient={{%patient.id}}` | for this patient: Smart Forms replaces `{{...}}` with `pam-demo` |
| `_sort=-date` | newest first |
| `_count=1` | only the first one, i.e. the latest |

The result is a **Bundle** (type `searchset`). The variable `%latestHb` holds the whole Bundle, not the Observation.

---

<!-- _class: demo -->
<style scoped>pre, pre code { font-size: 13px; }</style>

## Run the query in your browser

Paste this into the address bar of Edge or Chrome (or [open it](https://gw.interop.community/QHConnectathon2026/open/Observation?code=http://loinc.org%7C718-7&patient=pam-demo&_sort=-date&_count=1&_format=json)):

```
https://gw.interop.community/QHConnectathon2026/open/Observation?code=http://loinc.org%7C718-7&patient=pam-demo&_sort=-date&_count=1&_format=json
```

It's the form's query for `pam-demo`, with `|` written as `%7C` and `&_format=json` added (next slide says why).

You should get a `searchset` Bundle with `"total": 2` and one entry, `Observation/pam-demo-hb-2`: value **104 g/L**, `effectiveDateTime` `2026-10-14T08:45:00+10:00`.

`total` counts every match (2 Hb results); `_count=1` only limits what comes back.

---

## Gotcha: `|` and `_format=json`

<div class="cards">

<div>

### A raw `|` fails on Meld
`code=http://loinc.org|718-7` gets **HTTP 400** with no body, which the browser reports as a **CORS error**. In the address bar, or in an app or renderer that doesn't encode it, write **`%7C`**: `code=http://loinc.org%7C718-7`. Or leave the system out: `code=718-7`.

</div>

<div>

### Add `&_format=json`
Without it Meld sends XML, and Edge and Chrome **download a file** instead of showing it.

</div>

</div>

**In the form, keep the `|`.** The Smart Forms playground we use encodes it for you. Other renderers may not: if prepopulation stays empty and the browser console shows a CORS error, this is why.

---

<!-- _class: demo -->

## The Bundle

<div class="split">

<div>

![Latest-Hb search Bundle in the browser](img/prepop/01-query-in-browser.png)

</div>

<div>

What to look for:

- `"type": "searchset"`, `"total": 2`
- `entry[0].resource`: the Observation `pam-demo-hb-2`
- `effectiveDateTime`: `2026-10-14T08:45:00+10:00`
- `valueQuantity`: `104` `g/L`

Keep this tab open: you'll copy this JSON into fhirpath-lab next.

</div>

</div>

---

<!-- _class: demo -->

## Build the FHIRPath in fhirpath-lab

Open **https://fhirpath-lab.com/FhirPath**. fhirpath-lab is for building and testing expressions.

1. In the browser tab with the Bundle: click in the page, **Ctrl+A**, **Ctrl+C**.
2. In fhirpath-lab, click in **Test Resource JSON** (right), **Ctrl+A**, paste. The header changes to *(local resource JSON)*.
3. Leave **Context Expression** empty. Type the expression in **Fhirpath Expression**.
4. Click **▶** (top right) or press **Ctrl+Enter**. **Results don't update as you type.**

Engine: leave the default, **R4 / fhirpath.js**.

Next four slides: one step at a time, from the Bundle down to the number.

---

<!-- _class: demo -->

## Step 1: `entry.resource`

<div class="split">

<div>

![fhirpath-lab: entry.resource gives the Observation](img/prepop/02-fhirpath-lab-entry-resource.png)

</div>

<div>

Bundle → its entries → the resource in each.

Result: the Observation `pam-demo-hb-2` (the whole resource, under **RESULTS**).

</div>

</div>

---

<!-- _class: demo -->

## Step 2: `entry.resource.value`

<div class="split">

<div>

![fhirpath-lab: entry.resource.value gives a Quantity](img/prepop/03-fhirpath-lab-value.png)

</div>

<div>

`value` finds `valueQuantity`: in FHIRPath a choice element is named without its type.

Result: a **Quantity**

```
{ "value": 104,
  "unit": "g/L",
  "system": "http://unitsofmeasure.org",
  "code": "g/L" }
```

</div>

</div>

---

<!-- _class: demo -->

## Step 3: `entry.resource.value.value`

<div class="split">

<div>

![fhirpath-lab: entry.resource.value.value gives 104](img/prepop/04-fhirpath-lab-value-value.png)

</div>

<div>

The Quantity's own `value`: the number.

Result: **`104`** (decimal).

This is the Hb answer.

</div>

</div>

---

<!-- _class: demo -->

## Step 4: the date

`entry.resource.effective.toString().substring(0, 10)`

<div class="split">

<div>

![fhirpath-lab: the date expression gives 2026-10-14](img/prepop/05-fhirpath-lab-hb-date.png)

</div>

<div>

`effective` is `effectiveDateTime`, `2026-10-14T08:45:00+10:00`.

A `date` item wants only `YYYY-MM-DD`, so take the first 10 characters.

Result: **`2026-10-14`** (String).

</div>

</div>

---

<style scoped>pre, pre code { font-size: 16px; } table { font-size: 0.72em; }</style>

## 3 + 4. Put it in the form: `initialExpression`

In the form the Bundle is in the variable, so put `%latestHb.` (or `%latestFerritin.`) in front:

| Item | initialExpression | Gives |
|---|---|---|
| `pam-hb` | `%latestHb.entry.resource.value.value` | 104 |
| `pam-ferritin` | `%latestFerritin.entry.resource.value.value` | 18 |
| `pam-hb-date` | `%latestHb.entry.resource.effective.toString().substring(0, 10)` | 2026-10-14 |

On item `pam-hb` (next to its unit extension):

```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
  "valueExpression": {
    "language": "text/fhirpath",
    "expression": "%latestHb.entry.resource.value.value"
  }
}
```

---

<!-- _class: demo -->

## Smart Forms playground: server and patient

<div class="split">

<div>

![Playground settings: Meld open endpoint and Demi Formsdemo](img/prepop/07-playground-settings.png)

</div>

<div>

Open **https://aehrc.github.io/qh-connectathon/smart-forms/** → **GO TO PLAYGROUND** (left sidebar).

1. **Gear** (top right): *Launch Context Settings*.
2. *Source FHIR Server URL*: `https://gw.interop.community/QHConnectathon2026/open` → click **?** at the right (*URL validated*) → **SAVE URL AS SOURCE FHIR SERVER**.
3. *Selected Patient*: **Demi Formsdemo** (last in the list) → **SAVE**.

</div>

</div>

---

<!-- _class: demo -->

## Pick the form and build it

<div class="split">

<div>

![Playground: pathology-walkthrough picked](img/prepop/08-playground-pick-form.png)

</div>

<div>

The header now says *Patient: Demi Formsdemo*.

4. Click the box under *Or... pick a Questionnaire from our Forms Server*.
5. Type **pathology-walkthrough** and choose it. Its details appear (version 0.1.0).
6. Click **BUILD FORM ▶** under the details.

</div>

</div>

---

<!-- _class: demo -->

## Built, but empty: now Pre-populate

<div class="split">

<div>

![Playground: form built, empty](img/prepop/09-playground-built.png)

</div>

<div>

The form renders **empty**: the playground doesn't prepopulate on Build.

7. Click **POPULATE ▾** (top left).
8. Choose **Pre-populate (Replace whole form)**.

</div>

</div>

---

<!-- _class: demo -->

## Pre-populated

<div class="split">

<div>

![Playground: form pre-populated](img/prepop/10-playground-prepopulated.png)

</div>

<div>

- Haemoglobin: **104** g/L
- Ferritin: **18** µg/L
- Date of latest Hb: **14/10/2026**

The same values you got in fhirpath-lab.

The external lab group stays empty: that's for the Write-back deck.

</div>

</div>

---

## In a real EHR: launch the form

The playground's settings dialog stands in for an EHR: it sets `%patient` without a SMART launch.

- **Real use:** the EHR **launches Smart Forms as a SMART app with a patient selected**, and the launch sets `%patient`. Meld can launch our Smart Forms build: see the **SMART apps deck**.
- **The form doesn't change:** same launchContext, queries and expressions. Only where `%patient` comes from is different.
- **Other FHIR servers:** the public playground **https://smartforms.csiro.au/playground** works the same way, but it **can't reach Meld** (Meld's CORS check rejects its requests). For Meld, use our build.

---

## Calculations: `calculatedExpression`

Same FHIRPath, but **recalculated whenever the answers it uses change** (`initialExpression` runs once, at populate). BMI in `pam-patient-details.json`:

```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
  "valueExpression": {
    "language": "text/fhirpath",
    "expression": "(%weightKg / ((%heightCm / 100).power(2))).round(1)"
  }
}
```

`%weightKg` and `%heightCm` are **shared variables on the root form** (`questionnaires/pam-root.json`), read from the `pam-weight` and `pam-height` answers. Names must be unique across modules. See "Conventions" in `questionnaires/README.md`.

---

## Gotchas

- **`|` in a query on Meld:** HTTP 400, shown as a CORS error. Use `%7C` (or `code=718-7`) in the address bar and in renderers that don't encode it. Our playground build encodes it.
- **`&_format=json`** when opening a Meld search in Edge or Chrome, or it downloads XML.
- **fhirpath-lab doesn't run as you type:** click **▶** or press **Ctrl+Enter**.
- **Test on the Bundle, use on the variable:** `entry.resource.value.value` in fhirpath-lab becomes `%latestHb.entry.resource.value.value` in the form.
- **Playground:** the form is empty until **POPULATE → Pre-populate**. For Meld use our build, not `smartforms.csiro.au/playground`.
- **Dates:** `effectiveDateTime` has a time and zone; a `date` item needs only `YYYY-MM-DD`.
- **Empty field?** Check the patient has that Observation: run the query in the browser first.

---

<!-- _class: tryit -->

## Prepopulation scenarios

<div class="cards">

<div>

### A1 Patient Details ★
Pre-populate the Patient (name, date of birth, sex) and latest height and weight. Calculate age and BMI.
`questionnaires/modules/pam-patient-details.json`

</div>

<div>

### A5 Pathology Results ★★
Extend this deck's form: TSAT, CRP, MCV, B12, folate, eGFR (LOINC); time points.
`questionnaires/modules/pam-pathology.json`

</div>

<div>

### A6 Diagnosis + decision support ★★★
Pathway classification as `calculatedExpression`s over the pathology values and sex.
`questionnaires/modules/pam-diagnosis.json`

</div>

</div>

<div class="small">

Start from `decks/examples/pathology-walkthrough.json`. Paths are under `2026-10-29/1-FHIR-For-Users/` in [github.com/aehrc/qh-connectathon](https://github.com/aehrc/qh-connectathon). Test queries in the browser, expressions in [fhirpath-lab.com](https://fhirpath-lab.com), forms in the [playground](https://aehrc.github.io/qh-connectathon/smart-forms/). Next deck: **Write-back**.

</div>
