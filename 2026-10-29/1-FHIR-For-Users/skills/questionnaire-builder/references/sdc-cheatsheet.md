# SDC cheat-sheet

The patterns a Questionnaire needs for prepopulation and extraction, each with a snippet copied
from one working form: [`snippets/demo-questionnaire.json`](snippets/demo-questionnaire.json)
("Pre-op bloods"). A test keeps the snippets identical to that form, and the form passes `check`
with [`snippets/demo-sample-data.json`](snippets/demo-sample-data.json) (two patients, one female,
one male) and [`snippets/demo-answers.json`](snippets/demo-answers.json). When you're unsure how
something fits together, read the demo form whole.

FHIR R4, the SDC IG, as rendered by Smart Forms. Extension URLs start
`http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-`, **except variables**, which
use the core `http://hl7.org/fhir/StructureDefinition/variable`. Getting that wrong fails
silently: the variable just doesn't exist.

## Contents

1. Launch context: who and what the form is about
2. Fetching data: x-fhir-query variables
3. Picking a value: FHIRPath variables
4. Filling an item: initialExpression
5. Calculating: calculatedExpression
6. Showing and hiding: enableWhen and enableWhenExpression; long forms in tabs
7. Answer lists: answerOption or answerValueSet
8. Writing back: template-based extraction
9. Writing back only when asked to
10. The person using the form: `%user`
11. Gotchas
12. Explaining an expression to the person
13. Codes used here, and how they were checked

## 1. Launch context: who and what the form is about

Declare each thing the form expects to be given when it opens. `patient` is almost always there;
add `user` when the form needs the person filling it in (a requester, a signature block) and
`encounter` when it's tied to a visit. The name becomes a variable: `%patient`, `%user`.

<!-- from: demo-questionnaire.json#launchContext:patient -->
```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
  "extension": [
    {
      "url": "name",
      "valueCoding": {
        "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext",
        "code": "patient"
      }
    },
    {
      "url": "type",
      "valueCode": "Patient"
    }
  ]
}
```

<!-- from: demo-questionnaire.json#launchContext:user -->
```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
  "extension": [
    {
      "url": "name",
      "valueCoding": {
        "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext",
        "code": "user"
      }
    },
    {
      "url": "type",
      "valueCode": "Practitioner"
    }
  ]
}
```

## 2. Fetching data: x-fhir-query variables

A variable in the `application/x-fhir-query` language is a FHIR search, run when the form is
prepopulated. `{{ }}` holds FHIRPath evaluated first (here, the patient's id). The result is a
search Bundle.

<!-- from: demo-questionnaire.json#variable:ObsHb -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "ObsHb",
    "language": "application/x-fhir-query",
    "expression": "Observation?code=http://loinc.org%7C718-7&patient={{%patient.id}}&_sort=-date&_count=1"
  }
}
```

* Write `|` as `%7C`: some servers reject a raw `|` (Meld answers HTTP 400, which a browser
  reports as a CORS error).
* `_sort=-date&_count=1` gets the latest result only.
* The search must suit the upstream server's shape (see `upstream-shapes.md`): AU Core servers
  support `patient` + `code` on Observation; check what the target server supports.

## 3. Picking a value: FHIRPath variables

Name the thing you'll use more than once.

<!-- from: demo-questionnaire.json#variable:latestHb -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "latestHb",
    "language": "text/fhirpath",
    "expression": "%ObsHb.entry.resource.first()"
  }
}
```

Variables can depend on the patient, which is how a form varies by patient characteristics:

<!-- from: demo-questionnaire.json#variable:hbThreshold -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "hbThreshold",
    "language": "text/fhirpath",
    "expression": "iif(%patient.gender = 'male', 130, 120)"
  }
}
```

<!-- from: demo-questionnaire.json#variable:isAdult -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "isAdult",
    "language": "text/fhirpath",
    "expression": "%patient.birthDate.toDate() <= today() - 18 years"
  }
}
```

### Testing for a kind of thing: value-set membership

When a rule is about a *kind* of thing (any chronic kidney disease, any sedative, any
anticoagulant), test whether the record's code is a member of a value set. Don't list codes or
names: a list is always incomplete (new products, brands, more specific diagnoses), silently
misses the rest, and no one can review it. A value set (SNOMED CT ECL, or a published one) says
what you mean and stays current.

