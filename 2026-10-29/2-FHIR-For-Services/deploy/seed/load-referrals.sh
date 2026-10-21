#!/usr/bin/env bash
# Load the fictional referral seed (deploy/seed/referrals/*.json) into the REFERRAL FHIR server.
#
# Idempotent: every resource is written with PUT <Type>/<fixed id> inside a transaction Bundle,
# so re-running replaces the same resources and never creates duplicates. It does NOT delete
# anything, so participant-created data is untouched, but seeded resources that participants
# edited are overwritten back to their seed state.
#
#   FHIR_BASE=http://localhost:8080/fhir ./load-referrals.sh [--skip-slots] [--dry-run]
#
# Requires: bash, curl. (jq optional: used only for the summary counts.)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$HERE/referrals"
FHIR_BASE="${FHIR_BASE:-http://localhost:8080/fhir}"
FHIR_BASE="${FHIR_BASE%/}"
SKIP_SLOTS=0; DRY=0
for a in "$@"; do
  case "$a" in
    --skip-slots) SKIP_SLOTS=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown argument: $a" >&2; exit 2 ;;
  esac
done

# order matters only for readability (HAPI checks references at commit), but keep referrers first
files=("$DIR/00-referrers.json")
[ "$SKIP_SLOTS" = 1 ] || files+=("$DIR/01-schedules-slots.json")
for f in "$DIR"/patient-*.json; do files+=("$f"); done

echo "Target: $FHIR_BASE   (${#files[@]} bundles)"
fail=0
for f in "${files[@]}"; do
  name="$(basename "$f")"
  if [ "$DRY" = 1 ]; then echo "  [dry-run] $name"; continue; fi
  code=$(curl -sS -o /tmp/load-referrals.$$ -w '%{http_code}' -X POST \
         -H 'Content-Type: application/fhir+json' --data-binary @"$f" "$FHIR_BASE" || echo 000)
  if [ "$code" = 200 ] || [ "$code" = 201 ]; then
    echo "  ok   $name"
  else
    echo "  FAIL $name (HTTP $code)"; head -c 600 /tmp/load-referrals.$$; echo; fail=1
  fi
done
rm -f /tmp/load-referrals.$$
[ "$fail" = 0 ] || { echo "Some bundles failed." >&2; exit 1; }
[ "$DRY" = 1 ] && exit 0

echo "Summary (totals on server for the seeded types):"
for t in Patient ServiceRequest Task Appointment Slot Schedule PractitionerRole; do
  n=$(curl -sS "$FHIR_BASE/$t?_summary=count" | sed -n 's/.*"total"[^0-9]*\([0-9]*\).*/\1/p' | head -1)
  printf '  %-17s %s\n' "$t" "${n:-?}"
done
