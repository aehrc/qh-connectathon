#!/usr/bin/env bash
#
# k8s-install.sh — Stage 1: bring the Track 2 stack up on microk8s (single VM).
#
# Target: aehrc-qh-connectathon-track-2.it.csiro.au (Ubuntu 24.04), >= 8 GB RAM.
# Uses the SAME manifests (deploy/k8s/base + overlays/local) that promote to DiSP
# and AWS EKS — this validates them on a real Kubernetes before the cloud.
#
# Usage:
#   sudo ./k8s-install.sh            # installs microk8s + addons (sudo once), deploys the stack
#   ./k8s-install.sh --no-install    # skip microk8s install (already present), just deploy
#
# Idempotent: safe to re-run.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/k8s"
DO_INSTALL=1
[ "${1:-}" = "--no-install" ] && DO_INSTALL=0

say() { printf '\033[1;36m[k8s]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[k8s] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ---- 1. microk8s + addons --------------------------------------------------
if [ "$DO_INSTALL" = 1 ] && ! command -v microk8s >/dev/null; then
  say "Installing microk8s (needs sudo)…"
  sudo snap install microk8s --classic
  sudo usermod -aG microk8s "$USER"
  sudo mkdir -p ~/.kube && sudo chown -R "$USER" ~/.kube
  say "Added $USER to the microk8s group — run 'newgrp microk8s' or re-login, then re-run with --no-install."
fi
command -v microk8s >/dev/null || die "microk8s not available"

say "Waiting for microk8s to be ready…"
sudo microk8s status --wait-ready >/dev/null 2>&1 || microk8s status --wait-ready >/dev/null

say "Enabling addons (dns, hostpath-storage, ingress)…"
microk8s enable dns hostpath-storage ingress 2>&1 | grep -iE 'enabl|already' || true

# ---- 2. Build + import the referrer image ---------------------------------
say "Building the Patient-Referral image…"
if [ ! -d "$SCRIPT_DIR/Patient-Referral/.git" ]; then
  git clone --depth 1 https://github.com/mjosborne1/Patient-Referral.git "$SCRIPT_DIR/Patient-Referral"
fi
docker build -t patient-referral:local "$SCRIPT_DIR/Patient-Referral"
say "Importing the image into microk8s…"
docker save patient-referral:local | microk8s ctr image import -

# ---- 3. Deploy the manifests ----------------------------------------------
say "Applying deploy/k8s/overlays/local …"
microk8s kubectl apply -k "$K8S_DIR/overlays/local"

# ---- 4. Create the directory DB (hapi_dir) once Postgres is up ------------
say "Waiting for Postgres to be ready…"
microk8s kubectl -n track2 rollout status deploy/db --timeout=180s
DBPOD=$(microk8s kubectl -n track2 get pod -l app=db -o jsonpath='{.items[0].metadata.name}')
say "Ensuring the directory database (hapi_dir) exists…"
microk8s kubectl -n track2 exec "$DBPOD" -- sh -c \
  'psql -U hapi -tc "SELECT 1 FROM pg_database WHERE datname='"'"'hapi_dir'"'"'" | grep -q 1 || createdb -U hapi hapi_dir' \
  && say "  directory DB ready."

# Restart the directory deployment so it connects now that its DB exists
microk8s kubectl -n track2 rollout restart deploy/directory

# ---- 5. Wait for the FHIR servers, then run the seed Job ------------------
say "Waiting for the FHIR servers (this includes HAPI startup, ~1-2 min each)…"
microk8s kubectl -n track2 rollout status deploy/fhir --timeout=300s
microk8s kubectl -n track2 rollout status deploy/directory --timeout=300s

say "Running the seed Job (installs the HCPD + radiology-referral IG packages)…"
microk8s kubectl -n track2 delete job seed --ignore-not-found
microk8s kubectl -n track2 apply -f "$K8S_DIR/base/40-seed-job.yaml"
microk8s kubectl -n track2 wait --for=condition=complete job/seed --timeout=300s \
  && say "  seed complete." || say "  WARN: seed Job did not complete — check: microk8s kubectl -n track2 logs job/seed"

# ---- Done ------------------------------------------------------------------
IP=$(hostname -I | awk '{print $1}')
say "Stack up on microk8s. Ingress (add /etc/hosts or use the node IP):"
say "  Referrer   : http://${IP}/"
say "  Referral   : http://${IP}/fhir/metadata"
say "  Directory  : http://${IP}/directory/metadata  (HCPD IG)"
say "Inspect:  microk8s kubectl -n track2 get pods,svc,ingress"
say "Verify :  ./smoke/smoke.sh  (functional) and frog-runner (conformance) — see ../Deployment-Design.md §5"
