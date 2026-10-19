#!/usr/bin/env python3
"""Generator for the Track 2 seed HCPD directory. Output: 7 FHIR transaction Bundles (deterministic).

Usage: python3 generate.py [OUT_DIR]   (default: the directory this script is in; regenerates 01-...07-*.json)
All organisations, people, identifiers, ABNs and numbers are FICTIONAL.
"""
import json, sys, uuid, os

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
PROF = "http://digitalhealth.gov.au/fhir/hcpd/StructureDefinition/"
CC = "http://digitalhealth.gov.au/fhir/cc/StructureDefinition/"
SNOMED = "http://snomed.info/sct"
V2 = "http://terminology.hl7.org/CodeSystem/v2-0203"
V2AU = "http://terminology.hl7.org.au/CodeSystem/v2-0203"
NS = uuid.UUID("5b1c1c28-3f0e-4f43-9f6f-2a6a7b1d0c11")  # namespace for deterministic local ids
SRC_SYS = "https://github.com/aehrc/qh-connectathon/id/track2-seed-source"
LOCAL_SYS = "http://digitalhealth.gov.au/fhir/hcpd/id/hcpd-local-identifier"
TZ = None  # timezone extension omitted deliberately (see REVIEW.md)


def luhn_check_digit(body):
    total = 0
    for i, ch in enumerate(reversed(body)):
        d = int(ch)
        if i % 2 == 0:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return str((10 - total % 10) % 10)


def hpio(n):  # 800362 + 9999 + 5-digit seq + check  => 16 digits, Luhn-valid
    body = "8003629999%05d" % n
    return body + luhn_check_digit(body)


def hpii(n):
    body = "8003619999%05d" % n
    return body + luhn_check_digit(body)


def abn(n):
    # find a checksum-valid ABN: 2 check digits + 9 body digits (body 99000nnnn)
    body = "99%07d" % n
    w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    for chk in range(100):
        s = "%02d%s" % (chk, body)
        digs = [int(c) for c in s]
        digs[0] -= 1
        if sum(a * b for a, b in zip(digs, w)) % 89 == 0:
            return s
    raise SystemExit("no abn")


def local_id(key):
    return str(uuid.uuid5(NS, key))


def id_source(val):
    return {"type": {"coding": [{"system": V2, "code": "RI", "display": "Resource Identifier"}]}, "system": SRC_SYS, "value": val}


def id_local(key):
    return {"type": {"coding": [{"system": V2, "code": "XX", "display": "Organization identifier"}]}, "system": LOCAL_SYS, "value": local_id(key)}


def hi_status(code="A"):
    return {"url": PROF + "hi-services-identifier-status", "valueCoding": {"system": "http://digitalhealth.gov.au/fhir/hcpd/CodeSystem/hi-services-identifier-status-cs", "code": code, "display": {"A": "Active", "D": "Deactivated", "R": "Retired"}[code]}}


def sct(code, display):
    return {"coding": [{"system": SNOMED, "code": code, "display": display}]}


def ref(t, i):
    return {"reference": "%s/%s" % (t, i)}


def entry(res):
    return {"fullUrl": "urn:uuid:" + str(uuid.uuid5(NS, "%s/%s" % (res["resourceType"], res["id"]))), "resource": res, "request": {"method": "PUT", "url": "%s/%s" % (res["resourceType"], res["id"])}}


def bundle(res_list):
    return {"resourceType": "Bundle", "type": "transaction", "entry": [entry(r) for r in res_list]}


def phone(n):
    return "(07) 5550 %04d" % n