Fetch the candidates broadly, then filter with `memberOf()`:

<!-- from: demo-questionnaire.json#variable:Conditions -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "Conditions",
    "language": "application/x-fhir-query",
    "expression": "Condition?patient={{%patient.id}}&clinical-status=active"
  }
}
```

<!-- from: demo-questionnaire.json#variable:hasCKD -->
```json
{
  "url": "http://hl7.org/fhir/StructureDefinition/variable",
  "valueExpression": {
    "name": "hasCKD",
    "language": "text/fhirpath",
    "expression": "%Conditions.entry.resource.code.coding.where(memberOf('http://snomed.info/sct?fhir_vs=ecl/<< 709044004')).exists()"
  }
}
```

<!-- from: demo-questionnaire.json#item:ckd -->
```json
{
  "linkId": "ckd",
  "type": "boolean",
  "text": "Chronic kidney disease?",
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "iif(%hasCKD, true, {})"
      }
    }
  ]
}
```

* `memberOf()` asks the terminology server (Smart Forms uses `https://tx.ontoserver.csiro.au/fhir`
  by default), and works in prepopulation, calculations and show/hide rules (Smart Forms renderer
  1.5.0, sdc-populate 4.7.2). `check` runs it during prepopulation (it needs a network
  connection); its fill-in step can't yet run it inside a calculatedExpression.
* `iif(%hasCKD, true, {})` fills in "Yes" when the record says so and leaves the item blank
  otherwise: an absent record isn't a "No".
* `<<` includes the concept itself; `<` only its descendants. Check the ECL by expanding it
  (`$expand`) and looking at what's in and what's out, then log the rule in plain words ("any
  kind of chronic kidney disease on the problem list").
* For medicines, match on the product (AMT, in SNOMED CT-AU), e.g. the ingredient via
  `< 763158003 |Medicinal product| : 127489000 |Has active ingredient| = ...`. Expand it and
  check that the Australian brands you expect are in it: hand-written medicine ECL is easy to get
  subtly wrong.
* A specific pathology test (Hb, ferritin) is fine as a LOINC code in the search: that's one
  test, not a list standing in for a category.
* If the source server supports `code:in=<value set>` or `code:below=<code>`, the search can do
  the filtering; most don't, so `memberOf()` is the portable default.

## 4. Filling an item: initialExpression

The value the item starts with. The person can change it unless the item is `readOnly`.

<!-- from: demo-questionnaire.json#item:hb -->
```json
{
  "linkId": "hb",
  "type": "decimal",
  "text": "Haemoglobin (g/L)",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-unit",
      "valueCoding": {
        "system": "http://unitsofmeasure.org",
        "code": "g/L",
        "display": "g/L"
      }
    },
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%latestHb.value.value"
      }
    }
  ]
}
```

* `value.value` reads `Observation.valueQuantity.value` (`value` is a choice type).
* A date from a dateTime: `effective.toString().substring(0, 10)`.
* Give units with `questionnaire-unit`; the person then types just the number.

## 5. Calculating: calculatedExpression

Kept up to date as the form changes. Make it `readOnly` unless people may override it.

<!-- from: demo-questionnaire.json#item:anaemic -->
```json
{
  "linkId": "anaemic",
  "type": "boolean",
  "text": "Anaemic for their sex (Hb ≤ 130 g/L male, ≤ 120 g/L female)",
  "readOnly": true,
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%resource.repeat(item).where(linkId='hb').answer.value <= %hbThreshold"
      }
    }
  ]
}
```

* Inside the response, items nest in groups: use `%resource.repeat(item).where(linkId='hb')`.
  `%resource.item.where(linkId='hb')` only looks at the top level and finds nothing.
* Prepopulation doesn't run calculatedExpressions; the renderer does. `check` works them out
  too, for each test patient.

## 6. Showing and hiding: enableWhen and enableWhenExpression

Use **enableWhen** when it depends on another answer in the form:

<!-- from: demo-questionnaire.json#item:iron-product -->
```json
{
  "linkId": "iron-product",
  "type": "choice",
  "text": "Which iron product?",
  "answerValueSet": "https://healthterminologies.gov.au/fhir/ValueSet/australian-medication-1",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/questionnaire-item-control",
            "code": "autocomplete"
          }
        ]
      }
    }
  ],
  "enableWhen": [
    {
      "question": "iron-recent",
      "operator": "=",
      "answerBoolean": true
    }
  ]
}
```

Use **enableWhenExpression** when it depends on the patient's record (sex, age, a known
condition), so the person isn't asked something the system already knows:

