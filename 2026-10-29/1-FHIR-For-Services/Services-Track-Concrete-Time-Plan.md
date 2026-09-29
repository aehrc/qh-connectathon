# Services Track (Track 2) — Concrete Time Plan

**Event:** FHIR in Queensland Health Connectathon
**Dates:** Thursday 29 – Friday 30 October 2026
**Venue:** Telstra Health Building, 275 George St, Brisbane CBD
**Track 2 leads:** Daniel Foulkes, Joern Guy Suess, Paul Davies
**Scenario:** Radiology Referral with Directory Discovery and Booking (see `QH-Radiology-Referral-Scenario-DRAFT.md`)

**Basis:** Concrete track timings map onto the official event program
(`Program and Guide/29 - 30 October 2026 FHIR in QH Connectathon Detailed Program DRAFT.docx`, DRAFT).
Plenary and break times are fixed by the event program; Track 2 session content is planned here.
Expected attendance: ~25 baseline, plan for 35–40 (Track 2 is the broadest draw); split into a
**browser core** stream and a **developer deep-dive** stream (~10 people). Source: `Daniel Joern Guy Paul Michael O/Track2-EOI-insights.md`.

---

## Day 1 — Thursday 29 October 2026

| Time | Duration | Location | Session | Track 2 content |
|------|----------|----------|---------|-----------------|
| 8:30–9:00 | 30 min | — | Registration | Arrive, laptop/wifi check for early Track 2 attendees |
| 9:00–9:20 | 20 min | Main Room | Welcome & Introduction (plenary) | — |
| 9:20–9:35 | 15 min | Main Room | QH Landscape / FHIR Strategy (plenary) | — |
| 9:35–10:30 | 55 min | Main Room | "Spot FHIRs!" showcases (plenary) | — |
| 10:30–11:00 | 30 min | Main Room | Overview of Tracks — "Which room to Track to?" | Track 2 pitch: radiology referral scenario headline |
| 11:00–11:30 | 30 min | — | **Morning Tea** | Move to Track 2 room |
| 11:30–13:00 | 90 min | Track 2 Room | **Tracks Kick Off!** | **Kick-off & environment**: scenario intro, roles (Referrer/Directory/Referral Server/Filler), HCPD connectivity (X-Request-ID, auth, paging), seed-data review. Split streams: browser core vs developer deep-dive. |
| 13:00–14:00 | 60 min | — | **Lunch** | — |
| 14:00–15:00 | 60 min | Track 2 Room | Track session | **Track A — Discovery**: HCPD discovery queries (HealthcareService/Location/Organization/PractitionerRole/Endpoint); resolve receiving Endpoint. |
| 15:00–15:30 | 30 min | — | **Afternoon Tea** | — |
| 15:30–17:00 | 90 min | Track 2 Room | Track session | **Referral creation**: build the ServiceRequest + Task + supporting-info transaction Bundle; validate on HAPI (`$validate`) against QH IG / AU eRequesting. |
| 17:00 | — | Track 2 Room | Day 1 wrap-up (by Track Leads) | Day 1 issues log; IG feedback capture. |

## Day 2 — Friday 30 October 2026

| Time | Duration | Location | Session | Track 2 content |
|------|----------|----------|---------|-----------------|
| 8:30–9:00 | 30 min | — | Registration | — |
| 9:00–9:30 | 30 min | Main Room | Track lead recap & progress check-in (plenary) | Track 2 lead reports Day 1 progress |
| 9:30–10:30 | 60 min | Track 2 Room | Track session | **Filler triage & availability**: accept / reject / on-hold with coded reason; publish Schedule + free Slots. |
| 10:30–11:00 | 30 min | — | **Morning Tea** | — |
| 11:00–12:30 | 90 min | Track 2 Room | Track session | **Track B — Booking**: create Appointment against a free Slot; confirm; cancel & rebook; negative tests (taken slot). |
| 12:30–13:30 | 60 min | — | **Lunch** | — |
| 13:30–15:00 | 90 min | Track 2 Room | Track session | **Status tracking end-to-end** + stretch tracks (Subscriptions, patient app, `$export`, DiagnosticReport/report return). |
| 15:00–15:30 | 30 min | — | **Afternoon Tea** | Prepare Show-and-Tell demo |
| 15:30–16:30 | 60 min | Main Room | **Show and Tell!** (all tracks) + wrap-up | Track 2 demo: full referral flow (discover → request → triage → book → track); findings report; IG change requests. |
| 16:30 | — | Main Room | Closing Remarks (plenary) | — |

---

## Track 2 session budget (hands-on time)

| | Day 1 | Day 2 | Total |
|---|-------|-------|-------|
| Kick-off / environment | 90 min | — | 90 min |
| Discovery (Track A) | 60 min | — | 60 min |
| Referral creation | 90 min | — | 90 min |
| Filler triage & availability | — | 60 min | 60 min |
| Booking (Track B) | — | 90 min | 90 min |
| Tracking + stretch | — | 90 min | 90 min |
| **Hands-on total** | **240 min (4 h)** | **240 min (4 h)** | **480 min (8 h)** |

Plus plenary/recap, breaks, and the Show-and-Tell demo slot.

---

## Integration with the event program

The Track 2 scenario is sequenced to fit the six working blocks the official program
allocates to tracks. Three integration points shape how well it runs:

1. **The 10:30–11:00 "Overview of Tracks / Which room to Track to?" plenary is the recruitment
   moment.** EOI data shows Track 2 is the broadest draw (53 of 71 rank it 1st or 2nd) and it
   absorbs overflow, so the radiology-referral pitch here sets attendance. There is a natural
   thread from the 9:35 "Spot FHIRs!" CHQ showcase (Joern Guy) into the track.
2. **The two-stream split (browser core + developer deep-dive, ~10 people) must start in the very
   first block.** The 11:30–13:00 kick-off is only 90 minutes and must cover scenario intro,
   environment setup, and the stream split. To protect it, push environment prerequisites
   (laptop permissions, HCPD auth, tooling) into pre-event comms so the kick-off is not consumed
   by setup troubleshooting.
3. **Day 2 has no dedicated demo-prep time except the 15:00–15:30 afternoon tea.** Track 2 should
   freeze scope by ~14:30 on Day 2 so there is a working end-to-end flow to present in the
   15:30–16:30 "Show and Tell!". The scenario's end-to-end demo *is* the Show-and-Tell content.

## Notes & dependencies

- **Room:** track sessions run in an "Individual Track Room"; specific room numbers are not yet given in the event program (TBC).
- **Environments (from 2025 program, confirm for 2026):** Secured FHIR server `https://gw.interop.community/QHConnectathon2025/data`; Open `https://gw.interop.community/QHConnectathon2025/open`.
- **Pre-event decisions** that affect the plan are tracked in the scenario proposal Section 8 (QH referrals IG version, HCPD access/credentials, directory→referral-server linkage, who books, transport, security, terminology).
- **Streaming:** run the browser core path and developer deep-dive in parallel within each session; share developer prerequisites via pre-event comms.
- This plan follows a **DRAFT** event program — adjust if the official program times change.
