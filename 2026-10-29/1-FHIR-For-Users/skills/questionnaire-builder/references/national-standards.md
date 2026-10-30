# National data standards

Push hard for them. A form whose answers take a national standard's shape and codes can be
prefilled from any system that follows the standard. What it writes back is usable by everyone
else, and its data can be compared, counted and reported across services. A local list or code
makes the data useful only to this form, forever. The person rarely knows the standard exists, so
it's your job to bring it up, every time it applies.

## How to push

* **Lead with the standard.** Draft the item the standard way first, and say so in the outline:
  "Indigenous status uses the national five-way question, so it fills in from the hospital
  record."
* **Sell it in their terms**, with one concrete benefit:
  * "fills in from the GP's record";
  * "the pathology lab already uses these codes";
  * "you can compare with other hospitals";
  * "the registry can take it without re-keying".
* **Ask what stops them**, rather than whether they'd like it: "Is there anything that means
  this has to stay your own list?"
* **Weigh the answer.**
  * *Not* strong reasons: "we've always done it this way", "our list is shorter", "staff know
    our codes", "it's only for us". Say why the standard is still better, kindly and once more.
    A short list can be a subset of the national value set, and a familiar label can be a
    display text.
  * *Strong* reasons: a registry, funder or law that dictates the format; a downstream system
    that genuinely can't accept the standard and won't change; comparability with a long-running
    dataset.
* **Even with a strong reason, map.** Keep their codes as the answer, and give each one its
  national equivalent: a second coding on the answer option, or a mapping noted in the change
  log. Then the data can still be reused later.
* **Log every departure** with status **local by choice** and their reason in their words.

## Which country?

Ask early (strand 3); it decides everything below. If they don't say and nothing suggests
otherwise, assume Australia and say so.

## Australia

Versions checked on 30 Oct 2026 against hl7.org.au, sparked.csiro.au and the CSIRO Ontoserver;
check for newer releases before quoting a version to them.

| Standard | What it's for | Where |
|---|---|---|
| **AU Core 2.0.0** (HL7 AU) | The shape of the record: the resources you prefill from and write back to | `http://hl7.org.au/fhir/core/` |
| **AU Base 6.0.0** | Australian extensions and identifiers (IHI, Medicare, HPI-I, HPI-O, Indigenous status, addresses) | `http://hl7.org.au/fhir/` |
| **AUCDI Release 3** (Sparked, June 2026) | The agreed national *content*: which data elements to collect, named and defined. Release 2 is mapped to AU Core 2.0.0. | `https://sparked.csiro.au` (AUCDI); mapping `https://hl7.org.au/fhir/core/aucdi.html` |
| **AU eRequesting 1.0.1** (HL7 AU) | Pathology and imaging requests (community care) | `http://hl7.org.au/fhir/ereq/` |
| **AU Patient Summary 1.0.0** | Patient summaries (built on IPS) | `http://hl7.org.au/fhir/ps/` |
| **SNOMED CT-AU**, including **AMT** | Conditions, findings, procedures, substances, medicines | NCTS; the national value sets in the SDC cheat-sheet, section 7 |
| **LOINC** | Observations and test results | NCTS |
| **RCPA SPIA** | Pathology terms: what can be requested, result names, preferred units (its FHIR reference sets are still labelled draft) | NCTS; e.g. `https://www.rcpa.edu.au/fhir/ValueSet/spia-requesting-refset-3` |
| **METeOR** (AIHW) | National definitions for statistical and reporting items (Indigenous status, country of birth, and many more) | `https://meteor.aihw.gov.au` |

**AUCDI as a checklist:** for each thing the form collects, ask "is there an AUCDI data element
for this?". If there is, use its name, definition and value set, and the AU Core resource it
maps to. Release 2's core data groups include:
* adverse reaction risk;
* blood pressure, body height, body temperature, body weight, waist circumference, pulse and
  respiration;
* encounter;
* eGFR, HbA1c, lipids and uACR;
* medication use;
* problem/diagnosis;
* procedure;
* sex and gender;
* tobacco smoking;
* vaccination.

Release 3 adds more (check the release for assessments and scores).

### By kind of data

| Data | Shape (AU Core unless noted) | Codes |
|---|---|---|
| Name, date of birth, address, phone | Patient; prefill, don't ask | |
| Sex and gender | Patient `gender`; Sex Assigned At Birth, Gender Identity and Pronouns extensions | as bound in AU Core |
| Indigenous status | Patient, AU Base extension `http://hl7.org.au/fhir/StructureDefinition/indigenous-status` | `https://healthterminologies.gov.au/fhir/ValueSet/australian-indigenous-status-1`: 1 Aboriginal but not Torres Strait Islander origin, 2 Torres Strait Islander but not Aboriginal origin, 3 Both, 4 Neither, 9 Not stated/inadequately described. Never a yes/no "ATSI?" box. |
| IHI, Medicare, DVA numbers | Patient identifiers (AU Base identifier profiles); prefill | |
| Clinician, organisation | Practitioner, PractitionerRole, Organization (HPI-I, HPI-O) | |
| Vital signs, height, weight, waist | AU Core's vital-sign Observation profiles | LOINC as each profile fixes; UCUM units |
| Smoking | Smoking Status Observation | as bound in AU Core |
| Pathology results | Pathology Result Observation | LOINC, from the SPIA reporting reference sets; SPIA preferred units |
| Pathology or imaging **requests** | AU eRequesting Pathology Request / Imaging Request (ServiceRequest), not a free-text "tests wanted" box | SPIA requesting reference set for pathology; the imaging value set eRequesting binds |
| Conditions, diagnoses, problems | Condition | SNOMED CT-AU, Clinical Condition value set |
| Procedures, operations | Procedure | SNOMED CT-AU, Procedure value set |
| Medicines | MedicationRequest / MedicationStatement | AMT, Australian Medication value set |
| Allergies and reactions | AllergyIntolerance | substance and reaction value sets (cheat-sheet section 7) |
| Immunisations | Immunization | as bound in AU Core |
| Visits, admissions | Encounter | |
| Assessment scales and scores | Observation; a LOINC panel or score code if one exists for that instrument | look it up; if none exists, a local code, logged as local by choice |
| Statistical items (country of birth, language, living arrangements…) | The AU Core/AU Base element if there is one, else an Observation or a form item | the METeOR definition and its value domain, and the matching NCTS value set if there is one |

Look up every value set and code before using it (it may have moved or been versioned). If a
national one doesn't resolve, say so and log it "to confirm"; don't fall back to inventing.

## Other countries

The same stance with their standards; look up the current versions:

* **United States:** US Core (the FHIR form of the USCDI data classes), SNOMED CT US, LOINC,
  RxNorm.
* **United Kingdom:** UK Core, SNOMED CT UK, dm+d for medicines.
* **Anywhere else, or cross-border:** the International Patient Summary (IPS), SNOMED CT
  International, LOINC, and the country's national base profiles if it has them.
