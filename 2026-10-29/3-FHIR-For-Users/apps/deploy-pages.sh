#!/usr/bin/env bash
# Publish the track 3 apps to the gh-pages branch (GitHub Pages: /qh-connectathon/).
# Build each app first (e.g. smart-forms/build.sh).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
SITE="$(mktemp -d)"
trap 'git -C "$REPO" worktree remove --force "$SITE" 2>/dev/null || true' EXIT

git -C "$REPO" fetch -q origin gh-pages 2>/dev/null || true
if git -C "$REPO" rev-parse -q --verify origin/gh-pages >/dev/null; then
  git -C "$REPO" worktree add -q -B gh-pages "$SITE" origin/gh-pages
else
  git -C "$REPO" worktree add -q --detach "$SITE"
  git -C "$SITE" checkout -q --orphan gh-pages && git -C "$SITE" rm -rqf .
fi

rm -rf "$SITE/smart-forms" && cp -R "$HERE/smart-forms/dist" "$SITE/smart-forms"
# Pages has no SPA fallback: serve Smart Forms' index.html for unknown paths (e.g. /launch)
cp "$SITE/smart-forms/index.html" "$SITE/404.html"
cp "$HERE/site-index.html" "$SITE/index.html"
touch "$SITE/.nojekyll"

git -C "$SITE" add -A
git -C "$SITE" commit -q -m "Deploy track 3 apps from $(git -C "$REPO" rev-parse --short HEAD)" || echo "No changes"
git -C "$SITE" push -q origin gh-pages
echo "Deployed to https://aehrc.github.io/qh-connectathon/"
