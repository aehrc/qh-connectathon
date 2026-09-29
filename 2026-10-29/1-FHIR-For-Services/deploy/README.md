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

## Notes / known gotchas

- **HCPD isn't on public package registries** — the script fetches the tarball from the FHIR
  CI-build (`build.fhir.org/ig/AuDigitalHealth/HCPD/package.tgz`) and `$install`s it.
- **`au.pd: current`** is a floating dependency of HCPD — if `$install` fails on dependency
  resolution, pin it to a concrete AU PD version.
- **Confirm `TX_URL`** before the event (default is a placeholder Ontoserver URL).
- This is the **experiment/single-node** form. The staged path to DiSP and AWS EKS (Flux +
  Kustomize `base`/`overlays`) is in `../Deployment-Design.md`. TLS ingress is added for the event.
- Idempotent: safe to re-run. Config is written to `~/track2-stack/.env`.
