# QH Connectathon — Services Track Two-Day Agenda

**Scenario:** Radiology Referral with Directory Discovery and Booking
**Duration:** 2 days
**Author:** Michael Osborne (CSIRO AEHRC)
**Status:** Draft for discussion
**Source:** Extracted from `QH-Radiology-Referral-Scenario-DRAFT.md` (Section 6, "Two-day agenda").

---

## Agenda at a glance

| Session | Day 1 — Discover & Request | Day 2 — Book & Track |
|---------|----------------------------|----------------------|
| **AM**  | Kick-off, environment check, Qld Health Provider Directory on FHIR | Filler triage (accept, reject, on-hold); Schedule/Slot publishing |
| **Mid** | **Track A:** Qld Health Provider Directory on FHIR discovery queries | **Track B:** Appointment booking, confirm, cancel, rebook |
| **PM**  | Referral Bundle creation; validation against QH IG / AU eRequesting on HAPI (`$validate`) | Status tracking end to end; stretch tracks (Subscriptions, patient app, `$export`, report return) |
| **Close** | Day 1 issues log; IG feedback capture | Demo of the full flow; findings report; IG change requests |

---

## Day 1 — Discover & Request

- **AM — Kick-off & environment**
  - Kick-off and orientation.
  - Environment check and Qld Health Provider Directory on FHIR. 
  - Seed data review.
- **Mid — Track A: Discovery**
  - Qld Health Provider Directory on FHIR discovery queries (HealthcareService, Location, Organization, PractitionerRole, Endpoint).
  - Resolve the Endpoint that identifies the receiving referral server.
- **PM — Referral creation**
  - Referral Bundle creation (ServiceRequest + Task + supporting info).
  - Validation against the QH IG / AU eRequesting on HAPI via `$validate`.
- **Close**
  - Day 1 issues log.
  - IG feedback capture.

## Day 2 — Book & Track

- **AM — Filler triage & availability**
  - Filler triage: accept, reject, on-hold (with coded reason).
  - Schedule/Slot publishing.
- **Mid — Track B: Booking**
  - Appointment booking, confirm, cancel, rebook.
- **PM — Tracking & stretch**
  - Status tracking end to end.
  - Stretch tracks: Subscriptions, patient app, `$export`, report return.
- **Close**
  - Demo of the full flow.
  - Findings report.
  - IG change requests.

---
