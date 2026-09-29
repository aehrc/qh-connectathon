# Services Track Discussion — Meeting Recap & Tasks

**Meeting:** QH Connectathon — Services Track discussion
**Date/Time:** Monday, 28 September 2026, 2:30–3:30 PM AEST
**Location:** Microsoft Teams
**Attendees:** Jim Steel; Joern Guy Suess; Michael Osborne; James Grant
**Recap author:** James Grant (NCTS Implementation and Engagement Lead, NCTS Office, H&B | AEHRC)
**Source:** Email "Re: QH Connectathon - Services Track discussion [SEC=OFFICIAL]", sent 28 September 2026, 15:33 AEST

---

## Meeting Summary

The meeting focused on defining the scope, scenarios, content, and leadership approach for the Services Track of the Queensland Health Connectathon. Participants discussed potential demonstrations involving referrals, provider directories, service discovery, bookings, appointment scheduling, workflow management, and FHIR-based service architectures. Discussion included balancing participant interest in HL7 v2 interoperability with the desire to showcase modern FHIR-based approaches.

The group agreed that a **radiology referral workflow** provides a realistic and manageable scenario that exercises multiple FHIR resources and concepts while remaining relevant to Queensland Health participants. Existing referral workflow prototypes, provider directory concepts, workflow/state management approaches, and related implementation guides were considered. The group also discussed track oversight, collaboration arrangements, engagement with key stakeholders, and development logistics. A repository-based approach was preferred for content development, with draft materials to be shared for collaborative review.

---

## Topics

### Topic 1 — Connectathon Services Track Scope and Candidate Scenarios

Discussion began with likely participant interests: radiology referrals, provider discovery, service discovery, bookings, appointment scheduling, and referral workflows. The group explored whether existing implementation guides and prior work could be reused, including e-requesting work, provider directory capabilities, Ontario referral implementation guides, Philippines referral work, and outputs from previous Sparked events. The challenge of delivering meaningful content within the available timeframe was highlighted, given upcoming leave and competing workloads.

**Decisions / Agreements:**
- The Services Track should focus on a limited number of realistic scenarios rather than broad coverage.
- Radiology referrals are a strong candidate scenario, demonstrating multiple FHIR resources and workflow concepts.
- Existing referral and provider directory work should be examined for reuse where practical.

**Ideas:**
- Use provider directory resources combined with service discovery and referral workflows.
- Create a lightweight implementation guide covering appointments, slots, scheduling and referrals.
- Reuse aspects of previous e-requesting work.
- Investigate whether outputs from prior Connectathon and Sparked activities can be leveraged.
- Showcase an end-to-end radiology referral workflow covering referral, booking, triage, task progression, and reporting.

### Topic 2 — HL7 v2 to FHIR Demonstration and Architecture Concepts

A prototype HL7 v2-to-FHIR workflow was presented, including a submission interface, a FHIR server acting as a processing platform, file handling mechanisms, and a lightweight client for browsing/retrieving content. The implementation demonstrated decomposition, mapping, validation, routing, and error handling using FHIR-oriented components. Discussion explored the merits and risks of demonstrating FHIR Mapping Language (FML). Concerns were raised that exposing implementation details could distract attendees or unintentionally position the team as providers of v2-to-FHIR tooling. The group agreed that mentioning the existence and a brief demonstration of building blocks and concepts was more valuable than detailed mapping implementation.

**Decisions / Agreements:**
- Any v2 demonstration should emphasise architectural concepts rather than detailed FML implementation.
- FML, if used, should largely remain an implementation detail rather than a teaching focus.
- The prototype may be retained as a backup or supporting demonstration.

**Ideas:**
- Demonstrate how FHIR-based architectural building blocks can be assembled to process legacy data.
- Use v2 examples only as an entry point before moving participants into a FHIR-centric workflow.
- Use the prototype as a contingency option if the primary scenario requires additional material.

### Topic 3 — Radiology Referral Workflow as Primary Scenario

The group explored a focused radiology referral scenario as the primary Connectathon use case, demonstrating Provider, ServiceRequest, Appointment, Slot, Task and related FHIR resources. The workflow could illustrate referral creation, acknowledgement, triage, scheduling, task assignment, status updates, completion, reporting, and communication back to referrers. It complements Queensland Health's existing smart referral capabilities while exposing participants to finer-grained workflow management. A referral workflow prototype already exists with task tracking, workflow progression and visual monitoring capabilities; extending it with profiles, implementation guide concepts, terminology requirements and workflow rules was suggested.

**Decisions / Agreements:**
- The radiology referral workflow is the most attractive and practical primary scenario.
- The scenario should demonstrate multiple core FHIR resources and workflow concepts in a single cohesive use case.
- Existing referral workflow tooling can be leveraged as a foundation.

**Ideas:**
- Use referral profiles and implementation guide development as part of the scenario.
- Demonstrate workflow state transitions and task management.
- Incorporate terminology requirements and validation concepts.
- Show how workflow status can be communicated between participants and systems.

### Topic 4 — Workflow Validation and State Management

Participants discussed implementing workflow state validation using a rules-based state machine to validate whether workflow transitions are permitted. Implementation approaches considered included validator chains, plugins and intermediary services. Existing workflow implementations and referral workflow tooling were referenced. Workflow concepts were felt to be educationally valuable, though opinions varied on whether full implementation was necessary for the Connectathon.

