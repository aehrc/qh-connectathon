# Review notes: referral seed data (for Michael)

Status: DRAFT for review. Nothing has been loaded into DiSP or AWS and nothing is committed.
All data is fictional (see README.md for the directory-seed dependency).

## What is here

* 20 patients (AU Core Patient + AU eRequesting Patient profiles), Qld addresses and suburbs, fictional
  Medicare-style numbers in the synthetic range `2999 xxxx c i r` (valid check digit, so format validators pass;
  starts `2999`, which should not be issued, but this is not guaranteed), synthetic Luhn-valid IHIs (`800360990000` + key + check digit),
  ACMA fiction-reserved mobile numbers, 2 patients with Indigenous status recorded.
* 22 referrals, each = Referral ServiceRequest + AU eRequesting Group Task + Referral Task (the IG requires
  `Task.partOf` a Group Task and forbids `focus` on it). Placer group number `RFP-QHC-nnnn`, scoped to the
  referrer's HPI-O as in the IG example.
* Appointments: 6 `fulfilled` (completed referrals, past Slots, now busy) and 3 `booked` (future busy Slots, 2-3 Nov).
  Per decision C3 booking is API-driven, so these are only starting fixtures.
* 23 Schedules / 147 Slots. Free slots: 4-5 Nov 2026 at 09:00, 09:45, 10:30 on every Schedule, so participants can book
  right away. 08:00 on 2-3 Nov is used only by the pre-booked appointments.

## Referral list

| # | Patient | Referrer | Filler (directory, logical) | Imaging | Priority | Referral / Task state | Authored | Appointment |
|---|---|---|---|---|---|---|---|---|
| 1 | 01 Harold Mitchell-Voss | Riverside Family Practice | Northside Imaging | CT of abdomen and pelvis with contrast | routine | active / Task requested | 2026-10-14 | - |
| 2 | 02 Priya Raghunathan | Wattle Grove Medical Centre | Northside Imaging | Ultrasound of abdomen | routine | active / Task requested | 2026-10-15 | - |
| 3 | 03 Tamika Cooper | Reef View Medical Practice | Far North Reef Imaging | MRI of lumbar spine | routine | active / Task received | 2026-10-12 | - |
| 4 | 04 Giovanni Ferrante | Reef View Medical Practice | Far North Reef Imaging | CT of head | urgent | active / Task accepted | 2026-10-16 | - |
| 5 | 05 Margaret O'Dwyer | Cane Valley Family Clinic | Dry Tropics Radiology | MRI of knee | routine | completed / image-acquired | 2026-09-08 | 2026-09-22 (fulfilled) |
| 6 | 05 Margaret O'Dwyer | Cane Valley Family Clinic | Dry Tropics Radiology | Plain X-ray of shoulder | routine | active / Task requested | 2026-10-17 | - |
| 7 | 06 Ngoc Anh Tran | Toowoomba Range Medical | Darling Downs Medical Imaging | CT of chest | routine | active / Task in-progress, service-booked | 2026-10-09 | 2026-11-02 (booked) |
| 8 | 07 Bruce Hollingworth | Toowoomba Range Medical | Darling Downs Medical Imaging | Ultrasound of thyroid and parathyroid | routine | completed / image-acquired | 2026-09-15 | - |
| 9 | 08 Aroha Kemp | Bayside Community Hospital Outpatients | Northside Imaging | Plain chest X-ray | urgent | completed / image-acquired | 2026-09-30 | 2026-10-02 (fulfilled) |
| 10 | 09 Dmitri Volkov | Riverside Family Practice | Northside Imaging | CT of paranasal sinuses | routine | active / Task requested | 2026-10-18 | - |
| 11 | 10 Chloe Nguyen | Wattle Grove Medical Centre | Northside Imaging | Ultrasound scan of pelvis | routine | active / Task accepted | 2026-10-13 | - |
| 12 | 11 Kevin Patel | Reef View Medical Practice | Far North Reef Imaging | MRI of brain | routine | active / Task in-progress, service-booked | 2026-10-08 | 2026-11-03 (booked) |
| 13 | 12 Sandra Whitlock | Cane Valley Family Clinic | Dry Tropics Radiology | Screening mammography | routine | completed / image-acquired | 2026-09-01 | 2026-09-18 (fulfilled) |
| 14 | 13 Darren Pascoe | Toowoomba Range Medical | Darling Downs Medical Imaging | Plain X-ray of lumbar spine | routine | completed / image-acquired | 2026-08-12 | 2026-08-20 (fulfilled) |
| 15 | 13 Darren Pascoe | Toowoomba Range Medical | Darling Downs Medical Imaging | Ultrasound of abdomen | routine | active / Task received | 2026-10-17 | - |
| 16 | 14 Imogen Radcliffe | Bayside Community Hospital Outpatients | Northside Imaging | CT of abdomen and pelvis with contrast | urgent | completed / image-acquired | 2026-09-22 | 2026-09-25 (fulfilled) |
| 17 | 15 Joseph Kaufusi | Wattle Grove Medical Centre | Northside Imaging | Plain X-ray of shoulder | routine | completed / image-acquired | 2026-09-10 | - |
| 18 | 16 Lila Sorensen | Wattle Grove Medical Centre | Sunshine Coast Radiology | MRI of knee | routine | active / Task requested | 2026-10-19 | - |
| 19 | 17 Ernest Maguire | Reef View Medical Practice | Far North Reef Imaging | Ultrasound of abdomen | routine | completed / image-acquired | 2026-10-01 | 2026-10-06 (fulfilled) |
| 20 | 18 Fatima Al-Rashid | Cane Valley Family Clinic | Dry Tropics Radiology | CT of head | routine | completed / image-acquired | 2026-09-24 | - |
| 21 | 19 Callum Brennan | Toowoomba Range Medical | Darling Downs Medical Imaging | CT of chest | urgent | active / Task requested | 2026-10-18 | - |
| 22 | 20 Yolanda Ibarra | Bayside Community Hospital Outpatients | Northside Imaging | Ultrasound of abdomen | routine | active / Task in-progress, service-booked | 2026-10-07 | 2026-11-02 (booked) |

