#!/usr/bin/env bash
# Build CSIRO Smart Forms for GitHub Pages at /qh-connectathon/smart-forms/,
# with the Meld sandbox config. Output: ./dist
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SF_REF="${SF_REF:-6fe2eab}"          # aehrc/smart-forms commit the patch was made against
WORK="${WORK:-$HERE/.build}"

if [ ! -d "$WORK/smart-forms" ]; then
  git clone https://github.com/aehrc/smart-forms "$WORK/smart-forms"
fi
cd "$WORK/smart-forms"
git fetch -q origin && git checkout -q -f "$SF_REF"
git apply "$HERE/smart-forms-base-path.patch"

npm install
npm run build-all-deps-first-run
cd apps/smart-forms-app
SF_BASE_PATH=/qh-connectathon/smart-forms/ npm run build

rm -rf "$HERE/dist" && cp -R dist "$HERE/dist"
cp "$HERE/config.json" "$HERE/dist/config.json"
echo "Built $HERE/dist"
