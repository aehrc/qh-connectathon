# Track 2 — fhir-frog conformance tests

FHIR conformance tests for the radiology-referral scenario, run with
**[frog-runner](https://github.com/aehrc/frog-runner)** on the **`org.fhirfrog`** engine
(fhirfrog.org lineage — `fhir-frog-library 0-SNAPSHOT`, resolved from the fhirfrog GitLab group
Maven registry). These reuse/adapt the TestScripts from the HL7 AU Sparked Testing Event
(`sparked-testing-2026-07-08`, Connected Scenario 1); only the *engine* differs (frog-runner /
org.fhirfrog, not the older `au.csiro.fhir` parent the Sparked repo declared).

## Bundles

| Bundle | Target server | What it covers | Status |
|--------|---------------|----------------|--------|
| `scenario1/step1/` | **directory** (HCPD IG) | Step 1 — HealthcareService search by location (needs seeded HCPD data) | PASS |
| `scenario1-referral/` | **referral** (AU eRequesting) | Steps 2–6 — create/submit eRequest, retrieve, update fulfilment, monitor, patient view | 6/6 PASS |

## Bundle layout rules (frog-runner)

frog-runner (`RunService`) expects a **flat bundle**:
- **TestScripts** (`*.json`) directly in the bundle root — *not* in `stepN/` subdirs.
- **Fixtures** in a `fixtures/` subdirectory (`bundleDir.resolve("fixtures")`).
- Fixture `reference` values are **bare names** (e.g. `Patient-s1-patient-1`), resolved under
  `fixtures/`. (The Sparked originals used `scenario1/fixtures/...` prefixes for their JUnit
  runner; those are stripped here.)

## Running

Prereqs on the runner host: Java 17, Maven; build frog-runner once (`mvn -DskipTests package`),
run it (`java -jar target/frog-runner-*.jar --server.port=8090`).

```bash
# Steps 2-6 against the referral server (use an EXTERNAL serverUrl — see note)
curl -s -X POST http://localhost:8090/api/v1/runs -H 'Content-Type: application/json' \
  -d '{"bundlePath":"/abs/path/scenario1-referral","serverUrl":"http://<referral>/fhir"}'

# Step 1 against the directory server (seed deploy/seed/hcpd-balmain.json first)
curl -s -X POST http://localhost:8090/api/v1/runs -H 'Content-Type: application/json' \
  -d '{"bundlePath":"/abs/path/scenario1/step1","serverUrl":"http://<directory>/fhir"}'

# poll: GET /api/v1/runs/{id}  -> status COMPLETED, each result.success == true
```

**Always pass an explicit `serverUrl`.** Without it, frog-runner uses a **docker-managed** backend
(spins up its own HAPI via containers) — which fails on the CIS-hardened VM (see
`../VM-STATUS.md`). Pointing at our in-cluster servers uses the external/unmanaged path.

## Where validation runs (critical): frog-side, not server-side

`ProfileValidation` assertions (`validateProfileId`) run **in-process inside frog-runner**, using
a HAPI `FhirValidator` whose `ValidationSupport` chain is built from the **`igPackage`** run
parameter — NOT by calling the target server's `$validate`. Confirmed in frog-runner
`RunService`: without an IG, `validateProfileId` "runs, but against whatever
`DefaultProfileValidationSupport` ships (base FHIR only)", and the UI help: "Without this, every
ProfileValidation/terminology assertion fails against a plain HAPI".

Consequence — the packages are needed in **two independent places**:

| Concern | Where | How |
|---------|-------|-----|
| Create/store the test **fixtures** (referenced resources must resolve, or be allowed to dangle) | target **server** | install the IG on the server (`HAPI_FHIR_IMPLEMENTATIONGUIDES_*`) **and** `enforce_referential_integrity_on_write=false` so isolated fixtures load |
| **Validate** a resource against a profile | **frog-runner** | pass `igPackage` (+ `terminologyServerUrl`) on the run |

So a run against our AU eRequesting referral server must supply **both** `serverUrl` and
`igPackage`:

```bash
FR=https://frog-runner.dw.csiro.au   # existing in-cluster frog-runner (another DiSP namespace)
SVC=http://fhir.aehrc-qh-connectathon-track-2.svc.cluster.local:8080/fhir  # cluster-internal DNS
curl -s -X POST "$FR/api/v1/runs" -H 'Content-Type: application/json' -d '{
  "testPackage":"fhirfrog.au-erequesting-tests#0.1.0",
  "serverUrl":"'"$SVC"'",
  "igPackage":"hl7.fhir.au.ereq#1.0.1",
  "terminologyServerUrl":"https://tx.ontoserver.csiro.au/fhir"}'
# poll: GET /api/v1/runs/{id}
```

The in-cluster frog-runner reaches our servers over **cluster-internal service DNS** (no
port-forward, no public TLS needed — our own ingress cert was still provisioning at test time).

## Verified result (2026-09-29, live DiSP stack, remote frog-runner)

AU eRequesting suite (`fhirfrog.au-erequesting-tests#0.1.0`) against the DiSP `fhir` referral
server with `igPackage=hl7.fhir.au.ereq#1.0.1` + ontoserver tx: **3/7 pass**.

- PASS: Patient, Practitioner, PractitionerRole.
- FAIL (genuine fixture-vs-IG-version gaps, not infra): Organization (missing
  `Identifier.type`), ServiceRequest imag/path + DiagnosticRequest (missing mandatory
  `ServiceRequest.extension:displaySequence` slice and `ServiceRequest.requisition`). These are
  the shared test package's own 0.1.0-era fixtures not yet satisfying AU eRequesting 1.0.1
  mandatory elements — a suite fixture issue, independent of this deployment.

Server-side prerequisites now baked into `20-fhir.yaml`: AU eRequesting installed via the
akkadakka name/version pattern (registry, no packageUrl), `enforce_referential_integrity_on_write
=false` (fixtures load standalone), and akkadakka Bug-7 R5 `dependencyExcludes` guard.

## Earlier verified result (2026-09-29, live microk8s stack)

- Step 1 (directory + HCPD IG): **pass**.
- Steps 2–6 (referral server): **6/6 pass** — "All tests passed" for create-erequest,
  submit-erequest, retrieve-erequest-and-supporting-info, update-fulfilment-status,
  monitor-fulfilment-status, patient-displays-erequest.

Note: steps 2–6 model fulfilment status directly via `ServiceRequest.status` (a documented
Sparked simplification, not the fuller AU eRequesting Task-based model) — a candidate to extend
with real Task/Appointment steps for the connectathon.