# ----------------------------------------------------------------- organizations
# key, name, alias, town, postcode, street, classification, domain, ph
ORGS = [
    ("01", "Tropic Coast Health Service", "TCHS", "Cairns", "4870", "Level 1, 165 Sheridan Street", "network", "tropiccoast", -16.9186, 145.7781, "Public health service (fictional HHS stand-in) covering Cairns and Far North Queensland."),
    ("02", "Capricorn Bay Health Service", "CBHS", "Rockhampton", "4700", "50 Canning Street", "network", "capricornbay", -23.3781, 150.5136, "Public health service (fictional HHS stand-in) covering Rockhampton and Gladstone."),
    ("03", "Darling Plains Health Service", "DPHS", "Toowoomba", "4350", "120 Margaret Street", "network", "darlingplains", -27.5598, 151.9507, "Public health service (fictional HHS stand-in) covering Toowoomba and the Western Downs."),
    ("04", "Brisbane River Health Service", "BRHS", "Herston", "4006", "Butterfield Street", "network", "brisbaneriver", -27.4470, 153.0270, "Tertiary public health service (fictional HHS stand-in), Herston campus."),
    ("05", "Moreton Bay Imaging Partners", "MBIP", "Caboolture", "4510", "Level 2, 80 King Street", "seed", "moretonbayimaging", -27.0847, 152.9514, "Private diagnostic imaging group, Moreton Bay region."),
    ("06", "Southern Cross Diagnostic Imaging", "SCDI", "Southport", "4215", "Level 1, 45 Nerang Street", "seed", "southerncrossimaging", -27.9672, 153.4130, "Private diagnostic imaging group, Gold Coast."),
    ("07", "Sunshine Nuclear and PET Centre", "SNPC", "Maroochydore", "4558", "12 Horton Parade", "seed", "sunshinenuclear", -26.6590, 153.0940, "Private nuclear medicine and PET provider, Sunshine Coast."),
    ("08", "Burnett Valley Medical Imaging", "BVMI", "Bundaberg", "4670", "Level 1, 30 Bourbong Street", "seed", "burnettvalley", -24.8661, 152.3489, "Regional private imaging provider, Bundaberg and Hervey Bay."),
    ("09", "Outback Rural Imaging Outreach", "ORIO", "Mount Isa", "4825", "21 Miles Street", "seed", "outbackimaging", -20.7256, 139.4927, "Not-for-profit rural and remote imaging outreach, incl. a mobile screening unit."),
    ("10", "Toowong Family Medical Group", "TFMG", "Toowong", "4066", "Level 1, 9 Sherwood Road", "seed", "toowongfamily", -27.4850, 152.9830, "General practice (referrer) in Brisbane's inner west."),
    ("11", "Ross River Specialist Centre", "RRSC", "Townsville", "4810", "Level 3, 255 Flinders Street", "seed", "rossriverspecialist", -19.2590, 146.8169, "Private specialist consulting and imaging centre, Townsville."),
]
ORG = {o[0]: o for o in ORGS}


def make_orgs():
    out = []
    for n, (k, name, alias, town, pc, street, cls, dom, lat, lon, desc) in enumerate(ORGS, 1):
        out.append({
            "resourceType": "Organization", "id": "qhd-org-" + k,
            "meta": {"profile": [PROF + "hcpd-organization"]},
            "identifier": [
                {"extension": [hi_status("A"), {"url": PROF + "hi-org-classification", "valueCodeableConcept": {"coding": [{"system": "http://digitalhealth.gov.au/fhir/hcpd/CodeSystem/hi-org-classification-cs", "code": cls, "display": cls.capitalize()}]}}],
                 "type": {"coding": [{"system": V2AU, "code": "NOI"}]},
                 "system": "http://ns.electronichealth.net.au/id/hi/hpio/1.0", "value": hpio(n)},
                {"type": {"text": "ABN"}, "system": "http://hl7.org.au/id/abn", "value": abn(n)},
            ],
            "active": True, "name": name, "alias": [alias],
            "telecom": [
                {"system": "phone", "value": phone(1000 + n), "use": "work"},
                {"system": "email", "value": "admin@%s.qh-seed.test" % dom, "use": "work"},
                {"system": "url", "value": "https://www.%s.qh-seed.test" % dom, "use": "work"},
            ],
            "address": [{"type": "physical", "line": [street], "city": town, "state": "QLD", "postalCode": pc, "country": "AU"}],
        })
    return out


