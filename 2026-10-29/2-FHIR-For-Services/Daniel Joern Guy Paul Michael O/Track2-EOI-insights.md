# Track 2 (FHIR for Services): insights from the EOI data

*Prepared 23 Sept 2026 by Jörn Guy Süß for the Track 2 team (Daniel, Paul, Jörn Guy).*
*Source: `EOI/Expression of interest form - FHIR Connectathon 2026(1-71).xlsx`, 71 responses submitted 31 Aug – 16 Sept 2026.*
*Only aggregates and generalised roles appear here. There are no names or contact details.*

## Caveats

- These are **expressions of interest, not final registrations**. Claire said comms go out to all of QH around 23 Sept, so the numbers will grow.
- Roles are self-reported job titles, grouped by hand. Motivations are paraphrased.
- Everyone who responded is QH staff.

## 1. Track 2 is the broadest draw

| Track | 1st choice | 2nd choice | 3rd choice |
|---|---|---|---|
| FHIR for Data | **26** | 22 | 23 |
| **FHIR for Services (Track 2)** | 25 | **28** | **18** (fewest) |
| FHIR for Users | 20 | 21 | 30 |

- **53 of 71 (75%)** rank Track 2 first or second. It is the most common second choice and the least often ranked last.
- **Implication:** expect about 25 people as a baseline and plan for **35–40**. Track 2 is likely to take overflow and people moving between tracks. The hosted environment, the venue wifi (per room) and the exercises should be sized for that.

## 2. Track 2 people are much more technical than the overall pool

Roles of the 25 people who put Track 2 first:

| Group | Count |
|---|---|
| Integration (specialists, integration developer, integration delivery manager) | 5 |
| Solution architects / principal technical consultants / technical leads | 6 |
| Developers / application specialists | 3 |
| System administrators / BIOMED tech | 3 |
| Data engineering / BI / reporting and analytics | 4 |
| Clinicians and clinical informatics (medicine, nursing, radiography, lab science) | 4 |
| Delivery / solution managers | 1–2 |

(Some people fit two groups, so the counts overlap.)

Across all 71 responses, managers and clinical staff dominate. Among Track 2 first-choice people, **about 17 of 25 are hands-on technical**.

**Implications:**
- The **developer deep dive** (local Docker, direct MLLP client, extending the facade) could draw **10 or more people**, not the 5 we assumed. Their laptop permissions matter more than we thought (see the email to Harry).
- The browser-first core path is still right for the roughly 8 less technical people and anyone blocked by laptop restrictions.

## 3. What they say they want matches the HL7v2 → FHIR pivot

Themes from the free-text motivations of the 25 Track 2 first-choice people:

- **Existing HL7v2 estates moving to FHIR.** One HHS is building a FHIR R4 server and mapping all its HL7 feeds. Another group runs HL7 integration between PACS and RIS and wants patients and referrers linked more easily. A cardiac application is on its first FHIR integration.
- **Enterprise FHIR architecture.** People want to know how FHIR services should be set up across an enterprise (for example, linking to QCTS and future EMR platforms) and where their team will sit in the QH FHIR landscape.
- **App development on ieMR / FHIR**, and adopting AU Base / AU Core in eHealth QLD projects and procurements.
- **General upskilling and community.** Many build on the previous FHIR training and Connectathon.
- **No one mentions Provider Directory or FHIR Workflow.** That supports the 22 Sept direction: an HL7v2 → FHIR facade tutorial, with Provider Directory as one possible extension.
- **Imaging / RIS comes up directly.** That backs Paul's imaging/RIS use case as the flagship scenario.

## 4. Other observations

- **Spread across QH.** The top groups are eHealth QLD (6), Sunshine Coast (5) and CHQ (4). Gold Coast, Metro North, Corporate Services, Metro South, West Moreton and statewide roles have 1–2 each. Regional attendees support keeping the environment **online after the event** for a short follow-up window.
- **Endorsement.** 24 of 25 Track 2 first-choice people say their line manager has endorsed them (63 of 71 overall), so they are likely to turn up.
- **CHQ interest (4)** fits well with the CHQ FHIR deployment talk on Day 1 (Anthony, Harry, Jörn Guy). We can point people from that talk to Track 2.

## 5. Suggested actions

1. Size the hosted environment and exercises for about 40 concurrent users (per-user sandbox or reset strategy).
2. Plan two streams from the start: **browser core** and **developer deep dive** (about 10 people). Share any developer prerequisites through the pre-event comms.
3. Make **imaging / RIS HL7v2 (ORM/ORU, ADT)** the headline scenario, and offer "bring your own HL7v2 feed" (synthetic) as a stretch for the integration people.
4. Ask Claire for the refreshed track preferences after the all-QH comms (early–mid Oct).
