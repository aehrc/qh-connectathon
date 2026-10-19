#!/usr/bin/env bash
# Track 2 smoke test: drives the radiology referral story end to end over HTTP.
# Needs only bash, curl, jq. Works against compose / k8s / DiSP / AWS: just change BASE_URL.
# See README.md in this directory. All data is fictional and tagged for cleanup.
set -u

BASE_URL="${BASE_URL:-https://aehrc-qh-connectathon-track-2.dw.csiro.au}"
BASE_URL="${BASE_URL%/}"
REFERRAL_BASE="${REFERRAL_BASE:-/fhir}"
DIRECTORY_BASE="${DIRECTORY_BASE:-/directory/fhir}"
TX_URL="${TX_URL:-https://r4.ontoserver.csiro.au/fhir}"
TX_URL="${TX_URL%/}"
IG_CANON="${IG_CANON:-http://aehrc.csiro.au/fhir/radiology-referral}"
HCPD_CANON="${HCPD_CANON:-http://digitalhealth.gov.au/fhir/hcpd/StructureDefinition}"
CURL_TIMEOUT="${CURL_TIMEOUT:-30}"
CLEANUP=1

usage() {
  cat <<USAGE
Usage: BASE_URL=... [DIRECTORY_BASE=/directory/fhir] [TX_URL=...] $0 [--no-cleanup] [--help]
  BASE_URL        default https://aehrc-qh-connectathon-track-2.dw.csiro.au
  REFERRAL_BASE   default /fhir
  DIRECTORY_BASE  default /directory/fhir (the directory HAPI serves under /directory)
  DIRECTORY_URL   full directory FHIR base; overrides BASE_URL+DIRECTORY_BASE (e.g. a port-forward)
  TX_URL          default https://r4.ontoserver.csiro.au/fhir
  --no-cleanup    leave the tagged test resources on the referral server
Exit code: 0 all steps passed, 1 any failure, 2 usage error.
USAGE
}
for a in "$@"; do
  case "$a" in
    --no-cleanup) CLEANUP=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $a" >&2; usage >&2; exit 2 ;;
  esac
done
for t in curl jq; do command -v "$t" >/dev/null || { echo "missing required tool: $t" >&2; exit 2; }; done

REF="$BASE_URL$REFERRAL_BASE"
DIR="${DIRECTORY_URL:-$BASE_URL$DIRECTORY_BASE}"
RUN_ID="smoke-$(date +%Y%m%d%H%M%S)-$$"
TAG_SYS="urn:qh-connectathon:smoke-test"
WORK="$(mktemp -d)"
CREATED=()          # "Type/id" in creation order
PASSES=0; FAILS=0; SKIPS=0
CODE=""; BODY="$WORK/body.json"

pass() { PASSES=$((PASSES+1)); echo "PASS  $1"; }
fail() { FAILS=$((FAILS+1)); echo "FAIL  $1${2:+ -- $2}"; }
skip() { SKIPS=$((SKIPS+1)); echo "SKIP  $1${2:+ -- $2}"; }

# http METHOD URL [json-file]; sets CODE, body in $BODY
http() {
  local m="$1" u="$2" d="${3:-}" args=()
  [ -n "$d" ] && args=(-H 'Content-Type: application/fhir+json' --data-binary "@$d")
  CODE=$(curl -sS -m "$CURL_TIMEOUT" -o "$BODY" -w '%{http_code}' -X "$m" \
    -H 'Accept: application/fhir+json' "${args[@]}" "$u" 2>"$WORK/curl.err") || CODE="000"
  [ -s "$BODY" ] || : > "$BODY"
}
oo_msg() { jq -r '[.issue[]? | select(.severity=="error" or .severity=="fatal") | .diagnostics // .details.text // .code] | .[0:3] | join(" | ")' "$BODY" 2>/dev/null; }
err_detail() { local m; m="$(oo_msg)"; [ -z "$m" ] && m="$(head -c 160 "$WORK/curl.err" 2>/dev/null)"; echo "HTTP $CODE ${m:+$m}"; }