# ----------------------------------------------------------------- locations
# key, org, name, alias, street (None for mobile), town, pc, lat, lon, amenities
LOCS = [
    ("01", "01", "Tropic Coast Base Hospital - Medical Imaging", "Cairns Medical Imaging", "165 Sheridan Street", "Cairns", "4870", -16.9203, 145.7710, ["wheelchairAccess"]),
    ("02", "11", "Ross River Specialist Centre - Imaging and Cardiology", "RRSC Townsville", "255 Flinders Street", "Townsville", "4810", -19.2590, 146.8169, ["wheelchairAccess"]),
    ("03", "02", "Capricorn Bay Hospital - Radiology", "Rockhampton Radiology", "50 Canning Street", "Rockhampton", "4700", -23.3781, 150.5136, ["wheelchairAccess"]),
    ("04", "02", "Gladstone Community Imaging Unit", "Gladstone Imaging", "14 Goondoon Street", "Gladstone", "4680", -23.8449, 151.2575, ["wheelchairAccess"]),
    ("05", "03", "Darling Plains Base Hospital - Medical Imaging", "Toowoomba Medical Imaging", "120 Margaret Street", "Toowoomba", "4350", -27.5598, 151.9507, ["wheelchairAccess"]),
    ("06", "03", "Dalby Rural Hospital - X-ray", "Dalby X-ray", "2 Hospital Road", "Dalby", "4405", -27.1813, 151.2656, []),
    ("07", "04", "Brisbane River Hospital Complex - Imaging and Nuclear Medicine", "Herston Imaging", "Butterfield Street", "Herston", "4006", -27.4470, 153.0270, ["wheelchairAccess"]),
    ("08", "05", "Moreton Bay Imaging - Caboolture", "MBIP Caboolture", "80 King Street", "Caboolture", "4510", -27.0847, 152.9514, ["wheelchairAccess"]),
    ("09", "05", "Moreton Bay Imaging - Redcliffe", "MBIP Redcliffe", "20 Redcliffe Parade", "Redcliffe", "4020", -27.2300, 153.1010, ["wheelchairAccess"]),
    ("10", "06", "Southern Cross Diagnostic Imaging - Southport", "SCDI Southport", "45 Nerang Street", "Southport", "4215", -27.9672, 153.4130, ["wheelchairAccess"]),
    ("11", "07", "Sunshine Nuclear and PET Centre - Maroochydore", "SNPC Maroochydore", "12 Horton Parade", "Maroochydore", "4558", -26.6590, 153.0940, ["wheelchairAccess"]),
    ("12", "08", "Burnett Valley Medical Imaging - Bundaberg", "BVMI Bundaberg", "30 Bourbong Street", "Bundaberg", "4670", -24.8661, 152.3489, ["wheelchairAccess"]),
    ("13", "08", "Burnett Valley Medical Imaging - Hervey Bay", "BVMI Hervey Bay", "55 Torquay Road", "Hervey Bay", "4655", -25.2882, 152.8531, ["wheelchairAccess"]),
    ("14", "09", "Outback Rural Imaging Outreach - Mount Isa Clinic", "ORIO Mount Isa", "21 Miles Street", "Mount Isa", "4825", -20.7256, 139.4927, ["wheelchairAccess"]),
    ("15", "09", "Outback Mobile Screening Unit", "ORIO Mobile Unit", None, "Mount Isa", "4825", -20.7256, 139.4927, []),
    ("16", "10", "Toowong Family Medical Group - Sherwood Road", "TFMG Toowong", "9 Sherwood Road", "Toowong", "4066", -27.4850, 152.9830, ["wheelchairAccess"]),
]
LOC = {l[0]: l for l in LOCS}
AMEN = {"wheelchairAccess": "Wheelchair Access"}


