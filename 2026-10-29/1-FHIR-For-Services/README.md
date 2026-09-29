# Track 2 — FHIR for Services

**Provider Directory & Workflow · FHIR in Queensland Health Connectathon · 29–30 October 2026**

This track focuses on interoperability services and integration patterns — how FHIR-based
services are discovered, requested, coordinated and tracked across systems.

Example topics:

* Provider Directory
* FHIR Workflow
* Service discovery
* Cross-system integration

## Flagship scenario

**Radiology Referral with Directory Discovery and Booking.** An end-to-end workflow where a
referrer discovers a suitable imaging service in the Health Connect Provider Directory (HCPD),
raises a FHIR referral (ServiceRequest + Task with supporting information), and books an
appointment against slots the imaging provider publishes — with the referral status tracked
through a Task until the appointment is confirmed.

The scenario exercises AU Core, AU eRequesting, the QH referrals IG, HCPD/provider-directory
search, and FHIR R4 scheduling (Schedule/Slot/Appointment), split into a **browser core** path
and a **developer deep-dive** stream.

## Track leads

Daniel Foulkes (AEHRC) · Joern Guy Suess (AEHRC) · Paul Davies (QH)

## Contents

| Document | Purpose |
|----------|---------|
| [`QH-Radiology-Referral-Scenario-DRAFT.md`](QH-Radiology-Referral-Scenario-DRAFT.md) | The flagship scenario proposal: systems, roles, standards, workflow steps, test cases, and open decisions. |
| [`Services-Track-Concrete-Time-Plan.md`](Services-Track-Concrete-Time-Plan.md) | Concrete two-day time plan mapping the scenario onto the official event program, with a session budget and integration notes. |
| [`Services-Track-Two-Day-Agenda.md`](Services-Track-Two-Day-Agenda.md) | The block-level two-day agenda (AM / Mid / PM / Close) extracted from the scenario proposal. |
| [`2026-09-28-Services-Track-Discussion-Recap.md`](2026-09-28-Services-Track-Discussion-Recap.md) | Recap, decisions, action items and ideas from the 28 Sep 2026 planning meeting. |
| [`Track2-KickOff-Deck.md`](Track2-KickOff-Deck.md) / `.pptx` | Kick-off slide deck (Marp source + rendered editable PowerPoint). |
| [`slides/`](slides/) | Slide build: `Makefile`, PlantUML diagram sources, and build output. |
| `Daniel Joern Guy Paul Michael O/` | Working materials: EOI insights, early thoughts, meeting notes, and the external-service-access investigation. |

## Building the slides

The kick-off deck is authored in [Marp](https://marp.app/) Markdown with PlantUML-rendered
diagrams. Build it from the `slides/` directory:

```bash
cd slides
make            # render diagrams + build the editable PPTX
make preview    # per-slide PNG previews in build/preview/
make pdf        # PDF export
make help       # list targets
```

Requires `marp`, `plantuml` (+ Java, Graphviz), Chromium, and LibreOffice — all present on the
CSIRO dev image. Edit `Track2-KickOff-Deck.md` (and the `slides/diagrams/*.puml`) and re-run `make`.

## Event schedule (Track 2 blocks)

Times are fixed by the official event program (DRAFT); Track 2 content fills the track sessions.

**Day 1 — Thu 29 Oct:** kick-off & environment (11:30–13:00) → discovery (14:00–15:00) →
referral creation (15:30–17:00).

**Day 2 — Fri 30 Oct:** filler triage & availability (9:30–10:30) → booking (11:00–12:30) →
status tracking + stretch (13:30–15:00) → Show and Tell demo (15:30–16:30).

See the concrete time plan for the full mapping including plenaries and breaks.

## Status & how to contribute

Work is tracked via [GitHub issues](https://github.com/aehrc/qh-connectathon/issues):

* **Planning tasks** (#1–#3) — scenario review, group feedback, stakeholder engagement.
* **Pre-event dependencies** (#8–#11) — HCPD access, directory↔referral-server linkage,
  QH referrals IG version, and 2026 FHIR server URLs. These must resolve before 29 Oct or the
  corresponding schedule blocks cannot run.

Draft content lives here in the repository; SharePoint is used for broader checkpoints and
visibility. Contributions and review via pull request and issues are welcome.
