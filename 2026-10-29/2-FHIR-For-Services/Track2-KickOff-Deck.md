---
marp: true
paginate: true
size: 16:9
title: FHIR for Services — Track 2A
author: Track 2 — FHIR for Services
style: |
  :root {
    --csiro-teal: #00A9CE;
    --csiro-navy: #001D34;
    --csiro-grey: #757579;
    --csiro-indigo: #1E22AA;
    --csiro-green: #007A53;
  }
  section {
    font-family: Calibri, "Segoe UI", sans-serif;
    font-size: 26px;
    color: var(--csiro-navy);
    background: #FFFFFF;
    padding: 50px 70px;
    justify-content: flex-start;
  }
  h1 { color: var(--csiro-navy); font-size: 46px; }
  h2 { color: var(--csiro-teal); font-size: 34px; border-bottom: 3px solid var(--csiro-teal); padding-bottom: 6px; }
  h3 { color: var(--csiro-indigo); font-size: 28px; }
  a { color: var(--csiro-teal); }
  strong { color: var(--csiro-indigo); }
  table { font-size: 22px; }
  th { background: var(--csiro-navy); color: #FFFFFF; }
  code { color: var(--csiro-green); background: #F2F7F9; }
  section.lead {
    background: var(--csiro-navy);
    color: #FFFFFF;
    justify-content: center;
    text-align: left;
  }
  section.lead h1 { color: #FFFFFF; font-size: 54px; }
  section.lead h2 { color: var(--csiro-teal); border: none; font-size: 30px; }
  section.lead p { color: #C7D0D6; font-size: 24px; }
  footer { color: var(--csiro-grey); font-size: 16px; }
  section.split {
    display: grid;
    grid-template-columns: 55% 1fr;
    grid-template-rows: auto 1fr;
    column-gap: 40px;
    align-content: start;
  }
  section.split > h2 { grid-column: 1 / -1; }
  section.split > p:has(img) { grid-column: 1; grid-row: 2; margin: 0; }
  section.split > p:has(img) img { max-width: 100%; }
  section.split > ul { grid-column: 2; grid-row: 2; font-size: 23px; margin: 0; align-self: center; }
  section.split > ul li { margin-bottom: 10px; }
  section.split > ul code { white-space: nowrap; }
footer: "FHIR in Queensland Health Connectathon · 29–30 October 2026"
---

<!-- _class: lead -->
<!-- _paginate: false -->

# FHIR for Services — Track 2A

## 2A: Provider Directory and Workflow Services

FHIR in Queensland Health Connectathon | October 2026

Track leads: Daniel Foulkes · Joern Guy Süß · Michael Osborne

---

## 2A: Provider Directory and Workflow Services

Led by Michael Osborne, this stream focuses on **referral and workflow orchestration patterns using FHIR services**. Activities may include:

- Discovering services using an example `Qld Health Provider Directory on FHIR`
- Creating and managing ServiceRequests, Task and Appointment using a Patient Referrals demo app 
- Exploring FHIR referral workflows and provider discovery 
- Developing FHIR profiles and implementation guide content to support workflow interoperability
- Testing end-to-end workflow scenarios using real-world Queensland Health use cases

---

## What we are building

An **end-to-end radiology referral** workflow. A referrer:

1. **Discovers** a suitable imaging service in our demo of `Qld Health Provider Directory on FHIR`
2. **Creates** a FHIR referral — `ServiceRequest` + `Task` with supporting information
3. **Books** an appointment against slots the imaging provider publishes

…with the referral **status tracked through a Task** until the appointment is confirmed.

> Learn core FHIR resources and workflow concepts.

---

## Why this scenario

- **Realistic and manageable** — relevant to Queensland Health participants
- Exercises **Patient, Provider, ServiceRequest, Task, Schedule, Slot, Appointment** in one flow
- Complements QH's existing smart-referral capabilities
- Builds on existing HL7 AU eRequesting workflow prototypes and provider-directory concepts
- Broadest track draw — plan for **35–40** participants

---

<!-- _class: split -->

## Systems and roles

![h:500](slides/diagrams/architecture.svg)

- **Referrer** — Patient-Referral at `patient-referral.efiq.org`: the browser-core path for discover → refer → track
- **Directory** — Qld Health Provider Directory on FHIR at `qhpd.efiq.org`
- **Referral Server** — HAPI + QH IG at `qhreferral.efiq.org`
- **Filler / RIS** — imaging provider at `ris.efiq.org`
- **Terminology** — shared Ontoserver at `tx.efiq.org`, used by every server and app for `$expand` / `$validate-code`

---

## The flow — 1. Discover & request

![h:430 center](slides/diagrams/flow-1-discover-request.svg)

Search the directory → raise the referral (ServiceRequest + Task) → filler triages.

---

## The flow — 2. Track this request & book

![h:430 center](slides/diagrams/flow-2-track-book.svg)

Monitor **this referral's Task** to know when it has been acted on, then book.

---

## Tracking: poll vs subscribe

![h:400 center](slides/diagrams/flow-poll-vs-subscribe.svg)

**Baseline:** poll the Task for this request. **Stretch:** a FHIR Subscription
(R4 rest-hook) pushes a notification on change — no polling.

---

## The flow — 3. Confirm & complete

![h:400 center](slides/diagrams/flow-3-confirm-complete.svg)

Track status through to **Booked**; report return closes the Task (stretch).

---

## Standards in scope

- **AU Core** — Patient, Practitioner, PractitionerRole, Organization, Condition, Observation
- **AU eRequesting** — imaging ServiceRequest, Group + fulfilment Task (baseline to align with)
- **QH FHIR Referrals IG** — QH extensions: referral category, urgency, facility identifiers *(version TBC)*
- **ADHA Provider Directory IG** — directory resources and search *(spec pending)*
- **FHIR R4 Scheduling** — Schedule, Slot, Appointment
- *Bulk Data Access IG* — Qld Health Provider Directory on FHIR `$export` (stretch)

> Profiles for this scenario: the **Radiology Referral and Booking IG** — `github.com/aehrc/radiology-referral` (builds on AU eRequesting 1.0.1).

---

## Two streams, run in parallel

### Browser core path
- Qld Health Provider Directory on FHIR queries, referral creation and booking via a client (Postman / Bruno / test harness)
- Right for less-technical participants and anyone with locked-down laptops

### Developer deep dive (~10 people)
- Local tooling, extending the workflow, validation and state management
- Laptop permissions and prerequisites shared **before** the event

---

## Day 1 — Thursday 29 October

| Time | Focus |
|------|-------|
| 11:30–13:00 | **Kick-off & environment** — scenario intro, roles, Qld Health Provider Directory on FHIR connectivity, seed data; split streams |
| 14:00–15:00 | **Discovery** — Qld Health Provider Directory on FHIR queries; resolve the receiving Endpoint |
| 15:30–17:00 | **Referral creation** — ServiceRequest + Task Bundle; `$validate` on HAPI |

*(Plenaries 9:00–10:30, morning tea 11:00, lunch 13:00, afternoon tea 15:00.)*

---

## Day 2 — Friday 30 October

| Time | Focus |
|------|-------|
| 9:30–10:30 | **Filler triage & availability** — accept / reject / on-hold; publish Slots |
| 11:00–12:30 | **Booking** — Appointment, confirm, cancel & rebook, negative tests |
| 13:30–15:00 | **Status tracking** end-to-end + stretch goals |
| 15:30–16:30 | **Show and Tell!** — demo the full flow |

*(Recap 9:00, morning tea 10:30, lunch 12:30, afternoon tea 15:00, close 16:30.)*

---

## Getting started

- **Servers** *(confirm 2026 URLs)* — secured & open FHIR endpoints on the shared HAPI server
- **Every Qld Health Provider Directory on FHIR request** sends header `X-Request-ID: <UUID v4>`
- Validate against the QH IG / AU eRequesting with `$validate`
- Bring your laptop, synthetic data, and your ideas — nothing sensitive!

---

## Open decisions (before we start)

- **Qld Health Provider Directory on FHIR access** — SIT credentials & onboarding for participants
- **Directory ↔ referral server** — test Endpoints in the Qld Health Provider Directory on FHIR, or a local mirror
- **Who books?** — referrer directly, or filler after triage (support both?)
- **Transport & security** — shared HAPI vs push to discovered endpoint; open vs SMART

> Tracked as GitHub issues on the `track:services` label.

---

<!-- _class: lead -->
<!-- _paginate: false -->

# Let's build it

## Questions, ideas, and let's FHIR it up

Repository: `github.com/aehrc/qh-connectathon` → `2026-10-29/2-FHIR-For-Services`

IG: `github.com/aehrc/radiology-referral`

Referrer app: `patient-referral.efiq.org`

Servers: directory `qhpd.efiq.org` · referral `qhreferral.efiq.org` · RIS `ris.efiq.org` · terminology `tx.efiq.org`