cleanup() {
  if [ "$CLEANUP" -eq 1 ] && [ "${#CREATED[@]}" -gt 0 ]; then
    echo "--- cleanup: deleting ${#CREATED[@]} test resources"
    local i bad=0
    for ((i=${#CREATED[@]}-1; i>=0; i--)); do
      http DELETE "$REF/${CREATED[$i]}"
      case "$CODE" in 200|204|404|410) ;; *) bad=$((bad+1)); echo "WARN  could not delete ${CREATED[$i]} (HTTP $CODE)";; esac
    done
    [ "$bad" -eq 0 ] && echo "cleanup OK" || echo "cleanup incomplete; resources are tagged $TAG_SYS|$RUN_ID"
  elif [ "${#CREATED[@]}" -gt 0 ]; then
    echo "--- left in place (--no-cleanup), tag $TAG_SYS|$RUN_ID :"; printf '    %s\n' "${CREATED[@]}"
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# create_res FILE  -> sets NEWID (Type/id); returns 1 on failure
NEWID=""
create_res() {
  http POST "$REF/$(jq -r .resourceType "$1")" "$1"
  if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    NEWID="$(jq -r '.resourceType+"/"+.id' "$BODY")"; CREATED+=("$NEWID"); return 0
  fi
  return 1
}
# update_res FILE Type/id
update_res() { http PUT "$REF/$2" "$1"; [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; }
# tagged: stdin json -> adds smoke tag
tagged() { jq --arg s "$TAG_SYS" --arg c "$RUN_ID" '.meta.tag = ((.meta.tag // []) + [{system:$s,code:$c}])'; }

echo "Track 2 smoke test  run=$RUN_ID"
echo "  referral  $REF"; echo "  directory $DIR"; echo "  tx        $TX_URL"; echo

# ---- 1. TLS --------------------------------------------------------------
case "$BASE_URL" in
  https://*)
    out=$(curl -sS -m "$CURL_TIMEOUT" -o /dev/null -w '%{ssl_verify_result} %{http_code} %{http_version}' "$BASE_URL/" 2>"$WORK/curl.err") && rc=0 || rc=$?
    if [ "$rc" -eq 0 ] && [ "${out%% *}" = "0" ]; then pass "TLS handshake and certificate verify ($BASE_URL)"
    else fail "TLS handshake and certificate verify ($BASE_URL)" "curl rc=$rc verify=${out%% *} $(head -c 160 "$WORK/curl.err")"; fi ;;
  *) skip "TLS handshake" "BASE_URL is not https" ;;
esac

# ---- 2. Referrer UI ------------------------------------------------------
http GET "$BASE_URL/"
[ "$CODE" = "200" ] && pass "referrer UI GET / -> 200" || fail "referrer UI GET /" "HTTP $CODE"

# ---- 3. Metadata ---------------------------------------------------------
http GET "$REF/metadata"
if [ "$CODE" = "200" ] && [ "$(jq -r .resourceType "$BODY")" = "CapabilityStatement" ]; then
  pass "referral $REFERRAL_BASE/metadata -> 200 ($(jq -r '.software.name+" "+.software.version+", FHIR "+.fhirVersion' "$BODY"))"
  REF_OK=1
else fail "referral $REFERRAL_BASE/metadata" "$(err_detail)"; REF_OK=0; fi

http GET "$DIR/metadata"
if [ "$CODE" = "200" ] && [ "$(jq -r .resourceType "$BODY")" = "CapabilityStatement" ]; then
  pass "directory $DIR/metadata -> 200"; DIR_OK=1
else fail "directory $DIR/metadata" "$(err_detail) (try DIRECTORY_BASE=/directory/fhir)"; DIR_OK=0; fi

# ---- 4. Directory content ------------------------------------------------
if [ "$DIR_OK" = 1 ]; then
  http GET "$DIR/StructureDefinition?url:below=$HCPD_CANON&_summary=count"
  n=$(jq -r '.total // 0' "$BODY" 2>/dev/null)
  if [ "$CODE" = "200" ] && [ "${n:-0}" -gt 0 ]; then pass "directory has $n HCPD StructureDefinitions"
  else fail "directory HCPD StructureDefinitions present" "$(err_detail), total=${n:-?}"; fi
  http GET "$DIR/StructureDefinition?url=$HCPD_CANON/hcpd-healthcareservice&_summary=count"
  [ "$CODE" = "200" ] && [ "$(jq -r '.total // 0' "$BODY")" -ge 1 ] \
    && pass "directory has hcpd-healthcareservice profile" || fail "directory hcpd-healthcareservice profile" "$(err_detail)"

  http GET "$DIR/HealthcareService?_include=HealthcareService:organization&_include=HealthcareService:location&_count=10"
  hs=$(jq -r '[.entry[]?.resource | select(.resourceType=="HealthcareService")] | length' "$BODY" 2>/dev/null)
  if [ "$CODE" = "200" ] && [ "${hs:-0}" -ge 1 ]; then
    pass "directory search returns $hs seeded HealthcareService (with _include)"
    HCS_ID=$(jq -r '[.entry[].resource | select(.resourceType=="HealthcareService")][0].id' "$BODY")
    HCS_ORG=$(jq -r '[.entry[].resource | select(.resourceType=="HealthcareService")][0].providedBy.reference // empty' "$BODY")
    HCS_NAME=$(jq -r '[.entry[].resource | select(.resourceType=="HealthcareService")][0].name // empty' "$BODY")
  else fail "directory search returns seeded HealthcareService" "$(err_detail), found=${hs:-0}"; HCS_ID=""; fi
  http GET "$DIR/HealthcareService?service-type=http://snomed.info/sct%7C310128004&_summary=count"
  [ "$CODE" = "200" ] && [ "$(jq -r '.total // 0' "$BODY")" -ge 1 ] \
    && pass "directory search by service-type (SNOMED 310128004) matches" || fail "directory search by service-type 310128004" "$(err_detail)"
else
  for s in "directory HCPD StructureDefinitions" "directory HealthcareService search"; do skip "$s" "directory metadata failed"; done
  HCS_ID=""
fi
HCS_ID="${HCS_ID:-hcpd-seed-hcs-1}"

# ---- 5. Referral workflow ------------------------------------------------
if [ "$REF_OK" != 1 ]; then
  skip "referral/triage/book/track workflow" "referral server unreachable"
else
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  START=$(date -u -d '+7 days' +%Y-%m-%dT09:00:00Z); END=$(date -u -d '+7 days' +%Y-%m-%dT09:30:00Z)
  PGN="SMOKE-$RUN_ID"; PGN_SYS="http://aehrc.csiro.au/fhir/radiology-referral/sid/placer-group-number"
  WF=1   # workflow still healthy?
  mk() { # name json
    printf '%s' "$2" | tagged > "$WORK/$1.json"
  }

  mk patient '{"resourceType":"Patient","identifier":[{"system":"urn:qh-connectathon:smoke-patient","value":"'"$RUN_ID"'"}],"name":[{"family":"Smoketest","given":["Fictional"]}],"gender":"other","birthDate":"1980-01-01"}'
  mk filler '{"resourceType":"Organization","active":true,"name":"Smoke Test Imaging (fictional)"}'
  mk requesterorg '{"resourceType":"Organization","active":true,"name":"Smoke Test GP Clinic (fictional)"}'
  for f in patient filler requesterorg; do
    if create_res "$WORK/$f.json"; then eval "ID_$f=$NEWID"; else fail "create fixture $f" "$(err_detail)"; WF=0; fi
  done
  if [ "$WF" = 1 ]; then
    mk pract '{"resourceType":"Practitioner","name":[{"family":"Smoketest","given":["Dr Fictional"]}]}'
    create_res "$WORK/pract.json" && ID_pract=$NEWID || { fail "create fixture Practitioner" "$(err_detail)"; WF=0; }
  fi
  if [ "$WF" = 1 ]; then
    mk prole '{"resourceType":"PractitionerRole","active":true,"practitioner":{"reference":"'"$ID_pract"'"},"organization":{"reference":"'"$ID_requesterorg"'"}}'
    create_res "$WORK/prole.json" && ID_prole=$NEWID || { fail "create fixture PractitionerRole" "$(err_detail)"; WF=0; }
  fi

  # Profile-conformant bodies (profile claimed in meta.profile so $validate checks them).
  prof() { echo "$IG_CANON/StructureDefinition/$1"; }
  if [ "$WF" = 1 ]; then
    mk sr '{"resourceType":"ServiceRequest","meta":{"profile":["'"$(prof referral-servicerequest)"'"]},
      "identifier":[{"system":"'"$PGN_SYS"'","value":"'"$PGN-1"'"}],
      "requisition":{"type":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/v2-0203","code":"PGN"}]},"system":"'"$PGN_SYS"'","value":"'"$PGN"'"},
      "status":"active","intent":"order",
      "category":[{"coding":[{"system":"http://snomed.info/sct","code":"3457005","display":"Patient referral"}]},{"coding":[{"system":"http://snomed.info/sct","code":"363679005","display":"Imaging"}]}],
      "priority":"routine",
      "code":{"coding":[{"system":"http://snomed.info/sct","code":"432370003","display":"CT of abdomen and pelvis with contrast"}],"text":"CT abdomen and pelvis with contrast"},
      "subject":{"reference":"'"$ID_patient"'"},"authoredOn":"'"$NOW"'",
      "requester":{"reference":"'"$ID_prole"'"},
      "performer":[{"reference":"HealthcareService/'"$HCS_ID"'","display":"'"${HCS_NAME:-Directory service}"'"}],
      "note":[{"text":"Smoke test referral, fictional data."}]}'
    mk group '{"resourceType":"Task","meta":{"profile":["http://hl7.org.au/fhir/ereq/StructureDefinition/au-erequesting-task-group"]},
      "groupIdentifier":{"type":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/v2-0203","code":"PGN"}]},"system":"'"$PGN_SYS"'","value":"'"$PGN"'"},
      "status":"requested","intent":"order","code":{"coding":[{"system":"http://hl7.org/fhir/CodeSystem/task-code","code":"fulfill"}]},
      "for":{"reference":"'"$ID_patient"'"},"authoredOn":"'"$NOW"'","requester":{"reference":"'"$ID_prole"'"},"owner":{"reference":"'"$ID_filler"'"}}'

    # Referral creation: create SR first, then group Task and Referral Task referencing it.
    if create_res "$WORK/sr.json"; then ID_sr=$NEWID; pass "create referral ServiceRequest ($ID_sr)"
    else fail "create referral ServiceRequest" "$(err_detail)"; WF=0; fi
  fi
  if [ "$WF" = 1 ]; then
    if create_res "$WORK/group.json"; then ID_group=$NEWID; else fail "create Group Task" "$(err_detail)"; WF=0; fi
  fi
  if [ "$WF" = 1 ]; then
    mk task '{"resourceType":"Task","meta":{"profile":["'"$(prof referral-task)"'"],"tag":[{"system":"http://terminology.hl7.org.au/CodeSystem/resource-tag","code":"fulfilment-task"}]},
      "identifier":[{"system":"'"$PGN_SYS"'","value":"'"$PGN-1"'"}],
      "groupIdentifier":{"type":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/v2-0203","code":"PGN"}]},"system":"'"$PGN_SYS"'","value":"'"$PGN"'"},
      "partOf":[{"reference":"'"$ID_group"'"}],
      "status":"requested","intent":"order","priority":"routine",
      "code":{"coding":[{"system":"http://hl7.org/fhir/CodeSystem/task-code","code":"fulfill"}]},
      "focus":{"reference":"'"$ID_sr"'"},"for":{"reference":"'"$ID_patient"'"},"authoredOn":"'"$NOW"'",
      "requester":{"reference":"'"$ID_prole"'"},"owner":{"reference":"'"$ID_filler"'"}}'
    if create_res "$WORK/task.json"; then ID_task=$NEWID; pass "create referral Task status=requested ($ID_task)"
    else fail "create referral Task" "$(err_detail)"; WF=0; fi
  fi

  # Triage
  if [ "$WF" = 1 ]; then
    http GET "$REF/Task?owner=$ID_filler&status=requested&_tag=$TAG_SYS%7C$RUN_ID"
    [ "$CODE" = "200" ] && [ "$(jq -r '.total // (.entry|length) // 0' "$BODY")" -ge 1 ] \
      && pass "filler finds new work: Task?owner=...&status=requested" || fail "filler task search (owner,status=requested)" "$(err_detail)"
    jq '.status="accepted"' "$WORK/task.json" | jq --arg id "${ID_task#Task/}" '.id=$id' > "$WORK/task2.json"
    if update_res "$WORK/task2.json" "$ID_task"; then
      http GET "$REF/$ID_task"
      [ "$(jq -r .status "$BODY")" = "accepted" ] && pass "triage: Task -> accepted" || fail "triage: Task status read-back" "got $(jq -r .status "$BODY")"
    else fail "triage: Task -> accepted" "$(err_detail)"; WF=0; fi
  fi

  # Availability + book (Slot -> Appointment, API only)
  if [ "$WF" = 1 ]; then
    mk sched '{"resourceType":"Schedule","meta":{"profile":["'"$(prof booking-schedule)"'"]},"active":true,
      "serviceType":[{"coding":[{"system":"http://snomed.info/sct","code":"310128004","display":"Computed tomography service"}]}],
      "actor":[{"reference":"HealthcareService/'"$HCS_ID"'"}],
      "planningHorizon":{"start":"'"$NOW"'","end":"'"$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)"'"}}'
    # Schedule.actor must resolve locally in HAPI unless referential integrity is off; fall back to the filler Organization.
    create_res "$WORK/sched.json" || { jq --arg o "$ID_filler" '.actor=[{reference:$o}]' "$WORK/sched.json" > "$WORK/sched2.json"; create_res "$WORK/sched2.json"; }
    if [ -n "$NEWID" ] && [ "${NEWID%%/*}" = "Schedule" ]; then ID_sched=$NEWID; pass "publish availability: Schedule ($ID_sched)"
    else fail "publish availability: Schedule" "$(err_detail)"; WF=0; fi
  fi
  if [ "$WF" = 1 ]; then
    mk slot '{"resourceType":"Slot","meta":{"profile":["'"$(prof booking-slot)"'"]},
      "serviceType":[{"coding":[{"system":"http://snomed.info/sct","code":"310128004","display":"Computed tomography service"}]}],
      "schedule":{"reference":"'"$ID_sched"'"},"status":"free","start":"'"$START"'","end":"'"$END"'"}'
    if create_res "$WORK/slot.json"; then ID_slot=$NEWID; else fail "create free Slot" "$(err_detail)"; WF=0; fi
  fi
  if [ "$WF" = 1 ]; then
    http GET "$REF/Slot?schedule=$ID_sched&status=free&start=ge${START%T*}"
    if [ "$CODE" = "200" ] && [ "$(jq -r '[.entry[]?.resource.id]|index("'"${ID_slot#Slot/}"'") != null' "$BODY")" = "true" ]; then
      pass "referrer finds free Slot: Slot?schedule=...&status=free"
    else fail "referrer search free Slot" "$(err_detail)"; fi
    mk appt '{"resourceType":"Appointment","meta":{"profile":["'"$(prof referral-appointment)"'"]},"status":"proposed",
      "serviceType":[{"coding":[{"system":"http://snomed.info/sct","code":"310128004"}]}],
      "start":"'"$START"'","end":"'"$END"'","created":"'"${NOW%T*}"'",
      "slot":[{"reference":"'"$ID_slot"'"}],"basedOn":[{"reference":"'"$ID_sr"'"}],
      "participant":[{"actor":{"reference":"'"$ID_patient"'"},"status":"accepted"},{"actor":{"reference":"HealthcareService/'"$HCS_ID"'"},"status":"accepted"}]}'
    if create_res "$WORK/appt.json"; then ID_appt=$NEWID; pass "book: Appointment status=proposed against Slot ($ID_appt)"
    else fail "book: create Appointment" "$(err_detail)"; WF=0; fi
  fi
  if [ "$WF" = 1 ]; then
    # Filler confirms: Appointment booked, Slot busy, Task in-progress / service-booked.
    jq '.status="booked"' "$WORK/appt.json" | jq --arg id "${ID_appt#Appointment/}" '.id=$id' > "$WORK/appt2.json"
    jq '.status="busy"'   "$WORK/slot.json" | jq --arg id "${ID_slot#Slot/}" '.id=$id' > "$WORK/slot2.json"
    jq '.status="in-progress" | .businessStatus={"coding":[{"system":"http://terminology.hl7.org.au/CodeSystem/task-business-status","code":"service-booked"}]}' "$WORK/task2.json" > "$WORK/task3.json"
    if update_res "$WORK/appt2.json" "$ID_appt" && update_res "$WORK/slot2.json" "$ID_slot" && update_res "$WORK/task3.json" "$ID_task"; then
      pass "filler confirms: Appointment booked, Slot busy, Task in-progress/service-booked"
    else fail "filler confirms booking" "$(err_detail)"; WF=0; fi
  fi
  # Track
  if [ "$WF" = 1 ]; then
    http GET "$REF/$ID_task"; ts=$(jq -r '.status+"/"+(.businessStatus.coding[0].code // "")' "$BODY")
    [ "$ts" = "in-progress/service-booked" ] && pass "track: Task reads in-progress/service-booked" || fail "track: Task state" "got $ts"
    http GET "$REF/Appointment?based-on=$ID_sr&status=booked"
    [ "$CODE" = "200" ] && [ "$(jq -r '.total // (.entry|length) // 0' "$BODY")" -ge 1 ] \
      && pass "track: Appointment?based-on=ServiceRequest&status=booked" || fail "track: Appointment search" "$(err_detail)"
    http GET "$REF/Slot/${ID_slot#Slot/}"
    [ "$(jq -r .status "$BODY")" = "busy" ] && pass "track: Slot now busy" || fail "track: Slot status" "got $(jq -r .status "$BODY")"
  else
    skip "triage/book/track remaining steps" "earlier workflow step failed"
  fi

  # ---- 6. $validate against radiology-referral IG profiles -----------------
  echo "--- \$validate against $IG_CANON"
  for pair in "referral-servicerequest:ServiceRequest:sr" "referral-task:Task:task" "booking-schedule:Schedule:sched" \
              "booking-slot:Slot:slot" "referral-appointment:Appointment:appt"; do
    pid=${pair%%:*}; rest=${pair#*:}; rt=${rest%%:*}; fn=${rest#*:}
    f="$WORK/$fn.json"
    if [ ! -s "$f" ]; then skip "\$validate $rt vs $pid" "resource not built (earlier step failed)"; continue; fi
    http GET "$REF/StructureDefinition?url=$(prof "$pid")&_summary=count"
    if [ "$CODE" = "200" ] && [ "$(jq -r '.total // 0' "$BODY")" = "0" ]; then
      fail "\$validate $rt vs $pid" "profile not loaded on referral server (IG package missing)"; continue
    fi
    # POST the resource itself: it claims the profile in meta.profile. (Passing the profile as a
    # Parameters valueCanonical makes HAPI fail with "Failed to retrieve profile url=CanonicalType[...]".)
    http POST "$REF/$rt/\$validate" "$f"
    # Known HAPI limitation: its built-in v2-0203 table lacks PGN, so Task.groupIdentifier.type fails the
    # 'Order Identifier Type' binding; the HL7 validator accepts it. Ignored here, see deploy/IG-PINNING.md s6.
    KNOWN_RE="None of the codings provided are in the value set 'Order Identifier Type'"
    errs=$(jq -r --arg k "$KNOWN_RE" '[.issue[]? | select(.severity=="error" or .severity=="fatal") | select(((.diagnostics // "") | startswith($k)) | not)] | length' "$BODY" 2>/dev/null)
    if [ "$CODE" = "200" ] && [ "${errs:-1}" = "0" ]; then
      pass "\$validate $rt vs $pid (0 errors, $(jq -r '[.issue[]?|select(.severity=="warning")]|length' "$BODY") warnings)"
    else
      fail "\$validate $rt vs $pid" "HTTP $CODE, ${errs:-?} errors: $(oo_msg)"
    fi
  done
fi

# ---- 7. Terminology server ------------------------------------------------
http GET "$TX_URL/metadata?_summary=true"
[ "$CODE" = "200" ] && pass "tx $TX_URL/metadata reachable" || fail "tx metadata" "$(err_detail)"
VSURL="http://snomed.info/sct?fhir_vs=isa/363679005"
http GET "$TX_URL/ValueSet/\$expand?url=$(printf %s "$VSURL" | jq -sRr @uri)&filter=computed&count=5"
nx=$(jq -r '.expansion.contains|length' "$BODY" 2>/dev/null)
if [ "$CODE" = "200" ] && [ "${nx:-0}" -ge 1 ]; then pass "tx \$expand with filter (SNOMED imaging, filter=computed) -> $nx concepts"
else fail "tx \$expand with filter" "$(err_detail)"; fi
http GET "$TX_URL/CodeSystem/\$validate-code?url=http://snomed.info/sct&code=432370003"
if [ "$CODE" = "200" ] && [ "$(jq -r '[.parameter[]?|select(.name=="result")|.valueBoolean][0]' "$BODY")" = "true" ]; then
  pass "tx \$validate-code SNOMED 432370003 -> true"; else fail "tx \$validate-code SNOMED 432370003" "$(err_detail)"; fi
http GET "$TX_URL/ValueSet/\$validate-code?url=http://terminology.hl7.org.au/ValueSet/au-erequesting-request-status&system=http://hl7.org/fhir/request-status&code=active"
if [ "$CODE" = "200" ] && [ "$(jq -r '[.parameter[]?|select(.name=="result")|.valueBoolean][0]' "$BODY")" = "true" ]; then
  pass "tx \$validate-code au-erequesting-request-status#active -> true (IG binding)"
else fail "tx \$validate-code au-erequesting-request-status (IG binding)" "$(err_detail)"; fi

# ---- summary ---------------------------------------------------------------
echo
echo "SUMMARY: $PASSES passed, $FAILS failed, $SKIPS skipped  (run $RUN_ID)"
[ "$FAILS" -eq 0 ] && { echo "RESULT: PASS"; exit 0; } || { echo "RESULT: FAIL"; exit 1; }
