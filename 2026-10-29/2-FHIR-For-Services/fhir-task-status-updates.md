---
marp: true
theme: default
paginate: true
header: 'Updating Task.status on a FHIR server'
footer: 'PUT vs POST vs PATCH'
style: |
  section { font-size: 24px; }
  section pre { font-size: 17px; line-height: 1.3; }
  section.lead h1 { font-size: 52px; }
  section.small pre { font-size: 15px; }
  table { font-size: 20px; }
  .ok { color: #1a7f37; font-weight: bold; }
  .no { color: #cf222e; font-weight: bold; }
---

<!-- _class: lead -->
<!-- _header: '' -->
<!-- _footer: '' -->

---

# FHIR Server state transitions

A filler accepts a referral. `Task/123` must go from `requested` to `accepted`.

- Which HTTP interaction should the client use?
- How do we avoid overwriting someone else's change?
- What happens when the status change is coupled to other resources?

**Short answer:** PATCH if supported, otherwise read-then-PUT. Use `If-Match` either way. POST only as a transaction wrapper.

---

# Options for inserts/updates 

| Interaction | What it does | Use for status change? |
|---|---|---|
| `POST /Task` | Creates a **new** Task | <span class="no">No</span> |
| `PUT /Task/123` | Replaces the **whole** resource | <span class="ok">Yes</span>: baseline, universally supported |
| `PATCH /Task/123` | Applies a **delta** | <span class="ok">Yes</span>: best fit, if the server supports it |
| `POST /` (transaction Bundle) | Atomic set of PUT/PATCH/POST | <span class="ok">Yes</span>: when coupled to other resources |
| `POST /Task/123/$op` | Custom operation | Only if there's real server-side logic |

---

# POST is not an update

```http
POST /Task
Content-Type: application/fhir+json

{ "resourceType": "Task", "status": "accepted", ... }
```

- This creates **another** Task with a new id
- Conditional create (`If-None-Exist`) avoids duplicates, but it still never modifies an existing Task
- The only legitimate "POST to update" is a **transaction or batch Bundle** POSTed to the base URL, whose entries are PUT or PATCH

---

# PUT: step 1, read the current version

```http
GET /Task/123
Accept: application/fhir+json
```

```http
HTTP/1.1 200 OK
ETag: W/"4"
Content-Type: application/fhir+json

{
  "resourceType": "Task",
  "id": "123",
  "meta": { "versionId": "4" },
  "status": "requested",
  "intent": "order",
  "focus": { "reference": "ServiceRequest/abc" },
  ...
}
```

Keep the `ETag`. It is your concurrency token.

---

# PUT: step 2, send the whole resource back

```http
PUT /Task/123
Content-Type: application/fhir+json
If-Match: W/"4"

{
  "resourceType": "Task",
  "id": "123",
  "status": "accepted",
  "intent": "order",
  "focus": { "reference": "ServiceRequest/abc" },
  "owner": { "reference": "Organization/radiology-provider" },
  "lastModified": "2026-10-28T10:00:00+10:00",
  ...every other element you read, unchanged...
}
```

- **Every** element you omit is deleted
- `If-Match` makes the update version-aware

---

# PUT: what can come back

```http
HTTP/1.1 200 OK
ETag: W/"5"
Last-Modified: Wed, 28 Oct 2026 00:00:01 GMT
```

If someone changed the Task after your read:

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/fhir+json

{
  "resourceType": "OperationOutcome",
  "issue": [{ "severity": "error", "code": "conflict",
              "diagnostics": "Version mismatch: expected 4, current is 5" }]
}
```

On a 412, re-read the Task, re-check the state, then decide. Don't blindly retry.

---

# PATCH with JSON Patch

```http
PATCH /Task/123
Content-Type: application/json-patch+json
If-Match: W/"4"

[
  { "op": "test",    "path": "/status", "value": "requested" },
  { "op": "replace", "path": "/status", "value": "accepted" },
  { "op": "add",     "path": "/lastModified",
                     "value": "2026-10-28T10:00:00+10:00" },
  { "op": "add",     "path": "/owner",
                     "value": { "reference": "Organization/radiology-provider" } }
]
```

- Only the delta is sent, so there's no risk of dropping elements you didn't read
- `test` is a **business-state guard**: the patch fails if the Task isn't `requested`
- `add` on an existing object member replaces it (RFC 6902)

---

# JSON Patch: guarding state transitions

If the placer cancelled the Task in the meantime:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/fhir+json

{
  "resourceType": "OperationOutcome",
  "issue": [{ "severity": "error", "code": "processing",
              "diagnostics": "Patch test failed at /status:
                              expected 'requested', found 'cancelled'" }]
}
```

| Guard | Protects against |
|---|---|
| `If-Match` | **Any** change since your read (strict) |
| `test` op | A change to the **specific state** you care about (targeted) |

Use one or both depending on how strict you need to be.

---

<!-- _class: small -->

# PATCH with FHIRPath Patch

```http
PATCH /Task/123
Content-Type: application/fhir+json
If-Match: W/"4"

{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "operation", "part": [
        { "name": "type",  "valueCode": "replace" },
        { "name": "path",  "valueString": "Task.status" },
        { "name": "value", "valueCode": "accepted" } ] },
    { "name": "operation", "part": [
        { "name": "type",  "valueCode": "replace" },
        { "name": "path",  "valueString": "Task.lastModified" },
        { "name": "value", "valueDateTime": "2026-10-28T10:00:00+10:00" } ] }
  ]
}
```

- FHIR-native and format-independent (works for JSON and XML)
- Less widely implemented than JSON Patch
- Note: `replace` requires the element to exist. Use `add` for new elements.

---

# PATCH: check before you rely on it

PATCH is **optional** in FHIR, and support for each format varies.

```json
{
  "resourceType": "CapabilityStatement",
  "patchFormat": [
    "application/json-patch+json",
    "application/fhir+json"
  ],
  "rest": [{
    "mode": "server",
    "resource": [{
      "type": "Task",
      "interaction": [
        { "code": "read" }, { "code": "update" }, { "code": "patch" }
      ],
      "versioning": "versioned-update"
    }]
  }]
}
```

`versioned-update` signals that the server supports, and may require, `If-Match`.

---

<!-- _class: small -->

# Transaction: status change plus outputs, atomically

```http
POST /
Content-Type: application/fhir+json

{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    { "fullUrl": "urn:uuid:7f1c0b2e-0d1a-4c3e-9a55-2f6f0e1d8b10",
      "resource": { "resourceType": "DiagnosticReport", "status": "final", ... },
      "request": { "method": "POST", "url": "DiagnosticReport" } },

    { "resource": {
        "resourceType": "Task", "id": "123", "status": "completed",
        "output": [{
          "type": { "text": "Report" },
          "valueReference": {
            "reference": "urn:uuid:7f1c0b2e-0d1a-4c3e-9a55-2f6f0e1d8b10" } }],
        ... },
      "request": { "method": "PUT", "url": "Task/123", "ifMatch": "W/\"6\"" } }
  ]
}
```

Either both succeed or neither does. The `urn:uuid` reference is rewritten to the new id.

---

# Task has a state machine

```
          ┌──────────► rejected
          │
requested ─► received ─► accepted ─► in-progress ─► completed
    │                                    │  ▲
    │                                    ▼  │
    └──────────► cancelled            on-hold
                                         │
                                       failed
```

- Servers **may** reject invalid transitions with a 4xx and an OperationOutcome
- Clients must handle that, not retry blindly
- **Who** may make a transition is often an authorisation rule. Typically the placer can cancel and the filler drives the rest.

---

# A status change rarely travels alone

| Transition | Usually also update |
|---|---|
| → `accepted` | `owner`, `lastModified` |
| → `rejected` / `cancelled` | `statusReason`, `lastModified` |
| → `in-progress` | `businessStatus`, `executionPeriod.start` |
| → `completed` | `output`, `executionPeriod.end`, `lastModified` |
| any | `businessStatus` for finer-grained workflow state |

This argues for **PATCH with several ops**, or a **transaction** when outputs are new resources.

---

# Custom operations: only when earned

```http
POST /Task/123/$accept
```

Consider a custom operation only if the transition triggers **server-side business logic** beyond setting fields:

- creating downstream resources
- validating against external systems
- complex authorisation

Otherwise it reduces interoperability for no gain, because every client must learn a bespoke API.

---

# Audit and notification

- **History:** every update creates a new version, so `GET /Task/123/_history` gives a transition log for free
- **Provenance:** add it if you need *who* and *why* with more rigour than `meta.lastUpdated`
- **Subscriptions:** use topic-based Subscriptions so the placer is notified of status changes, rather than polling

---

# Recommendation for an IG

| Requirement | Conformance |
|---|---|
| `update` (PUT) on Task with `If-Match` | **SHALL** |
| `patch` with JSON Patch | **SHOULD** / **MAY** |
| FHIRPath Patch | **MAY** |
| Transaction when a status change creates outputs | **SHALL** (for that scenario) |
| Handle 412 / 422 by re-reading state | **SHALL** (clients) |

Minimal servers stay conformant. Capable clients get the leaner, safer path.

---

<!-- _class: lead -->

# Summary

**POST** creates. It is never an update, except as a transaction wrapper.
**PUT** is the interoperable baseline: read, modify, then PUT with `If-Match`.
**PATCH** is the best fit for single-element changes. Check the CapabilityStatement first.
**Transaction** when the status change must be atomic with other resources.
