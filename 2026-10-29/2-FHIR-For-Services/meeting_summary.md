 # Radiology Referral Workflow as Primary Scenario

## Discussion Summary

The group explored a focused radiology referral scenario as the primary Connectathon use case. Participants discussed how such a scenario could demonstrate Provider, ServiceRequest, Appointment, Slot, Task and related FHIR resources.

The workflow could illustrate referral creation, acknowledgement, triage, scheduling, task assignment, status updates, completion, reporting, and communication back to referrers.

Discussion also considered how the scenario complements Queensland Health's existing smart referral capabilities while exposing participants to finer-grained workflow management concepts supported by FHIR.

A referral workflow prototype already exists and includes task tracking, workflow progression and visual monitoring capabilities. Participants suggested extending this by introducing profiles, implementation guide concepts, terminology requirements and workflow rules.

## Decisions / Agreements

The radiology referral workflow was viewed as the most attractive and practical primary scenario.
The scenario should demonstrate multiple core FHIR resources and workflow concepts in a single cohesive use case.
Existing referral workflow tooling can be leveraged as a foundation for the Connectathon exercise.
Ideas

Use referral profiles and implementation guide development as part of the scenario.
Demonstrate workflow state transitions and task management.
Incorporate terminology requirements and validation concepts.
Show how workflow status can be communicated between participants and systems.

## Transfer of request 

The AU eRequesting WG is considering transfer of requests between providers and looking
at custom operations for viewing and transferring ServiceRequests.

