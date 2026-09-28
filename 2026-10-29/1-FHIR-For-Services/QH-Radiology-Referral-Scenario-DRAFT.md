# QH Connectathon – Radiology Referral with Directory Discovery and Booking (DRAFT)

**Status:** Sketch for discussion · **Duration:** 2 days · **Author:** Michael Osborne (CSIRO AEHRC)

## 1. Purpose

Show an end-to-end radiology referral where a referrer:

1. **discovers** a suitable imaging service in the Health Connect Provider Directory (HCPD),
2. **creates** a FHIR referral (ServiceRequest plus supporting information) on a referral server, and
3. **books** an appointment against slots that the imaging provider publishes,

with the referral status tracked through a Task until the appointment is confirmed.

## 2. Systems and roles

| Role | Description | Suggested implementation |
|---|---|---|
| **Referrer** (Placer) | GP or hospital clinician system that searches the directory, raises the referral and books | Participant clients (CIS, test harness, Postman/Bruno collections) |
| **Provider Directory** | Source of truth for organisations, services, locations, practitioner roles and endpoints | HCPD SIT: `https://sit.healthconnect.digitalhealth.gov.au/adha/hcd-api-router/api/v1/fhir/` |
| **Referral Server** | Holds ServiceRequest, Task, supporting resources, Schedule/Slot/Appointment | HAPI FHIR instance loaded with the QH referrals IG (plus AU Core / AU eRequesting) |
| **Imaging Provider** (Filler) | RIS/booking system that triages referrals, publishes availability and confirms bookings | Participant RIS or a simulator |
| *Patient app (stretch)* | Lets the patient view the referral and self-book | Participant app |

```
Referrer ──(1) search──▶ HCPD
    │  (HealthcareService / Location / Organization / PractitionerRole / Endpoint)
    │
    ├──(2) POST Bundle (ServiceRequest + Task + supporting info)──▶ Referral Server ◀──(3) poll/subscribe── Imaging Provider
    │                                                                   ▲                                 │
    ├──(4) search Slot ─────────────────────────────────────────────────┤◀──── publishes Schedule/Slot ────┤
    ├──(5) POST Appointment (proposed) ─────────────────────────────────┤                                 │
    └──(6) read Task / Appointment status ──────────────────────────────┘◀──── accept Task, book Appt ────┘
```

## 3. Standards in scope

- **AU Core**: Patient, Practitioner, PractitionerRole, Organization, Condition, AllergyIntolerance, Observation.
- **AU eRequesting**: imaging ServiceRequest, Task (Group Task and fulfilment Task), patient-request pattern. This is the baseline to align with or profile from.
- **QH FHIR Referrals IG** *(TBC: confirm name, version and canonical)*: QH-specific extensions, such as referral category, urgency category and QH facility identifiers.
- **HCPD / HCA Provider Directory IG**: directory resources and search. *Note: the HCPD API Technical Specification has not been published yet, so the search parameters below are assumptions to confirm on Day 1.*
- **FHIR R4 Scheduling**: Schedule, Slot, Appointment. AU Core has no scheduling profiles, so we would use base R4 or the QH IG if it profiles them.
- **Bulk Data Access IG**: HCPD `$export` (stretch track).

## 4. Clinical storyline (test data)

A 58-year-old patient sees a Brisbane GP with right upper quadrant pain and abnormal LFTs. The GP requests **CT abdomen and pelvis with contrast**, urgency *within 2 weeks*.

Supporting information travels with the referral:

- Reason / Condition: RUQ pain, abnormal LFTs
- Observation: eGFR, needed to screen before contrast
- AllergyIntolerance: none known to iodinated contrast (a second variant has a known contrast allergy, which should trigger a triage query)
- Observation / DocumentReference: prior ultrasound report
- Pregnancy status: not applicable (a variant for a female patient of reproductive age adds it)
- Coverage: Medicare, for the bulk-billed pathway

Variant patients add an **MRI with an implanted device** (safety questionnaire) and a **paediatric ultrasound**.

*Codes (SNOMED CT procedures, LOINC observations) are bound to the AU eRequesting imaging ValueSets and validated against Ontoserver. They are to be finalised in the test data pack.*

## 5. Workflow steps

### Step 1 – Discover an imaging service (HCPD)

Every request **must** send the header `X-Request-ID: <UUID v4>`.

Example searches (parameters to confirm against the HCPD spec):

```
GET [hcpd]/HealthcareService?service-type=<imaging service type>&location.address-state=QLD
GET [hcpd]/HealthcareService?specialty=<radiology>&_include=HealthcareService:location&_include=HealthcareService:organization
GET [hcpd]/Location?address-city=Brisbane&_revinclude=HealthcareService:location
GET [hcpd]/PractitionerRole?organization=<id>&_include=PractitionerRole:practitioner
GET [hcpd]/Endpoint?organization=<id>          ← where to send / how to reach the referral receiver
```

Also covered: paging (`Bundle.link[next]`), and polling of `$export` status as a stretch.

**Expected outcome:** the referrer chooses a HealthcareService and Location, and resolves the **Endpoint** that identifies the receiving referral server (or its logical address).

> **Connectathon gap to flag:** SIT HCPD data will not point at the connectathon HAPI server. Options: (a) the organisers ask ADHA to load test HealthcareService and Endpoint records; (b) seed a local mirror of the directory on the HAPI server from `$export`, then add test Endpoints. Decide before the event.

### Step 2 – Create the referral

The referrer sends a **transaction Bundle** to the referral server containing:

