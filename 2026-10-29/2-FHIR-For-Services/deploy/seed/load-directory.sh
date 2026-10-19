#!/usr/bin/env bash
# Load the Track 2 seed HCPD directory (deploy/seed/directory/*.json) into the directory FHIR server.
#
# Idempotent: every entry is a PUT to a fixed logical id (qhd-*), so re-running
# updates in place (HTTP 200) rather than duplicating (first run returns 201). The files are
# FHIR transaction Bundles, loaded in numeric order so that referenced resources already exist:
#   01 Endpoint -> 02 Organization -> 03 Location -> 04 HealthcareService
#   -> 05 Practitioner -> 06 PractitionerRole -> 07 Provenance
#
# Usage:
#   DIRECTORY_URL=http://localhost:28081/fhir deploy/seed/load-directory.sh
#   DIRECTORY_URL=https://<host>/directory/fhir deploy/seed/load-directory.sh
#
# Env:
#   DIRECTORY_URL    (required) FHIR base URL of the directory server, no trailing slash needed
#   REFERRAL_FHIR_BASE  base URL written into the "FHIR Referral Endpoint" Endpoint.address values
#                    (default: <scheme>://<authority of DIRECTORY_URL>/fhir, i.e. the referral
#                    server is assumed to sit next to the directory behind the same ingress)
#   CURL_OPTS        extra curl options (e.g. an Authorization header: -H "Authorization: Bearer ...")
#   DRY_RUN=1        print what would be POSTed, send nothing
#
# Requires: curl, jq.
set -euo pipefail

: "${DIRECTORY_URL:?set DIRECTORY_URL to the directory FHIR base, e.g. http://localhost:28081/fhir}"
DIR="${DIRECTORY_URL%/}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DIR="$HERE/directory"

# Default referral base = same scheme+authority as the directory, path /fhir.
if [ -z "${REFERRAL_FHIR_BASE:-}" ]; then
  authority="$(printf '%s' "$DIR" | sed -E 's#^(https?://[^/]+).*#\1#')"
  REFERRAL_FHIR_BASE="$authority/referral/fhir"
fi
REFERRAL_FHIR_BASE="${REFERRAL_FHIR_BASE%/}"

# shellcheck disable=SC2206
CURL_EXTRA=(${CURL_OPTS:-})

echo "Directory:     $DIR"
echo "Referral base: $REFERRAL_FHIR_BASE (substituted into FHIR referral Endpoint addresses)"

shopt -s nullglob
files=("$SEED_DIR"/[0-9][0-9]-*.json)
[ "${#files[@]}" -gt 0 ] || { echo "no seed files in $SEED_DIR" >&2; exit 1; }

if [ "${DRY_RUN:-0}" != "1" ]; then
  curl -fsS "${CURL_EXTRA[@]}" -o /dev/null "$DIR/metadata" || { echo "cannot reach $DIR/metadata" >&2; exit 1; }
fi

total=0
for f in "${files[@]}"; do
  name="$(basename "$f")"
  payload="$(sed "s#https://REFERRAL_HOST/fhir#$REFERRAL_FHIR_BASE#g" "$f")"
  n="$(printf '%s' "$payload" | jq '.entry | length')"
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "[dry-run] $name: $n entries -> POST $DIR"
    continue
  fi
  resp="$(mktemp)"
  code="$(printf '%s' "$payload" | curl -sS "${CURL_EXTRA[@]}" -o "$resp" -w '%{http_code}' \
    -X POST -H 'Content-Type: application/fhir+json' -H 'Accept: application/fhir+json' \
    --data-binary @- "$DIR")" || { echo "$name: curl failed" >&2; rm -f "$resp"; exit 1; }
  if [ "$code" != "200" ]; then
    echo "$name: HTTP $code" >&2
    jq -r '.issue[]? | "  \(.severity): \(.diagnostics // .details.text)"' "$resp" >&2 || cat "$resp" >&2
    rm -f "$resp"
    exit 1
  fi
  created="$(jq '[.entry[].response.status | select(startswith("201"))] | length' "$resp")"
  updated="$(jq '[.entry[].response.status | select(startswith("200"))] | length' "$resp")"
  echo "$name: $n entries ($created created, $updated updated)"
  total=$((total + n))
  rm -f "$resp"
done

echo "done: $total resources loaded"