Active: 13 (Task: 6 requested, 2 received, 2 accepted, 3 in-progress with `service-booked`). Completed: 9 (all Tasks
`completed` with `image-acquired`; 6 with a fulfilled Appointment, 3 without). Patients 05 and 13 have two referrals
(one completed, one active) to show history on one patient.

## How it was validated

1. SUSHI-built the IG in `ig/` (scratch copy; the submodule was not touched) to get the profile StructureDefinitions.
2. HL7 validator 7.0.2 (R4, `-tx https://r4.ontoserver.csiro.au/fhir`) with `hl7.fhir.au.ereq#1.0.1` (pulls AU Base 6.0.0,
   AU Core 2.0.0) + the IG's built resources. All 291 resources (every resource inside the 22 bundles), each validated against the
   `meta.profile` it declares (referral-servicerequest, referral-task, referral-appointment, booking-schedule, booking-slot,
   au-core-patient, au-erequesting-*, au-core-condition): **0 errors**, 0 fatal. Remaining warnings are non-blocking:
   dom-6 narrative (all), "multiple matching profiles" for AU identifier/address types, Condition codes outside the AU
   Clinical Condition VS (6), IdentifierType VS for Practitioner HPI-I type (copied from the IG example), UCUM annotation
   `{1.73_m2}` and missing Observation.performer (eGFR, 2).
3. Terminology: the validator checked every SNOMED CT / LOINC code and display against r4.ontoserver (SNOMED CT-AU).
   Three codes first failed (displays); one reason code (`30989003`) was inactive and was replaced.
4. Loader test: loaded all 22 bundles twice into a throwaway local `hapiproject/hapi:latest` (no IGs): both runs HTTP 200, totals identical
   (Patient 20, ServiceRequest 22, Task 44, Appointment 9, Slot 147, Schedule 23, PractitionerRole 6), so it is idempotent. The container was removed.
   A typical filler query works with the logical owner: `Task?owner:identifier=<hpio-system>|<HPI-O>&status=requested&_tag=...|fulfilment-task`.
5. Live DiSP referral server (read-only, via port-forward, `$validate` only; nothing written): it currently has AU eRequesting SDs but
   **not** the radiology-referral IG, and not AU Base/Core or the AU terminology CodeSystems, so `$validate` there returns
   "profile not found / unknown CodeSystem" for these resources. That is a server-configuration gap (20-fhir.yaml keeps the radiology
   IG commented out until its CI package exists), not a data defect. Validate against the live server once the IG package is loaded.

## Things to check / decide

* **Radiology-referral IG snapshot bug with older validators.** With validator 6.5.x the IG's `referral-servicerequest` and `referral-task`
  fail snapshot generation (`au-erequesting-patient` / `-task-group` "not a valid constraint on the base"); with 7.0.2 they build. Use a current validator.
* **Group Tasks double the Task count** (44 = 22 Group + 22 fulfilment). Fillers should search with
  `_tag=http://terminology.hl7.org.au/CodeSystem/resource-tag|fulfilment-task` (or `focus:missing=false`). Check smoke.sh counts.
* **Logical performer/owner**: `ServiceRequest.performer` and `Task.owner` are Organization references by HPI-O + display (no literal link
  to the directory). If you want literal references, the directory's resource ids must be fixed and shared.
* `ServiceRequest.category[1]` (imaging 363679005) triggers the harmless "no known slice" info message, same as the IG's own example.
* Business status: only `service-booked` and `image-acquired` are used; there is no code for "triaged"/"accepted", so received/accepted Tasks carry no businessStatus (IG open issue 9).
* Procedure SNOMED codes are chosen from general CT/MRI/US/XR concepts; no value set is bound by the IG (open issue 8). Please eyeball the clinical sense of the
  procedure/reason pairs and the contrast-CT eGFR values (60-94).
* Service types for Schedules: CT `310128004`, MRI `310127009`, Ultrasound `310169008`; X-ray and mammography share `310125001` Radiology service.
  Note: `deploy/seed/hcpd-balmain.json` uses `708175000` for "Diagnostic imaging service"; the Ontoserver MCP lookup suggests `708175003` is the
  active "Diagnostic imaging service" code. Worth checking, it is outside this task and I did not touch it.
* Dates are relative to 19 Oct 2026 (authored 1 Aug to 19 Oct; appointments 20 Aug to 3 Nov; free slots 4-5 Nov). Slots after the event days
  are fine for browsing but nothing is time-sensitive; regenerate if the dates should shift.
* Keep Day 1 data (D2): the loader never deletes, but reloading overwrites seeded resources back to their seed state, so do not re-run it between days.
* Referrers are not in the directory; if the directory author also creates GP practices, the HPI-Os above must not collide.
