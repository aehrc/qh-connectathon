#!/usr/bin/env bash
# Recreate the scratch Track 2 stack on DiSP with a fresh database (deletes scratch-* only, incl. its PVC).
set -euo pipefail
export PATH="$PATH:$HOME/.local/bin"
cd ~/git/qh-connectathon/2026-10-29/2-FHIR-For-Services/deploy/k8s
echo "== delete scratch stack"
kustomize build overlays/disp-scratch | kubectl-dw delete -f - --wait=true --ignore-not-found
echo "== apply scratch stack"
kustomize build overlays/disp-scratch | kubectl-dw apply -f -
echo "== done"
