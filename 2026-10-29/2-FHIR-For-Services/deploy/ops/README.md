# Operating scripts (DiSP)

Copies of the scripts the operator runs from their home directory (`~/apply-scratch.sh` and so on). They exist as scripts, not as
long pasted commands, because long terminal lines wrap and break. All use `kustomize build overlays/<name> | kubectl-dw ...` and
only touch the objects of that overlay. `kubectl-dw` is the operator's wrapper: kubectl 1.24 with the DiSP context
`sue005-kubernetes` (the cluster is v1.24 and needs the old client for exec and port-forward).

| Script | Overlay | Effect |
|---|---|---|
| `apply-scratch.sh` | `disp-scratch` | apply in place (database kept) to the test stack, `https://qh-fhir-test.dw.csiro.au` |
| `reset-scratch.sh` | `disp-scratch` | delete and recreate the test stack (fresh database, new PVC) |
| `apply-live.sh` | `disp` | apply in place to the live stack, `https://aehrc-qh-connectathon-track-2.dw.csiro.au` |
| `reset-live.sh` | `disp` | delete and recreate the live stack (fresh database) |

After a reset the stack is empty: wait about 3 minutes, then load the seeds (`seed/load-directory.sh`, `seed/load-referrals.sh`),
then run `smoke/usecases.sh` and `smoke/smoke.sh`. See `../DEPLOYMENT.md` section 8.
