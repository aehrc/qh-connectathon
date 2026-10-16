---
marp: true
paginate: true
size: 16:9
title: FHIR for Services — Track 2A
author: Jörn Guy Süß (AEHRC) · Track 2
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
  section.split > ul { grid-column: 2; grid-row: 2; font-size: 18px; margin: 0; align-self: center; }
  section.split > ul li { margin-bottom: 8px; }
  section.split > ul code { white-space: nowrap; font-size: 16px; }
footer: "FHIR in Queensland Health Connectathon · 29–30 October 2026"
---

<!-- _class: lead -->
<!-- _paginate: false -->

# FHIR services for architects

## What do I need, what exists, and how does it fit?

Jörn Guy Süß · AEHRC, CSIRO
Track 2: FHIR for Services · Architecture breakout

---

## The architect's four questions

1. **Find.** Who offers what, and which codes do we agree on?
2. **Do.** How is work requested, tracked and scheduled?
3. **Connect.** How does the legacy estate join in?
4. **Prove.** How do I know it works?

And for each one: *what is there to reuse, what is mine to build, and where do I look?*

---

## Four families of service

![h:300 center](slides/diagrams/services-families.svg)

Each family has a few ready-made services. We look at what is in each, and what it takes to use it.

---

## Three levels of effort

![h:380 center](slides/diagrams/effort-levels.svg)

The colour follows the effort: the darker, the more custom work. Most of an architecture is levels 1 and 2.

---

## Six services across the four families

![h:380 center](slides/diagrams/services-map.svg)

Pale services are configuration, mid-tone ones need an IG, the dark one needs a little code.

---

## How they combine (illustrative)

![h:380 center](slides/diagrams/services-architecture.svg)

Illustrative: the two demo stacks (Track 2A and Caret) are separate and share no infrastructure or data.

---

## Worked example: Caret

**Stock:** HAPI server, validator, mapping engine, storage, Postgres.

**Ours:** a small plugin (listener 155 lines, parser 68) and maps of 45 to 105 lines each.

Apache-2.0. Synthetic data.

<!--
Caret is a hands-on tutorial: send a real HL7 v2 message over MLLP, watch a real FHIR server turn it into FHIR resources, then read the map that did it. A small sender stands in for the RIS. Maps are written in FHIR Mapping Language. Message types: ADT A04 and A08, ORM O01, ORU R01, MDM T02, OMI O23. Source: gitlab.com/jgsuess-csiro/ris-hl7v2-tutorial.
-->

---

## Limits of Caret

- Reference, not a product: five message types, no authentication or TLS, one fictional hospital.
- Two defects fixed in the plugin: unescaped "^" gave AE with no audit record; contained Observation showed an object name.
- Failures now get a rejected acknowledgement and AuditEvent.

<!--
Building Caret exposed two real faults, both fixed in the plugin (merged). An unescaped caret in a text report made the server answer AE with no audit record. A contained Observation showed an object name instead of the report text. Failed messages now get a rejected acknowledgement with a reason and an AuditEvent. Production needs authentication, TLS, more message types and monitoring; Layer 6 of the tutorial lists what. The lesson: a reader of a map can find and fix this kind of fault.
-->

---

## Which pattern answers which question

| Question | Pattern |
|---|---|
| Who offers this service, and where? | Naming and Trading Service |
| How do I request work and track it? | Asynchronous Invocation |
| How do I tell others something changed? | Event Observer, Broker |
| How does the legacy system join in? | Legacy Adapter |
| Do we mean the same codes? | PL-09, PL-10 |
| How do I know it works? | PL-15, PL-17 |

Source: fhirpatterns.net

<!--
fhirpatterns.net publishes three pattern languages: FHIR Implementation Patterns, FHIR Authoring Patterns and IG Authoring Patterns. This table is the mapping used in this deck. Other implementation patterns on the site include Capability Facade and Imaging Bridge.
-->

---

## Experiments: akkadakka

- Wiki, snippets and tutorial trail for the HAPI FHIR JPA Starter.
- Configuration and reuse; no HAPI code held.
- More than a dozen snippets. Not yet covered: terminology, directory, legacy adapter.
- "Activate IPS" leads to the AU Patient Summary plugin.
- gitlab.com/australian-e-health-research-centre/akkadakka

<!--
The snippets are GitLab snippets. Each has a stock hapiproject/hapi container, an application.yaml, seed and example scripts, and a README. PSGC (geographic codes) and Duke UCUM (units) are worked examples of custom terminology plugins. The akkadakka.dev website is coming.
-->

---

## Conformance checks

- Two layers: HAPI $validate for resources, fhir-frog for conformance test scripts.
- frog-runner is public (early trial): gitlab.com/fhirfrog/frog-runner
- Track 2 repo: directory bundle and referral bundle recorded as passing (referral 6 of 6).
- akkadakka: validator snippets. Patterns: PL-15, PL-17.

<!--
Two layers: HAPI $validate for resources, then fhir-frog test scripts. frog-runner describes itself as an early trial. Track 2 bundles are recorded as passing. Validator Gate in CI is PL-15. TestScript / Inferno / Touchstone Alignment is PL-17.
-->

---

## Where to look

| Topic | Advice | Try it | Run it |
|---|---|---|---|
| Terminology | [PL-09](https://fhirpatterns.net/fhir-authoring-patterns/patterns/pl-09/), PL-10 | gap | [Ontoserver](https://r4.ontoserver.csiro.au) |
| Directory | [Naming and Trading](https://fhirpatterns.net/fhir-implementation-patterns/patterns/naming-trading/) | gap | [repo](https://github.com/aehrc/qh-connectathon/tree/main/2026-10-29/2-FHIR-For-Services/deploy) |
| Referral and booking | [Async Invocation](https://fhirpatterns.net/fhir-implementation-patterns/patterns/async-invocation/) | [snippet](https://gitlab.com/australian-e-health-research-centre/akkadakka/-/snippets/6008642) | [repo](https://github.com/aehrc/qh-connectathon/tree/main/2026-10-29/2-FHIR-For-Services/deploy), [IG](https://github.com/aehrc/radiology-referral) |
| Eventing | [Event Observer](https://fhirpatterns.net/fhir-implementation-patterns/patterns/event-observer/) | [snippet](https://gitlab.com/australian-e-health-research-centre/akkadakka/-/snippets/6008651) | same snippets |
| Legacy adapter | [Legacy Adapter](https://fhirpatterns.net/fhir-implementation-patterns/patterns/legacy-adapter/) | gap | [Caret](https://gitlab.com/jgsuess-csiro/ris-hl7v2-tutorial) |
| Conformance | [PL-15](https://fhirpatterns.net/fhir-authoring-patterns/patterns/pl-15/) | [snippet](https://gitlab.com/australian-e-health-research-centre/akkadakka/-/snippets/4879496) | [repo](https://gitlab.com/fhirfrog/frog-runner) |

<!--
Every topic has advice. Three have no try-it snippet yet: terminology, directory and legacy adapter. Run-it for directory and referral is the Track 2 deploy folder; the IG is the Radiology Referral IG; conformance run-it is frog-runner.
-->
