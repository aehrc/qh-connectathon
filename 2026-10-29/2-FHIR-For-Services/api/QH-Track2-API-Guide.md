# Track 2 API guide: Radiology Referral with Directory Discovery and Booking

**FHIR in Queensland Health Connectathon, 29–30 October 2026 · Track 2 (FHIR for Services)**

This page gets you calling the Track 2 servers in a few minutes. It goes with the
[scenario description](QH-Radiology-Referral-Scenario-DRAFT.html), and every request below maps to a test
case (D-01 … S-01) from §7 of that document. All data is fictional.

## Downloads

| File | What it is |
|---|---|
| [**QH-Track2.postman_collection.json**](downloads/QH-Track2.postman_collection.json) | Postman collection, 41 requests with tests, in scenario order |
| [QH-Track2-public.postman_environment.json](downloads/QH-Track2-public.postman_environment.json) | Environment: the public `*.efiq.hospservices.net` servers |
| [QH-Track2-incluster.postman_environment.json](downloads/QH-Track2-incluster.postman_environment.json) | Environment: in-cluster URLs, for frog-runner and anything running inside the cluster |
| [**QH-Track2-frog-testscripts.zip**](downloads/QH-Track2-frog-testscripts.zip) | The fhir-frog test library: FHIR TestScripts and fixtures for this scenario (see [fhir-frog](#fhir-frog-conformance-tests)) |

The collection also works in [Bruno](https://www.usebruno.com/) (File → Import Collection → Postman) and in
[newman](https://github.com/postmanlabs/newman):

```bash
npm i -g newman
newman run QH-Track2.postman_collection.json -e QH-Track2-public.postman_environment.json
```

## The servers

| Role | Public URL | Notes |
|---|---|---|
| **Provider Directory** (HCPD, read mostly) | `https://directory.efiq.hospservices.net/fhir` | Every request needs an `X-Request-ID: <UUID v4>` header. The collection sets it for you. |
| **Referral Server** (referrals, tasks, booking) | `https://referrals.efiq.hospservices.net/fhir` | HAPI with the [Radiology Referral and Booking IG](https://aehrc.github.io/radiology-referral/), AU eRequesting and AU Core. Open, no auth. |
| **Referrer / filler UI** | `https://ui.efiq.hospservices.net` | Browser path of the track, same data. |
| **Conformance (frog-runner)** | `https://conformance.efiq.hospservices.net` | Runs the fhir-frog TestScripts, see below. |

The directory and the referral server are **separate servers with separate data**. Directory ids start with `qhd-`,
referral ids with `qhc-`.

## Run the scenario

Open the collection and work through the folders in order, or use the Collection Runner for a full pass.
Folders 2 to 5 chain together: the ids created by one request are saved for the next.

| Folder | Scenario step | Test cases | What it does |
|---|---|---|---|
| **1 Discover** | Step 1 | D-01, D-02, D-03, X-01 | Search CT services in QLD, page through results, resolve Organization / Location / **Endpoint**, look up a referrer's PractitionerRole, bulk `$export` (stretch) |
| **2 Create the referral** | Step 2 | R-01, R-02 | POST one transaction Bundle (Patient, eGFR, ServiceRequest, Group Task, fulfilment Task); `$validate`; read back with supporting info |
| **3 Triage** | Step 3 | T-01, T-02 | Filler finds new Tasks; accept, put on hold with a coded reason, reject |
| **4 Availability and booking** | Steps 4 and 5 | B-01 … B-04 | Publish Schedule and Slots, search free Slots, propose an Appointment, confirm it, cancel and rebook |
| **5 Track status** | Step 6 | S-01 | Read the Task (`status` and `businessStatus`) and Appointments |
| **9 Clean up** | | | Deletes what the run created |

Every folder has working defaults pointing at the seeded data, so you can start anywhere. Seeded ids worth knowing:

| What | Id |
|---|---|
| CT service in the directory (Cairns CT) | `HealthcareService/qhd-hcs-01` |
| Its organisation, endpoints | `Organization/qhd-org-01`, `Endpoint/qhd-ep-01-rest` |
| Referrer PractitionerRole | `PractitionerRole/qhc-role-1` (Dr Chen, Riverside Family Practice) |
| Filler organisation | `Organization/qhc-org-fill1` (Tropic Coast Health Service, HPI-O `8003629999000017`) |
| A referral with its eGFR | `ServiceRequest/qhc-sr-0001`, `Task/qhc-task-0001`, `Observation/qhc-egfr-0001` |
| Schedule with free Slots (4 and 5 Nov 2026) | `Schedule/qhc-sched-f1-ct` for `HealthcareService/qhc-hcs-f1-ct` |
| A booked Appointment | `Appointment/qhc-appt-0007` |

## The requests in curl

If you prefer a terminal. `X-Request-ID` is required by the directory.

```bash
DIR=https://directory.efiq.hospservices.net/fhir
REF=https://referrals.efiq.hospservices.net/fhir
RID=$(uuidgen)

# D-01  CT services in Queensland, with Location and Organization
curl -H "X-Request-ID: $RID" \
  "$DIR/HealthcareService?service-type=http://snomed.info/sct|310128004&location.address-state=QLD&_include=HealthcareService:location&_include=HealthcareService:organization"

# D-02  from the service to its Endpoints
curl -H "X-Request-ID: $RID" \
  "$DIR/HealthcareService?_id=qhd-hcs-01&_include=HealthcareService:endpoint&_include=HealthcareService:organization"

# T-01  new work for a filler, with the ServiceRequest
curl "$REF/Task?owner=qhc-org-fill1&status=requested&_include=Task:focus"

# B-01  free CT slots for a service
curl "$REF/Slot?schedule.actor=HealthcareService/qhc-hcs-f1-ct&status=free"

# S-01  track the referral
curl "$REF/Task?focus=ServiceRequest/qhc-sr-0001"
curl "$REF/Appointment?based-on=ServiceRequest/qhc-sr-0007"
```

## Things worth knowing

These came from running the collection against the live servers.

- **Endpoint has no `organization` search parameter.** `Endpoint?organization=…` quietly returns nothing. Reach
  Endpoints from the owner instead: `HealthcareService?_id=…&_include=HealthcareService:endpoint` or
  `Organization?_id=…&_include=Organization:endpoint`.
- **Seeded `Endpoint.address` values are in-cluster URLs** (`http://fhir.track2.svc.cluster.local:8080/fhir`). From your
  laptop, use the public referral URL above instead.
- **The server does not prevent double booking.** Two Appointments can be created against the same Slot and both succeed.
  A booking client must re-read the Slot and check `status = free` immediately before booking, and the filler must set the
  Slot to `busy` when it confirms (request B-02 does both steps). This is the interesting part of test case B-03.
- **Triage and booking updates use JSON Patch** (`PATCH` with `Content-Type: application/json-patch+json`), so you only
  send what changes. A full `PUT` works too.
- **Group Task and fulfilment Task.** A referral has two Tasks: the Group Task (no `focus`) and the fulfilment Task, which
  has `focus` → ServiceRequest and `partOf` → Group Task. Search on `Task?focus=` finds the fulfilment Task only.
- **`owner:identifier` is not supported** on Task search. Search by the organisation's resource id (`owner=qhc-org-fill1`).
- **The first `$validate` can take about ten seconds** while HAPI warms its validation cache.
- **Directory search parameters are Day-1 assumptions.** The ADHA HCPD technical specification is not published yet, so
  treat D-02 and D-03 as provisional.

## fhir-frog conformance tests

[fhir-frog](https://fhirfrog.org) is the FHIR conformance test toolkit used to check this track. Tests are FHIR
`TestScript` resources run by **[frog-runner](https://gitlab.com/fhirfrog/frog-runner)**, deployed here at
<https://conformance.efiq.hospservices.net>.

**The test library.** [QH-Track2-frog-testscripts.zip](downloads/QH-Track2-frog-testscripts.zip) holds the TestScripts and fixtures
for the scenario, as deployed on the conformance host:

| Bundle | Server | Covers |
|---|---|---|
| `scenario1/step1/` | directory | Step 1: HealthcareService search |
| `scenario1-referral/` | referral | Steps 2 to 6: create and submit a referral, retrieve it with supporting information, update and monitor fulfilment status, patient view |

These were adapted from the HL7 AU Sparked Testing Event TestScripts (Connected Scenario 1). They cover the referral flow;
the **Schedule, Slot and Appointment booking steps (B-01 … B-04) are covered by the Postman collection above, not yet by
frog TestScripts.** Source and run notes: [`deploy/frog-tests`](https://github.com/aehrc/qh-connectathon/tree/main/2026-10-29/2-FHIR-For-Services/deploy/frog-tests).

**Run them** on the conformance host (use the in-cluster server URLs, because the runner's JVM does not trust the
public certificate chain):

```bash
FROG=https://conformance.efiq.hospservices.net

# directory, step 1
curl -s -X POST "$FROG/api/v1/runs" -H 'Content-Type: application/json' -d '{
  "bundlePath": "/bundles/scenario1/step1",
  "serverUrl": "http://directory:8080/fhir"}'

# referral, steps 2 to 6 (needs the IG for profile validation, takes 5 to 10 minutes)
curl -s -X POST "$FROG/api/v1/runs" -H 'Content-Type: application/json' -d '{
  "bundlePath": "/bundles/scenario1-referral",
  "serverUrl": "http://fhir:8080/fhir",
  "igPackage": "hl7.fhir.au.ereq#1.0.1",
  "terminologyServerUrl": "https://r4.ontoserver.csiro.au/fhir"}'

curl -s "$FROG/api/v1/runs/<id>"     # status COMPLETED, every result.success == true
```

Profile validation runs inside frog-runner from the `igPackage` you pass, not on the server, so always send both
`serverUrl` and `igPackage` for the referral bundle. Run one at a time, and expect the referral bundle to leave a few
test resources behind (`deploy/frog-tests/cleanup-fixtures.py` removes them).

**Write your own tests, with AI help.** The [fhir-frog MCP server and skill](https://gitlab.com/fhirfrog/fhir-frog-mcp)
let Claude, Kiro and other MCP clients author, lint and validate TestScripts for you (release
[v0.1.0](https://gitlab.com/fhirfrog/fhir-frog-mcp/-/releases/v0.1.0), Java 17+ or Docker). Start with `frog_doctor`.

## Links

- [Scenario description and test cases](QH-Radiology-Referral-Scenario-DRAFT.html)
- [Radiology Referral and Booking IG](https://aehrc.github.io/radiology-referral/) · [source](https://github.com/aehrc/radiology-referral)
- [Track 2 workshop guide](index.html)
- [fhir-frog](https://fhirfrog.org) · [frog-runner](https://gitlab.com/fhirfrog/frog-runner) · [fhir-frog-mcp](https://gitlab.com/fhirfrog/fhir-frog-mcp)
- Questions or problems: [open an issue](https://github.com/aehrc/qh-connectathon/issues) or ask Michael Osborne or Joern Guy Süß at the event.
