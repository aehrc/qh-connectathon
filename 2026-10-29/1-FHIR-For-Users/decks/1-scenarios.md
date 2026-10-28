---
marp: true
theme: track1
paginate: true
title: Track 1 scenarios
---

<!-- _class: title -->
<!-- _paginate: false -->

# Track 1: FHIR for Users

## Scenarios: what you can work on

FHIR in Queensland Health Connectathon, 29–30 Oct 2026
Jim Steel, Leonie Dickson (AEHRC), Leon Cavalli (QH)

---

## Four strands, one PAM case

| Strand | You build | Scenarios | Start here if you are... |
|---|---|---|---|
| **A** Questionnaire modules | One form module in Smart Forms (SDC) | A1–A11 | a clinician or analyst, or new to FHIR |
| **B** SMART apps | A piece of the dashboard as a SMART app | B1–B9 | a web developer |
| **C** End to end | Close the loop, or critique the mapping | C1–C2 | on a team that has finished a module or app |
| **D** REDCap + FHIR | Bring FHIR into the existing REDCap system | D1–D4 | a REDCap user or administrator |

Levels: ★ good first task, ★★ some FHIR experience, ★★★ hard.

Day 1: build. Day 2: assemble the modules into one PAM form and feed the apps.

---

## Strand A: Questionnaire modules (1 of 2)

Each team builds or extends one module. You'll touch: Smart Forms, SDC, FHIRPath.

<div class="cards">

<div>

### A1 Patient Details ★
Pre-populate Patient, height, weight. Calculate age and BMI. Write back height and weight.

</div>

<div>

### A2 GP Details ★
`Patient.generalPractitioner`; pick the source with `enableWhen`. Update the GP.

</div>

<div>

### A3 Proposed Surgery / Referral ★★
Waitlist ServiceRequest in; days to surgery; referral ServiceRequest out.

</div>

<div>

### A4 Past Medical / Surgical History ★★
Condition, Procedure, medications, allergies. SNOMED CT-AU value sets (ECL on Ontoserver).

</div>

<div>

### A5 Pathology Results (repeating) ★★
Latest Hb, ferritin and more (LOINC). Repeating time points. Hand-entered results become Observations.

</div>

<div>

### A6 Diagnosis + decision support ★★★
Pathway classification as calculated expressions. Writes Condition, Flag and Goal.

</div>

</div>

---

## Strand A: Questionnaire modules (2 of 2)

<div class="cards">

<div>

### A7 Treatment + Ganzoni ★★★
Ideal body weight, target Hb, total iron dose. Writes MedicationRequest and ServiceRequest or Appointment.

</div>

<div>

### A8 Patient Education ★
Pre-populate name, unit, consultant. Multi-select materials. Writes Communication or Procedure.

</div>

<div>

### A9 Follow-up + Status ★★
Days with the team, follow-up due date. Writes Task and EpisodeOfCare status.

</div>

<div>

### A10 Modular assembly ★★★
Assemble the full form from A1–A9 with `subQuestionnaire` and `$assemble`.

</div>

<div>

### A11 Patient-facing pre-admission form ★★
Plain-language questions. The response is what the nurse's forms pre-populate from.

</div>

</div>

---

## Strand B: SMART apps (1 of 2)

Parts of the current dashboard as apps. You'll touch: fhirclient.js, FHIR search, a chart library.

<div class="cards">

<div>

### B1 Patient summary for the nurse ★
EHR launch. Hb and ferritin trend with thresholds, pathway, days to surgery.

</div>

<div>

### B2 Nurse worklist ★★
EpisodeOfCare and Task, sorted by surgery date. Population view.

</div>

<div>

### B3 Headline numbers (KPI tiles) ★
Counts, median days with the team, education sessions per month.

</div>

<div>

### B4 Referrals over time ★★
Referrals per quarter by category vs waitlisted cases; financial-year quarters.

</div>

<div>

### B5 Referral profile ★
Surgical unit, referral source, recommended treatment.

</div>

<div>

### B6 Outcomes ★★
Initial vs post-treatment Hb and ferritin, by sex: the main clinical outcome.

</div>

</div>

---

## Strand B: SMART apps (2 of 2)

<div class="cards">

<div>