- `ServiceRequest` (intent `order`, status `active`, `category` imaging, `code` for the imaging procedure, `priority`, `reasonReference`, `supportingInfo[]`, `requester` → PractitionerRole, `performer` → HCPD Organization/HealthcareService reference or identifier, `requisition` identifier)
- `Task` (Group Task per AU eRequesting: `status=requested`, `intent=order`, `focus` → ServiceRequest, `owner` → filler Organization)
- Patient, PractitionerRole/Practitioner, Condition, Observation(s), AllergyIntolerance, DocumentReference, Coverage

**Decision point:** should resources reference the HCPD directly (absolute URLs) or through identifiers (HPI-O, HPI-I)? Recommendation: use **identifier references with display**, plus an absolute HCPD reference where one is available. This avoids coupling to SIT resource IDs.

### Step 3 – Filler receives and triages

The imaging provider retrieves new work:

```
GET [ref]/Task?owner=<org>&status=requested&_include=Task:focus
```

or through a FHIR Subscription as a stretch.

It then updates the Task to `accepted` (or `rejected` / `on-hold` with `statusReason`, for example "contrast allergy – please confirm"). It may create a fulfilment Task that is `partOf` the Group Task.

### Step 4 – Publish availability

The filler maintains `Schedule` (actor → HealthcareService/Location, serviceType CT) and `Slot` (status `free`) on the referral server.

```
GET [ref]/Slot?schedule.actor=HealthcareService/<id>&status=free&start=ge2026-..&service-type=<CT>
```

### Step 5 – Book

The referrer or patient app creates an `Appointment`:

- status `proposed` (or `pending`), `basedOn` → ServiceRequest, `slot` → Slot, `participant` = patient + location + HealthcareService

The filler confirms: Appointment `booked`, Slot `busy`, Task `in-progress` (businessStatus "Booked").

Negative tests: slot already taken (409 or rejected Appointment); cancellation and rebook.

### Step 6 – Track status

The referrer polls the Task and Appointment, or subscribes. It must display the status and businessStatus correctly.

*Stretch:* the filler posts a DiagnosticReport or ImagingStudy and completes the Task. This links to the report flow in AU eRequesting.

## 6. Two-day agenda

| | Day 1 – Discover & Request | Day 2 – Book & Track |
|---|---|---|
| AM | Kick-off, environment check, HCPD connectivity (X-Request-ID, auth, paging); seed data review | Filler triage (accept, reject, on-hold); Schedule/Slot publishing |
| Mid | **Track A:** HCPD discovery queries; resolve Endpoint | **Track B:** Appointment booking, confirm, cancel, rebook |
| PM | Referral Bundle creation; validation against QH IG / AU eRequesting on HAPI (`$validate`) | Status tracking end to end; stretch tracks (Subscriptions, patient app, `$export`, report return) |
| Close | Day 1 issues log; IG feedback capture | Demo of the full flow; findings report; IG change requests |

## 7. Test cases (summary)

| ID | Actor | Test | Pass criteria |
|---|---|---|---|
| D-01 | Referrer | Search HCPD HealthcareService by imaging type + QLD | 200, searchset Bundle, header sent, paging handled |
| D-02 | Referrer | Resolve Location, Organization and Endpoint for the chosen service | Endpoint address and payload type identified |
| D-03 | Referrer | Look up referrer PractitionerRole in HCPD | HPI-I / HPI-O identifiers obtained |
| R-01 | Referrer | POST referral transaction Bundle | 200/201; resources conform to profiles (`$validate` clean or warnings only) |
| R-02 | Referrer | Referral with full supporting info | supportingInfo resolvable; eGFR present when contrast is requested |
| T-01 | Filler | Retrieve new Tasks for its organisation | Correct Task + ServiceRequest returned |
| T-02 | Filler | Accept / reject / on-hold with reason | Task status transitions valid; reason coded |
| B-01 | Filler | Publish Schedule + free Slots | Slots searchable by service and date |
| B-02 | Referrer | Book a free Slot | Appointment booked, Slot busy, linked via basedOn |
| B-03 | Referrer | Book a taken Slot | Handled gracefully with an error or rejected Appointment |
| B-04 | Either | Cancel and rebook | Appointment cancelled, Slot freed, new booking linked |
| S-01 | Referrer | Track status to Booked | Task businessStatus shown correctly |
| X-01 | Stretch | HCPD `$export` + polling | NDJSON retrieved, status polling honoured |

## 8. Open questions / decisions before the event

1. **QH referrals IG**: which version, and does it profile Schedule/Slot/Appointment or only the referral?
2. **HCPD access**: SIT credentials and onboarding for participants, whether auth is needed beyond X-Request-ID, rate limits, and the timing of the tech spec.
3. **Directory to referral server linkage**: test Endpoint records in HCPD, or a local mirror (see Step 1).
4. **Who books?** The referrer books directly (open slots), or the filler books after triage (the more realistic QH pathway). Support both as variants?
5. **Transport**: FHIR REST directly on the shared HAPI server (simplest), or a push to the filler's own endpoint discovered via HCPD (more realistic, harder).
6. **Security**: open HAPI for the connectathon vs SMART Backend Services.
7. **Terminology**: finalise the imaging procedure ValueSet (AU eRequesting vs QH RIS catalogue) and HCPD service-type codes for imaging.
8. **Alignment**: map to Sparked Connected Test Scenario 1 (eRequest/eReferral with provider lookup) so results feed back into AU IGs.
