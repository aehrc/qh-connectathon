#!/usr/bin/env python3
"""Delete what the frog-runner conformance runs leave in the referral server (the bundle fixtures s1-*, and the
ServiceRequests its create/submit tests create). Keeps the seed: every seed resource has an id starting "qhc-".

Usage: cleanup-fixtures.py [REFERRAL_FHIR_BASE]   (default https://qh-fhir-test.dw.csiro.au/referral/fhir)
Test data only: run it against the scratch/test stack or after a rehearsal, never while participants are working.
"""
import json, sys, urllib.request

B = (sys.argv[1] if len(sys.argv) > 1 else "https://qh-fhir-test.dw.csiro.au/referral/fhir").rstrip("/")


def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"Accept": "application/fhir+json"}), timeout=60))


def delete(u):
    try:
        urllib.request.urlopen(urllib.request.Request(u, method="DELETE"), timeout=60)
        return True
    except Exception as e:
        return str(e)[:60]


todel = []
for t in ("ServiceRequest", "Patient", "Organization", "PractitionerRole", "Practitioner", "Task", "Condition", "Observation"):
    url = "%s/%s?_count=200&_elements=id" % (B, t)
    while url:
        b = get(url)
        todel += [(t, e["resource"]["id"]) for e in b.get("entry", []) if not e["resource"]["id"].startswith("qhc-")]
        url = next((l["url"] for l in b.get("link", []) if l["relation"] == "next"), None)
print("non-seed resources:", todel)
for t, i in todel:
    print(t, i, delete("%s/%s/%s" % (B, t, i)))
