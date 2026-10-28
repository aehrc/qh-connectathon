#!/usr/bin/env bash
# Publish the track 1 apps and kick-off decks to the gh-pages branch (GitHub Pages: /qh-connectathon/).
# Build each app first (e.g. smart-forms/build.sh). The decks are built here (needs marp, see
# ../decks/README.md) and published as /decks/<deck>.html with their images in /decks/img/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
DECKS="$HERE/../decks"
rm -rf "$DECKS/build/img"   # no stale screenshots
make -C "$DECKS" html </dev/null
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
rm -rf "$SITE/pam-dashboard" && mkdir -p "$SITE/pam-dashboard" && cp "$HERE/pam-dashboard/"*.html "$SITE/pam-dashboard/"
# Decks: the HTML embeds the theme; images are referenced as img/<deck>/... next to the HTML.
rm -rf "$SITE/decks" && mkdir -p "$SITE/decks" && cp "$DECKS/build/"[0-9]*.html "$SITE/decks/" \
  && cp -R "$DECKS/build/img" "$SITE/decks/img"
# Pages has no SPA fallback: serve Smart Forms' index.html for unknown paths (e.g. /launch)
cp "$SITE/smart-forms/index.html" "$SITE/404.html"
cp "$HERE/site-index.html" "$SITE/index.html"
touch "$SITE/.nojekyll"

git -C "$SITE" add -A
git -C "$SITE" commit -q -m "Deploy track 1 apps from $(git -C "$REPO" rev-parse --short HEAD)" || echo "No changes"
git -C "$SITE" push -q origin gh-pages
echo "Deployed to https://aehrc.github.io/qh-connectathon/"
