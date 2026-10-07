#!/usr/bin/env bash
# Load the synthetic PAM bundle into a FHIR server (default: the Meld sandbox open endpoint).
set -euo pipefail
BASE="${1:-https://gw.interop.community/QHConnectathon2026/open}"
HERE="$(cd "$(dirname "$0")" && pwd)"
curl -sS -X POST "$BASE" -H 'Content-Type: application/fhir+json' \
  --data-binary @"$HERE/pam-synthetic-bundle.json" -o "$HERE/.load-response.json" -w 'HTTP %{http_code}\n'
python3 - "$HERE/.load-response.json" <<'PY'
import json, sys, collections
r = json.load(open(sys.argv[1]))
if r.get("resourceType") != "Bundle":
    print(json.dumps(r, indent=1)[:2000]); sys.exit(1)
print(collections.Counter(e["response"]["status"] for e in r["entry"]))
PY
