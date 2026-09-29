# Track 2 — VM install

`install.sh` bootstraps the self-contained Track 2 stack on the host VM
(`aehrc-qh-connectathon-track-2.it.csiro.au`), **after the quota increase**
(see `../quota-increase-request.md` — ≥ 8 GB for experiments, 16 GB for the event).

## What it stands up

- **Referral FHIR server** — HAPI + `radiology-referral` IG (`:8080`)
- **Directory FHIR server** — HAPI + **HCPD IG** (`:8081`)
- **Postgres** — shared persistence
- **Referrer** — Patient-Referral app (`:5000`), pointed at the in-cluster FHIR + directory
- **Terminology** — **external** via `TX_URL` (the one external dependency)

## Run

```bash
# on the VM, after the quota increase
scp -r deploy sue005@aehrc-qh-connectathon-track-2.it.csiro.au:~/
ssh track2-vm
cd deploy
TX_URL=https://<confirmed-tx>/fhir ./install.sh      # installs docker (sudo once), builds the stack
# re-run in a fresh shell if it just added you to the docker group
```

### Two-phase (prep docker now, stack after resize)

The VM is ~2 GB until the quota lands — too small for the HAPI servers. To prep the
runtime now and bring up the stack after the resize:

```bash
sudo ./install.sh --docker-only     # now: installs docker, adds you to the docker group
newgrp docker                       # (or log out/in) so the group applies
# ...after the VM is resized to >= 8 GB...
TX_URL=https://<confirmed-tx>/fhir ./install.sh   # no sudo needed for the stack
```

## Stage 1 — microk8s (real Kubernetes on the VM)

`k8s-install.sh` brings the same stack up on **microk8s**, using the manifests in
`k8s/base` + `k8s/overlays/local` — the same source that promotes to DiSP and AWS EKS.
This validates the Kubernetes manifests (Deployments, Services, PVC, Ingress, seed Job)
on a real cluster before the cloud.

```bash
ssh track2-vm
cd ~/deploy
sudo ./k8s-install.sh        # installs microk8s + addons (dns, hostpath-storage, ingress)
newgrp microk8s              # so the group applies
./k8s-install.sh --no-install   # deploy the stack (builds+imports referrer, applies overlay, seeds IGs)
```

Endpoints (via the microk8s ingress, on the node IP):
- Referrer  `http://<vm-ip>/`
- Referral  `http://<vm-ip>/fhir/metadata`
- Directory `http://<vm-ip>/directory/metadata` (HCPD IG)

Inspect: `microk8s kubectl -n track2 get pods,svc,ingress`.
The overlay renders to 14 resources (`kustomize build k8s/overlays/local`) — validated.

## Notes / known gotchas

- **HCPD isn't on public package registries** — the script fetches the tarball from the FHIR
  CI-build (`build.fhir.org/ig/AuDigitalHealth/HCPD/package.tgz`) and `$install`s it.
- **`au.pd: current`** is a floating dependency of HCPD — if `$install` fails on dependency
  resolution, pin it to a concrete AU PD version.
- **Confirm `TX_URL`** before the event (default is a placeholder Ontoserver URL).
- This is the **experiment/single-node** form. The staged path to DiSP and AWS EKS (Flux +
  Kustomize `base`/`overlays`) is in `../Deployment-Design.md`. TLS ingress is added for the event.
- Idempotent: safe to re-run. Config is written to `~/track2-stack/.env`.
