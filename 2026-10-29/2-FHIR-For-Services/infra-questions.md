# Track 2 Infrastructure Questions

Answered by Michael Osborne, 2026-10-15.

## A. Scope and target

### A1. Which environment are we setting up now?

- (a) Re-verify or repair the existing DiSP stack (dry run)
- (b) Stand up AWS EKS (the event host)
- (c) Both: DiSP first, then EKS
- (d) Local k8s only (dev)

Default: (c)

**Answer:** (c) Both: DiSP first (dry run), then AWS EKS.

### A2. What is the deadline for a tested environment?

Event is 29–30 Oct. Load test at 40 users (issue #26), teardown (issue #28).

Default: tested and frozen by __________

**Answer:** Tested and frozen by **Mon 26 Oct 2026**.

## B. Terminology (the one external dependency)

### B1. Which tx server is TX_URL?

- (a) Public https://r4.ontoserver.csiro.au/fhir
- (b) Dion's instance
- (c) Another (specify)

Default: (a), if it serves what we need

**Answer:** (a) Public https://r4.ontoserver.csiro.au/fhir.

### B2. Does it serve everything the scenario needs?

Imaging ValueSets, SNOMED (which edition: AU?), `$expand` with filter for typeahead, `$validate-code`.
Which ValueSets exactly does the radiology-referral IG bind to?
Who confirms them: Michael (content), or I test them against the endpoint?

**Answer:** SNOMED CT-AU edition. Claude extracts the radiology-referral IG bindings and tests `$expand` (with filter) and `$validate-code` against TX_URL; Michael confirms the content.

### B3. Can that server cope with about 40 concurrent users over HTTPS?

Do we need to warn the owner or pre-test? Should the cluster have a fallback, such as a caching proxy or a second URL?

**Answer:** Pre-test only: include tx calls in the 40-user load test (#26). No caching proxy or second URL for now.

### B4. Is the CSIRO/AWS egress to that host allowed from the cluster?

Allow-listing is the only egress we need.

**Answer:** r4.ontoserver is read/write and open to the world, but may be rate limited. (Rate limiting to be checked as part of the B3 load test.)

## C. Architecture

### C1. One HAPI or two?

- (a) Two servers: referral at `/fhir`, directory at `/directory` (as committed; mirrors HCPD as a separate system)
- (b) One HAPI with a directory partition

Default: (a)

**Answer:** (a) Two servers: referral at `/fhir`, directory at `/directory`.

### C2. Open or secured (SMART)?

HCPD says OAuth is SHALL. The design runs open for teaching simplicity.

- (a) Open for everyone
- (b) Open, with a documented deviation from HCPD
- (c) Add in-cluster SMART/Keycloak for a "security" stream

Default: (b)

**Answer:** (b) Open, with a documented deviation from HCPD.

### C3. Booking in Patient-Referral (issue #32)

Does the app create Slot/Appointment, or is booking driven through the FHIR API for now? Affects: seed fixtures, smoke test, what participants can click.

**Answer:** Booking is driven through the FHIR API for now; the app does not create Slot/Appointment.

### C4. Bulk `$export` on the directory

Stretch only (needs the Bulk Export provider enabled and the HCPD `_typeFilter` conventions). In or out?

Default: out, mention as a stretch

**Answer:** **In**: enable the Bulk Export provider on the directory with the HCPD `_typeFilter` conventions.

### C5. Real HCPD as a stretch

Do we want an optional "connect to real HCPD" path (needs SIT access #8, the X-Request-ID proxy)? Or drop it?

**Answer:** Drop it.

## D. Content and seed data (Michael's area)

### D1. Seed directory

HCPD ships profiles only, with no examples. We must author the data. Only one Balmain fixture exists so far.

- How many Organizations, Locations, HealthcareServices, PractitionerRoles and Endpoints?
- Real-looking (QH-style) names, or obviously fictional?
- Who writes or reviews them: Michael, or I draft and Michael reviews?

**Answer:**

- Size: medium, ~10 Organizations, ~15 Locations, ~25 HealthcareServices, ~40 PractitionerRoles, ~25 Endpoints.
- Names: fictional but QH-flavoured (made-up services in real Queensland towns/regions).
- Authoring: Claude drafts, Michael reviews.

### D2. Sample patients and referrals

How many patients? Which referral states (draft, active, completed) should exist at start? Reset between the two event days: wipe and reseed, or keep Day 1 data?

**Answer:**

- ~20 patients.
- Referral states at start: `active` and `completed` (no drafts).
- Between days: keep Day 1 data (no wipe).

### D3. Which IG versions do we pin?

`au.gov.digitalhealth.fhir.hcpd` (v26.0.0?), AU Base/Core/PD, AU eRequesting, radiology-referral (build from `ig/`). Pin concrete versions rather than current?

Default: pin all

**Answer:** Pin all to concrete versions.

## E. Testing

### E1. Is conformance testing (fhir-frog / frog-runner) a gate or a stretch?

- (a) Gate before promotion DiSP → AWS
- (b) Stretch; `$validate` plus manual review is the gate

Default: (b)

**Answer:** (b) Stretch; `$validate` plus manual review is the gate.

### E2. Smoke test

Should I write `smoke/smoke.sh` (seed → discover → create referral → triage → book → track to Booked) and run it before each event day?

Default: yes

**Answer:** Yes: write `smoke/smoke.sh` and run it before each event day.

### E3. Do participants see the frog results?

The design says it doubles as a teaching artifact. Do we expose the frog-runner UI during the event?

**Answer:** Yes: expose the frog-runner UI as a teaching artifact.

## F. Hosting and access

### F1. Public DNS name and TLS (issue #13)

What hostname will participants use? Who owns the DNS? DiSP: `*.dw.csiro.au`. AWS: ALB + ACM.

**Answer:** Joern to decide the hostname and own DNS (DiSP `*.dw.csiro.au`; AWS ALB + ACM).

### F2. Who may apply changes to AWS and DiSP?

Default: I prepare manifests and commands; Joern applies. I only apply with explicit go-ahead.

**Answer:** Default: Claude prepares manifests and commands; Joern applies. Claude applies only with explicit go-ahead.

### F3. Capacity

Quota increase status (8 GB for experiments, 16 GB for the event). Is it approved? Does EKS sizing target 35–40 concurrent users?

**Answer:** Approval status unknown, Joern to confirm. Size EKS for 40 concurrent users.

## G. Event-day operations

### G1. Who can trigger reset/reseed, and when?

Manual only, or an overnight CronJob?

**Answer:** Manual only, triggered by Joern. No overnight CronJob (consistent with keeping Day 1 data).

### G2. Participant data

Participants will write data into a shared open server. Any rules, for example no real patient data, and a banner in the UI?

**Answer:** No real patient data, and a "test data only" banner in every UI.

### G3. Fallback if the cluster fails on the day

DiSP as the standby host? A pre-recorded demo? Nothing?

**Answer:** DiSP as the warm standby host.

### G4. Teardown (issue #28)

Delete the namespace plus the ALB/ACM/DNS the day after? Do we need any data export before teardown?

**Answer:** Leave up for up to a week after the event, export the data first, then delete the namespace plus ALB/ACM/DNS.

## H. Anything else

Notes / decisions / new issues to raise:

None.
