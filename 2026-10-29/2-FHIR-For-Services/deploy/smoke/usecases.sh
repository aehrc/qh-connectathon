#!/usr/bin/env bash
# Use-case acceptance checks for the Track 2 stack, derived from the two-day agenda (Services-Track-Two-Day-Agenda.md).
# Where smoke.sh asks "is the plumbing alive?", this asks "can a participant do what the agenda says?", through the UI
# (what a browser would call) and the FHIR APIs. Read-only: it creates nothing.
#
#   BASE_URL=https://host ./usecases.sh [--frog https://frog-host]
#
# PASS / FAIL / SKIP per check; exit 1 if any FAIL. SKIP means "this build of the UI does not have that screen" (for example the
# imaging filler, booking and /version features of Patient-Referral 1.0.0, which an older UI image predates), never "could not check".
set -u
BASE_URL="${BASE_URL:-https://aehrc-qh-connectathon-track-2.dw.csiro.au}"; BASE_URL="${BASE_URL%/}"
REF="$BASE_URL${REFERRAL_BASE:-/referral/fhir}"; DIR="$BASE_URL${DIRECTORY_BASE:-/directory/fhir}"
FROG=""; [ "${1:-}" = "--frog" ] && FROG="${2:-}"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
PASSN=0; FAILN=0; SKIPN=0
pass() { PASSN=$((PASSN+1)); printf 'PASS  %s\n' "$1"; }
fail() { FAILN=$((FAILN+1)); printf 'FAIL  %s -- %s\n' "$1" "${2:-}"; }
skip() { SKIPN=$((SKIPN+1)); printf 'SKIP  %s -- %s\n' "$1" "${2:-}"; }
# FHIR API calls ask for JSON only: with text/html among the Accept types HAPI answers with its HTML page instead of JSON.
get() { CODE=$(curl -s -m 60 -o "$WORK/body" -w '%{http_code}' -H 'Accept: application/fhir+json' "$1" 2>/dev/null); }
# UI calls (the Patient-Referral app) ask for HTML.
ui() { CODE=$(curl -s -m 60 -o "$WORK/body" -w '%{http_code}' -H 'Accept: text/html' "$1" 2>/dev/null); }
total() { get "$1"; jq -r '.total // empty' "$WORK/body" 2>/dev/null; }
text() { sed -E 's/<[^>]+>/ /g' "$WORK/body" | tr -s ' \n' ' '; }
need() { command -v "$1" >/dev/null || { echo "missing tool: $1" >&2; exit 2; }; }; need curl; need jq

echo "Track 2 use-case checks   UI $BASE_URL   referral $REF   directory $DIR"

echo "--- Day 1 AM: environment check and seed data review"
ui "$BASE_URL/"; [ "$CODE" = 200 ] && grep -q 'TEST ENVIRONMENT' "$WORK/body" && pass "UI loads and shows the 'test data only' banner" || fail "UI loads with the banner" "HTTP $CODE"
ui "$BASE_URL/version"; if [ "$CODE" = 404 ]; then skip "UI /version endpoint" "UI image predates versioning (Patient-Referral 1.0.0)"; else v=$(jq -r '.version // empty' "$WORK/body" 2>/dev/null); [ -n "$v" ] && pass "UI reports version $v (commit $(jq -r '.commit // "?"' "$WORK/body" | cut -c1-7))" || fail "UI /version" "HTTP $CODE, no version field"; fi
get "$REF/metadata"; [ "$CODE" = 200 ] && pass "referral server metadata" || fail "referral server metadata" "HTTP $CODE"
get "$DIR/metadata"; [ "$CODE" = 200 ] && pass "directory server metadata" || fail "directory server metadata" "HTTP $CODE"
n=$(total "$REF/Patient?_summary=count"); [ "${n:-0}" -ge 20 ] && pass "seed: $n patients" || fail "seed patients >= 20" "${n:-none}"
n=$(total "$REF/ServiceRequest?_summary=count"); [ "${n:-0}" -ge 22 ] && pass "seed: $n referrals (ServiceRequest)" || fail "seed referrals >= 22" "${n:-none}"
n=$(total "$DIR/HealthcareService?_summary=count"); [ "${n:-0}" -ge 31 ] && pass "seed: $n directory services" || fail "seed directory services >= 31" "${n:-none}"

