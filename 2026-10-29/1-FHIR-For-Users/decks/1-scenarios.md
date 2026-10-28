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

<!--
Thanks, Leon. That's the problem; now what you can do about it over two days.
This deck is the menu: about 10 minutes. Then four short technical decks to get you started.
Everything here is on GitHub, so you can read it back later. Don't take notes.
-->

---

## Three strands, one PAM case

| Strand | You build | Scenarios | Start here if you are... |
|---|---|---|---|
| **A** Questionnaire modules | One form module in Smart Forms (SDC) | A1–A11 | a clinician or analyst, or new to FHIR |
| **B** SMART apps | A piece of the dashboard as a SMART app | B1–B9 | a web developer |
| **C** End to end | Close the loop, or critique the mapping | C1–C2 | someone who has finished a module or app |

Levels: ★ good first task, ★★ some FHIR experience, ★★★ hard. REDCap user? `Scenarios.md` also has optional REDCap scenarios (D1–D4): ask a track lead.

Day 1: build. Day 2: assemble whichever modules are ready into one PAM form and feed the apps.

<!--
Three strands, all on the same PAM case, so the pieces fit together on day 2. (There's an optional REDCap strand in Scenarios.md; I won't cover it.)
Pick by who you are, not by what sounds impressive: the right-hand column is the guide.
Stars are about FHIR experience, not about how useful the work is. A one-star module is a real contribution.
Day 1 build, day 2 assemble whatever is ready: forms become one PAM form, and the apps read what the forms write.
We don't expect every scenario to be covered, and two people on the same one is fine.
-->

---

## Strand A: Questionnaire modules (1 of 2)

Build or extend a module, alone or with others. You'll touch: Smart Forms, SDC, FHIRPath.

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

<!--
Strand A: pick a module of the PAM form and make it a proper SDC questionnaire, on your own or with others.
Two versions of the same module is fine: different approaches are worth comparing.
A1 and A2 are the gentlest start: prepopulate from the record, write a little back.
A5 Pathology is the running example in the forms decks, so it's a good pick if you want to follow along closely.
A6 is the hard one: decision support as calculated expressions, writing Condition, Flag and Goal.
-->

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
Assemble the full form from whichever of A1–A9 are ready, with `subQuestionnaire` and `$assemble`.

</div>

<div>

### A11 Patient-facing pre-admission form ★★
Plain-language questions. The response is what the nurse's forms pre-populate from.

</div>

</div>

<!--
A7 is the Ganzoni iron dose calculation: fiddly maths, satisfying when it works.
A8 and A9 are good next steps after a one-star module.
A10 is the integration job: assembling whatever modules are ready into one form, choosing one where there are several. Best for someone who likes plumbing.
A11 flips it round: a form the patient fills in, which the nurse's forms then prepopulate from.
-->

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

<!--
Strand B: the current dashboard rebuilt as SMART apps against the same synthetic data.
B1 is the per-patient view and the natural first app; the SMART deck builds the start of it live.
B3 and B5 are one-star: counts and breakdowns over the population, starting from our pam-dashboard app.
B6 Outcomes is the clinical headline: did Hb go up after treatment?
-->

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

<!--
B7 and B8 round out the dashboard; B8's shared filters make the others reusable.
B9 is the stretch goal: analytics without a BI tool, via ViewDefinitions, Bulk export or Measure.
One practical point: population apps launch from Meld with any patient selected and read with user scope. The SMART deck covers this.
-->

---

## Strand C: end to end

<div class="cards">

<div>

### C1 Closed loop
Fill in A6 or A7 in Smart Forms, extract the resources, watch B4 and B6 update.

</div>

<div>

### C2 Mapping review
Critique and improve the shared FHIR mapping.

</div>

</div>

<!--
C is for anyone who finishes: C1 closes the loop from a form to the dashboard; C2 is critiquing our mapping, which we'd really like.
Good for anyone who's finished something, or who'd rather think than code.
-->

---

## Shared conventions and mapping

One mapping, or the forms won't feed the apps.

- **Mapping draft:** Patient, ServiceRequest, EpisodeOfCare, Task, Observation (LOINC), Condition (SNOMED CT-AU), MedicationRequest (AMT), Flag, Goal. Profiles: AU Core where one exists. Critique it in C2.
- **Module conventions:** linkIds start `pam-`; pre-population queries sit on the module's top-level group; **shared variables live on the root form** and names must be unique, or `$assemble` rejects them; extraction is template-based.

Files in the repo: `FHIR-Mapping-DRAFT.md` and `questionnaires/README.md` (under `2026-10-29/1-FHIR-For-Users/`).

<!--
This is the slide that stops day 2 from falling apart.
Everyone maps to the same resources and codes, or the forms won't feed the apps.
The module conventions matter for A10: linkIds start with pam-, shared variables live on the root form, and names must be unique.
If you disagree with the mapping, great: that's C2. Tell us rather than quietly doing it differently.
-->

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

<!--
Everything you need is on this slide, and in the repo README.
Open endpoint: no login, for testing and for the forms. Secured endpoint: what SMART apps use, with a token.
The Smart Forms on our GitHub Pages is patched to work with Meld; use it rather than the public one.
Client IDs for SMART apps come from me: the SMART deck shows what to send.
-->

---

## Pick a scenario, work how you like

1. Pick a scenario that matches your skills. A ★ is a fine choice.
2. Work **alone or with others**. Teams are welcome, not required. Someone else on the same scenario? Fine: compare approaches.
3. Tell a track lead what you've picked, so we can help and put people in touch.
4. Check the shared conventions before you start, so your work fits with the others. Give anything you put on Meld **your own id** (e.g. `pathology-yourname`), so you don't overwrite someone else's.

Not every scenario will be taken, and that's fine. Finished early? Take another, or C1.

<!--
Pick a scenario. A one-star is a fine choice.
Alone or in a group, both work. If you do pair up, an A with a B is nice: the app can show what the form wrote.
Several people on the same scenario is fine; we're not trying to cover everything.
Tell one of us what you've picked, so we know who to check on and who to introduce to whom.
Use your own ids on Meld: it's one shared server.
-->

---

<!-- _class: section -->

# Next: the technical decks

1. **SMART apps**: then the apps cohort splits off and starts
2. **Questionnaires**, then **Prepopulation**, then **Write-back**

**Show and tell: 3:30 pm Friday**

<!--
Next: the SMART apps deck. After it, the apps people can go and start.
Forms people stay for Questionnaires, Prepopulation and Write-back.
Show and tell is 3:30 Friday: aim for something small that works over something big that doesn't.
-->
