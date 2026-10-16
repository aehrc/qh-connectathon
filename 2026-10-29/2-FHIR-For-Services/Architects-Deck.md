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

Pale services are configuration, mid-tone ones need an IG, the dark one needs code.

---

## How they combine (illustrative)

![h:380 center](slides/diagrams/services-architecture.svg)

Illustrative: the two demo stacks (Track 2A and Caret) are separate and share no infrastructure or data.
