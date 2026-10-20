# Track 2 smoke test

`smoke.sh` drives the radiology referral story over plain HTTP and works at every stage
(compose, k8s, DiSP, AWS): only `BASE_URL` changes. Needs `bash`, `curl`, `jq`.

```bash
./smoke.sh                                   # DiSP default
BASE_URL=https://track2.example.org ./smoke.sh
./smoke.sh --no-cleanup                      # keep the tagged test resources
```

| Variable | Default | Notes |
|---|---|---|
| `BASE_URL` | `https://aehrc-qh-connectathon-track-2.dw.csiro.au` | ingress root |
| `REFERRAL_BASE` | `/fhir` | referral HAPI path |
| `DIRECTORY_BASE` | `/directory` | use `/directory/fhir` if the directory serves there |
| `DIRECTORY_URL` | (unset) | full directory FHIR base, overrides the two above (e.g. a `kubectl port-forward` to `http://localhost:28081/fhir`) |
| `TX_URL` | `https://r4.ontoserver.csiro.au/fhir` | terminology server |
| `IG_CANON` | `http://aehrc.csiro.au/fhir/radiology-referral` | profile URLs are `$IG_CANON/StructureDefinition/<id>` |

## Steps

1. TLS handshake and certificate verification (skipped for `http://`)
2. Referrer UI `GET /` is 200
3. `/fhir/metadata` and directory `metadata` are 200
4. Directory has HCPD StructureDefinitions (and `hcpd-healthcareservice`); search returns a seeded
   HealthcareService (with `_include`); `service-type` search matches SNOMED 310128004
5. Referral flow on the referral server: fixtures (Patient, 2 Organizations, Practitioner,
   PractitionerRole) -> ServiceRequest + Group Task + Referral Task (`requested`) -> triage
   (Task `accepted`) -> Schedule + free Slot -> Appointment `proposed` against the Slot -> filler
   confirms (Appointment `booked`, Slot `busy`, Task `in-progress` / `service-booked`) -> read-back
   and searches to track the state. The referral `performer` points at the first HealthcareService found
   in the directory (falls back to `hcpd-seed-hcs-1`).
6. `$validate` of ServiceRequest, Task, Schedule, Slot and Appointment against the
   radiology-referral profiles (`referral-servicerequest`, `referral-task`, `booking-schedule`,
   `booking-slot`, `referral-appointment`). If the profile is not loaded on the server this reports
   FAIL "IG package missing" rather than silently passing.
7. Terminology: `metadata`, `ValueSet/$expand` with `filter` (SNOMED imaging), `CodeSystem/$validate-code`
   (SNOMED 432370003) and `ValueSet/$validate-code` for the IG's one external binding
   (`au-erequesting-request-status`).

Output is `PASS` / `FAIL` / `SKIP` lines and a summary; exit code is 0 only if nothing failed.

## Test data and cleanup

All data is fictional. Every created resource carries the tag
`urn:qh-connectathon:smoke-test|smoke-<timestamp>-<pid>`. On exit (including after failures) the script
deletes what it created in reverse order; `--no-cleanup` skips that and lists the resource ids. If cleanup
is interrupted, find leftovers with `GET /fhir/<Type>?_tag=urn:qh-connectathon:smoke-test|<run id>`.
Nothing is written to the directory or the terminology server.

## Notes

- Resources are created without relying on the server enforcing profiles (the live HAPI accepts
  `meta.profile` claims it cannot resolve); conformance is checked only by step 6.
- Fixtures are minimal and are not validated against AU eRequesting profiles. If the IG's
  profile constraints (for example `requester` must be an `au-erequesting-practitionerrole`) tighten,
  step 6 will report them and the fixtures will need AU-conformant content.

## Use-case acceptance checks (`usecases.sh`)

`smoke.sh` proves the plumbing; `usecases.sh` proves a participant can do what Michael's two-day agenda
(`Services-Track-Two-Day-Agenda.md`) says, through the UI and the APIs: environment and seed review, directory discovery and
Endpoint resolution, browsing providers and patients in the UI (including the "Select Provider Organisation" dropdown and the
filler organisation list), IG profiles loaded, referrals waiting for triage, free slots, booked and completed referrals, and the
statistics and demographics pages. It is read-only.

```
BASE_URL=https://<host> ./usecases.sh [--frog https://<frog-host>]
```

`SKIP` means the deployed UI build does not have that screen (today: the imaging filler and booking screens, which the deployed
`patient-referral` image predates); it never means "could not check". Run it, then `smoke.sh`, after every deployment and reseed.
It would have caught the empty organisation dropdown and the empty filler list that Michael found on 2026-10-20.
