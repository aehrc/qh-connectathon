# Synthetic PAM data

40 fictional preoperative anaemia patients (July 2025 – October 2026) as a FHIR R4 transaction
bundle, following the [draft mapping](../FHIR-Mapping-DRAFT.md). All names, people and
organisations are made up.

| File | Purpose |
|---|---|
| `generate.py` | Deterministic generator (fixed seed) → `pam-synthetic-bundle.json` |
| `pam-synthetic-bundle.json` | The bundle (PUT with fixed ids, so reloading updates in place) |
| `load.sh [base]` | Posts the bundle; defaults to the Meld sandbox open endpoint |

## What's in it

| Resource | Count | Notes |
|---|---|---|
| Patient | 40 | ids `pam-001`…`pam-040`; northside Brisbane postcodes |
| Observation | 340 | Height, weight; Hb, ferritin, TSAT, CRP at referral, and again after treatment for those who finished |
| ServiceRequest | 80 | Per patient: surgical waitlist entry (SNOMED procedure, elective category, unit) and the referral to blood management (referral source) |
| Condition | 33 | Iron deficiency anaemia (22), iron deficiency (6), anaemia of chronic disease (5) |
| MedicationRequest | 28 | IV iron (AMT), dose from Ganzoni |
| EpisodeOfCare | 40 | 32 finished ("cleared"), 8 active ("being managed") |
| Task | 8 | Follow-ups for active episodes |
| Organization / Practitioner | 6 / 8 | Blood management service, surgical units, nurses, surgeons |

Local codes (elective category, referral source, episode and task types) use the placeholder
system `https://aehrc.github.io/qh-connectathon/track1/CodeSystem/…` until the mapping is agreed.
