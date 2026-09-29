#!/usr/bin/env bash
#
# sync-sharepoint-github.sh
# -------------------------
# Keep the Track 2 (FHIR for Services) content in sync between the SharePoint
# document library (via `shit`) and the GitHub repository (via `git`).
#
# The two systems are NOT a plain mirror:
#   - SharePoint holds shared working materials (the "Daniel Joern Guy Paul
#     Michael O" folder): drafts, meeting notes, EOI data, investigations.
#   - GitHub holds version-controlled artifacts authored in the repo (README,
#     scenario, time plan, agenda, recap, slides) plus a copy of the shared
#     working materials.
#
# So the sync is directional:
#   pull  : SharePoint -> GitHub   refresh shared working materials into the repo
#   push  : GitHub     -> SharePoint publish repo artifacts to the library
#   both  : pull, then push (default)
#
# Safety:
#   - `shit push` writes versions to a SHARED SharePoint library. This script
#     defaults to --dry-run for the push direction; pass --apply to actually
#     write. The GitHub commit is local until you pass --apply too.
#   - Nothing is force-pushed to git main without --apply.
#
# Usage:
#   ./sync-sharepoint-github.sh [pull|push|both] [--apply] [-m "message"]
#
# Examples:
#   ./sync-sharepoint-github.sh                 # dry-run of both directions
#   ./sync-sharepoint-github.sh pull --apply    # refresh repo from SharePoint & commit
#   ./sync-sharepoint-github.sh push --apply -m "Publish Track 2 time plan"

set -euo pipefail

# ---- Configuration --------------------------------------------------------

SHIT_REPO="${SHIT_REPO:-/home/jg/shit/efiq-enabling-fhir-in-qh}"
GIT_REPO="${GIT_REPO:-/home/jg/git/qh-connectathon}"

# The shared working-materials folder, relative to each repo root.
SP_SHARED="FHIR in QH Connectathon - 2026/Connectathon Presentations and Resources/Track 2 - FHIR for Services/Daniel Joern Guy Paul Michael O"
GH_TRACK="2026-10-29/1-FHIR-For-Services"
GH_SHARED="$GH_TRACK/Daniel Joern Guy Paul Michael O"

# Repo-authored artifacts to publish back to SharePoint (relative to GH_TRACK).
# These land in the SharePoint Track 2 folder so the wider team can see them.
# Policy: publish human-readable deliverables (Markdown) and the rendered deck.
# Do NOT publish source/build material (slides/ Makefile, *.puml, *.svg,
# scripts/, the ig/ submodule) — that belongs in git only.
PUBLISH_FILES=(
  "README.md"
  "AGENTS.md"
  "QH-Radiology-Referral-Scenario-DRAFT.md"
  "Services-Track-Two-Day-Agenda.md"
  "Services-Track-Concrete-Time-Plan.md"
  "2026-09-28-Services-Track-Discussion-Recap.md"
  "Track2-KickOff-Deck.md"
  "Track2-KickOff-Deck.pptx"
)
# Where published artifacts go inside the SharePoint library (relative to SHIT_REPO).
SP_PUBLISH_DIR="FHIR in QH Connectathon - 2026/Connectathon Presentations and Resources/Track 2 - FHIR for Services"

# ---- Args -----------------------------------------------------------------

DIRECTION="both"
APPLY=0
MESSAGE="Sync Track 2 content ($(date +%Y-%m-%d))"

for arg in "$@"; do
  case "$arg" in
    pull|push|both) DIRECTION="$arg" ;;
    --apply)        APPLY=1 ;;
    -m) shift; MESSAGE="${1:-$MESSAGE}" ;;
    -m*)            MESSAGE="${arg#-m}" ;;
    -h|--help)      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  esac
done

log()  { printf '\033[1;36m[sync]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[sync]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[sync] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$SHIT_REPO/.shit" ] || die "Not a shit repo: $SHIT_REPO"
[ -d "$GIT_REPO/.git" ]   || die "Not a git repo: $GIT_REPO"
command -v shit >/dev/null || die "shit CLI not found"
command -v git  >/dev/null || die "git not found"

if [ "$APPLY" -eq 1 ]; then
  log "Mode: APPLY (changes will be written)"
else
  warn "Mode: DRY-RUN (no writes). Re-run with --apply to make changes."
fi

# ---- Pull: SharePoint -> GitHub -------------------------------------------

do_pull() {
  log "PULL: SharePoint -> GitHub"

  log "Fetching latest SharePoint metadata..."
  ( cd "$SHIT_REPO" && shit fetch )

  log "Pulling changed files from SharePoint..."
  ( cd "$SHIT_REPO" && shit pull "$SP_SHARED" -y )

  log "Syncing shared working materials into the repo..."
  local src="$SHIT_REPO/$SP_SHARED/"
  local dst="$GIT_REPO/$GH_SHARED/"
  mkdir -p "$dst"
  if [ "$APPLY" -eq 1 ]; then
    rsync -a --delete --exclude='.git' --exclude='.shit' "$src" "$dst"
  else
    rsync -an --delete --exclude='.git' --exclude='.shit' "$src" "$dst" \
      | sed 's/^/  would sync: /'
  fi

  # Commit into git
  ( cd "$GIT_REPO"
    if git diff --quiet -- "$GH_SHARED" && git diff --cached --quiet -- "$GH_SHARED" \
       && [ -z "$(git status --porcelain -- "$GH_SHARED")" ]; then
      log "No repo changes from SharePoint."
    elif [ "$APPLY" -eq 1 ]; then
      git add -- "$GH_SHARED"
      git commit -m "Sync shared working materials from SharePoint

$MESSAGE"
      git push origin "$(git branch --show-current)"
      log "Committed and pushed SharePoint changes to GitHub."
    else
      warn "Repo would change (dry-run). Files:"
      git status --porcelain -- "$GH_SHARED" | sed 's/^/  /'
    fi
  )
}

# ---- Push: GitHub -> SharePoint -------------------------------------------

do_push() {
  log "PUSH: GitHub -> SharePoint"

  log "Ensuring local repo is up to date with origin..."
  ( cd "$GIT_REPO" && git pull --ff-only origin "$(git branch --show-current)" || warn "git pull skipped (non-ff or offline)" )

  log "Copying published artifacts into the SharePoint working tree..."
  local copied=0
  for f in "${PUBLISH_FILES[@]}"; do
    local src="$GIT_REPO/$GH_TRACK/$f"
    local dst="$SHIT_REPO/$SP_PUBLISH_DIR/$f"
    if [ ! -f "$src" ]; then warn "skip (missing): $f"; continue; fi
    if [ "$APPLY" -eq 1 ]; then
      cp -p "$src" "$dst"; copied=$((copied+1))
    else
      if [ ! -f "$dst" ] || ! cmp -s "$src" "$dst"; then
        echo "  would publish: $f"
      fi
    fi
  done

  log "Pushing to SharePoint (creates versions in the shared library)..."
  if [ "$APPLY" -eq 1 ]; then
    ( cd "$SHIT_REPO" && shit push "$SP_PUBLISH_DIR" -m "$MESSAGE" --include-unbaselined -y )
    log "Pushed $copied artifact(s) to SharePoint."
  else
    ( cd "$SHIT_REPO" && shit push "$SP_PUBLISH_DIR" --dry-run --include-unbaselined ) || true
    warn "Dry-run only. Re-run with --apply to write to SharePoint."
  fi
}

# ---- Run ------------------------------------------------------------------

case "$DIRECTION" in
  pull) do_pull ;;
  push) do_push ;;
  both) do_pull; do_push ;;
esac

log "Done."
