---
marp: true
paginate: true
size: 16:9
title: FHIR for Services Kick Off
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
footer: "FHIR in Queensland Health Connectathon · 29–30 October 2026"
---

<!-- _class: lead -->
<!-- _paginate: false -->

# FHIR for Services — Kick Off

## Radiology Referral with Directory Discovery and Booking

FHIR in Queensland Health Connectathon | October 2026

Track leads: Daniel Foulkes · Joern Guy Süß · Paul Davies

---

## What we are building

An **end-to-end radiology referral** workflow. A referrer:

1. **Discovers** a suitable imaging service in the Health Connect Provider Directory (HCPD)
2. **Creates** a FHIR referral — `ServiceRequest` + `Task` with supporting information
3. **Books** an appointment against slots the imaging provider publishes

…with the referral **status tracked through a Task** until the appointment is confirmed.

> One cohesive scenario that exercises many core FHIR resources and workflow concepts.

---

## Why this scenario

- **Realistic and manageable** — relevant to Queensland Health participants
- Exercises **Provider, ServiceRequest, Task, Schedule, Slot, Appointment** in one flow
- Complements QH's existing smart-referral capabilities
- Builds on existing referral workflow prototypes and provider-directory concepts
- Broadest track draw — plan for **35–40** participants

---

## Systems and roles

| Role | Responsibility |
|------|----------------|
| **Referrer** (Placer) | Searches the directory, raises the referral, books |
| **Provider Directory** | Source of truth: organisations, services, locations, roles, endpoints (HCPD) |
| **Referral Server** | Holds ServiceRequest, Task, Schedule/Slot/Appointment (HAPI + QH IG) |
| **Imaging Provider** (Filler) | Triages referrals, publishes availability, confirms bookings |
| *Patient app (stretch)* | Lets the patient view the referral and self-book |

---

## The flow

The referrer, referral server and imaging provider (filler) interact in six steps:

| # | Step | From → To |
|---|------|-----------|
| **1** | **Search** the directory for an imaging service | Referrer → HCPD |
| **2** | **POST** referral Bundle (ServiceRequest + Task + info) | Referrer → Referral Server |
| **3** | **Poll / subscribe** for new referrals | Imaging Provider → Referral Server |
| **4** | **Publish** availability, then **search Slot** | Provider publishes · Referrer searches |
| **5** | **POST** Appointment (proposed) | Referrer → Referral Server |
| **6** | **Accept** Task, **book** Appointment, read status | Provider confirms · Referrer tracks |

> Discovery → request → triage → book → track — one continuous thread.

---

## Standards in scope

- **AU Core** — Patient, Practitioner, PractitionerRole, Organization, Condition, Observation
- **AU eRequesting** — imaging ServiceRequest, Group + fulfilment Task (baseline to align with)
- **QH FHIR Referrals IG** — QH extensions: referral category, urgency, facility identifiers *(version TBC)*
- **HCPD / Provider Directory IG** — directory resources and search *(spec pending)*
- **FHIR R4 Scheduling** — Schedule, Slot, Appointment
- *Bulk Data Access IG* — HCPD `$export` (stretch)

---

## Two streams, run in parallel

### Browser core path
- HCPD queries, referral creation and booking via a client (Postman / Bruno / test harness)
- Right for less-technical participants and anyone with locked-down laptops

### Developer deep dive (~10 people)
- Local tooling, extending the workflow, validation and state management
- Laptop permissions and prerequisites shared **before** the event

---

## Day 1 — Thursday 29 October

| Time | Focus |
|------|-------|
| 11:30–13:00 | **Kick-off & environment** — scenario intro, roles, HCPD connectivity, seed data; split streams |
| 14:00–15:00 | **Discovery** — HCPD queries; resolve the receiving Endpoint |
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
- **Every HCPD request** sends header `X-Request-ID: <UUID v4>`
- Validate against the QH IG / AU eRequesting with `$validate`
- Bring your laptop, synthetic data, and your ideas — nothing sensitive!

---

## Open decisions (before we start)

- **HCPD access** — SIT credentials & onboarding for participants
- **Directory ↔ referral server** — test Endpoints in HCPD, or a local mirror
- **Who books?** — referrer directly, or filler after triage (support both?)
- **Transport & security** — shared HAPI vs push to discovered endpoint; open vs SMART

> Tracked as GitHub issues on the `track:services` label.

---

<!-- _class: lead -->
<!-- _paginate: false -->

# Let's build it

## Questions, ideas, and let's FHIR it up

Repository: `github.com/aehrc/qh-connectathon` → `2026-10-29/1-FHIR-For-Services`
