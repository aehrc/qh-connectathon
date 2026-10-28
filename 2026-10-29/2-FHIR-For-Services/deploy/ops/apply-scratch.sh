#!/usr/bin/env bash
# Apply the scratch Track 2 stack on DiSP in place (no delete, database kept).
set -euo pipefail
export PATH="$PATH:$HOME/.local/bin"
cd ~/git/qh-connectathon/2026-10-29/2-FHIR-For-Services/deploy/k8s
echo "== apply scratch stack"
kustomize build overlays/disp-scratch | kubectl-dw apply -f -
echo "== done"
