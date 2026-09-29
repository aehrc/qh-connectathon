# Track 2 — Way of Working

This file explains how work is organised and how issues are assigned for the
**FHIR for Services (Track 2)** of the FHIR in Queensland Health Connectathon.

## Roles and responsibility areas

Every piece of work in this track maps to one of three responsibility areas, each owned
by a named team member:

| Responsibility area | Owner | GitHub | Category label |
|---------------------|-------|--------|----------------|
| **External comms & point man** — stakeholder engagement, presenting to the broader group, representing the track externally | Jim Steel | `@jimsteel` | `area:external-comms` |
| **Ideas & content design** — scenario design, content, implementation guides, terminology and clinical modelling | Michael Osborne | `@mjosborne1` | `area:content-design` |
| **Project management & technical** — coordination, environments, servers, integration and delivery logistics | Joern Guy Süß | `@jgsuess` | `area:pm-technical` |

## Assignment rules

1. **No unassigned issues.** Every issue in this track has exactly one assignee — the owner
   of the responsibility area the work falls under.
2. **Track label.** Every issue associated with this track is tagged with the `track:services`
   label so track work is easy to filter.
3. **Category label.** Every issue also carries the `area:*` label for its responsibility area.
   The assignee is derived from this category. Keeping the category as a separate label means
   that if a person is reassigned, the *area of work* is still clearly identified and coverage
   gaps are visible.
4. **Reassignment.** To reassign, change the assignee to the new owner of that `area:*` category.
   The category label stays, so the nature of the work is preserved independently of who does it.

## How to add a new issue

1. Decide which responsibility area it belongs to.
2. Add labels: `track:services` + the matching `area:*` label.
3. Assign it to the current owner of that area (see the table above).
