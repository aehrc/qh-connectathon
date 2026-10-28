#!/usr/bin/env bash
# Apply the LIVE Track 2 stack on DiSP IN PLACE (no delete, the database is kept): rolls out manifest changes such as adding
# the frog-runner. Use reset-live.sh instead when you want a fresh database.
set -euo pipefail
export PATH="$PATH:$HOME/.local/bin"
cd ~/git/qh-connectathon/2026-10-29/2-FHIR-For-Services/deploy/k8s
echo "== apply live Track 2 stack"
kustomize build overlays/disp | kubectl-dw apply -f -
echo "== done"