def make_locs():
    out = []
    for k, org, name, alias, street, town, pc, lat, lon, amen in LOCS:
        o = ORG[org]
        ext = []
        if street:
            ext.append({"url": PROF + "hcpd-alternate-postal-address", "valueAddress": {"use": "work", "type": "postal", "text": "PO Box %d, %s QLD %s" % (100 + int(k) * 7, town.upper(), pc), "line": ["PO Box %d" % (100 + int(k) * 7)], "city": town.upper(), "state": "QLD", "postalCode": pc, "country": "AU"}})
        for a in amen:
            ext.append({"url": CC + "amenity", "valueCodeableConcept": {"coding": [{"system": "https://healthterminologies.gov.au/fhir/CodeSystem/facility-amenity-1", "code": a, "display": AMEN[a]}]}})
        r = {
            "resourceType": "Location", "id": "qhd-loc-" + k,
            "meta": {"profile": [PROF + "hcpd-location"]},
        }
        if ext:
            r["extension"] = ext
        r["identifier"] = [id_source("QHD-LOC-" + k), id_local("loc-" + k)]
        r["status"] = "active"
        r["name"] = name
        r["alias"] = [alias]
        if street is None:
            r["type"] = [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode", "code": "MOBL", "display": "Mobile Unit"}]},
                         {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode", "code": "COMM", "display": "Community Location"}]}]
        else:
            r["physicalType"] = {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/location-physical-type", "code": "bu", "display": "Building"}]}
        dom = o[7]
        r["telecom"] = [
            {"system": "phone", "value": phone(2000 + int(k)), "use": "work"},
            {"system": "email", "value": "%s@%s.qh-seed.test" % ("mobile" if street is None else "reception", dom), "use": "work"},
        ]
        if street:
            r["address"] = {"type": "physical", "text": "%s, %s QLD %s" % (street, town, pc), "line": [street], "city": town, "state": "QLD", "postalCode": pc, "country": "AU"}
        else:
            r["address"] = {"type": "physical", "text": "Base: %s QLD %s (mobile unit, location varies)" % (town, pc), "city": town, "state": "QLD", "postalCode": pc, "country": "AU"}
        r["position"] = {"longitude": lon, "latitude": lat}
        r["managingOrganization"] = ref("Organization", "qhd-org-" + org)
        out.append(r)
    return out


# ----------------------------------------------------------------- endpoints
# per-org endpoints: rest (all), smd (some), msg (some)
ENDPOINTS = []  # (key, org, kind)
EP_BY_ORG = {}
for o in ORGS:
    k = o[0]
    kinds = ["rest"]
    if k in ("01", "02", "03", "04", "05", "06", "07", "08"):
        kinds.append("smd")
    if k in ("01", "03", "04", "05", "06", "11"):
        kinds.append("msg")
    for kd in kinds:
        ek = "%s-%s" % (k, kd)
        ENDPOINTS.append((ek, k, kd))
        EP_BY_ORG.setdefault(k, {})[kd] = "qhd-ep-" + ek

KIND = {
    "rest": ("hl7-fhir-rest", "HL7 FHIR", "FHIR Referral Endpoint", ["application/fhir+json"], "https://%s/fhir"),
    "msg": ("hl7-fhir-msg", "HL7 FHIR Messaging", "FHIR Messaging Endpoint", ["application/fhir+json", "application/fhir+xml"], "https://%s/fhir-messaging"),
    "smd": ("direct-project", "Direct Project", "Secure Message Delivery Endpoint", ["application/pdf", "application/hl7-v2"], "https://%s/smd/endpoint"),
}


def make_endpoints():
    out = []
    n = 0
    for ek, org, kd in ENDPOINTS:
        n += 1
        o = ORG[org]
        code, disp, label, mimes, addr = KIND[kd]
        host = "REFERRAL_HOST" if kd == "rest" and org in ("01", "03", "04", "05", "06", "11") else "%s.qh-seed.test" % o[7]
        ids = []
        if kd == "smd":
            ids.append({"system": "http://ns.electronichealth.net.au/smd/target", "value": "smd-%s.qh-seed.test" % o[7]})
        ids += [id_source("QHD-EP-" + ek), id_local("ep-" + ek)]
        out.append({
            "resourceType": "Endpoint", "id": "qhd-ep-" + ek,
            "meta": {"profile": [PROF + "hcpd-endpoint"]},
            "identifier": ids,
            "status": "active",
            "connectionType": {"system": "http://terminology.hl7.org/CodeSystem/endpoint-connection-type", "code": code, "display": disp},
            "name": "%s - %s" % (o[1], label),
            "contact": [{"system": "email", "value": "%s@%s.qh-seed.test" % ("referrals" if kd == "rest" else "it-support", o[7]), "use": "work"}],
            "payloadType": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/endpoint-payload-type", "code": "any", "display": "Any"}]}],
            "payloadMimeType": mimes,
            "address": addr % host,
        })
    return out


# ----------------------------------------------------------------- healthcare services
T = {
    "xray": ("933537131000036109", "X-ray service"),
    "ct": ("310128004", "Computed tomography service"),
    "mri": ("310127009", "Magnetic resonance imaging service"),
    "us": ("310169008", "Ultrasound service"),
    "nm": ("788009005", "Nuclear medicine service"),
    "mammo": ("933536641000036105", "Mammography service"),
    "bmd": ("1579081000168100", "Bone densitometry service"),
    "fluoro": ("933537141000036104", "Fluoroscopy service"),
    "ir": ("708174004", "Interventional radiology service"),
    "obus": ("708173005", "Obstetric ultrasound service"),
    "vus": ("708171007", "Vascular ultrasound service"),
    "cus": ("708172000", "Cardiac ultrasound service"),
    "rad": ("310125001", "Radiology service"),
    "dimg": ("708175003", "Diagnostic imaging service"),
    "pnm": ("1223251000168108", "Paediatric nuclear medicine service"),
    "bscr": ("310126000", "Breast screening service"),
    "card": ("789718008", "Cardiology service"),
    "gp": ("788007007", "General practice service"),
    "ortho": ("310161006", "Orthopaedic service"),
    "resp": ("722174002", "Pulmonary medicine service"),
    "path": ("310074003", "Pathology service"),
}
# key, org, loc, type, name, hours profile, appt, referral note
H = {"std": ("08:00:00", "17:00:00", ["mon", "tue", "wed", "thu", "fri"]),
     "ext": ("07:30:00", "18:30:00", ["mon", "tue", "wed", "thu", "fri"]),
     "wk": ("08:00:00", "12:00:00", ["sat"]),
     "gp": ("08:30:00", "17:30:00", ["mon", "tue", "wed", "thu", "fri"])}
HCS = [
    # key, org, loc, type, name, hours, appt, accepting
    ("01", "01", "01", "ct", "Cairns CT", "ext", True, "accepting"),
    ("02", "01", "01", "xray", "Cairns General X-ray", "ext", False, "accepting"),
    ("03", "01", "01", "mri", "Cairns MRI", "std", True, "accepting"),
    ("04", "01", "01", "us", "Cairns General Ultrasound", "std", True, "accepting"),
    ("05", "11", "02", "dimg", "Townsville Diagnostic Imaging", "std", True, "accepting"),
    ("06", "11", "02", "card", "Townsville Cardiology Clinic", "std", True, "accepting"),
    ("07", "02", "03", "rad", "Rockhampton Radiology", "ext", True, "accepting"),
    ("08", "02", "03", "ct", "Rockhampton CT", "ext", True, "accepting"),
    ("09", "02", "03", "mammo", "Rockhampton Mammography", "std", True, "accepting"),
    ("10", "02", "04", "xray", "Gladstone X-ray", "std", False, "accepting"),
    ("11", "03", "05", "mri", "Toowoomba MRI", "std", True, "accepting"),
    ("12", "03", "05", "nm", "Toowoomba Nuclear Medicine", "std", True, "accepting"),
    ("13", "03", "05", "ir", "Toowoomba Interventional Radiology", "std", True, "accepting"),
    ("14", "03", "06", "xray", "Dalby Rural X-ray", "std", False, "accepting"),
    ("15", "04", "07", "ct", "Herston CT", "ext", True, "accepting"),
    ("16", "04", "07", "mri", "Herston MRI", "ext", True, "accepting"),
    ("17", "04", "07", "nm", "Herston Nuclear Medicine", "std", True, "accepting"),
    ("18", "04", "07", "pnm", "Herston Paediatric Nuclear Medicine", "std", True, "notAccepting"),
    ("19", "05", "08", "us", "Caboolture Ultrasound", "std", True, "accepting"),
    ("20", "05", "08", "xray", "Caboolture X-ray", "ext", False, "accepting"),
    ("21", "05", "09", "obus", "Redcliffe Obstetric Ultrasound", "std", True, "accepting"),
    ("22", "06", "10", "ct", "Southport CT", "ext", True, "accepting"),
    ("23", "06", "10", "mri", "Southport MRI", "ext", True, "accepting"),
    ("24", "07", "11", "nm", "Maroochydore Nuclear Medicine and PET", "std", True, "accepting"),
    ("25", "07", "11", "bmd", "Maroochydore Bone Densitometry", "std", True, "accepting"),
    ("26", "08", "12", "us", "Bundaberg Ultrasound", "std", True, "accepting"),
    ("27", "08", "13", "xray", "Hervey Bay X-ray", "std", False, "accepting"),
    ("28", "09", "14", "xray", "Mount Isa X-ray", "std", False, "accepting"),
    ("29", "09", "15", "bscr", "Outback Mobile Breast Screening", "std", True, "accepting"),
    ("30", "10", "16", "gp", "Toowong General Practice", "gp", True, "accepting"),
    ("31", "11", "02", "ortho", "Townsville Orthopaedic Clinic", "std", True, "accepting"),
]
HCSD = {h[0]: h for h in HCS}

REFER = {
    "ct": "**Referral required.** Please include clinical question, relevant history and renal function (eGFR) for contrast studies.",
    "mri": "**Referral required.** Please complete the MRI safety questionnaire (implants, pacemakers, claustrophobia) with the referral.",
    "xray": "Referral required. Walk-in accepted during opening hours with a valid referral.",
    "us": "**Referral required.** State clinical question; pelvic scans need a full bladder.",
    "nm": "**Referral required.** Specify the study requested; dose scheduling may apply.",
    "dimg": "**Referral required.** All modalities accepted; please specify modality.",
    "rad": "**Referral required.** All general radiology modalities accepted.",
    "mammo": "Referral not required for screening; **required** for diagnostic mammography.",
    "bmd": "**Referral required.** Include previous DXA results where available.",
    "ir": "**Referral required** from a specialist or GP after discussion with the interventional radiologist.",
    "obus": "**Referral required.** State gestational age and indication.",
    "pnm": "**Referral required** from a paediatrician or specialist.",
    "bscr": "No referral required for screening. Women aged 50-74 are eligible.",
    "card": "**Referral required** from a GP or specialist.",
    "ortho": "**Referral required** from a GP. Include recent imaging (X-ray/MRI) reports where available.",
    "gp": "Not a referral destination for imaging; accepts new patients by appointment.",
}


def make_hcs():
    out = []
    for k, org, loc, t, name, hrs, appt, newp in HCS:
        o = ORG[org]
        code, disp = T[t]
        st, en, days = H[hrs]
        r = {"resourceType": "HealthcareService", "id": "qhd-hcs-" + k,
             "meta": {"profile": [PROF + "hcpd-healthcareservice"]}}
        ext = [{"url": CC + "referral-information-for-referrer", "valueMarkdown": REFER[t]},
               {"url": CC + "new-patient-availability", "valueCodeableConcept": {"coding": [{"system": "https://healthterminologies.gov.au/fhir/CodeSystem/new-patient-availability-1", "code": newp, "display": "Accepting new patients" if newp == "accepting" else "Not accepting new patients"}]}}]
        r["extension"] = ext
        r["identifier"] = [id_source("QHD-HCS-" + k), id_local("hcs-" + k)]
        r["active"] = True
        r["providedBy"] = ref("Organization", "qhd-org-" + org)
        r["type"] = [sct(code, disp)]
        r["location"] = [ref("Location", "qhd-loc-" + loc)]
        r["name"] = name
        r["telecom"] = [{"extension": [{"url": "http://hl7.org.au/fhir/StructureDefinition/contact-purpose", "valueCodeableConcept": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/contactentity-type", "code": "ADMIN", "display": "Administrative"}]}}],
                         "system": "phone", "value": phone(3000 + int(k)), "use": "work"}]
        if org in ("01", "02", "03", "04", "09"):
            prov = [("NFE", "No Fee")]
        elif org in ("10",):
            prov = [("MIX", "Mixed Billing")]
        else:
            prov = [("FAP", "Fees Apply")]
        r["serviceProvisionCode"] = [{"coding": [{"system": "http://digitalhealth.gov.au/fhir/hcpd/CodeSystem/service-provision-cs", "code": c, "display": d}]} for c, d in prov]
        r["communication"] = [{"coding": [{"system": "urn:ietf:bcp:47", "code": "en", "display": "English"}]}]
        r["appointmentRequired"] = appt
        r["availableTime"] = [{"daysOfWeek": days, "allDay": False, "availableStartTime": st, "availableEndTime": en}]
        if hrs in ("ext",):
            r["availableTime"].append({"daysOfWeek": ["sat"], "allDay": False, "availableStartTime": "08:00:00", "availableEndTime": "12:00:00"})
        eps = EP_BY_ORG[org]
        epl = [ref("Endpoint", eps["rest"])]
        if "smd" in eps:
            epl.append(ref("Endpoint", eps["smd"]))
        r["endpoint"] = epl
        out.append(r)
    return out


# ----------------------------------------------------------------- practitioners and roles
# key, prefix, given, family, sex, regtype, regno
PEOPLE = [
    ("01", "Dr", "Priya", "Raman", "female", "MED", "Radiologist"),
    ("02", "Dr", "Thomas", "Whitlock", "male", "MED", "Radiologist"),
    ("03", "Dr", "Mei", "Zhang", "female", "MED", "Radiologist"),
    ("04", "Dr", "Callum", "Ferris", "male", "MED", "Radiologist"),
    ("05", "Dr", "Amara", "Okafor", "female", "MED", "Radiologist"),
    ("06", "Dr", "Jonas", "Lindqvist", "male", "MED", "Radiologist"),
    ("07", "Dr", "Sienna", "Marchetti", "female", "MED", "Radiologist"),
    ("08", "Dr", "Wiremu", "Tane", "male", "MED", "Interventional radiologist"),
    ("09", "Dr", "Hannah", "Brooks", "female", "MED", "Nuclear medicine physician"),
    ("10", "Dr", "Rohan", "Deshmukh", "male", "MED", "Nuclear medicine physician"),
    ("11", "Dr", "Eleni", "Papadakis", "female", "MED", "Nuclear medicine physician"),
    ("12", "Dr", "Declan", "Murphy", "male", "MED", "Radiologist"),
    ("13", "Dr", "Fatima", "Al-Sayed", "female", "MED", "Radiologist"),
    ("14", "Dr", "Liam", "Kowalski", "male", "MED", "Cardiologist"),
    ("15", "Dr", "Grace", "Nakamura", "female", "MED", "General practitioner"),
    ("16", "Dr", "Ben", "Hartigan", "male", "MED", "General practitioner"),
    ("17", "Mx", "Sam", "Ellery", "other", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("18", "Ms", "Jessica", "Tran", "female", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("19", "Mr", "Kieran", "O'Donnell", "male", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("20", "Ms", "Aisha", "Rahman", "female", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("21", "Mr", "Pita", "Vaea", "male", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("22", "Ms", "Chloe", "Barrett", "female", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("23", "Mr", "Daniel", "Pereira", "male", "MRP", "Medical radiation practitioner (nuclear medicine technologist)"),
    ("24", "Ms", "Ingrid", "Solberg", "female", "MRP", "Medical radiation practitioner (nuclear medicine technologist)"),
    ("25", "Ms", "Nadia", "Karimi", "female", "PB", "Sonographer"),
    ("26", "Mr", "Oscar", "Fenwick", "male", "PB", "Sonographer"),
    ("27", "Ms", "Tamika", "Wallace", "female", "PB", "Sonographer"),
    ("28", "Ms", "Rebecca", "Chen", "female", "PB", "Obstetric and gynaecological sonographer"),
    ("29", "Mr", "Harvey", "Doyle", "male", "PB", "Sonographer"),
    ("30", "Dr", "Anjali", "Mehta", "female", "MED", "Orthopaedic surgeon"),
    ("31", "Mr", "Mitchell", "Hale", "male", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("32", "Ms", "Lucy", "Kapoor", "female", "MRP", "Medical radiation practitioner (diagnostic radiographer)"),
    ("33", "Dr", "Marcus", "Eaton", "male", "MED", "Radiologist"),
    ("34", "Dr", "Yusuf", "Hassan", "male", "MED", "Nuclear medicine physician"),
    ("35", "Dr", "Olivia", "Grant", "female", "MED", "Radiologist"),
    ("36", "Ms", "Bridget", "Nolan", "female", "MRP", "Medical radiation practitioner (mammographer)"),
]
PEOPLED = {p[0]: p for p in PEOPLE}
SEX = {"female": "Female", "male": "Male", "other": "Other"}


def reg_number(kind, n):
    return "%s%010d" % (kind, 9990000 + n)


def make_practitioners():
    out = []
    for n, (k, pre, given, fam, sex, kind, qual) in enumerate(PEOPLE, 1):
        if kind == "PB":
            qid = {"type": {"coding": [{"system": V2, "code": "PRN"}]},
                   "system": "https://github.com/aehrc/qh-connectathon/id/fictional-asar-accreditation", "value": "ASAR-FICT-%05d" % (1000 + n),
                   "assigner": {"display": "Australasian Sonographer Accreditation Registry (fictional number)"}}
            issuer = "ASAR"
        else:
            qid = {"type": {"coding": [{"system": V2AU, "code": "AHPRA"}]}, "system": "http://hl7.org.au/id/ahpra-registration-number", "value": reg_number(kind, n)}
            issuer = "Ahpra"
        out.append({
            "resourceType": "Practitioner", "id": "qhd-prac-" + k,
            "meta": {"profile": [PROF + "hcpd-practitioner"]},
            "extension": [{"url": "http://hl7.org/fhir/StructureDefinition/individual-recordedSexOrGender",
                           "extension": [{"url": "value", "valueCodeableConcept": {"coding": [{"system": "http://hl7.org/fhir/administrative-gender", "code": sex, "display": SEX[sex]}]}}]}],
            "identifier": [{"extension": [hi_status("A")], "type": {"coding": [{"system": V2, "code": "NPI"}]},
                            "system": "http://ns.electronichealth.net.au/id/hi/hpii/1.0", "value": hpii(n)}],
            "name": [{"use": "official", "family": fam, "given": [given], "prefix": [pre]}],
            "qualification": [{"identifier": [qid], "code": {"text": qual}, "issuer": {"display": issuer}}],
        })
    return out


R = {
    "rad": ("66862007", "Radiologist"),
    "ir": ("66862007", "Radiologist"),
    "nm": ("80933006", "Nuclear medicine specialist"),
    "mrp": ("1782801000168101", "Medical radiation practitioner"),
    "dr": ("159017007", "Diagnostic radiographer"),
    "nmt": ("1256114007", "Nuclear medicine technologist"),
    "son": ("789543004", "Sonographer"),
    "obson": ("1726051000168100", "Obstetric and gynaecological sonographer"),
    "card": ("17561000", "Cardiologist"),
    "gp": ("62247001", "General practitioner"),
    "ortho": ("22731001", "Orthopaedic surgeon"),
}
# role key, practitioner, hcs, role
ROLES = [
    ("01", "01", "01", "rad"), ("02", "01", "03", "rad"), ("03", "17", "02", "dr"), ("04", "18", "01", "dr"),
    ("05", "25", "04", "son"), ("06", "02", "05", "rad"), ("07", "14", "06", "card"), ("08", "30", "31", "ortho"),
    ("09", "03", "07", "rad"), ("10", "03", "08", "rad"), ("11", "19", "07", "dr"), ("12", "26", "09", "son"),
    ("13", "20", "10", "dr"), ("14", "04", "11", "rad"), ("15", "09", "12", "nm"), ("16", "08", "13", "ir"),
    ("17", "21", "14", "dr"), ("18", "05", "15", "rad"), ("19", "06", "16", "rad"), ("20", "10", "17", "nm"),
    ("21", "11", "18", "nm"), ("22", "23", "17", "nmt"), ("23", "27", "19", "son"), ("24", "07", "19", "rad"),
    ("25", "22", "20", "dr"), ("26", "28", "21", "obson"), ("27", "12", "22", "rad"), ("28", "13", "23", "rad"),
    ("29", "13", "22", "rad"), ("30", "34", "24", "nm"), ("31", "24", "24", "nmt"), ("32", "35", "25", "rad"),
    ("33", "29", "26", "son"), ("34", "33", "26", "rad"), ("35", "32", "28", "dr"), ("36", "31", "27", "dr"),
    ("37", "15", "30", "gp"), ("38", "16", "30", "gp"), ("39", "36", "29", "dr"), ("40", "05", "28", "rad"),
]


def make_roles():
    out = []
    for n, (k, prac, hcs, role) in enumerate(ROLES, 1):
        h = HCSD[hcs]
        org, loc = h[1], h[2]
        p = PEOPLED[prac]
        code, disp = R[role]
        ids = [id_source("QHD-PR-" + k), id_local("pr-" + k)]
        kind = p[5]
        if kind == "MED":
            ids.append({"type": {"coding": [{"system": V2AU, "code": "AHPRA"}]}, "system": "http://hl7.org.au/id/ahpra-registration-number", "value": reg_number("MED", int(prac))})
        elif kind == "MRP":
            ids.append({"type": {"coding": [{"system": V2AU, "code": "AHPRA"}]}, "system": "http://hl7.org.au/id/ahpra-registration-number", "value": reg_number("MRP", int(prac))})
        r = {"resourceType": "PractitionerRole", "id": "qhd-pr-" + k,
             "meta": {"profile": [PROF + "hcpd-practitionerrole"]},
             "identifier": ids, "active": True, "period": {"start": "2024-01-01"},
             "practitioner": ref("Practitioner", "qhd-prac-" + prac),
             "organization": ref("Organization", "qhd-org-" + org),
             "code": [sct(code, disp)],
             "location": [ref("Location", "qhd-loc-" + loc)],
             "healthcareService": [ref("HealthcareService", "qhd-hcs-" + hcs)],
             "telecom": [{"system": "phone", "value": phone(4000 + n), "use": "work"}]}
        st, en, days = H[h[5]]
        r["availableTime"] = [{"daysOfWeek": days, "allDay": False, "availableStartTime": st, "availableEndTime": en}]
        eps = EP_BY_ORG[org]
        if "smd" in eps and role in ("rad", "nm", "ir"):
            r["endpoint"] = [ref("Endpoint", eps["smd"])]
        out.append(r)
    return out


# ----------------------------------------------------------------- provenance
def prov(i, target, activity, recorded, who, source_val, path=None):
    t = {"reference": target}
    if path:
        t["extension"] = [{"url": "http://hl7.org/fhir/StructureDefinition/targetPath", "valueString": path}]
    return {
        "resourceType": "Provenance", "id": "qhd-prov-%02d" % i,
        "meta": {"profile": [PROF + "hcpd-provenance"]},
        "target": [t], "recorded": recorded,
        "activity": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation", "code": activity}]},
        "agent": [{"type": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type", "code": "author"}]},
                   "role": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/contractsignertypecodes", "code": "AMENDER" if activity == "UPDATE" else "AUTHOR"}]}] if False else [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/contractsignertypecodes", "code": "AMENDER"}]}],
                   "who": who}],
        "entity": [{"role": "source", "what": {"identifier": {"system": SRC_SYS, "value": source_val}, "display": "Seed record " + source_val}}],
    }


def make_prov():
    out = []
    i = 0
    for o in ORGS:
        i += 1
        out.append(prov(i, "Organization/qhd-org-" + o[0], "CREATE", "2026-10-19T09:00:00+10:00", ref("Organization", "qhd-org-" + o[0]), "SEED-ORG-" + o[0]))
    i += 1
    out.append(prov(i, "Practitioner/qhd-prac-17", "UPDATE", "2026-10-19T10:15:00+10:00", ref("Organization", "qhd-org-01"), "SEED-PRAC-17-NAME", "name[0].family"))
    i += 1
    out.append(prov(i, "Practitioner/qhd-prac-25", "UPDATE", "2026-10-19T10:20:00+10:00", ref("Organization", "qhd-org-01"), "SEED-PRAC-25-NAME", "name[0].given"))
    i += 1
    out.append(prov(i, "PractitionerRole/qhd-pr-16", "UPDATE", "2026-10-19T10:30:00+10:00", ref("Organization", "qhd-org-03"), "SEED-PR-16-PHONE", "telecom.where(system='phone').value"))
    i += 1
    out.append(prov(i, "Location/qhd-loc-04", "UPDATE", "2026-10-19T10:40:00+10:00", ref("Organization", "qhd-org-02"), "SEED-LOC-04-ADDR", "address.line"))
    return out


FILES = [
    ("01-endpoints.json", make_endpoints),
    ("02-organizations.json", make_orgs),
    ("03-locations.json", make_locs),
    ("04-healthcareservices.json", make_hcs),
    ("05-practitioners.json", make_practitioners),
    ("06-practitionerroles.json", make_roles),
    ("07-provenance.json", make_prov),
]
for fn, f in FILES:
    res = f()
    with open(os.path.join(OUT, fn), "w") as fh:
        json.dump(bundle(res), fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(fn, len(res))
