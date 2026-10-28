#!/usr/bin/env bash
# Reset the demo patient after write-back demos: delete every Observation whose subject is
# Patient/pam-demo (baseline and extracted), then reload the baseline with load.sh.
# Touches nothing else (pam-001..pam-040 and other resources are left alone).
set -euo pipefail
BASE="${1:-https://gw.interop.community/QHConnectathon2026/open}"
HERE="$(cd "$(dirname "$0")" && pwd)"
python3 - "$BASE" <<'PY'
import json, sys, urllib.request
base = sys.argv[1].rstrip("/")
def call(method, url, body=None):
    req = urllib.request.Request(url, method=method, data=body and json.dumps(body).encode(),
                                 headers={"Accept": "application/fhir+json", "Content-Type": "application/fhir+json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)
ids, url = [], f"{base}/Observation?subject=Patient/pam-demo&_elements=subject&_count=200"
while url:
    page = call("GET", url)
    for e in page.get("entry", []):
        r = e["resource"]
        if r.get("subject", {}).get("reference") == "Patient/pam-demo":  # belt and braces
            ids.append(r["id"])
    url = next((l["url"] for l in page.get("link", []) if l["relation"] == "next"), None)
print(f"deleting {len(ids)} Observation(s) for Patient/pam-demo")
if ids:
    tx = {"resourceType": "Bundle", "type": "transaction",
          "entry": [{"request": {"method": "DELETE", "url": f"Observation/{i}"}} for i in ids]}
    r = call("POST", base, tx)
    import collections
    print(collections.Counter(e["response"]["status"] for e in r["entry"]))
PY
"$HERE/load.sh" "$BASE"
