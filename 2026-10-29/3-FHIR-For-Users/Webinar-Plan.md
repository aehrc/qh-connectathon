# Pre-connectathon webinar — Thursday 8 October 2026

Track 3 slot, about 40 minutes.

| Time | Who | Content |
|---|---|---|
| ~10 min | Leon | The scenario: why preoperative anaemia matters, the clinical pathway, the decision rules, and how it runs today (REDCap forms + Power BI dashboard) |
| 20–25 min | Jim | From forms to FHIR: the same pieces in FHIR, starting from REDCap (redcap_advanced_fhir_ontology; Redmatch in one line), composable questionnaires, then three live demos |
| ~5 min | Both | What you can work on at the connectathon ([scenarios](Scenarios.md)), setup before 29 Oct, questions |

## Live demos

1. **Pre-population and calculations** — PAM form in Smart Forms launched from the sandbox:
   patient details and pathology pre-populated via `launchContext` + x-fhir-query /
   `initialExpression`; BMI, pathway classification and Ganzoni iron dose as
   `calculatedExpression`s. Show one module file, the root form, and the assembled result.
2. **Write-back** — template-based `$extract` of Condition, MedicationRequest and Observations,
   saved to the FHIR server.
3. **SMART app for the dashboard** — outcomes view (PAM 15/16, initial vs post-treatment Hb
   and ferritin by sex), driven by a single FHIR search:

   ```
   GET Observation?code=http://loinc.org|718-7,http://loinc.org|2276-4
       &date=ge2025-07-01&date=le2026-06-30&_include=Observation:subject
   ```

## Still to do before the webinar

- [x] Public HTTPS hosting for Smart Forms (GitHub Pages); dashboard app to follow ([environment](Demo-Environment.md))
- [ ] Synthetic PAM data in the sandbox
- [ ] PAM module Questionnaires + root form
- [ ] Dashboard app (B6)
- [ ] Fill slide placeholders: scenario-list link, track-materials link, demo URLs
- [ ] Dry run with Leon
