---
tags: [questionnaire-builder]
max_turns: 60
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I want a falls risk screen for admissions to our medical wards, as a FHIR questionnaire. There's no existing form, just this list from our falls committee:

1. Age
2. Sex
3. Fall in the last 12 months
4. Taking sedatives or hypnotics
5. Uses a walking aid
6. Cognitive impairment (e.g. dementia, delirium)
7. Needs help to get to the toilet
8. Total score

Background, since I know you'll ask: nurses fill it in on admission, one sitting. Our EMR is a FHIR server shaped to AU Core: it has patient demographics, active conditions (SNOMED CT-AU) and active MedicationRequests (AMT codes). Falls aren't recorded anywhere structured, and neither is mobility or toileting, so the nurse answers those. Each of items 3 to 7 scores 1 point if yes; patients aged 65 or over get 1 extra point. The total goes to the ward falls dashboard, and a total of 3 or more means high risk: then we want "high falls risk" recorded in the patient record so the next team sees it. It works the same for everyone otherwise. Please don't wait for me: build the complete thing (prepopulation, write-back, sample data to show it, and the decision log). My initials are JS.