echo "--- Day 1 Mid, Track A: discovery in the directory"
n=$(total "$DIR/HealthcareService?service-type=http://snomed.info/sct%7C310128004&_summary=count"); [ "${n:-0}" -ge 1 ] && pass "directory: CT services found by service-type ($n)" || fail "directory search by service-type" "${n:-none}"
n=$(total "$DIR/HealthcareService?location.address-city=Cairns&_summary=count"); [ "${n:-0}" -ge 1 ] && pass "directory: services found by city (Cairns: $n)" || fail "directory search by city" "${n:-none}"
n=$(total "$DIR/Organization?_summary=count"); [ "${n:-0}" -ge 11 ] && pass "directory: $n organisations to browse" || fail "directory organisations >= 11" "${n:-none}"
get "$DIR/HealthcareService?service-type=http://snomed.info/sct%7C310128004&_include=HealthcareService:organization&_include=HealthcareService:location&_count=5"
jq -e '[.entry[].resource.resourceType]|(index("Organization")!=null and index("Location")!=null)' "$WORK/body" >/dev/null 2>&1 && pass "directory: _include returns the organisation and location with the service" || fail "directory _include organisation+location"
# resolve the Endpoint that identifies the receiving referral server
get "$DIR/Endpoint?_count=100"; ep=$(jq -r '[.entry[].resource|select(.address|test("/referral/fhir"))|.address]|first // empty' "$WORK/body" 2>/dev/null)
if [ -n "$ep" ]; then
  # an Endpoint address may name another host than the one under test (for example seeded for a different stack): report which
  [ "$ep" = "$REF" ] && pass "Endpoint resolution: a directory Endpoint points at this stack's referral server" \
    || { get "$ep/metadata"; [ "$CODE" = 200 ] && pass "Endpoint resolution: a directory Endpoint ($ep) answers /metadata" || fail "Endpoint resolution" "directory Endpoint $ep does not answer (HTTP $CODE); reseed with load-directory.sh from this URL"; }
else fail "Endpoint resolution" "no directory Endpoint with a /referral/fhir address"; fi

echo "--- Day 1 Mid: browsing providers and patients in the UI"
for q in Cairns Moreton Toowoomba; do ui "$BASE_URL/provider-search?pdUnifiedQuery=$q"; c=$(grep -c 'list-group-item' "$WORK/body"); [ "$CODE" = 200 ] && [ "$c" -ge 1 ] && pass "UI provider search '$q': $c results" || fail "UI provider search '$q'" "HTTP $CODE, $c results"; done
ui "$BASE_URL/fhir/Provider/708175003"; opts=$(grep -oE '<option value="[^"]+"' "$WORK/body" | sed -E 's/<option value="//; s/"//' | grep -v '^05030000-' ); c=$(echo "$opts" | grep -c .)
[ "$c" -ge 6 ] && pass "UI 'Select Provider Organisation' (imaging) lists $c organisations" || fail "UI imaging provider dropdown" "$c organisations (expected >= 6)"
bad=0; for id in $opts; do get "$REF/Organization/$id"; [ "$CODE" = 200 ] || { bad=$((bad+1)); echo "      not on the referral server: $id (HTTP $CODE)"; }; done
[ "$bad" = 0 ] && pass "every organisation in the dropdown exists on the referral server" || fail "dropdown organisations resolve on the referral server" "$bad missing"
ui "$BASE_URL/fhir/Patients"; c=$(grep -c 'qhc-pat-' "$WORK/body"); [ "$CODE" = 200 ] && [ "$c" -ge 5 ] && pass "UI patient list shows seeded patients ($c rows on the first page)" || fail "UI patient list" "HTTP $CODE, $c rows"
ui "$BASE_URL/fhir/Patient/qhc-pat-01"; [ "$CODE" = 200 ] && text | grep -q 'Mitchell-Voss' && pass "UI patient detail opens (Harold Mitchell-Voss)" || fail "UI patient detail" "HTTP $CODE"
CODE=$(curl -s -m 60 -o "$WORK/body" -w '%{http_code}' -X POST -d 'q=mitchell&page=1&per_page=10' "$BASE_URL/fhir/search_patients"); [ "$CODE" = 200 ] && text | grep -q 'Mitchell' && pass "UI patient search finds 'mitchell'" || fail "UI patient search" "HTTP $CODE"
ui "$BASE_URL/fhir/indicationvalueset/expand?indication_display=pain"; c=$(grep -c 'indication-option' "$WORK/body"); [ "$CODE" = 200 ] && [ "$c" -ge 1 ] && pass "UI reason-for-request typeahead returns $c suggestions (terminology server)" || fail "UI indication typeahead" "HTTP $CODE, $c"

