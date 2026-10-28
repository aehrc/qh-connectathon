#!/usr/bin/env bash
# Recreate the LIVE Track 2 stack on DiSP (aehrc-qh-connectathon-track-2.dw.csiro.au) with a fresh database and the
# current manifests (heap fix, /referral + /directory paths, pinned IG set, banner). Deletes only the objects of
# overlays/disp: db, fhir, directory, referrer, banner, seed job, ingress track2, config, db-secret, pvc pgdata.
# RIS (ris-*) and the scratch stack (scratch-*, qh-fhir-test) are not in that overlay and are not touched.
# Then reload the seeds (see the echo at the end).
set -euo pipefail
export PATH="$PATH:$HOME/.local/bin"
cd ~/git/qh-connectathon/2026-10-29/2-FHIR-For-Services/deploy/k8s
echo "== objects this run deletes and recreates:"
kustomize build overlays/disp | python3 -I -c "
import sys, yaml
for d in yaml.safe_load_all(sys.stdin):
    if d: print('   ', d['kind'], d['metadata']['name'])
"
echo "== delete live Track 2 stack"
kustomize build overlays/disp | kubectl-dw delete -f - --wait=true --ignore-not-found
echo "== apply live Track 2 stack"
kustomize build overlays/disp | kubectl-dw apply -f -
echo "== done. Next: wait about 3 minutes, then load the seeds:"
echo "   H=https://aehrc-qh-connectathon-track-2.dw.csiro.au"
echo "   DIRECTORY_URL=\$H/directory/fhir ./seed/load-directory.sh ; FHIR_BASE=\$H/referral/fhir ./seed/load-referrals.sh"
