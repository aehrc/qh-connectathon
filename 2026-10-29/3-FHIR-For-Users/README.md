# Track 3 — FHIR for Users

**Forms and apps for preoperative anaemia · FHIR in Queensland Health Connectathon · 29–30 October 2026**

This track focuses on how FHIR supports clinicians, patients, administrators, and other end users.

Example topics:

* SMART Forms
* SMART-on-FHIR Applications
* User-centered workflows
* Clinical data capture and presentation

## Case study

**Preoperative Anaemia Management (PAM).** Elective surgical patients are screened for anaemia
and iron deficiency before surgery, so it can be treated (often with IV iron) in time. Today
the blood management team runs the pathway on a set of REDCap forms with a Power BI dashboard
on top. In this track we rebuild parts of it with FHIR:

* **Smart questionnaires (SDC)** rendered in the CSIRO Smart Forms renderer: pre-population
  from the patient record, calculations (e.g. the Ganzoni iron dose), and write-back of
  resources to a FHIR server via template-based `$extract`.
* **Composable questionnaires**: the PAM forms as separate modules, assembled into one form
  with `subQuestionnaire` and `$assemble`.
* **SMART on FHIR apps** that reproduce parts of the dashboard from standard FHIR searches.
* **REDCap + FHIR**: coding the existing REDCap forms against Ontoserver, and mapping REDCap
  data out to FHIR.

## Track leads

Jim Steel (CSIRO AEHRC) · Leon Cavalli (Metro North Health)

## Key dates

| Date | What |
|------|------|
| Thu 8 Oct 2026 | Pre-connectathon webinar (scenario + live demos) |
| 29–30 Oct 2026 | Connectathon |

## Contents

| Document | Purpose |
|----------|---------|
| [`Scenarios.md`](Scenarios.md) | The scenario catalogue participants choose from: questionnaire modules (A), SMART apps (B), end to end (C), REDCap + FHIR (D). |
| [`FHIR-Mapping-DRAFT.md`](FHIR-Mapping-DRAFT.md) | Proposed shared FHIR mapping of the PAM data, so questionnaires and apps work against the same resources. **Needs agreement.** |
| [`Demo-Environment.md`](Demo-Environment.md) | Sandbox (Meld), Smart Forms build and config, known issues, and open hosting decisions. |
| [`Webinar-Plan.md`](Webinar-Plan.md) | Running order and demo list for the 8 Oct webinar. |

The webinar slide deck is not in the repo for now (it is kept locally in `slides/`, which is
git-ignored).