**Ideas:**
- Demonstrate state-aware workflow validation for referrals.
- Use workflow state transitions as a practical mechanism for teaching FHIR process management.
- Show how validation can enforce workflow progression rules.

### Topic 5 — Provider Directory Integration Opportunities

Discussion moved to provider directory use cases and onboarding workflows. Participants expressed interest in demonstrating provider registration through a single FHIR-based API that could distribute requests to multiple backend systems — allowing organisations to integrate once while shielding consumers from backend complexity and future platform replacement. Interest from North Queensland stakeholders regarding provider onboarding and directory capabilities was noted.

**Ideas:**
- Demonstrate provider onboarding through a unified FHIR API.
- Use Provider and PractitionerRole resources as the primary integration interface.
- Position provider directories as a reusable platform abstraction layer over multiple backend systems.
- Include provider directory functionality within the broader referral workflow scenario.

### Topic 6 — Connectathon Coordination and Delivery Approach

The group discussed ownership and delivery responsibilities. Daniel was identified as an important contributor and presenter but has limited availability during preparation. A proposed division of responsibilities: Joern Guy provides overall external engagement plus operational coordination; Michael Osborne guides content and overall direction. The need to maintain engagement with Paul and keep plans visible to key stakeholders was recognised.

**Decisions / Agreements:**
- Michael Osborne will lead content direction and scenario design.
- Joern Guy Suess will support implementation and detailed execution activities, including external communications.
- The team should keep Paul informed and seek feedback on proposed approaches.

**Action Items:**
- Prepare and share a proposed Services Track scenario for team review — Michael Osborne — *In Progress*.
- Present the proposed scenario to the broader group for double-checking and feedback — Michael Osborne — *Not Started*.
- Engage Paul with a proposed track approach and gather feedback — Services Track team — *Not Started*.

### Topic 7 — Collaboration Environment and Content Development

The meeting concluded with discussion about where Connectathon materials should be developed and maintained. A repository-based approach was preferred (version control, reviews, issue tracking, markdown support). The team agreed to establish a repository and store draft content there while continuing to use SharePoint for sharing checkpoints and broader visibility. A draft scenario ("strawman") will be uploaded to initiate collaborative refinement.

**Decisions / Agreements:**
- A source-controlled repository should be the primary working area for Services Track content.
- SharePoint may be used for publishing checkpoints and outputs.

**Action Items:**
- Create a repository for Services Track content if one does not already exist — Joern Guy Suess — *Not Started*.
- Upload the draft scenario proposal to the repository or SharePoint — Michael Osborne — *Not Started*.
- Add relevant team members to the repository and begin requirements refinement — Joern Guy Suess — *Not Started*.
- Provide the meeting transcript and summary to support ongoing planning — James Grant — *Done*.

---

## Action Items Summary

All items dated 28 September 2026; status *Not Started* unless noted.

| # | Action | Owner | Status | Rationale |
|---|--------|-------|--------|-----------|
| 1 | Prepare and share a proposed Services Track scenario for review | Michael Osborne | In Progress | Enable collaborative assessment of proposed track content |
| 2 | Present proposed scenario to the broader group for feedback | Michael Osborne | Not Started | Validate suitability and feasibility of the scenario |
| 3 | Engage Paul on the proposed Services Track direction and gather feedback | Services Track team | Not Started | Maintain stakeholder alignment and incorporate preferences |
| 4 | Create repository for Services Track content | Joern Guy Suess | Not Started | Provide version-controlled collaboration environment |
| 5 | Upload draft scenario proposal to repository | Michael Osborne | Not Started | Establish baseline material for review and refinement |
| 6 | Add team members to repository and commence requirements review | Joern Guy Suess | Not Started | Enable coordinated development of Connectathon content |
| 7 | Distribute transcript and meeting summary to participants | James Grant | Done | Support planning and follow-up activities |

---

## Ideas Summary

| ID | Idea | Proposed by | Value |
|----|------|-------------|-------|
| I-01 | Use a radiology referral workflow as the primary Connectathon scenario | Michael Osborne & participants | Demonstrates multiple FHIR resources and workflow concepts |
| I-02 | Demonstrate provider directory integration alongside referral workflows | Participants | Supports service discovery and onboarding use cases |
| I-03 | Create a lightweight implementation guide including appointments, slots and referrals | Participants | Provides structure for exercise content |
| I-04 | Reuse prior e-requesting and Connectathon assets where practical | Participants | Reduces preparation effort and delivery risk |
| I-05 | Demonstrate FHIR architectural building blocks using a v2-to-FHIR example | Joern Guy Suess | Focus on architecture rather than implementation detail |
| I-06 | Use workflow state validation and state-machine concepts during demonstrations | Joern Guy Suess | Illustrates process governance and workflow control |
| I-07 | Use referral profiles, terminology and IG development as teaching elements | Jim Steel & participants | Connects workflow exercises to broader FHIR practices |
| I-08 | Build a provider onboarding API that abstracts multiple backend systems | Michael Osborne | Demonstrates long-term interoperability architecture |
| I-09 | Retain the v2-to-FHIR prototype as a backup or supplementary demonstration | Joern Guy Suess | Provides fallback capability if required |
