# Quota increase request — Track 2 connectathon host VM

**VM:** `aehrc-qh-connectathon-track-2.it.csiro.au`
**Requested by:** Joern Guy Süß (sue005), on behalf of the FHIR in QH Connectathon Track 2 team
**Event:** FHIR in Queensland Health Connectathon, 29–30 October 2026 (Telstra Health, Brisbane)

## Summary

We are standing up the **FHIR for Services (Track 2)** scenario environment for the connectathon
and need a memory (and vCPU) quota increase on the experiment/host VM. The VM is currently
**~2 GB RAM / 2 vCPU**, which is too small to run the FHIR server stack — HAPI FHIR alone needs
~2 GB of JVM heap for Implementation Guide loading and validation, exhausting available memory
before the app is usable.

## What the environment runs

The Track 2 scenario is an **end-to-end radiology referral** (directory discovery → referral
creation → triage → booking → status tracking). The self-contained stack is:

| Component | Purpose | Approx. footprint |
|-----------|---------|-------------------|
| Referral FHIR server | HAPI FHIR + `radiology-referral` IG (ServiceRequest, Task, Schedule, Slot, Appointment; `$validate`) | ~3 GB (2 GB heap + overhead) |
| Directory FHIR server | HAPI FHIR + HCA Provider Directory (HCPD) IG — stands in for the provider directory | ~3 GB (2 GB heap + overhead) |
| Postgres | Shared persistence for the FHIR servers | ~1 GB |
| Referrer app | Patient-Referral (Python/Flask) — the browser client | ~0.5 GB |
| OS + container runtime + headroom | Base + concurrent-user headroom | ~2–2.5 GB |

Terminology is **external** (a shared Ontoserver via `TX_URL`), so no terminology server runs on
this VM — this deliberately keeps the footprint down.

## Load expectation

Track 2 is the broadest-draw track (EOI data: 53 of 71 participants rank it 1st or 2nd). We are
sizing for **35–40 concurrent users** across a browser-core path and a developer deep-dive stream,
over the two event days, plus a dry run beforehand.

## Requested sizing

| Scenario | RAM | vCPU | Rationale |
|----------|-----|------|-----------|
| **Experiment only** (validate HAPI + HCPD/radiology-referral IG loading, single-user smoke tests) | **8 GB (8192 MB)** | 2–4 | One HAPI + Postgres with real headroom; no swap thrashing |
| **Event host** (full stack, 35–40 concurrent users) — *recommended, sizes once* | **16 GB (16384 MB)** | 4 | Both HAPI servers + Postgres + referrer + concurrent-user headroom |

**Recommendation:** provision **16 GB / 4 vCPU** so we don't resize twice — this VM is intended
to serve both the build-up experiments and (a candidate for) the event itself. Disk is adequate
(~21 GB free; FHIR images and IG packages are small — a few hundred MB).

## Duration

Needed from now through the event and a short post-event follow-up window; the environment is
torn down afterwards (tracked in the Track 2 teardown task). This is a **time-boxed** need, not
an ongoing allocation.

## Impact if not increased

At ~2 GB the FHIR servers cannot load their Implementation Guides or run validation, blocking the
entire Track 2 build-up (environment prep, dry run, and the event itself).
