# Track 3 scenarios — DRAFT

Scenarios are graded ★ (good first task) to ★★★ (hard). Strand A modules follow the PAM
forms; strand B apps follow the numbered visualisations (PAM 1–19) of the current dashboard.

**Composable questionnaires are the backbone of strand A.** Each team builds or extends one
module Questionnaire against a shared root form and shared conventions (variable names, launch
context, [FHIR mapping](FHIR-Mapping-DRAFT.md)). On day 2 the modules are assembled with
`$assemble` into one PAM form.

## Strand A — Questionnaire modules (Smart Forms + SDC)

| # | Module | Pre-population | Calculations / logic | Write-back | Level |
|---|---|---|---|---|---|
| A1 | **Patient Details** | Patient (name, date of birth, sex, Indigenous status, interpreter, Medicare number, address); latest height and weight Observations | Age, BMI | Height and weight Observations | ★ |
| A2 | **GP Details** | `Patient.generalPractitioner` → Practitioner / PractitionerRole | Pick the source (referring doctor, GP from latest admission, or manual entry) with `enableWhen` | Update `Patient.generalPractitioner` | ★ |
| A3 | **Proposed Surgery / Referral** | Waitlist entry (ServiceRequest): procedure, surgeon, unit, category, booked date | Days until surgery | ServiceRequest referring the patient to the blood management service | ★★ |
| A4 | **Past Medical / Surgical History** | Condition, Procedure, MedicationStatement, AllergyIntolerance | Deep `enableWhen` trees; SNOMED CT-AU value sets via ECL on Ontoserver | Condition and Procedure | ★★ |
| A5 | **Pathology Results** (repeating) | Latest Hb, ferritin, TSAT, CRP, MCV, B12, folate and eGFR Observations (LOINC) | Repeating time points; initial vs post-treatment values | Observations for results entered by hand (e.g. from an external lab) | ★★ |
| A6 | **Diagnosis + decision support** | Pathology values and sex | Pathway classification (anaemia, iron deficiency, inflammation) as calculated expressions | Condition (SNOMED CT-AU); Flag for limited consent / refusal of blood products; Goal for a requested target Hb | ★★★ |
| A7 | **Treatment + Ganzoni** | Weight, height, sex, latest Hb | Ideal body weight, target Hb, iron stores, total iron dose | MedicationRequest (IV iron, AMT value set); ServiceRequest or Appointment for the infusion | ★★★ |
| A8 | **Patient Education** | Patient name, unit, consultant | Multi-select delivery method and materials | Communication / Procedure (education given) | ★ |
| A9 | **Follow-up + Status** | Previous notes, status, referral date | Days with the blood management team; follow-up due date | Task (follow-up); EpisodeOfCare status (being managed / cleared) | ★★ |
| A10 | **Modular assembly** | — | Assemble the full PAM form from A1–A9 with `subQuestionnaire` + `$assemble` (precedent: the MBS 715 assembled form on the CSIRO forms server) | — | ★★★ |
| A11 | **Patient-facing pre-admission form** | Patient demographics | Plain-language questions on history, diet and transfusion preferences | QuestionnaireResponse that the nurse's forms then pre-populate from | ★★ |

## Strand B — SMART apps (parts of the dashboard)

| # | App | Dashboard elements | FHIR focus | Level |
|---|---|---|---|---|
| B1 | **Patient summary for the blood management nurse** (EHR launch) | Not in the dashboard; the clinician's view | Hb/ferritin trend with sex-specific thresholds, pathway classification, days to surgery, treatments | ★ |
| B2 | **Nurse worklist** | PAM 6, plus follow-ups due | EpisodeOfCare (being managed), Task (due), sorted by surgery date | ★★ |
| B3 | **Headline numbers (KPI tiles)** | PAM 6, 7, 8 / 8a | Counts, median days with the team, education sessions per month | ★ |
| B4 | **Referrals over time** | PAM 9, 10, 11 | Referrals per quarter by category vs waitlisted cases; diagnosis stacked; financial-year quarters | ★★ |
| B5 | **Referral profile** | PAM 12, 13, 14 | Surgical unit, referral source, recommended treatment | ★ |
| B6 | **Outcomes** | PAM 15, 16 | Initial vs post-treatment Hb and ferritin, by sex — the main clinical outcome | ★★ |
| B7 | **Demographics** | PAM 17, 18, 19 | Age bands, sex, Queensland postcode map | ★★ |
| B8 | **Shared filters** | PAM 1–5 | Directorate, timeframe, waitlist category, unit and referral source as FHIR search parameters, reusable across B3–B7 | ★★ |
| B9 | **Analytics without a BI tool** | Any of the above | SQL on FHIR ViewDefinitions (e.g. Pathling), Bulk Data `$export`, or Measure / MeasureReport for the KPIs | ★★★ |

Population views (B2–B8) use a standalone launch with `user/*.read`; per-patient views (B1)
use an EHR launch.

## Strand C — End to end

* **C1 Closed loop:** fill in A6/A7 in Smart Forms, extract the resources, and watch B4/B6 update.
* **C2 Mapping review:** critique and improve the track's [FHIR mapping](FHIR-Mapping-DRAFT.md).

## Strand D — Bringing FHIR into the existing REDCap system

| # | Scenario | What it involves | Level |
|---|---|---|---|
| D1 | **Code the PAM forms with [redcap_advanced_fhir_ontology](https://github.com/aehrc/redcap_advanced_fhir_ontology)** | Replace free-text and local dropdown fields with Ontoserver lookups: procedure (SNOMED CT-AU), anaemia type, IV iron product (AMT), etc. Priority codes for common products, banned codes for inappropriate ones. | ★ |
| D2 | **REDCap data → FHIR** | Store code, display and system with the module's code template, then turn one form's records into FHIR resources (e.g. Diagnosis → Condition), with [Redmatch](https://github.com/aehrc/redmatch) as the suggested tool. | ★★ |
| D3 | **Same form, two platforms** | Build one PAM form both in REDCap (with the module) and as an SDC Questionnaire, bound to the same ValueSets. Compare pre-population, calculations, write-back. | ★★ |
| D4 | **Feed the dashboard from coded data** | Show that SNOMED coding allows grouping and subsumption queries (e.g. "all iron deficiency anaemias") that local dropdown values can't. | ★★★ |

**Dependency:** D1–D4 need a REDCap instance where external modules can be installed
(PHP 8, REDCap 8.8.1+). If none is available, D1 runs as a chairs' demo and D3 uses Smart
Forms only.

## Starter assets (to build)

* A working A1 module and root PAM Questionnaire.
* A B1/B6 app skeleton (fhirclient.js).
* Synthetic PAM patients loaded in the sandbox — enough for the population charts.

The webinar demos double as these: A1 + A5 pre-population, A6/A7 write-back, B6 outcomes.
