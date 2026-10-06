#!/usr/bin/env bash
# PUT the PAM modules, root and assembled form to a forms server (default: Meld open endpoint).
set -euo pipefail
BASE="${1:-https://gw.interop.community/QHConnectathon2026/open}"
HERE="$(cd "$(dirname "$0")" && pwd)"
python3 - "$HERE" > "$HERE/.bundle.json" <<'PY'
import json, sys, pathlib
here = pathlib.Path(sys.argv[1])
files = sorted((here / "modules").glob("*.json")) + [here / "pam-root.json", here / "pam-assembled.json"]
entries = []
for f in files:
    r = json.loads(f.read_text())
    entries.append({"resource": r, "request": {"method": "PUT", "url": f"Questionnaire/{r['id']}"}})
print(json.dumps({"resourceType": "Bundle", "type": "transaction", "entry": entries}))
PY
curl -sS -X POST "$BASE" -H 'Content-Type: application/fhir+json' --data-binary @"$HERE/.bundle.json" \
  | python3 -c 'import json,sys,collections; r=json.load(sys.stdin); print(collections.Counter(e["response"]["status"] for e in r["entry"]) if r.get("resourceType")=="Bundle" else json.dumps(r)[:1500])'
rm -f "$HERE/.bundle.json"
