# Seed HCPD directory - review notes (for Michael Osborne)

Draft by Claude, 2026-10-19. Status: **draft for review, not loaded anywhere** (the live DiSP
directory was only read / `$validate`d, never written). All data is fictional.

## What is here

Seven FHIR R4 transaction Bundles, every entry a `PUT` to a fixed id (`qhd-*`), loaded in numeric
order by `../load-directory.sh`:

| File | Resources | Notes |
|------|-----------|-------|
| `01-endpoints.json` | 25 Endpoint | per org: FHIR referral (REST) for all 11; Direct-style secure messaging for 8; FHIR messaging for 6 |
| `02-organizations.json` | 11 Organization | 4 public "HHS-like", 6 private/NFP imaging, 1 GP practice |
| `03-locations.json` | 16 Location | 15 physical sites in 13 Qld towns + 1 mobile unit (`MOBL`) |
| `04-healthcareservices.json` | 31 HealthcareService | 28 imaging + 3 non-imaging (see mix below) |
| `05-practitioners.json` | 36 Practitioner | fictional names; HPI-I, AHPRA (or peak-body for sonographers) |
| `06-practitionerroles.json` | 40 PractitionerRole | each role = one practitioner at one HealthcareService/Location |
| `07-provenance.json` | 15 Provenance | 11 `CREATE` (one per Organization) + 4 `UPDATE` with `targetPath` |

Sizes are slightly over the ~10/15/25/40/25 target in HealthcareService (31) and Practitioner (36);
all other counts are on target.

**Service mix (31):** X-ray 6, CT 4, MRI 4, ultrasound 3, nuclear medicine 3, and one each of
diagnostic imaging, radiology (general), mammography, breast screening, bone densitometry,
interventional radiology, obstetric ultrasound, paediatric nuclear medicine; non-imaging: cardiology
(Townsville), orthopaedics (Townsville), general practice (Toowong).

**Places (real towns, real postcodes):** Cairns 4870, Townsville 4810, Rockhampton 4700, Gladstone 4680,
Toowoomba 4350, Dalby 4405, Herston 4006, Caboolture 4510, Redcliffe 4020, Southport 4215,
Maroochydore 4558, Bundaberg 4670, Hervey Bay 4655, Mount Isa 4825, Toowong 4066.

Handy demo searches (all verified on a local HAPI after loading): `HealthcareService?service-type=310128004`
(4 CT services), `HealthcareService?location.address-city=Cairns` (4), `...location.address-postalcode=4006` (4),
`PractitionerRole?service=HealthcareService/qhd-hcs-15`, `Location?near=-27.447|153.027|20|km`.

## How it was built / conformance approach

- Pattern taken from the **IG's own examples** (`package/example/` in the HCPD `package.tgz`, version
  26.0.0 / 2026-09-08 CI build), not just `hcpd-balmain.json`. Note the existing Balmain seed is
  **not** conformant: it uses a different HPI-O system, bare Location identifiers and no ABN/address slices.
  It is left untouched and its ids (`hcpd-seed-*`) do not collide with these (`qhd-*`).
- Satisfies the profile minimums: Organization HPI-O (with status + classification extensions) + ABN +
  `active` + one `physical` address; Location 2 identifiers (source `RI` + local `XX`), `managingOrganization`,
  `type`/`physicalType`; HealthcareService source+local identifiers, `providedBy`, `type` (SNOMED,
  `service-type-1`), exactly one `location`; Practitioner HPI-I (with status), `recordedSexOrGender`, an
  officialName, a qualification with `code.text`; PractitionerRole source+local identifiers, `organization`,
  exactly one `code`, one `location`, one `healthcareService`; Endpoint source+local identifiers.
- Because HCPD fixes HealthcareService.location and PractitionerRole.location/healthcareService at max 1,
  a practitioner who works at two services has two PractitionerRoles (several do).

## Judgement calls (please sanity-check)

1. **Fictional identifiers.**
   - HPI-O `800362 9999 nnnnn c` and HPI-I `800361 9999 nnnnn c`: correct prefix, 16 digits, Luhn-valid (the AU Base
     invariants check this), but in a `9999` block I chose to look unmistakably synthetic. Not checked against the HI
     Service; cannot guarantee they are unissued.
   - ABNs are **checksum-valid** (AU Base checks the format) and in a `99 000 nnnn` body block. A valid checksum means
     a small chance (order 1%) any given number is a real ABN - spot-check on ABN Lookup before publishing outside the
     connectathon. AHPRA numbers are `MED`/`MRP` + `00099900nn` (e.g. `MED0009990001`).
   - Sonographers are not Ahpra-registered, so they carry a peak-body number (`pbprn` slice) with a made-up
     `ASAR-FICT-nnnnn` value.
