# Upstream shapes: where prepopulation data comes from

Prepopulation can only read what an upstream system holds, in the shape it holds it. Ask what
the systems are (strand 3 in `probing.md`); then use this page to turn each answer into a search
and a FHIRPath expression, or into a change-log line saying why an item can't be prepopulated.

Default: **AU Core 2.0.0** (`hl7.fhir.au.core#2.0.0`). Use US Core only when the person says their
source is US Core / USCDI-shaped. When the source is something else, ask for an example resource
or a data dictionary, and don't guess field names.

Check everything here against the target server's CapabilityStatement (`<base>/metadata`) when
you can reach it: servers don't always support every search their IG lists.

## Common items

| Item | AU Core search (x-fhir-query) | FHIRPath to the value | US Core difference |
|---|---|---|---|
| Name, sex, date of birth | none needed: `%patient` | `%patient.name.first().given.first()`, `%patient.name.first().family`, `%patient.gender`, `%patient.birthDate` | Same |
| Age, adult or not | none: from `%patient.birthDate` | `%patient.birthDate.toDate() <= today() - 18 years` | Same |
| Indigenous status | none: `%patient` | `%patient.extension.where(url='http://hl7.org.au/fhir/StructureDefinition/indigenous-status').value` (AU Base; confirm the URL in the IG version the server uses) | Not present; US Core has race and ethnicity extensions instead |
| Medicare / IHI number | none: `%patient` | `%patient.identifier.where(type.coding.code='MC').value`; IHI by its system `http://ns.electronichealth.net.au/id/hi/ihi/1.0` | Not present |
| Height, weight | `Observation?code=http://loinc.org%7C8302-2&patient={{%patient.id}}&_sort=-date&_count=1` (weight: `29463-7`) | `%ObsHeight.entry.resource.first().value.value` | Same LOINC codes |
| A pathology result (Hb, ferritin...) | `Observation?code=http://loinc.org%7C<code>&patient={{%patient.id}}&_sort=-date&_count=1` | `%ObsX.entry.resource.first().value.value`; date: `.effective.toString().substring(0, 10)` | Same pattern; US labs may use different LOINC codes for the same test |
| Vital signs | as above, `category=vital-signs` for all of them | as above; blood pressure is `component.where(code.coding.code='8480-6').value.value` (systolic) | Same LOINC codes |
| Active conditions | `Condition?patient={{%patient.id}}&clinical-status=active` | `%Conds.entry.resource.code.coding.where(system='http://snomed.info/sct')` | US Core codes may be ICD-10-CM as well as SNOMED CT |
| Is a particular condition present? | as above | `%Conds.entry.resource.code.coding.where(code='<snomed>').exists()` (or a subsumption check through the terminology server for "this or anything under it") | Same idea |
| Current medications | `MedicationRequest?patient={{%patient.id}}&status=active&intent=order` | `.medication.coding` (AMT codes in SNOMED CT-AU) | RxNorm codes |
| Allergies | `AllergyIntolerance?patient={{%patient.id}}&clinical-status=active` | `.code.coding`, `.reaction.manifestation` | Same shape |
| The person using the form | none: `%user` (launchContext `user`, a Practitioner) | `%user.name.first()...`; their role or organisation needs `PractitionerRole?practitioner={{%user.id}}` | Same |
| An appointment or admission | `Encounter?patient={{%patient.id}}&_sort=-date&_count=1` (AU Core); `Appointment` is not in AU Core | `.period.start`, `.period.end` | US Core has Encounter too; Appointment is outside both |

## When the source isn't FHIR, or doesn't exist

* **Non-FHIR system** (a spreadsheet, a local database, REDCap): it can't be queried from the
  form. Log it as "could prepopulate once this source is exposed as FHIR", and leave the item for
  the person to fill in.
* **Nowhere**: the form is where the data is born. Then the item is a candidate for
  extraction (see strand 4), so the next form can prepopulate from it.
* **Exists, but how recent is recent enough?** Ask. A ferritin from 18 months ago may be worse
  than nothing. Add a date item next to the value, or filter in the search (`date=ge...`),
  and log the rule.

## Shaping sample data like the source

The sample Bundle stands in for the upstream system, so make its resources look like that
system's: the same profile shape, code systems and the fields the searches use (`subject`,
`code`, `effectiveDateTime`, `clinicalStatus`). See `sample-data.md`.