### B7 Demographics ★★
Age bands, sex, Queensland postcode map.

</div>

<div>

### B8 Shared filters ★★
Directorate, timeframe, category, unit and source as FHIR search parameters, reused across B3–B7.

</div>

<div>

### B9 Analytics without a BI tool ★★★
SQL on FHIR ViewDefinitions (Pathling), Bulk `$export`, or Measure and MeasureReport.

</div>

</div>

Per-patient views (B1) use an EHR launch. Population views (B2–B8) read with `user/*.read`; on Meld they launch from the launcher with any patient selected (standalone is part of B9).

---

## Strands C and D

<div class="cards">

<div>

### C1 Closed loop
Fill in A6 or A7 in Smart Forms, extract the resources, watch B4 and B6 update.

</div>

<div>

### C2 Mapping review
Critique and improve the shared FHIR mapping.

</div>

<div>

### D1 Code the PAM forms ★
`redcap_advanced_fhir_ontology`: Ontoserver lookups for procedure, anaemia type, IV iron.

</div>

<div>

### D2 REDCap data to FHIR ★★
Store code, display and system; turn a form's records into resources (Redmatch).

</div>

<div>

### D3 Same form, two platforms ★★
One PAM form in REDCap and as an SDC Questionnaire, bound to the same ValueSets.

</div>

<div>

### D4 Feed the dashboard from coded data ★★★
SNOMED subsumption queries that local dropdown values can't answer.

</div>

</div>

**Strand D needs a REDCap instance with external modules** (PHP 8, REDCap 8.8.1+). Instance not confirmed yet. If none: D1 is a leads' demo and D3 uses Smart Forms only.

---

## Shared conventions and mapping

One mapping, or the forms won't feed the apps.

- **Mapping draft:** Patient, ServiceRequest, EpisodeOfCare, Task, Observation (LOINC), Condition (SNOMED CT-AU), MedicationRequest (AMT), Flag, Goal. Profiles: AU Core where one exists. Critique it in C2.
- **Module conventions:** linkIds start `pam-`; pre-population queries sit on the module's top-level group; **shared variables live on the root form** and names must be unique, or `$assemble` rejects them; extraction is template-based.

Files in the repo: `FHIR-Mapping-DRAFT.md` and `questionnaires/README.md` (under `2026-10-29/1-FHIR-For-Users/`).

---

## Where things are

<div class="small">

| What | Where |
|---|---|
| Meld sandbox, open | `https://gw.interop.community/QHConnectathon2026/open` |
| Meld sandbox, secured | `https://gw.interop.community/QHConnectathon2026/data` |
| Smart Forms and playground | `https://aehrc.github.io/qh-connectathon/smart-forms/` (and `/playground`) |
| PAM dashboard | `https://aehrc.github.io/qh-connectathon/pam-dashboard/` |
| Repo | `https://github.com/aehrc/qh-connectathon` |
| Smart Forms Storybook | `https://smartforms.csiro.au/storybook` |
| SMART App starter | `https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q` |
| SMART App Launch Postman collection | [smart-app-launch-introduction](https://www.postman.com/planetary-crescent-937142/smart-app-launch-hl7-au-connectathon/collection/xbq559p/smart-app-launch-introduction) |
| Ontoserver | `https://r4.ontoserver.csiro.au/fhir` |
| FHIRPath lab | `https://fhirpath-lab.com` |
| NLM Form Builder (LHC Forms) | `https://formbuilder.nlm.nih.gov/` |

</div>

Synthetic patients `pam-001`..`pam-040`; demo patient `pam-demo`. SMART app client IDs: ask Jim.

---

## Pick a scenario, form a team

1. Pick **one** scenario that matches your skills. A ★ is a fine choice.
2. Find 2–4 people on the same or a neighbouring scenario (A with A, or an A and a B).
3. Tell a track lead which one you've picked so we can help.
4. Check the shared conventions before you start, so your work fits with the others.

Post-lunch tip: a team that finishes can take C1.

---

<!-- _class: section -->

# Next: the technical decks

1. **SMART apps**: then the apps cohort splits off and starts
2. **Questionnaires**, then **Prepopulation**, then **Write-back**

**Show and tell: 3:30 pm Friday**
