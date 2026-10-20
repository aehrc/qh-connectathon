#!/usr/bin/env bash
# Timestamped Track 2 smoke report: run before each event day (issue #14).
# Runs smoke.sh and usecases.sh against one stack and writes a Markdown report; exit 1 if either fails.
#
#   BASE_URL=https://track2.efiq.hospservices.net ./daily-report.sh [--frog https://track2-frog.efiq.hospservices.net] [--out DIR]
#
# Reports go to ./reports/<UTC time>-<host>.md by default (commit the ones worth keeping). Needs bash, curl, jq.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-https://aehrc-qh-connectathon-track-2.dw.csiro.au}"; BASE_URL="${BASE_URL%/}"
OUT="$HERE/reports"; FROG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --frog) FROG="${2:?--frog needs a URL}"; shift 2 ;;
    --out) OUT="${2:?--out needs a directory}"; shift 2 ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
mkdir -p "$OUT"
HOST="${BASE_URL#*://}"; HOST="${HOST%%/*}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT/$STAMP-$HOST.md"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT

ver=$(curl -s -m 20 "$BASE_URL/version" | jq -r '"v\(.version) (\(.commit[0:7]))"' 2>/dev/null); ver="${ver:-unknown}"
# the pinned Track 2 commit this script came from, so a report can be tied to the repo state
repo=$(git -C "$HERE" rev-parse --short HEAD 2>/dev/null || echo unknown)

echo "running smoke.sh ..." >&2;     BASE_URL="$BASE_URL" bash "$HERE/smoke.sh"    >"$T/smoke.txt" 2>&1; s1=$?
echo "running usecases.sh ..." >&2
if [ -n "$FROG" ]; then BASE_URL="$BASE_URL" bash "$HERE/usecases.sh" --frog "$FROG" >"$T/usecases.txt" 2>&1; else BASE_URL="$BASE_URL" bash "$HERE/usecases.sh" >"$T/usecases.txt" 2>&1; fi; s2=$?

sum() { grep -E '^SUMMARY' "$1" | tail -1; }
verdict=PASS; [ "$s1" = 0 ] && [ "$s2" = 0 ] || verdict=FAIL
{
  echo "# Track 2 smoke report: $verdict"
  echo
  echo "| | |"; echo "|---|---|"
  echo "| Time (UTC) | $(date -u '+%Y-%m-%d %H:%M:%S') (local $(date '+%H:%M %Z')) |"
  echo "| Stack | $BASE_URL |"
  echo "| UI version | $ver |"
  echo "| Repo commit | $repo |"
  echo "| smoke.sh | $(sum "$T/smoke.txt") |"
  echo "| usecases.sh | $(sum "$T/usecases.txt") |"
  echo
  echo "## Failures"; echo
  if grep -hE '^(FAIL|SKIP)' "$T/smoke.txt" "$T/usecases.txt" | grep -q .; then echo '```'; grep -hE '^(FAIL|SKIP)' "$T/smoke.txt" "$T/usecases.txt"; echo '```'; else echo "None (no FAIL or SKIP lines)."; fi
  echo; echo "## smoke.sh"; echo; echo '```'; cat "$T/smoke.txt"; echo '```'
  echo; echo "## usecases.sh"; echo; echo '```'; cat "$T/usecases.txt"; echo '```'
} >"$FILE"
echo "$verdict: $FILE"
[ "$verdict" = PASS ]
