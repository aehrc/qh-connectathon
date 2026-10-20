# Track 2 "FHIR for Services": test report

Status as of 2026-10-21. Covers the three deployments of the Track 2 stack and what has, and has not, been tested on each.
How the stack is built is in [DEPLOYMENT.md](DEPLOYMENT.md); the test tools are in `smoke/`, `loadtest/` and `frog-tests/`.

## 1. Addresses

| What | AWS (EKS, from 2026-10-21) | DiSP live (CSIRO network only) |
|---|---|---|
| Patient-Referral UI | https://track2.efiq.hospservices.net/ | https://aehrc-qh-connectathon-track-2.dw.csiro.au/ |
| Referral FHIR server (R4) | https://track2.efiq.hospservices.net/referral/fhir | https://aehrc-qh-connectathon-track-2.dw.csiro.au/referral/fhir |
| Provider directory FHIR server (R4) | https://track2.efiq.hospservices.net/directory/fhir | https://aehrc-qh-connectathon-track-2.dw.csiro.au/directory/fhir |
| Conformance runner (frog-runner) | https://track2-frog.efiq.hospservices.net/ | https://frog-aehrc-qh-connectathon-track-2.dw.csiro.au/ |
| Caret (RIS HL7v2 tutorial, separate) | https://caret.efiq.hospservices.net/ | n/a |

A DiSP scratch copy (`qh-fhir-test.dw.csiro.au`) exists for rehearsing changes. The AWS stack is torn down on or after 2026-11-06.
All data is fictional; the UI shows a "test data only" banner.

## 2. What is deployed

| Component | Version / source | Where pinned |
|---|---|---|
| Patient-Referral UI | v1.0.0, commit `53eca0d` (Michael Osborne), image `joernguysuess/patient-referral:1.0.0-53eca0d` | digest `sha256:2a1d0ad7…` in the `disp` and `efiq` overlays; `/version` reports it |
| HAPI FHIR servers (2) | `hapiproject/hapi` | digest in `20-fhir.yaml` |
| Implementation guides | AU eRequesting, radiology-referral, HCPD (provider directory) | raw GitHub URLs at commit SHAs, `deploy/IG-PINNING.md` |
| Seed data | 20 patients, 22 referrals, 45 tasks, 9 appointments, 219 slots, 14 schedules; directory of 174 resources (31 services) | `deploy/seed/`, loaded by scripts |
| frog-runner | fhirfrog image, bundles from this repo at a pinned commit | `60-frog.yaml` |

## 3. Results

### 3.1 Automated suites (run against each stack after deployment)

| Suite | What it checks | AWS | DiSP live | DiSP scratch |
|---|---|---|---|---|
| `smoke.sh` | 28 checks (29 with the bulk `$export` step, DiSP only so far): TLS and metadata on both servers, IG profiles and HCPD structure definitions loaded, directory search by service type (SNOMED 310128004) with `_include`, create a referral (ServiceRequest + Task), `$validate` against the AU eRequesting profiles (0 errors), publish availability (Schedule, free Slot), book (Appointment against Slot), filler finds the Task and confirms the booking, tracking (Appointment search, Slot busy); cleans up what it creates | 28/28 PASS | 28/28 PASS | 28/28 PASS |
| `usecases.sh` | The agenda use cases through the UI and the API (39 checks on AWS): environment banner and `/version`; browsing the directory; UI patient list, search, detail and demographics; provider search; "Select Provider Organisation" (imaging) list; reason-for-request typeahead (terminology server); referral listing; filler triage by owner and organisation list; imaging filler screen; booking panel and slot picker offering free slots; booked appointments; statistics; directory Endpoint resolution pointing at this stack; frog-runner reachable | 39/39 PASS | 38/38 PASS (before the AWS-only frog check) | 38/38 PASS |
| frog-runner, directory bundle (`scenario1/step1`, HealthcareService by city) | HCPD search on the directory | 1/1 PASS | 1/1 PASS | not run (runner off to save quota) |
| frog-runner, referral bundle (`scenario1-referral`, steps 2 to 6) | create/submit eRequest, retrieve, update fulfilment, monitor, patient view; validated against `hl7.fhir.au.ereq#1.0.1` 6/6 PASS (2026-10-21; fixtures cleaned up afterwards) | 6/6 PASS | 6/6 PASS (2026-10-19) |

