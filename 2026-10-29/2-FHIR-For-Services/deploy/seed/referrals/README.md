# Referral seed data (FICTIONAL)

Starting data for the **referral server** (`/fhir`, radiology-referral IG): 20 fictional patients,
22 referrals (13 active, 9 completed, no drafts), Schedules/Slots and a few Appointments.
All people, organisations, identifiers and phone numbers are made up. **No real patient data.**

| File | Contents |
|------|----------|
| `00-referrers.json` | 6 referrer Organizations + Practitioner + PractitionerRole each, 4 pathology laboratory Organizations with 8 linked pathologists (Practitioner + PractitionerRole), all AU eRequesting profiles; plus the imaging fillers mirrored from the directory |
| `01-schedules-slots.json` | 23 Schedules (7 imaging providers x modalities), 147 Slots (free slots 4-5 Nov 2026, busy slots behind appointments) |
| `patient-01.json` .. `patient-20.json` | one transaction per patient: Patient, Condition/eGFR where relevant, ServiceRequest + Group Task + Referral Task per referral, Appointment where booked/fulfilled; plus the patient's AU eRequesting pathology orders (see below) |
| `generate.py` | deterministic generator (`python3 -I generate.py`); edit it, never the JSON, then regenerate |
| `REVIEW.md` | review notes for Michael |

Load with `../load-referrals.sh` (`FHIR_BASE=... ./load-referrals.sh [--skip-slots] [--dry-run]`). Every
resource is a `PUT` with a fixed id (`qhc-*`) so reloading is idempotent.

## Dependency on the provider directory seed (IMPORTANT)

The receiving services (fillers) live in the **directory** server, which is a different server, so the
referral data refers to them **logically** (identifier + display), as recommended by the IG open-issue 3
("identifier plus display"). Nothing here is a literal reference into the directory. For the data to tell
a coherent story the directory seed should contain these Organizations (HPI-O is the join key) and,
ideally, the HealthcareService/Location keys below:

| # | Organization (name) | Town | HPI-O (`http://ns.electronichealth.net.au/id/hi/hpio/1.0`) | Modalities used |
|---|---|---|---|---|
| 1 | Northside Imaging | Chermside | `8003623233370062` | CT, US, XR |
| 2 | Far North Reef Imaging | Cairns | `8003629900001021` | CT, MRI, US, XR |
| 3 | Dry Tropics Radiology | Townsville | `8003629900001039` | CT, MRI, XR, MAM |
| 4 | Darling Downs Medical Imaging | Toowoomba | `8003629900001047` | CT, US, XR |
| 5 | Capricornia Imaging | Rockhampton | `8003629900001054` | CT, US, XR |
| 6 | Sunshine Coast Radiology | Maroochydore | `8003629900001062` | CT, MRI, US |
| 7 | Bayside Southport Imaging | Southport | `8003629900001070` | MRI, XR, US |

HPI-Os are Luhn-valid but obviously synthetic (`800362990000` + 3-digit key + Luhn check digit); #1 reuses the IG example HPI-O.

Optional, only used in `Schedule.actor` and `Appointment.participant.actor` (display text still works if absent):

* HealthcareService identifier system `http://aehrc.csiro.au/fhir/qh-connectathon/sid/healthcareservice-key`,
  value `QHC-HCS-F<n>-<CT|MRI|US|XR|MAM>` (e.g. `QHC-HCS-F2-MRI`)
* Location identifier system `http://aehrc.csiro.au/fhir/qh-connectathon/sid/location-key`, value `QHC-LOC-F<n>`

If the directory author prefers different names/identifiers, change the `FILLERS` table (and key helpers) at the top of
`generate.py` and regenerate. Referrers (GP practices, a hospital outpatient clinic) are NOT in the directory; they are
local Organizations on the referral server:

| Referrer organisation | Town | HPI-O |
|---|---|---|
| Riverside Family Practice | Brisbane | `8003621566684455` |
| Wattle Grove Medical Centre | Ipswich | `8003629900000023` |
| Reef View Medical Practice | Cairns | `8003629900000031` |
| Cane Valley Family Clinic | Mackay | `8003629900000049` |
| Toowoomba Range Medical | Toowoomba | `8003629900000056` |
| Bayside Community Hospital Outpatients | Wynnum | `8003629900000064` |

Pathology laboratories (also local to the referral server, `Organization.type` = SNOMED `310074003` Pathology service).
Pathologists are linked by `PractitionerRole` (`qhc-role-path-NN`, HPI-I `hpii(NN)`, role coded in SNOMED):

| Laboratory | Town | HPI-O | Pathologists |
|---|---|---|---|
| Coral Coast Pathology | Cairns | `8003629900000213` | Dr Rhiannon Petrakis (general), Dr Tobias Wenzel (haematology) |
| Brigalow Pathology Laboratories | Toowoomba | `8003629900000221` | Dr Anjali Deshmukh (medical biochemist), Dr Fergus Lachlan-Reid (anatomic) |
| Moreton Clinical Pathology | Bowen Hills | `8003629900000239` | Dr Selina Marchetti (clinical), Dr Kwame Asante (anatomic), Dr Yuki Harrington (haematology) |
| Fitzroy Valley Pathology | Rockhampton | `8003629900000247` | Dr Declan Moorhouse (general) |

## Pathology requests (AU eRequesting 1.0.1)

15 pathology orders (32 tests) from the same referrers to the four labs above, for testing pathology requesting
against [AU eRequesting](https://hl7.org.au/fhir/ereq/1.0.1/). Each order, in the patient's bundle, is:

* an `au-erequesting-encounter` (the GP consultation; `ServiceRequest.encounter` is mandatory),
* one `au-erequesting-servicerequest-path` per test: category `108252007` Laboratory procedure, code from the RCPA SPIA
  requesting refset with the form wording in `code.text`, `displaySequence`, fasting precondition on fasting tests,
  PLAC identifier `LAB-QHC-nnnn-NN` and requisition (PGN) `LAB-QHC-nnnn`, scoped to the requester's HPI-O,
* one `au-erequesting-task-group` (owner = the lab) and one `au-erequesting-task-diagnosticrequest` per test
  (`partOf` the group, `focus` the ServiceRequest),
* `au-erequesting-coverage` only where billing is not bulk-billed Medicare (DVA, concession, private), and an IPS
  pregnancy-status Observation in `supportingInfo` for the antenatal order.

The orders cover every Task state: requested, received, accepted, in-progress (specimen-collected,
pathology-in-lab, preliminary-results), completed, on-hold, cancelled (request-cancelled-placer) and
rejected (request-data-issue). Ids are `qhc-path-*`. Edit the `PATH_REQUESTS` table in `generate.py` to change them.
