#!/usr/bin/env bash
# External availability check for the Track 2 stack on AWS (issue #14): the same addresses a participant uses, read-only, no test data written.
# Runs from GitHub Actions (.github/workflows/external-check.yml) so it sees the stack from outside CSIRO, or by hand:
#
#   ./external-check.sh                      # efiq.hospservices.net
#   ROOT=efiq.hospservices.net ./external-check.sh
#
# Needs bash, curl, jq. Exit 0 if every check passes, 1 otherwise. Appends a Markdown table to $GITHUB_STEP_SUMMARY when it is set.
set -u
ROOT="${ROOT:-efiq.hospservices.net}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
FAILS=0; ROWS=""

row() { # name status detail
  ROWS="$ROWS| $1 | $2 | $3 |"$'\n'
  printf '%-5s %s  %s\n' "$2" "$1" "$3"
  [ "$2" = PASS ] || FAILS=$((FAILS+1))
}
# get NAME URL: fetch (TLS verified, retried), leaves the body in $T/body and the HTTP code in $CODE
get() { # FHIR endpoints must be asked for JSON only: with text/html in Accept, HAPI answers with its HTML page
  local accept='text/html'; case "$2" in */fhir/*) accept='application/fhir+json';; */api/*|*/version) accept='application/json';; esac
  CODE=$(curl -sS -m 25 --retry 2 --retry-delay 3 --retry-all-errors -o "$T/body" -w '%{http_code}' -H "Accept: $accept" "$2" 2>"$T/err") || CODE="000"; }
ok() { # NAME URL [jq-or-grep test description]; test is a shell function name evaluated on the body
  local name="$1" url="$2" test="${3:-}" desc="${4:-HTTP 200}"
  get "$name" "$url"
  if [ "$CODE" != 200 ]; then row "$name" FAIL "HTTP $CODE $(head -c 120 "$T/err" | tr '\n' ' ')"; return; fi
  if [ -n "$test" ] && ! $test; then row "$name" FAIL "HTTP 200 but $desc is not true"; return; fi
  row "$name" PASS "$desc"
}

has_track2()   { grep -q "Track 2" "$T/body"; }
has_banner()   { grep -q "TEST ENVIRONMENT" "$T/body"; }
has_version()  { jq -e '.version' "$T/body" >/dev/null 2>&1; }
is_fhir_r4()   { jq -e '.resourceType=="CapabilityStatement" and .fhirVersion=="4.0.1"' "$T/body" >/dev/null 2>&1; }
total_ge1()    { jq -e '(.total // 0) >= 1' "$T/body" >/dev/null 2>&1; }

ok "landing page"          "https://track2.$ROOT/"                                   has_track2  "page names Track 2"
ok "app"                   "https://ui.$ROOT/"                                       has_banner  "page shows the test-data banner"
ok "app version"           "https://ui.$ROOT/version"                                has_version "/version reports a version"
ok "referral server"       "https://referrals.$ROOT/fhir/metadata"                  is_fhir_r4  "CapabilityStatement, FHIR 4.0.1"
ok "directory server"      "https://directory.$ROOT/fhir/metadata"                  is_fhir_r4  "CapabilityStatement, FHIR 4.0.1"
ok "referral seed present" "https://referrals.$ROOT/fhir/Patient?_summary=count"     total_ge1   "at least one Patient"
ok "directory seed present" "https://directory.$ROOT/fhir/HealthcareService?_summary=count" total_ge1 "at least one HealthcareService"
ok "conformance runner"    "https://conformance.$ROOT/api/version"                   ""          "HTTP 200"
ok "Caret"                 "https://v2.$ROOT/"                                       ""          "HTTP 200"

echo; [ "$FAILS" = 0 ] && echo "RESULT: PASS" || echo "RESULT: FAIL ($FAILS)"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "### Track 2 external check: $([ "$FAILS" = 0 ] && echo PASS || echo "FAIL ($FAILS)")"; echo; echo "Root: \`$ROOT\`, $(date -u '+%Y-%m-%d %H:%M UTC')"; echo
    echo "| Check | Result | Detail |"; echo "|---|---|---|"; printf '%s' "$ROWS"; } >> "$GITHUB_STEP_SUMMARY"
fi
[ "$FAILS" = 0 ]