2. **Names are fictional but real-sounding.** The four public bodies are invented ("Tropic Coast Health Service",
   "Capricorn Bay...", "Darling Plains...", "Brisbane River...") rather than the real Hospital and Health Services;
   please eyeball for accidental real-world matches, in particular practitioner names and the private groups
   (a made-up name cannot be guaranteed free of collisions). Street names are real Qld streets with illustrative
   numbers; coordinates are town-centre approximations. Phones use the ACMA fictional range `(07) 5550 nnnn`;
   emails/URLs use the reserved `.test` TLD (`*.qh-seed.test`).
3. **Not `example.org`.** The validator rejects `example.org`/`example.com` for Identifier.system and Endpoint.address
   ("Example URLs are not allowed"), so source identifiers use `https://github.com/aehrc/qh-connectathon/id/...`
   and endpoint addresses use `*.qh-seed.test`. Say if you prefer another namespace for the source-system identifier.
4. **Which endpoints are "live".** Six FHIR-referral Endpoints (orgs 01, 03, 04, 05, 06, 11) have address
   `https://REFERRAL_HOST/fhir` in the files; `load-directory.sh` rewrites that to `REFERRAL_FHIR_BASE`
   (default: same host as `DIRECTORY_URL`, path `/fhir`), so a referrer discovering those services lands on our
   in-cluster referral server. The other referral endpoints and all SMD/messaging endpoints point at
   non-resolving `.qh-seed.test` hosts on purpose (realistic "directory knows more than we run" negative cases).
   If you want every referral endpoint to resolve in-cluster, set all REST ones to the placeholder (one-line change
   to the generator logic - ask). On a re-run with a different `REFERRAL_FHIR_BASE` the PUTs simply overwrite.
5. **Terminology.** Service types are SNOMED CT-AU codes from `service-type-1` and role codes from
   `practitioner-role-1`, checked against Ontoserver (see residuals for the X-ray/mammography/BMD caveat).
   Interventional radiologists carry the plain "Radiologist" role code because the more specific AU code
   (`1726731000168104`) failed validation as "unknown in AU 20260930"; their qualification text still says
   "Interventional radiologist". The Toowoomba IR **service type** uses the valid "Interventional radiology service".
6. **Variety on purpose (to give search/filter demos something to chew on):** one service `notAccepting` new
   patients (Herston paediatric nuclear medicine); `serviceProvisionCode` NFE (public), FAP (private), MIX (GP);
   `appointmentRequired` false for walk-in X-ray; Saturday-morning hours at the "extended" sites;
   referral-information markdown per modality; one mobile unit with no street address; a tele-reporting
   radiologist (Herston) rostered at Mount Isa X-ray.
7. **Left out deliberately:** no `suppressed`/`deactivated` extensions (every record is plain active - add a couple if
   you want to demo suppression); no HSP-O orgs (all Organizations use HPI-O; HSP-O needs fixed classification `seed`);
   no ACN, Medicare provider numbers, IAR levels of care, G-NAF identifiers, coverage-area Locations or
   `Practitioner.telecom` (personal contact details are kept out on purpose); no timezone extension on
   `availableStartTime/EndTime` (see residuals); no bulk-export `Parameters` (not directory data).
8. **Provenance** is minimal and fictional: Provenance.target is max 1, so one per target; `entity.what` is an
   identifier-only reference to a made-up source record (nothing resolvable). The four UPDATEs carry `targetPath`s.
9. **IG defect noticed, not fixed:** `pbprn` fixes `Identifier.type` to coding `PRN` only but also patterns
   `type.text` - the two are contradictory when `text` is present, so the sonographer identifiers omit `type.text`.

## Validation performed

1. **Reference validator** (HL7 `validator_cli` 6.5.24, R4, IGs: HCPD 26.0.0 `package.tgz` from build.fhir.org,
   `hl7.fhir.au.base#6.0.0`, `hl7.fhir.au.core#2.0.0`, tx = `https://r4.ontoserver.csiro.au/fhir`). Bundles validated;
   per-resource profiles resolved from `meta.profile`.
   **Result: no structural / profile / cardinality / invariant errors.** All cross-references resolve (checked separately).
   Residual **errors (9 + 78, all environmental)** and warnings listed below.