<!-- from: demo-questionnaire.json#item:pregnancy -->
```json
{
  "linkId": "pregnancy",
  "type": "choice",
  "text": "Pregnancy status",
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%patient.gender = 'female' and %isAdult"
      }
    },
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtract",
      "extension": [
        {
          "url": "template",
          "valueReference": {
            "reference": "#PregnancyStatusTemplate"
          }
        }
      ]
    }
  ],
  "answerOption": [
    {
      "valueCoding": {
        "system": "http://loinc.org",
        "code": "LA15173-0",
        "display": "Pregnant"
      }
    },
    {
      "valueCoding": {
        "system": "http://loinc.org",
        "code": "LA26683-5",
        "display": "Not pregnant"
      }
    },
    {
      "valueCoding": {
        "system": "http://loinc.org",
        "code": "LA4489-6",
        "display": "Unknown"
      }
    }
  ]
}
```

Hidden items are left out of the response, so anything they would write back isn't written.

### Long forms: tabs

A long form (more than about 15 questions, or several sections) goes in tabs: one top-level
group with the `tab-container` item control, and a group inside it for each section. Each inner
group is a tab, its `text` the tab's name. Use the original's own sections (headings, numbered
parts, pages) as the tabs; the demo form is laid out this way (abridged here):

```json
{
  "linkId": "tabs",
  "type": "group",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/questionnaire-item-control",
            "code": "tab-container"
          }
        ]
      }
    }
  ],
  "item": [
    { "linkId": "bloods", "type": "group", "text": "Latest bloods", "item": [ "..." ] },
    { "linkId": "history", "type": "group", "text": "Iron and history", "item": [ "..." ] },
    { "linkId": "plan", "type": "group", "text": "Diagnosis and plan", "item": [ "..." ] }
  ]
}
```

* A tab can have `enableWhen` / `enableWhenExpression` like any item: a "Maternity" tab only for
  pregnant patients, a section only one user fills in.
* Groups inside a tab show as headed sections within it.
* Wrapping items in tabs doesn't change their linkIds; expressions that use `repeat(item)` still
  find them. `check` warns (`long-no-tabs`) when a long form has sections but no tabs.
* Smart Forms also supports `page` (one section per screen, with next/back). Prefer tabs: people
  can see every section and move between them freely.

## 7. Answer lists: answerOption or answerValueSet

A **short, fixed list** that matters for its own sake: `answerOption` with real codes.

<!-- from: demo-questionnaire.json#item:urgency -->
```json
{
  "linkId": "urgency",
  "type": "choice",
  "text": "How urgent is surgery?",
  "answerOption": [
    {
      "valueCoding": {
        "system": "http://hl7.org/fhir/request-priority",
        "code": "routine",
        "display": "Routine"
      }
    },
    {
      "valueCoding": {
        "system": "http://hl7.org/fhir/request-priority",
        "code": "urgent",
        "display": "Urgent"
      }
    },
    {
      "valueCoding": {
        "system": "http://hl7.org/fhir/request-priority",
        "code": "asap",
        "display": "As soon as possible"
      }
    }
  ]
}
```

A **long list**, where people should find anything relevant rather than pick from what fitted
on the page: `answerValueSet`, with SNOMED CT ECL, shown as a search box (`autocomplete`).

<!-- from: demo-questionnaire.json#item:anaemia-type -->
```json
{
  "linkId": "anaemia-type",
  "type": "choice",
  "text": "Type of anaemia, if known",
  "answerValueSet": "http://snomed.info/sct?fhir_vs=ecl/< 271737000",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/questionnaire-item-control",
            "code": "autocomplete"
          }
        ]
      }
    }
  ],
  "enableWhen": [
    {
      "question": "anaemic",
      "operator": "=",
      "answerBoolean": true
    }
  ]
}
```

