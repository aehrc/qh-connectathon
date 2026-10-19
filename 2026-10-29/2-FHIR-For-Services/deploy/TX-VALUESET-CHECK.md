# Terminology ValueSet check (issues #41 / #37)

Every ValueSet binding the radiology-referral scenario touches, tested against the public CSIRO Ontoserver
(`https://r4.ontoserver.csiro.au/fhir`, the final B-answer in `infra-questions.md`). Reproduce with
`deploy/smoke/tx-check.sh` (read-only GETs; `--no-burst` skips the load test). The "Raw results" section below is that
script's output verbatim, run 2026-10-19; the sections above it are interpretation.

## How the binding list was built

- IG-own FSH (`ig/input/fsh`): the only explicit binding is `ServiceRequest.status` from
  `au-erequesting-request-status` (required). Other terminology is fixed codes: `$SCT#3457005` (Referral category),
  `$v2-0203#PGN`, `$resource-tag#fulfilment-task`. `ReferralServiceRequest.code` inherits the binding from its parent.
- Inherited bindings: every `binding.valueSet` in the snapshots of the profiles the IG uses (au-erequesting
  servicerequest-imag/task/task-group/patient/practitioner/practitionerrole/organization; au-base servicerequest/healthcareservice/location;
  au-core condition/patient/practitioner/practitionerrole/organization), read from the local FHIR package cache
  `~/.fhir/packages`, plus the R4 base bindings of Appointment/Slot/Schedule (the IG's booking profiles add no bindings).
- Caveat: the cache holds `hl7.fhir.au.ereq#1.0.0`, `au.core#2.0.0`, `au.base#6.0.0`. `sushi-config.yaml` depends on
  ereq **1.0.1**, which is not in the cache; I did not confirm 1.0.1 changed any binding. The ig/ submodule has no built package (no `output/`).
- Each ValueSet: `$expand?count=5`, a typeahead-style `$expand?filter=` (curated term for the important ones, else the first word of the first
  hit), `$validate-code` (curated or first expanded code), and a negative-control code that must return `result=false`.

## Findings (read these first)

1. **BLOCKER-ish: scenario imaging code is not in the bound imaging ValueSet.** `ServiceRequest.code` is bound (preferred) to
   `https://ranzcr.com/fhir/ValueSet/radiology-referral-1` (v1.0.0, 1118 SNOMED codes). The scenario/IG example code
   `SCT#432370003 "CT of abdomen and pelvis with contrast"` returns `result=false` there (it is valid in SNOMED CT-AU and in AU `procedure-1`).
   RANZCR's set has no plain "CT abdomen and pelvis"; nearest are `22831000087106` (CT of abdomen, pelvis and bilateral lower limbs with contrast)
   and `15391000087101` (CT angiography of abdomen, pelvis and lower limb with contrast). The binding is only *preferred*, so the example still validates
   structurally, but a typeahead on the RANZCR set will never offer the scenario code and a strict validator will emit a binding warning.
   Decision needed (content-design owner): pick a RANZCR code for the scenario, or bind `procedure-1`/an own subset. Matches the open item in the scenario draft ("finalise the imaging procedure ValueSet").
2. **SNOMED CT-AU is available and is the default.** `http://snomed.info/sct` resolves (no version) to
   `http://snomed.info/sct/32506021000036107/version/20260930` (AU module, latest, monthly releases from 2016 to 2026-09-30). Other modules are also loaded, so pin
   the version via `system-version`/`displayLanguage` parameters only if a stable edition matters for the event.
3. **Working for typeahead:** all SNOMED-based AU/RANZCR/AU Core value sets expand and filter in ~80-300 ms, including huge ones
   (`reason-for-request-1` 195,257; `clinical-condition-1` 133,143; `procedure-1` 61,983 concepts) with `count=5`. Always send `count` and a filter on these.
4. **Two AU ValueSets cannot be expanded at all (HTTP 404):** `location-physical-type-extended` (imports `http://terminology.hl7.org/ValueSet/location-physical-type`)
   and `v2-0360-extended` (imports `.../ValueSet/v2-0360`) - the imported THO value sets are missing on the server. Both are *preferred*
   bindings on Location.physicalType and Practitioner.qualification.code; not needed by the scenario unless the seed data populates those fields (then expect validator warnings or errors, depending on how HAPI treats the 404).
5. **`http://hl7.org/fhir/ValueSet/location-status` expand returns HTTP 500** (AmbiguousResourceException: implicit VS URI matches CodeSystems `location-status` and `location-characteristic`).
   This is a *required* binding on Location.status, which the seed data (directory Locations) will set. If the HAPI validator asks Ontoserver to validate it remotely it may fail;
   test a real `Location` `$validate` against the HAPI + tx combination and, if it fails, configure HAPI to validate that code from the FHIR core package instead.
   Note `$validate-code` for this VS was not tested separately (script stops at the failed expand), so check it with a Location.status of `active`.
6. **expand/validate-code inconsistencies on three HL7 base *example* VSs (low impact):** `appointment-cancellation-reason` and `service-category` expand fine but
   `$validate-code` fails because the CodeSystems `http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason` and `.../service-category` are not loaded
   ("definition ... could not be found"); `participant-role` lists SNOMED `373654008` in `$expand` but `$validate-code` says it is not in the set. Example-strength only, so no action unless the scenario uses them.
7. **Rate limiting is real but soft.** Every response carries `x-ratelimit-limit: 20`, `x-ratelimit-remaining`, `x-ratelimit-reset` (0/1; looks like ~20 requests per second window).
   Sequential use never gets near it (about 12 req/s with 0.25 s pacing in the script). The 50-request / concurrency-10 burst got **all 200s on the first run (28.9 req/s) and 6 x HTTP 429 on the
   second run (116 req/s)**, with no `Retry-After` header. So the limit is enforced when throughput exceeds roughly 20/s. Implications: a connectathon of many typeahead clients behind one egress IP can hit 429;
   the referral app / HAPI should debounce typeahead (>=250 ms), cache `$expand` results, and retry 429 with backoff. Unknown: whether the limit is per IP, and whether the DiSP cluster's egress IP is exempt or shared.
8. Not tested: write operations (r4.ontoserver is read/write per infra-questions B), HAPI's own remote-terminology path, `Retry-After` behaviour over longer periods, large-count expands (`count>1000`), and the
   SNOMED `displayLanguage`/AU-specific designations.

## Raw results (generated)

Server: `https://r4.ontoserver.csiro.au/fhir`  
Run: 2026-10-19 09:41:41 AEST

Metadata: HTTP 200, Ontoserver® 6.30.2-SNAPSHOT, FHIR 4.0.1, 144 ms. Rate-limit headers on this response: x-ratelimit-limit=20, x-ratelimit-remaining=19, x-ratelimit-reset=0

## SNOMED CT-AU edition

- CodeSystem search `url=http://snomed.info/sct`: HTTP 200, 131 versions listed
- SNOMED CT-AU module `32506021000036107`: 74 sct/ versions; latest = `http://snomed.info/sct/32506021000036107/version/20260930`
- Other editions/modules present: 11000146104, 11000221109, 1303956008, 20611000087101, 21000210109, 332351000009108, 450829007, 45991000052106, 718291003, 731000124108, 83821000000107, 890195008, 900000000000207008, 999000031000000106, 999991001000101
- `$validate-code` 432370003 against `http://snomed.info/sct/32506021000036107/version/20260930`: HTTP 200, result=True, display='CT of abdomen and pelvis with contrast'
- `$lookup` with no version (what a bare `http://snomed.info/sct` resolves to): HTTP 200, version=`http://snomed.info/sct/32506021000036107/version/20260930`

## Binding results

| ValueSet url | Strength | Expand ok | Count | Filter ok | validate-code ok | Notes |
|---|---|---|---|---|---|---|
| `https://ranzcr.com/fhir/ValueSet/radiology-referral-1` | preferred | yes | 1118 | yes (5, 'abdomen') | NO (result=False, HTTP 200, 432370003) | ServiceRequest.code (au-erequesting-servicerequest-imag; inherited by Referral ServiceRequest); top hit for 'abdomen': 241621009 MRI of abdomen; curated sample http://snomed.info/sct#432370003 not in VS |
| `https://healthterminologies.gov.au/fhir/ValueSet/procedure-1` | example | yes | 61983 | yes (5, 'abdomen') | yes (432370003) | ServiceRequest.code (au-servicerequest); top hit for 'abdomen': 120171006 Abdomen closure |
| `https://healthterminologies.gov.au/fhir/ValueSet/reason-for-request-1` | preferred | yes | 195257 | yes (5, 'pain') | yes (301717006) | ServiceRequest.reasonCode; top hit for 'pain': 22253000 Pain |
| `https://healthterminologies.gov.au/fhir/ValueSet/body-site-1` | preferred | yes | 37021 | yes (5, 'abdomen') | yes (279162007) | ServiceRequest.bodySite; Condition.bodySite (extensible); top hit for 'abdomen': 818983003 Structure of abdomen |
| `https://healthterminologies.gov.au/fhir/ValueSet/clinical-condition-1` | extensible | yes | 133143 | yes (5, 'pain') | yes (279225001) | au-core-condition Condition.code; top hit for 'pain': 22253000 Pain |
| `https://healthterminologies.gov.au/fhir/ValueSet/clinical-finding-1` | preferred | yes | 126348 | yes (5, 'pain') | yes (279225001) | au-core-condition Condition.evidence.code; top hit for 'pain': 22253000 Pain |
| `https://healthterminologies.gov.au/fhir/ValueSet/practitioner-role-1` | preferred | yes | 625 | yes (5, 'general') | yes (62247001) | PractitionerRole.code (au-erequesting / au-core); top hit for 'general': 40127002 Dietitian (general) |
| `https://healthterminologies.gov.au/fhir/ValueSet/clinical-specialty-1` | preferred | yes | 267 | yes (5, 'radiology') | yes (23861000087105) | PractitionerRole.specialty; HealthcareService.specialty; top hit for 'radiology': 394914008 Radiology - speciality |
| `https://healthterminologies.gov.au/fhir/ValueSet/service-type-1` | preferred | yes | 709 | yes (2, 'radiology') | yes (373654008) | HealthcareService.type (provider directory); top hit for 'radiology': 310125001 Radiology service |
| `https://healthterminologies.gov.au/fhir/ValueSet/healthcare-organisation-role-type-1` | preferred | yes | 510 | yes (5, 'hospital') | yes (3768009) | Organization.type; top hit for 'hospital': 22232009 Hospital |
| `https://healthterminologies.gov.au/fhir/ValueSet/common-languages-australia-2` | extensible | yes | 339 | yes (5, 'english') | yes (zh-min) | Patient.communication.language; top hit for 'english': en English |
| `https://healthterminologies.gov.au/fhir/ValueSet/contact-relationship-type-3` | extensible | yes | 16 | yes (2, 'carer') | yes (133932002) | Patient.contact.relationship |
| `http://terminology.hl7.org.au/ValueSet/au-erequesting-request-status` | required | yes | 5 | yes (1, 'active') | yes (active) | ServiceRequest.status (Referral ServiceRequest, FSH) |
| `http://terminology.hl7.org.au/ValueSet/au-erequesting-task-status` | required | yes | 9 | yes (1, 'requested') | yes (requested) | Task.status |
| `http://terminology.hl7.org.au/ValueSet/au-erequesting-task-businessstatus` | extensible | yes | 10 | yes (2, 'cancel') | yes (cancel-handled) | Task.businessStatus |
| `http://terminology.hl7.org.au/ValueSet/au-erequesting-fulfilment-task-tags` | required | yes | 2 | yes (2, 'fulfilment') | yes (fulfilment-task) | Task.meta.tag (Referral Task, FSH) |
| `http://terminology.hl7.org.au/ValueSet/order-identifier-type` | required | yes | 4 | yes (2, 'filler') | yes (PGN) | ServiceRequest.requisition.type / Task.groupIdentifier.type (PGN) |
| `http://terminology.hl7.org.au/ValueSet/contact-purpose` | extensible | yes | 12 | yes (1, 'after') | yes (after-hours) | Organization.contact.purpose |
| `http://terminology.hl7.org.au/ValueSet/location-physical-type-extended` | preferred | NO (404) | - | - | - | Location.physicalType; [6063ebd0-04a5-4c5f-ace3-6db8eada4db5]: The imported value set http://terminology.hl7.org/ValueSet/location-physical-type was not found. |
| `http://terminology.hl7.org.au/ValueSet/service-provision-conditions` | preferred | yes | 9 | yes (3, 'bulk') | yes (BB) | HealthcareService.serviceProvisionCode |
| `http://terminology.hl7.org.au/ValueSet/v2-0360-extended` | preferred | NO (404) | - | - | - | Practitioner.qualification.code; [a70f8f17-8bea-44a4-a60f-623e959b91fe]: The imported value set http://terminology.hl7.org/ValueSet/v2-0360 was not found. |
| `http://terminology.hl7.org.au/ValueSet/v3-ServiceDeliveryLocationRoleType-extended` | extensible | yes | 128 | yes (5, 'pediatric') | yes (PEDNICU) | Location.type |
| `http://hl7.org/fhir/ValueSet/service-type` | example | yes | 596 | yes (1, 'adoption/permanent') | yes (1) | Appointment/Slot/Schedule.serviceType (R4 base) |
| `http://hl7.org/fhir/ValueSet/c80-practice-codes` | preferred | yes | 115 | yes (1, 'anesthetics') | yes (394577000) | Appointment/Slot/Schedule.specialty (R4 base) |
| `http://terminology.hl7.org/ValueSet/v2-0276` | preferred | yes | 5 | yes (1, 'a f') | yes (FOLLOWUP) | Appointment/Slot.appointmentType (R4 base) |
| `http://hl7.org/fhir/ValueSet/appointment-cancellation-reason` | example | yes | 32 | yes (5, 'other:') | NO (result=False, HTTP 200, oth-mu) | Appointment.cancelationReason (R4 base) |
| `http://hl7.org/fhir/ValueSet/encounter-reason` | preferred | yes | 201604 | yes (5, 'construction') | yes (27926003) | Appointment.reasonCode (R4 base) |
| `http://hl7.org/fhir/ValueSet/appointmentstatus` | required | yes | 10 | yes (1, 'arrived') | yes (arrived) | Appointment.status |
| `http://hl7.org/fhir/ValueSet/slotstatus` | required | yes | 5 | yes (3, 'busy') | yes (busy) | Slot.status |
| `http://hl7.org/fhir/ValueSet/participationstatus` | required | yes | 4 | yes (1, 'accepted') | yes (accepted) | Appointment.participant.status |
| `http://hl7.org/fhir/ValueSet/request-priority` | required | yes | 4 | yes (1, 'asap') | yes (asap) | ServiceRequest.priority; Task.priority |
| `http://hl7.org/fhir/ValueSet/request-intent` | required | yes | 9 | yes (1, 'filler') | yes (filler-order) | ServiceRequest.intent |
| `http://hl7.org/fhir/ValueSet/request-status` | required | yes | 7 | yes (1, 'active') | yes (active) | au-servicerequest status (superseded by au-erequesting-request-status in eReq) |
| `http://hl7.org/fhir/ValueSet/task-intent` | required | yes | 9 | yes (1, 'original') | yes (original-order) | Task.intent |
| `http://hl7.org/fhir/ValueSet/task-code` | example | yes | 8 | yes (1, 'activate/approve') | yes (approve) | Task.code |
| `http://hl7.org/fhir/ValueSet/servicerequest-category` | example | yes | 5 | yes (1, 'laboratory') | yes (108252007) | ServiceRequest.category |
| `http://hl7.org/fhir/ValueSet/servicerequest-orderdetail` | example | yes | 5 | yes (1, 'continuous') | yes (47545007) | ServiceRequest.orderDetail |
| `http://hl7.org/fhir/ValueSet/participant-role` | example | yes | 1338 | yes (5, 'medical') | NO (result=False, HTTP 200, 373654008) | ServiceRequest.performerType |
| `http://hl7.org/fhir/ValueSet/performer-role` | preferred | yes | 625 | yes (1, 'chiropractor') | yes (3842006) | Task.performerType |
| `http://hl7.org/fhir/ValueSet/identifier-use` | required | yes | 5 | yes (1, 'official') | yes (official) | identifier.use |
| `http://hl7.org/fhir/ValueSet/administrative-gender` | required | yes | 4 | yes (1, 'female') | yes (female) | Patient.gender |
| `http://hl7.org/fhir/ValueSet/name-use` | required | yes | 7 | yes (1, 'name') | yes (maiden) | HumanName.use |
| `http://hl7.org/fhir/ValueSet/contact-point-system` | required | yes | 7 | yes (1, 'email') | yes (email) | ContactPoint.system |
| `http://hl7.org/fhir/ValueSet/contact-point-use` | required | yes | 5 | yes (1, 'home') | yes (home) | ContactPoint.use |
| `http://hl7.org/fhir/ValueSet/days-of-week` | required | yes | 7 | yes (1, 'friday') | yes (fri) | availableTime.daysOfWeek |
| `http://hl7.org/fhir/ValueSet/marital-status` | extensible | yes | 11 | yes (1, 'annulled') | yes (A) | Patient.maritalStatus |
| `http://hl7.org/fhir/ValueSet/link-type` | required | yes | 4 | yes (1, 'refer') | yes (refer) | Patient.link.type |
| `http://hl7.org/fhir/ValueSet/condition-clinical` | required | yes | 6 | yes (1, 'active') | yes (active) | Condition.clinicalStatus |
| `http://hl7.org/fhir/ValueSet/condition-ver-status` | required | yes | 6 | yes (1, 'confirmed') | yes (confirmed) | Condition.verificationStatus |
| `http://hl7.org/fhir/ValueSet/condition-category` | extensible | yes | 2 | yes (1, 'encounter') | yes (encounter-diagnosis) | Condition.category |
| `http://hl7.org/fhir/ValueSet/condition-severity` | extensible | yes | 3 | yes (1, 'severe') | yes (24484000) | Condition.severity |
| `http://hl7.org/fhir/ValueSet/location-mode` | required | yes | 2 | yes (1, 'instance') | yes (instance) | Location.mode |
| `http://hl7.org/fhir/ValueSet/location-status` | required | NO (500) | - | - | - | Location.status; Implicit ValueSet URI http://hl7.org/fhir/ValueSet/location-status matched more than one CodeSystem: [http://hl7.org/fhir/location-character |
| `http://terminology.hl7.org/ValueSet/v2-0116` | preferred | yes | 6 | yes (1, 'closed') | yes (C) | Location.operationalStatus |
| `http://terminology.hl7.org/ValueSet/v3-ServiceDeliveryLocationRoleType` | example | yes | 127 | yes (5, 'pediatric') | yes (PEDNICU) | ServiceRequest.locationCode |
| `http://hl7.org/fhir/ValueSet/service-category` | example | yes | 38 | yes (1, 'adoption') | NO (result=False, HTTP 200, 1) | HealthcareService.category |
| `http://hl7.org/fhir/ValueSet/service-referral-method` | example | yes | 5 | yes (1, 'fax') | yes (fax) | HealthcareService.referralMethod |
| `http://hl7.org/fhir/ValueSet/languages` | preferred | yes | 55 | yes (2, 'swedish') | yes (sv-SE) | *.language (all-languages, unbounded BCP-47) |

## Failures

- `https://ranzcr.com/fhir/ValueSet/radiology-referral-1` (preferred): expand=yes, filter=yes (5, 'abdomen'), validate=NO (result=False, HTTP 200, 432370003). top hit for 'abdomen': 241621009 MRI of abdomen; curated sample http://snomed.info/sct#432370003 not in VS
- `http://terminology.hl7.org.au/ValueSet/location-physical-type-extended` (preferred): expand=NO (404), filter=-, validate=-. [6063ebd0-04a5-4c5f-ace3-6db8eada4db5]: The imported value set http://terminology.hl7.org/ValueSet/location-physical-type was not found.
- `http://terminology.hl7.org.au/ValueSet/v2-0360-extended` (preferred): expand=NO (404), filter=-, validate=-. [a70f8f17-8bea-44a4-a60f-623e959b91fe]: The imported value set http://terminology.hl7.org/ValueSet/v2-0360 was not found.
- `http://hl7.org/fhir/ValueSet/appointment-cancellation-reason` (example): expand=yes, filter=yes (5, 'other:'), validate=NO (result=False, HTTP 200, oth-mu). 
- `http://hl7.org/fhir/ValueSet/participant-role` (example): expand=yes, filter=yes (5, 'medical'), validate=NO (result=False, HTTP 200, 373654008). 
- `http://hl7.org/fhir/ValueSet/location-status` (required): expand=NO (500), filter=-, validate=-. Implicit ValueSet URI http://hl7.org/fhir/ValueSet/location-status matched more than one CodeSystem: [http://hl7.org/fhir/location-character
- `http://hl7.org/fhir/ValueSet/service-category` (example): expand=yes, filter=yes (1, 'adoption'), validate=NO (result=False, HTTP 200, 1). 

## Scenario codes (from the IG FSH / scenario draft) against their bound ValueSets

| Code | Meaning | ValueSet | In VS? |
|---|---|---|---|
| 432370003 | CT of abdomen and pelvis with contrast | `https://ranzcr.com/fhir/ValueSet/radiology-referral-1` | NO |
| 432370003 | CT of abdomen and pelvis with contrast | `https://healthterminologies.gov.au/fhir/ValueSet/procedure-1` | yes |
| 301717006 | Right upper quadrant pain | `https://healthterminologies.gov.au/fhir/ValueSet/reason-for-request-1` | yes |
| 62247001 | General practitioner | `https://healthterminologies.gov.au/fhir/ValueSet/practitioner-role-1` | yes |
| 3457005 | Referral (category[referral], fixed in FSH) | `http://hl7.org/fhir/ValueSet/servicerequest-category` | NO |
| 363679005 | Imaging (optional discipline category) | `http://hl7.org/fhir/ValueSet/servicerequest-category` | yes |

Closest RANZCR codes for 'CT of abdomen' + 'pelvis' (filter, count 20):
- 15391000087101 CT angiography of abdomen, pelvis and lower limb with contrast
- 22831000087106 CT of abdomen, pelvis and bilateral lower limbs with contrast

Sequential timings over 221 requests: median 83 ms, p95 87 ms, max 94 ms.

## Burst test (50 typeahead `$expand` requests, concurrency 10)

- Wall time 0.4 s (116.1 req/s); status counts: {200: 44, 429: 6}
- Latency ms: median 84, p95 90, max 92
- Rate-limit headers: limit=20, remaining min/max seen=0/19, reset values=['0', '1']
- 429 responses: 6; Retry-After=[None]