2. **Live DiSP directory `$validate`** (read-only via `kubectl-dw port-forward svc/directory`, nothing persisted):
   1286 errors, **every one** "Unknown profile http://hl7.org.au/fhir/StructureDefinition/au-*|6.0.0" or "Slicing cannot
   be evaluated ... could not be resolved". Cause: the live directory loads only the HCPD package, with
   `HAPI_FHIR_IMPLEMENTATIONGUIDES_HCPD_FETCHDEPENDENCIES=false`, so AU Base 6.0.0 / AU Core 2.0.0 are not installed and
   any HCPD resource (including the IG's own examples - tested) cannot validate cleanly there. No other error classes
   appeared. **Recommendation:** if we want `$validate` to be demonstrable on the event directory, install
   `hl7.fhir.au.base#6.0.0` + `hl7.fhir.au.core#2.0.0` (+ `au.pd`) on that server; this is an infra change for Joern,
   not made here.
3. **Load test on a throw-away local HAPI** (`hapiproject/hapi:latest`, H2, container removed afterwards): first run
   167 created, second run 167 updated, 0 duplicates; spot searches above behave. This does **not** test the HCPD
   IG-enabled server (no IG in that container) - the real server may enforce profiles on write; if
   `HAPI_FHIR_VALIDATE...` style enforcement is on, the AU Base gap above will also reject writes there.

### Residual validator messages (all judged non-actionable; please confirm)

| Count | Message | Why left |
|-------|---------|----------|
| 78 (Endpoint) | `payloadMimeType` value not found in `http://hl7.org/fhir/ValueSet/mimetypes` ("System URI for urn:ietf:bcp:13 not found") | Ontoserver doesn't serve BCP-13; fires for any mime type (`application/fhir+json` etc.), including those in the IG's own Endpoint example. Values are correct. |
| 9 (HealthcareService) | `type` not in `service-type-1\|1.0.0`: X-ray `933537131000036109` (6), mammography `933536641000036105`, bone densitometry `1579081000168100`, paediatric nuclear medicine `1223251000168108` | The validator disagrees with Ontoserver: `$validate-code` against the same ValueSet/version on Ontoserver returns `result=true` for X-ray, and these codes appear in the unpinned `$expand` of `service-type-1`. Probably a version-pinning artefact in the validator's expansion. Kept because "X-ray" etc. are the services referrers will search for. Fallback if a real tx server rejects them: use `310125001` Radiology service. |
| ~100 | `dom-6` no narrative; `IdentifierType` "no suitable code" for `RI`/`XX`/`NATAS` etc.; "multiple matching profiles" for HPI-O/ABN/HPI-I/address; `Address.state` CodeSystem 'null'; Endpoint `payloadType` not in AU payload-type ValueSet | Same warnings the IG's own examples produce; pattern types are mandated by the HCPD profiles. |

## Things I could not verify / open questions

- Whether the **event HAPI** will accept these as written once the IG/AU Base are installed (see 2 and 3 above).
- Real-world collisions for names/ABNs/HPI numbers (see Judgement calls 1-2).
- `new-patient-availability` uses `accepting` / `notAccepting`; `iar-levels-of-care`, `service-eligibility` are not used.
- Whether you want the directory resources to be date-stamped (`meta.lastUpdated` is server-assigned on load; Provenance
  `recorded` is fixed at 2026-10-19).
- Do you want the **generator** kept in the repo? The files were produced by a Python script that is not committed
  (kept in the session scratchpad); say so and it can be added under `deploy/seed/`.

## Loading

```bash
# port-forward or ingress URL to the directory server
kubectl-dw -n aehrc-qh-connectathon-track-2 port-forward svc/directory 28081:8080 &
DIRECTORY_URL=http://localhost:28081/fhir deploy/seed/load-directory.sh        # not run against DiSP yet
DRY_RUN=1 DIRECTORY_URL=http://x/fhir deploy/seed/load-directory.sh             # no network
```

Optional: `REFERRAL_FHIR_BASE=https://<event-host>/fhir` to point the in-cluster FHIR referral Endpoints at the
referral server explicitly; `CURL_OPTS` for auth headers. Requires `curl` and `jq`.


Regenerate the bundles with `python3 generate.py` (deterministic; run in this directory).
