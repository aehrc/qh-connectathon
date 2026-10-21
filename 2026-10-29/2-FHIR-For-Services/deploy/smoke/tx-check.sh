#!/usr/bin/env bash
# tx-check.sh - test every ValueSet binding used by the Track 2 radiology-referral scenario
# against a FHIR terminology server (default: public CSIRO Ontoserver).
#
# Usage:  deploy/smoke/tx-check.sh [--no-burst] [TX_URL]      (TX_URL defaults to $TX_URL or r4.ontoserver)
# Output: a Markdown report on stdout (progress on stderr). Needs only bash + python3 (stdlib).
# Read-only: GET requests only. Sequential for the binding tests (paced ~0.3s) and a
# 50-request / concurrency-10 burst at the end (skip with --no-burst).
# Bindings listed below were extracted from the IG's dependencies (au.ereq / au.core / au.base
# snapshots, see the report) plus the IG's own FSH; fictional data only.
set -euo pipefail
BURST=1
[ "${1:-}" = "--no-burst" ] && { BURST=0; shift; }
TX="${1:-${TX_URL:-https://r4.ontoserver.csiro.au/fhir}}"
export TX BURST
exec python3 -I - <<'PY'
import os, sys, json, time, urllib.request, urllib.parse, urllib.error, threading, statistics
from concurrent.futures import ThreadPoolExecutor

TX = os.environ["TX"].rstrip("/")
SCT = "http://snomed.info/sct"