### 3.2 Load test (`loadtest/`, 40 virtual users, 8 minutes, about 12 requests/s, browser-style and API-style mix)

Run on DiSP live (run 4, 2026-10-20): 5,740 requests, 0 errors; UI p95 1.89 s (provider search is the slow call, median 1.55 s), FHIR read p95 0.14 s,
write p95 0.07 s, `$validate` p95 0.18 s; referral HAPI peaked at 0.90 CPU. Criteria (error rate < 1 %, UI p95 < 2 s, read p95 < 1.5 s, write p95 < 2 s) all met.
Earlier runs found and fixed a heap setting that HAPI was ignoring (`JAVA_OPTS` vs `JAVA_TOOL_OPTIONS`); see `loadtest/README.md`.
Run on AWS (run 5, 2026-10-21): 5,853 requests, 0 errors; UI p95 1.84 s (provider search p95 2.00 s, right at the limit), FHIR read p95 0.07 s, write p95 0.04 s. All criteria met. No per-pod CPU figures were taken on AWS.

### 3.3 Defects found and fixed while testing

| Found | Fix |
|---|---|
| HAPI out of memory under load | `JAVA_TOOL_OPTIONS` heap, higher limits |
| Background ValueSet pre-expansion pinned CPU | disabled; 20 KB v2-0203 extract instead of the full terminology package |
| UI `/fhir/*` route collided with HAPI; UI silently used a public Aidbox | referral HAPI moved to `/referral/fhir`; the UI reads `FHIR_SERVER_URL` |
| Scratch and live pods shared labels, so traffic and the database split | distinct `app=scratch-*` labels |
| Filler organisation list empty | `Task.owner` carries a literal Organization reference |
| Michael's new booking and imaging screens (v1.0.0) found no slots | seeded Locations and HealthcareServices per imaging provider on the referral server, literal `Schedule.actor` references, more free-slot days |
| AWS: Postgres crash loop on EBS (`lost+found`) | `PGDATA` subdirectory in the efiq overlay only |
| AWS: ALB would not build (frog and Track 2 ingresses set different idle timeouts in one IngressGroup) | both 300 s |
| AWS: no DNS records (external-dns started before its Pod Identity association existed) | external-dns restarted; a clean bring-up needs the same until `up.sh` is fixed |

### 3.4 Not tested, or tested only partly

- **A person using it in a browser on AWS.** All AWS checks went through scripts. Nobody has clicked through the screens on the AWS hostnames yet.
- **Caret** was only checked to return HTTP 200 with a valid certificate.
- **Slot picker window:** the UI searches 14 days ahead. Free slots run 4 to 10 Nov, so on 29/30 Oct the picker shows slots, but the seed would need extending for any test after about 26 Nov. Loading the seed again re-creates them.
- **Seed re-load resets** seeded resources that participants have edited; it never deletes participant-created data.
- **SNOMED `432370003`** is not in the bound ValueSet (known, left as is).
- **First `$validate` after a restart** can return a 504; run smoke once to warm the servers before participants arrive.
- **Bulk `$export`** on the directory is enabled (issue #38) and checked by `smoke.sh` on DiSP; AWS gets it when Flux picks up the commit.
- **Provider search** is the slowest UI call (about 1.6 s median under load) and sits near the 2 s criterion.
- The AWS data lives on an EBS volume with no backup; export anything worth keeping before the teardown.
- **Terminology** calls (typeahead, `$validate`) use the shared public `r4.ontoserver.csiro.au`, which we do not control.

## 4. Reaching the AWS hosts from inside the CSIRO network

`hospservices.net` is a newly registered domain, and the web filter may categorise such domains as "uncategorised" or block them. Options, in order of effort:
request recategorisation of `hospservices.net` with IMT (most likely to help Michael and the participants); use a phone on mobile data to check; or use an SSH SOCKS tunnel
(`ssh -D 1080 <host outside the filter>`, browser pointed at it) or `kubectl port-forward` to the services for a developer-only view.