This is the tick-box question in code: ten conditions printed on paper may be "these ten
matter" (answerOption) or "these were the ten that fitted" (a value set, or the ten plus
"other").

**Coded by default** for medicines, conditions, procedures, allergies (the substance and the
reaction) and pathology: a coded answer can be prepopulated, extracted, checked by rules and
counted; free text can't. Use a national value set with `autocomplete` (the iron product in
section 6 does this), and narrow it with ECL only when the question really is narrower:

| Data | Value set (`answerValueSet`) |
|---|---|
| Medicines | `https://healthterminologies.gov.au/fhir/ValueSet/australian-medication-1` |
| Conditions, diagnoses, problems | `https://healthterminologies.gov.au/fhir/ValueSet/clinical-condition-1` |
| Procedures, operations | `https://healthterminologies.gov.au/fhir/ValueSet/procedure-1` |
| Allergy or intolerance: substance | `https://healthterminologies.gov.au/fhir/ValueSet/indicator-hypersensitivity-intolerance-to-substance-2` |
| Allergy or intolerance: reaction | `https://healthterminologies.gov.au/fhir/ValueSet/clinical-finding-1` |
| Pathology test requested | `https://www.rcpa.edu.au/fhir/ValueSet/spia-requesting-refset-3` |
| Pathology result names (LOINC) | `https://www.rcpa.edu.au/fhir/ValueSet/spia-chemical-pathology-refset-3` (and the other SPIA sets) |

These are the bindings AU Core uses, so answers line up with the record they're read from and
written back to. Use `open-choice` only if people genuinely need to type something not in the
value set, and say so in the decision log.

## 8. Writing back: template-based extraction

Put an example of the resource to create in `contained`, with `templateExtractValue` where a
value comes from the response. Attach it to the item it's about with `templateExtract`. Paths
are FHIRPath, evaluated from that item: `answer.value` is its answer; `%resource` is the whole
QuestionnaireResponse.

<!-- from: demo-questionnaire.json#contained:PregnancyStatusTemplate -->
```json
{
  "resourceType": "Observation",
  "id": "PregnancyStatusTemplate",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "social-history",
          "display": "Social History"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "82810-3",
        "display": "Pregnancy status"
      }
    ]
  },
  "subject": {
    "_reference": {
      "extension": [
        {
          "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
          "valueString": "%resource.subject.reference"
        }
      ]
    }
  },
  "_effectiveDateTime": {
    "extension": [
      {
        "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
        "valueString": "today().toString()"
      }
    ]
  },
  "valueCodeableConcept": {
    "coding": [
      {
        "extension": [
          {
            "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
            "valueString": "answer.value"
          }
        ]
      }
    ]
  }
}
```

* Put `templateExtractValue` on the `_element` beside a primitive (`_effectiveDateTime`,
  `subject._reference`), or on a complex element itself (a Coding inside `coding`).
* `today().toString()` gives a date; use the response's own date where it matters.
* Leave out `meta.profile`: the resource can conform to AU Core without declaring it, and
  some servers (Meld) reject resources that declare one.

## 9. Writing back only when asked to

Attach the template to a **group that's only shown when the answer is yes**. When it's hidden,
it isn't in the response, so nothing is written. (A `templateExtractContext` on the template
itself doesn't stop it in Smart Forms' extractor, sdc-template-extract 1.0.16.)

<!-- from: demo-questionnaire.json#item:ida -->
```json
{
  "linkId": "ida",
  "type": "group",
  "text": "Iron deficiency anaemia",
  "enableWhen": [
    {
      "question": "ida-confirm",
      "operator": "=",
      "answerBoolean": true
    }
  ],
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtract",
      "extension": [
        {
          "url": "template",
          "valueReference": {
            "reference": "#IronDeficiencyAnaemiaTemplate"
          }
        }
      ]
    }
  ],
  "item": [
    {
      "linkId": "ida-onset",
      "type": "date",
      "text": "Date diagnosed"
    }
  ]
}
```