echo "--- Day 1 PM: referral creation and validation (API; smoke.sh creates and validates a full referral)"
for pair in referral-servicerequest:ServiceRequest referral-task:Task booking-slot:Slot; do pid=${pair%%:*}; rt=${pair#*:}; n=$(total "$REF/StructureDefinition?url=http://aehrc.csiro.au/fhir/radiology-referral/StructureDefinition/$pid&_summary=count"); [ "${n:-0}" -ge 1 ] && pass "IG profile $pid is loaded on the referral server" || fail "IG profile $pid loaded" "${n:-none}"; done
get "$REF/Task?_count=1"; [ "$CODE" = 200 ] && pass "referral Tasks readable" || fail "referral Tasks readable" "HTTP $CODE"

echo "--- Day 2 AM: filler triage and availability"
ui "$BASE_URL/api/organisations/with-tasks"; n=$(jq 'length' "$WORK/body" 2>/dev/null); [ "${n:-0}" -ge 6 ] && pass "UI filler organisation list: $n organisations with referrals" || fail "UI filler organisation list" "${n:-0} (the group Task.owner must be a resolvable Organization reference)"
n=$(total "$REF/Task?status=requested&_tag=http://terminology.hl7.org.au/CodeSystem/resource-tag%7Cfulfilment-task&_summary=count"); [ "${n:-0}" -ge 1 ] && pass "referrals waiting for triage: $n" || fail "referrals waiting for triage" "${n:-none}"
n=$(total "$REF/Task?owner=Organization/qhc-org-fill1&_summary=count"); [ "${n:-0}" -ge 1 ] && pass "a filler finds its referrals by owner (Tropic Coast: $n)" || fail "filler finds referrals by owner" "${n:-none}"
n=$(total "$REF/Slot?status=free&_summary=count"); [ "${n:-0}" -ge 20 ] && pass "free slots published: $n" || fail "free slots >= 20" "${n:-none}"
ui "$BASE_URL/filler/imaging"; if [ "$CODE" = 404 ]; then skip "UI imaging filler screen (/filler/imaging)" "not in the deployed UI image; the image predates the booking/imaging screens"; else [ "$CODE" = 200 ] && pass "UI imaging filler screen loads" || fail "UI imaging filler screen" "HTTP $CODE"; fi
ui "$BASE_URL/filler"; [ "$CODE" = 200 ] && pass "UI specialist filler screen loads (note: it lists specialist referrals only, not radiology)" || fail "UI filler screen" "HTTP $CODE"

echo "--- Day 2 Mid, Track B: booking"
ui "$BASE_URL/booking/patient/qhc-pat-01/panel"; if [ "$CODE" = 404 ]; then skip "UI booking panel" "not in the deployed UI image (booking is API-driven here, decision C3); smoke.sh exercises Slot to Appointment"; else [ "$CODE" = 200 ] && pass "UI booking panel loads" || fail "UI booking panel" "HTTP $CODE"; fi
# the slot picker searches a fortnight ahead from today (or the request's start), so it is only meaningful when free slots fall in that window
ui "$BASE_URL/booking/sr/qhc-sr-0001/slots"
if [ "$CODE" = 404 ]; then skip "UI slot picker" "UI image predates the booking screens"
elif [ "$CODE" != 200 ]; then fail "UI slot picker" "HTTP $CODE"
else
  nxt=$(get "$REF/Slot?status=free&_count=1&_sort=start&_elements=start"; jq -r '.entry[0].resource.start // empty' "$WORK/body" 2>/dev/null)
  if grep -qi 'no free slots' "$WORK/body"; then
    if [ -n "$nxt" ] && [ "$(date -d "$nxt" +%s)" -gt "$(date -d '+14 days' +%s)" ]; then skip "UI slot picker offers slots" "next free slot ($nxt) is beyond the picker's 14-day window"; else fail "UI slot picker offers slots" "page says no free slots; next free slot: ${nxt:-none}"; fi
  else pass "UI slot picker offers free slots (next: $nxt)"; fi
fi
n=$(total "$REF/Appointment?status=booked&_summary=count"); [ "${n:-0}" -ge 1 ] && pass "booked appointments exist: $n" || fail "booked appointments" "${n:-none}"

echo "--- Day 2 PM: status tracking"
n=$(total "$REF/Task?status=completed&_summary=count"); [ "${n:-0}" -ge 1 ] && pass "completed referrals to track: $n tasks" || fail "completed referrals" "${n:-none}"
ui "$BASE_URL/fhir/Stats"; [ "$CODE" = 200 ] && [ "$(text | grep -oE 'ServiceRequests Summary [0-9]+ total' | grep -oE '[0-9]+')" -ge 22 ] 2>/dev/null && pass "UI statistics page counts the referrals" || fail "UI statistics page" "HTTP $CODE"
ui "$BASE_URL/fhir/Demographics"; [ "$CODE" = 200 ] && text | grep -q 'Male' && pass "UI demographics page renders from our data" || fail "UI demographics page" "HTTP $CODE"
ui "$BASE_URL/fhir/Dashboard"; [ "$CODE" = 200 ] && pass "UI dashboard loads" || fail "UI dashboard" "HTTP $CODE"

if [ -n "$FROG" ]; then
  echo "--- Conformance (frog-runner)"
  get "$FROG/api/version"; [ "$CODE" = 200 ] && pass "frog-runner is up" || fail "frog-runner is up" "HTTP $CODE"
fi

echo; echo "SUMMARY: $PASSN passed, $FAILN failed, $SKIPN skipped"
[ "$FAILN" = 0 ] && echo "RESULT: PASS" || echo "RESULT: FAIL"
exit $([ "$FAILN" = 0 ] && echo 0 || echo 1)