def get(path, params=None, retries=3):
    """GET -> (status, json|None, seconds, headers). Honours Retry-After on 429."""
    url = TX + path + ("?" + urllib.parse.urlencode(params) if params else "")
    for attempt in range(retries + 1):
        t = time.time()
        req = urllib.request.Request(url, headers={"Accept": "application/fhir+json", "User-Agent": "qh-connectathon-tx-check/1"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                body, st, h = r.read(), r.status, dict(r.headers)
        except urllib.error.HTTPError as e:
            body, st, h = e.read(), e.code, dict(e.headers)
        except Exception as e:
            return 0, {"error": str(e)}, time.time() - t, {}
        dt = time.time() - t
        if st == 429 and attempt < retries:
            time.sleep(float(h.get("Retry-After", 2)) + 0.5); continue
        try: j = json.loads(body)
        except Exception: j = None
        return st, j, dt, h
    return st, j, dt, h

def oo(j):
    try: return j["issue"][0].get("diagnostics") or j["issue"][0].get("details", {}).get("text", "")
    except Exception: return ""

# (url, binding strength, where used, curated filter or None, curated (system, code) or None)
VS = [
 # --- the bindings that matter for the scenario (typeahead / validation) ---
 ("https://ranzcr.com/fhir/ValueSet/radiology-referral-1", "preferred", "ServiceRequest.code (au-erequesting-servicerequest-imag; inherited by Referral ServiceRequest)", "abdomen", (SCT, "432370003")),
 ("https://healthterminologies.gov.au/fhir/ValueSet/procedure-1", "example", "ServiceRequest.code (au-servicerequest)", "abdomen", (SCT, "432370003")),
 ("https://healthterminologies.gov.au/fhir/ValueSet/reason-for-request-1", "preferred", "ServiceRequest.reasonCode", "pain", (SCT, "301717006")),
 ("https://healthterminologies.gov.au/fhir/ValueSet/body-site-1", "preferred", "ServiceRequest.bodySite; Condition.bodySite (extensible)", "abdomen", None),
 ("https://healthterminologies.gov.au/fhir/ValueSet/clinical-condition-1", "extensible", "au-core-condition Condition.code", "pain", None),
 ("https://healthterminologies.gov.au/fhir/ValueSet/clinical-finding-1", "preferred", "au-core-condition Condition.evidence.code", "pain", None),
 ("https://healthterminologies.gov.au/fhir/ValueSet/practitioner-role-1", "preferred", "PractitionerRole.code (au-erequesting / au-core)", "general", (SCT, "62247001")),
 ("https://healthterminologies.gov.au/fhir/ValueSet/clinical-specialty-1", "preferred", "PractitionerRole.specialty; HealthcareService.specialty", "radiology", None),
 ("https://healthterminologies.gov.au/fhir/ValueSet/service-type-1", "preferred", "HealthcareService.type (provider directory)", "radiology", None),
 ("https://healthterminologies.gov.au/fhir/ValueSet/healthcare-organisation-role-type-1", "preferred", "Organization.type", "hospital", None),
 ("https://healthterminologies.gov.au/fhir/ValueSet/common-languages-australia-2", "extensible", "Patient.communication.language", "english", None),
 ("https://healthterminologies.gov.au/fhir/ValueSet/contact-relationship-type-3", "extensible", "Patient.contact.relationship", None, None),
 # --- AU terminology.hl7.org.au value sets (AU eRequesting / AU Base) ---
 ("http://terminology.hl7.org.au/ValueSet/au-erequesting-request-status", "required", "ServiceRequest.status (Referral ServiceRequest, FSH)", None, None),
 ("http://terminology.hl7.org.au/ValueSet/au-erequesting-task-status", "required", "Task.status", None, None),
 ("http://terminology.hl7.org.au/ValueSet/au-erequesting-task-businessstatus", "extensible", "Task.businessStatus", None, None),
 ("http://terminology.hl7.org.au/ValueSet/au-erequesting-fulfilment-task-tags", "required", "Task.meta.tag (Referral Task, FSH)", None, None),
 ("http://terminology.hl7.org.au/ValueSet/order-identifier-type", "required", "ServiceRequest.requisition.type / Task.groupIdentifier.type (PGN)", None, ("http://terminology.hl7.org/CodeSystem/v2-0203", "PGN")),
 ("http://terminology.hl7.org.au/ValueSet/contact-purpose", "extensible", "Organization.contact.purpose", None, None),
 ("http://terminology.hl7.org.au/ValueSet/location-physical-type-extended", "preferred", "Location.physicalType", None, None),
 ("http://terminology.hl7.org.au/ValueSet/service-provision-conditions", "preferred", "HealthcareService.serviceProvisionCode", None, None),
 ("http://terminology.hl7.org.au/ValueSet/v2-0360-extended", "preferred", "Practitioner.qualification.code", None, None),
 ("http://terminology.hl7.org.au/ValueSet/v3-ServiceDeliveryLocationRoleType-extended", "extensible", "Location.type", None, None),
 # --- HL7 base R4 / THO value sets (booking resources + eRequesting) ---
 ("http://hl7.org/fhir/ValueSet/service-type", "example", "Appointment/Slot/Schedule.serviceType (R4 base)", None, None),
 ("http://hl7.org/fhir/ValueSet/c80-practice-codes", "preferred", "Appointment/Slot/Schedule.specialty (R4 base)", None, None),
 ("http://terminology.hl7.org/ValueSet/v2-0276", "preferred", "Appointment/Slot.appointmentType (R4 base)", None, None),
 ("http://hl7.org/fhir/ValueSet/appointment-cancellation-reason", "example", "Appointment.cancelationReason (R4 base)", None, None),
 ("http://hl7.org/fhir/ValueSet/encounter-reason", "preferred", "Appointment.reasonCode (R4 base)", None, None),
 ("http://hl7.org/fhir/ValueSet/appointmentstatus", "required", "Appointment.status", None, None),
 ("http://hl7.org/fhir/ValueSet/slotstatus", "required", "Slot.status", None, None),
 ("http://hl7.org/fhir/ValueSet/participationstatus", "required", "Appointment.participant.status", None, None),
 ("http://hl7.org/fhir/ValueSet/request-priority", "required", "ServiceRequest.priority; Task.priority", None, None),
 ("http://hl7.org/fhir/ValueSet/request-intent", "required", "ServiceRequest.intent", None, None),
 ("http://hl7.org/fhir/ValueSet/request-status", "required", "au-servicerequest status (superseded by au-erequesting-request-status in eReq)", None, None),
 ("http://hl7.org/fhir/ValueSet/task-intent", "required", "Task.intent", None, None),
 ("http://hl7.org/fhir/ValueSet/task-code", "example", "Task.code", None, None),
 ("http://hl7.org/fhir/ValueSet/servicerequest-category", "example", "ServiceRequest.category", None, None),
 ("http://hl7.org/fhir/ValueSet/servicerequest-orderdetail", "example", "ServiceRequest.orderDetail", None, None),
 ("http://hl7.org/fhir/ValueSet/participant-role", "example", "ServiceRequest.performerType", None, None),
 ("http://hl7.org/fhir/ValueSet/performer-role", "preferred", "Task.performerType", None, None),
 ("http://hl7.org/fhir/ValueSet/identifier-use", "required", "identifier.use", None, None),
 ("http://hl7.org/fhir/ValueSet/administrative-gender", "required", "Patient.gender", None, None),
 ("http://hl7.org/fhir/ValueSet/name-use", "required", "HumanName.use", None, None),
 ("http://hl7.org/fhir/ValueSet/contact-point-system", "required", "ContactPoint.system", None, None),
 ("http://hl7.org/fhir/ValueSet/contact-point-use", "required", "ContactPoint.use", None, None),
 ("http://hl7.org/fhir/ValueSet/days-of-week", "required", "availableTime.daysOfWeek", None, None),
 ("http://hl7.org/fhir/ValueSet/marital-status", "extensible", "Patient.maritalStatus", None, None),
 ("http://hl7.org/fhir/ValueSet/link-type", "required", "Patient.link.type", None, None),
 ("http://hl7.org/fhir/ValueSet/condition-clinical", "required", "Condition.clinicalStatus", None, None),
 ("http://hl7.org/fhir/ValueSet/condition-ver-status", "required", "Condition.verificationStatus", None, None),
 ("http://hl7.org/fhir/ValueSet/condition-category", "extensible", "Condition.category", None, None),
 ("http://hl7.org/fhir/ValueSet/condition-severity", "extensible", "Condition.severity", None, None),
 ("http://hl7.org/fhir/ValueSet/location-mode", "required", "Location.mode", None, None),
 ("http://hl7.org/fhir/ValueSet/location-status", "required", "Location.status", None, None),
 ("http://terminology.hl7.org/ValueSet/v2-0116", "preferred", "Location.operationalStatus", None, None),
 ("http://terminology.hl7.org/ValueSet/v3-ServiceDeliveryLocationRoleType", "example", "ServiceRequest.locationCode", None, None),
 ("http://hl7.org/fhir/ValueSet/service-category", "example", "HealthcareService.category", None, None),
 ("http://hl7.org/fhir/ValueSet/service-referral-method", "example", "HealthcareService.referralMethod", None, None),
 ("http://hl7.org/fhir/ValueSet/languages", "preferred", "*.language (all-languages, unbounded BCP-47)", None, None),
]

def sct_edition():
    out = []
    st, j, dt, h = get("/CodeSystem", {"url": SCT, "_elements": "version"})
    vers = sorted({e["resource"].get("version", "") for e in (j or {}).get("entry", [])})
    au = [v for v in vers if "/32506021000036107/" in v and "/sct/" in v]
    out.append(f"- CodeSystem search `url={SCT}`: HTTP {st}, {len((j or {}).get('entry', []))} versions listed")
    out.append(f"- SNOMED CT-AU module `32506021000036107`: {len(au)} sct/ versions; latest = `{au[-1] if au else 'NONE'}`")
    other = sorted({v.split('/')[4] for v in vers if '/sct/' in v and '/32506021000036107/' not in v})
    out.append(f"- Other editions/modules present: {', '.join(other)}")
    # explicit AU-version operations: does the server resolve the AU version URI?
    latest = au[-1] if au else None
    if latest:
        st, j, dt, h = get("/CodeSystem/$validate-code", {"url": SCT, "version": latest, "code": "432370003"})
        res = next((p.get("valueBoolean") for p in (j or {}).get("parameter", []) if p["name"] == "result"), None)
        disp = next((p.get("valueString") for p in (j or {}).get("parameter", []) if p["name"] == "display"), None)
        out.append(f"- `$validate-code` 432370003 against `{latest}`: HTTP {st}, result={res}, display={disp!r}")
        st, j, dt, h = get("/CodeSystem/$lookup", {"system": SCT, "code": "432370003"})
        v = next((p.get("valueString") for p in (j or {}).get("parameter", []) if p["name"] == "version"), None)
        out.append(f"- `$lookup` with no version (what a bare `http://snomed.info/sct` resolves to): HTTP {st}, version=`{v}`")
    return out, latest

def run_vs(url, strength, used, filt, sample):
    r = dict(url=url, strength=strength, used=used, expand="-", count="-", filt="-", val="-", notes=[], ms=[])
    st, j, dt, h = get("/ValueSet/$expand", {"url": url, "count": 5}); r["ms"].append(dt * 1000)
    codes = []
    if st == 200 and j and j.get("resourceType") == "ValueSet":
        r["expand"] = "yes"; ex = j.get("expansion", {})
        r["count"] = str(ex.get("total", "?")) if "total" in ex else f">={len(ex.get('contains', []))}"
        codes = [(c["system"], c["code"], c.get("display", "")) for c in ex.get("contains", [])]
        if not codes: r["notes"].append("expansion empty")
    else:
        r["expand"] = f"NO ({st})"; r["notes"].append((oo(j) or "")[:140].replace("|", "/"))
    time.sleep(0.25)
    # filter= as typeahead would
    f = filt or (codes[0][2].split()[0].lower() if codes and len(codes[0][2].split()[0]) >= 3 else (codes[0][2][:3].lower() if codes else None))
    if f and r["expand"] == "yes":
        st, j, dt, h = get("/ValueSet/$expand", {"url": url, "filter": f, "count": 5}); r["ms"].append(dt * 1000)
        n = len(j.get("expansion", {}).get("contains", [])) if st == 200 and j else 0
        r["filt"] = f"yes ({n}, '{f}')" if n else f"NO (0 for '{f}')" if st == 200 else f"NO ({st})"
        if filt and st == 200 and n:
            sc = [c for c in j["expansion"]["contains"]][0]
            r["notes"].append(f"top hit for '{f}': {sc['code']} {sc.get('display','')[:45]}")
        time.sleep(0.25)
    # validate-code: curated sample if given, else first expanded code; plus a negative control
    s = sample or ((codes[0][0], codes[0][1]) if codes else None)
    if s:
        st, j, dt, h = get("/ValueSet/$validate-code", {"url": url, "system": s[0], "code": s[1]}); r["ms"].append(dt * 1000)
        res = next((p.get("valueBoolean") for p in (j or {}).get("parameter", []) if p["name"] == "result"), None) if st == 200 and j else None
        r["val"] = f"yes ({s[1]})" if res is True else f"NO (result={res}, HTTP {st}, {s[1]})"
        if res is not True and sample: r["notes"].append(f"curated sample {s[0]}#{s[1]} not in VS")
        time.sleep(0.25)
        if "languages" in url:  # BCP-47 accepts any well-formed tag, so a negative control is meaningless
            return r
        st, j, dt, h = get("/ValueSet/$validate-code", {"url": url, "system": s[0], "code": "ZZ-NOT-A-CODE-0"}); r["ms"].append(dt * 1000)
        res = next((p.get("valueBoolean") for p in (j or {}).get("parameter", []) if p["name"] == "result"), None) if st == 200 and j else None
        if res is not False: r["notes"].append(f"negative control did not return false (result={res}, HTTP {st})")
        time.sleep(0.25)
    return r

def burst(n=50, conc=10):
    # mix of typeahead-style expands against the main imaging VS, as 10 concurrent users would do
    terms = ["ab", "abd", "abdo", "ct", "ct a", "chest", "head", "mri", "brain", "knee", "spine", "pelv", "ultra", "xray", "x-ray", "hip", "shoul", "neck", "ankle", "foot"]
    results = []; lock = threading.Lock()
    def one(i):
        p = {"url": "https://ranzcr.com/fhir/ValueSet/radiology-referral-1", "filter": terms[i % len(terms)], "count": 10}
        url = TX + "/ValueSet/$expand?" + urllib.parse.urlencode(p)
        t = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/fhir+json"}), timeout=60) as r:
                r.read(); st, h = r.status, dict(r.headers)
        except urllib.error.HTTPError as e:
            st, h = e.code, dict(e.headers)
        except Exception:
            st, h = 0, {}
        with lock: results.append((st, time.time() - t, {k.lower(): v for k, v in h.items()}))
    t0 = time.time()
    with ThreadPoolExecutor(conc) as ex: list(ex.map(one, range(n)))
    return results, time.time() - t0

print(f"# Terminology server check\n\nServer: `{TX}`  \nRun: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}\n")
st, j, dt, h = get("/metadata", {"_summary": "true"})
sw = f"{j.get('software',{}).get('name')} {j.get('software',{}).get('version')}, FHIR {j.get('fhirVersion')}" if j else "unreachable"
print(f"Metadata: HTTP {st}, {sw}, {dt*1000:.0f} ms. Rate-limit headers on this response: " +
      ", ".join(f"{k}={v}" for k, v in h.items() if k.lower().startswith(("x-ratelimit", "retry-after"))) + "\n")

print("## SNOMED CT-AU edition\n")
lines, latest = sct_edition()
print("\n".join(lines) + "\n")

print("## Binding results\n")
print("| ValueSet url | Strength | Expand ok | Count | Filter ok | validate-code ok | Notes |\n|---|---|---|---|---|---|---|")
rows = []
for i, v in enumerate(VS):
    print(f"[{i+1}/{len(VS)}] {v[0]}", file=sys.stderr)
    r = run_vs(*v); rows.append(r)
    notes = "; ".join(x for x in r["notes"] if x)
    print(f"| `{r['url']}` | {r['strength']} | {r['expand']} | {r['count']} | {r['filt']} | {r['val']} | {r['used']}{'; ' + notes if notes else ''} |")
bad = [r for r in rows if r["expand"].startswith("NO") or r["filt"].startswith("NO") or r["val"].startswith("NO") or any("negative" in n or "empty" in n for n in r["notes"])]
print("\n## Failures\n")
if not bad: print("None.")
for r in bad: print(f"- `{r['url']}` ({r['strength']}): expand={r['expand']}, filter={r['filt']}, validate={r['val']}. {'; '.join(r['notes'])}")
print("\n## Scenario codes (from the IG FSH / scenario draft) against their bound ValueSets\n")
print("| Code | Meaning | ValueSet | In VS? |\n|---|---|---|---|")
for code, what, vs in [("432370003", "CT of abdomen and pelvis with contrast", "https://ranzcr.com/fhir/ValueSet/radiology-referral-1"),
                       ("432370003", "CT of abdomen and pelvis with contrast", "https://healthterminologies.gov.au/fhir/ValueSet/procedure-1"),
                       ("301717006", "Right upper quadrant pain", "https://healthterminologies.gov.au/fhir/ValueSet/reason-for-request-1"),
                       ("62247001", "General practitioner", "https://healthterminologies.gov.au/fhir/ValueSet/practitioner-role-1"),
                       ("3457005", "Referral (category[referral], fixed in FSH)", "http://hl7.org/fhir/ValueSet/servicerequest-category"),
                       ("363679005", "Imaging (optional discipline category)", "http://hl7.org/fhir/ValueSet/servicerequest-category")]:
    st, j, dt, h = get("/ValueSet/$validate-code", {"url": vs, "system": SCT, "code": code})
    res = next((p.get("valueBoolean") for p in (j or {}).get("parameter", []) if p["name"] == "result"), None) if st == 200 and j else None
    print(f"| {code} | {what} | `{vs}` | {'yes' if res else 'NO'} |")
    time.sleep(0.25)
print("\nClosest RANZCR codes for 'CT of abdomen' + 'pelvis' (filter, count 20):")
st, j, dt, h = get("/ValueSet/$expand", {"url": "https://ranzcr.com/fhir/ValueSet/radiology-referral-1", "filter": "CT of pelvis", "count": 20})
for c in (j or {}).get("expansion", {}).get("contains", []): print(f"- {c['code']} {c.get('display','')}")

allms = [m for r in rows for m in r["ms"]]
print(f"\nSequential timings over {len(allms)} requests: median {statistics.median(allms):.0f} ms, p95 {sorted(allms)[int(.95*(len(allms)-1))]:.0f} ms, max {max(allms):.0f} ms.\n")

if os.environ.get("BURST") == "1":
    print("## Burst test (50 typeahead `$expand` requests, concurrency 10)\n")
    res, wall = burst()
    codes = {}
    for st, _, _ in res: codes[st] = codes.get(st, 0) + 1
    lat = sorted(d * 1000 for _, d, _ in res)
    print(f"- Wall time {wall:.1f} s ({len(res)/wall:.1f} req/s); status counts: {codes}")
    print(f"- Latency ms: median {statistics.median(lat):.0f}, p95 {lat[int(.95*(len(lat)-1))]:.0f}, max {lat[-1]:.0f}")
    rl = [r[2] for r in res if any(k.startswith("x-ratelimit") or k == "retry-after" for k in r[2])]
    rem = [int(r["x-ratelimit-remaining"]) for r in rl if r.get("x-ratelimit-remaining", "").lstrip("-").isdigit()]
    if rl:
        print(f"- Rate-limit headers: limit={rl[0].get('x-ratelimit-limit')}, remaining min/max seen={min(rem) if rem else '?'}/{max(rem) if rem else '?'}, reset values={sorted({r.get('x-ratelimit-reset') for r in rl})}")
    else: print("- No rate-limit headers seen")
    r429 = [r[2] for r in res if r[0] == 429]
    if r429: print(f"- 429 responses: {len(r429)}; Retry-After={sorted({r.get('retry-after') for r in r429})}")
PY
