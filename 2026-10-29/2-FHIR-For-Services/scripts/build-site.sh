#!/usr/bin/env bash
# Build the HTML pages linked from index.html (the Track 2 workshop guide).
#   - Kick-off deck -> Marp HTML slides
#   - Scenario, time plan, agenda -> pandoc HTML (GitHub-style heading ids)
# Requires: marp, pandoc. Run from anywhere: scripts/build-site.sh
set -euo pipefail
cd "$(dirname "$0")/.."

marp --no-stdin --html --allow-local-files Track2-KickOff-Deck.md -o Track2-KickOff-Deck.html

for doc in QH-Radiology-Referral-Scenario-DRAFT Services-Track-Concrete-Time-Plan Services-Track-Two-Day-Agenda; do
  title=$(grep -m1 '^# ' "$doc.md" | sed 's/^# //')
  pandoc -f gfm -t html5 --standalone \
    --metadata title="$title" \
    --variable title= \
    --include-in-header scripts/site/doc-style.html \
    --include-before-body scripts/site/doc-back.html \
    "$doc.md" -o "$doc.html"
done
echo "Built: Track2-KickOff-Deck.html and scenario/plan/agenda pages"
