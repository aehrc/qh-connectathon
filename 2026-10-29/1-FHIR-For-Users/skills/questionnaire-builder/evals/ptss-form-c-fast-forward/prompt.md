---
tags: [questionnaire-builder]
max_turns: 60
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

We want to move the Patient Travel Subsidy Scheme "Appointment attendance (Form C)" to an electronic form that specialists complete in our system. The PDF is attached.

Background: section A (patient details) is all in the patient record. The specialist completing it is the logged-in user, a Practitioner with a PractitionerRole for their specialty and facility. Admission and discharge dates are on the Encounter. Escort details are sometimes in a RelatedPerson. Our server is AU Core shaped. The PTSS team processes the completed form for the travel subsidy claim: they don't need anything written into the clinical record, they just need the completed form and its attachments. Please build the complete form, sample data and change log without waiting for me. My initials are KM.

Input files: appointment-attendance-form-c.pdf