<!-- from: demo-questionnaire.json#contained:IronDeficiencyAnaemiaTemplate -->
```json
{
  "resourceType": "Condition",
  "id": "IronDeficiencyAnaemiaTemplate",
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
        "code": "active"
      }
    ]
  },
  "verificationStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
        "code": "confirmed"
      }
    ]
  },
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/condition-category",
          "code": "problem-list-item"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "87522002",
        "display": "Iron deficiency anaemia"
      }
    ]
  },
  "subject": {
    "_reference": {
      "extension": [
        {
          "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
          "valueString": "%resource.subject.reference"
        }
      ]
    }
  },
  "_onsetDateTime": {
    "extension": [
      {
        "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
        "valueString": "item.where(linkId='ida-onset').answer.value.toString()"
      }
    ]
  }
}
```

## 10. The person using the form: `%user`

<!-- from: demo-questionnaire.json#item:requester -->
```json
{
  "linkId": "requester",
  "type": "string",
  "text": "Requesting clinician",
  "readOnly": true,
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%user.name.first().given.first() + ' ' + %user.name.first().family"
      }
    }
  ]
}
```

**When it isn't a clinician.** A parent or carer completing a child's consent form is a
`RelatedPerson` (linked to the child by `RelatedPerson.patient`); a patient filling in their own
questionnaire is the `Patient`. Declare that type on the `user` launch context:

```json
{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
  "extension": [
    { "url": "name", "valueCoding": { "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext", "code": "user" } },
    { "url": "type", "valueCode": "RelatedPerson" }
  ]
}
```

Then `%user.name.first().text` is the parent's name. Put `name` before `type`: sdc-populate reads
them by position. It takes a `user` directly only as a Practitioner; a RelatedPerson or Patient
user reaches it as a SMART `fhirContext` reference from the launch, so check that your target
environment sends one (and say so under "Couldn't check" if you can't). `check` and `preview` do
this for you, using the RelatedPerson linked to each test patient, so put one per family in the
sample data.

## 11. Gotchas

* **Variables** use `http://hl7.org/fhir/StructureDefinition/variable`, not an `sdc-` URL.
* **`|` in searches**: write `%7C`.
* **`repeat(item)`** to find an item anywhere in the response.
* **Smart Forms drops `ifNoneExist`**: writing back twice creates duplicates. Say so in the change
  log if it matters.
* **The playground doesn't prepopulate on Build**: choose *Populate → Pre-populate*.
* **`meta.profile`**: leave it out of templates (see 8).
* **linkIds** are forever: other things (expressions, templates, analytics) refer to them. Make
  them readable (`hb-date`, not `item-17`).

## 12. Explaining an expression to the person

The person never writes or reads FHIRPath: you write every expression and check it. Tell them,
in their words, what an item fills in from and when ("your latest Hb result from the lab system,
if there's one from the last 3 months"; "only shown for women aged 18 or over"), and log that
plain-words rule in the decision log. If a technical colleague asks to see an expression, show
it then.

## 13. Codes used here, and how they were checked

Looked up with Ontoserver (`$lookup` / `$expand`) on 30 Oct 2026:

| Code | System | Display |
|---|---|---|
| 718-7 | LOINC | Hemoglobin [Mass/volume] in Blood |
| 2276-4 | LOINC | Ferritin [Mass/volume] in Serum or Plasma |
| 82810-3 | LOINC | Pregnancy status |
| LA15173-0, LA26683-5, LA4489-6 | LOINC answers | Pregnant, Not pregnant, Unknown |
| 87522002 | SNOMED CT | Iron deficiency anaemia |
| `< 271737000` | SNOMED CT ECL | descendants of Anaemia (576 concepts) |
| `<< 709044004` | SNOMED CT ECL | Chronic kidney disease and its subtypes (143 concepts) |
| 433144002 | SNOMED CT | Chronic kidney disease stage 3 (sample data; in the ECL above) |
| 56531000036109 | SNOMED CT-AU (AMT) | Ferinject 500 mg/10 mL injection, 10 mL vial (answers; in Australian Medication) |
| the value sets in section 7 | NCTS, RCPA | expanded on `tx.ontoserver.csiro.au` on 30 Oct 2026 |

Never invent a code. If you can't look one up, write the item with text only and list it in the
decision log as "code to confirm".

MBS item numbers have no FHIR system URI confirmed by AU Core. If a form needs them, use the one
your target system uses and log the system as "to confirm".
