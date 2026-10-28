#!/usr/bin/env python3
"""Generate the fictional Track 2 referral seed bundles (deterministic output).

Usage: python3 generate.py   (writes *.json next to this script)
All people, organisations, identifiers and numbers are FICTIONAL.
"""
import json, os, datetime as dt

OUT = os.path.dirname(os.path.abspath(__file__))
SCT = "http://snomed.info/sct"
V2 = "http://terminology.hl7.org/CodeSystem/v2-0203"
AUV2 = "http://terminology.hl7.org.au/CodeSystem/v2-0203"
TAG = "http://terminology.hl7.org.au/CodeSystem/resource-tag"
TBS = "http://terminology.hl7.org.au/CodeSystem/task-business-status"
TCODE = "http://hl7.org/fhir/CodeSystem/task-code"
HPIO = "http://ns.electronichealth.net.au/id/hi/hpio/1.0"
HPII = "http://ns.electronichealth.net.au/id/hi/hpii/1.0"
IHI = "http://ns.electronichealth.net.au/id/hi/ihi/1.0"
MEDICARE = "http://ns.electronichealth.net.au/id/medicare-number"
MPN = "http://ns.electronichealth.net.au/id/medicare-provider-number"
P = "http://hl7.org.au/fhir/ereq/StructureDefinition/"
RR = "http://aehrc.csiro.au/fhir/radiology-referral/StructureDefinition/"
CORE = "http://hl7.org.au/fhir/core/StructureDefinition/"


def luhn(prefix):
    s = 0
    for i, ch in enumerate(reversed(prefix)):
        d = int(ch)
        if i % 2 == 0:
            d *= 2
            if d > 9: d -= 9
        s += d
    return prefix + str((10 - s % 10) % 10)


def hpio(n): return luhn("800362990000%03d" % n)       # synthetic: 8003629900 00nnn
def hpii(n): return luhn("800361990000%03d" % n)
def ihi(n):  return luhn("800360990000%03d" % n)


def medicare(n):
    base = "2999%04d" % n                                # synthetic: 2999 xxxx
    w = [1, 3, 7, 9, 1, 3, 7, 9]
    chk = sum(int(c) * k for c, k in zip(base, w)) % 10
    return base + str(chk) + "1" + "1"                   # check, issue no., IRN


def cc(system, code, display=None, text=None):
    c = {"system": system, "code": code}
    if display: c["display"] = display
    out = {"coding": [c]}
    if text: out["text"] = text
    return out


def ref(r, display=None):
    d = {"reference": r}
    if display: d["display"] = display
    return d


def bundle(entries):
    return {"resourceType": "Bundle", "type": "transaction", "entry": [
        {"fullUrl": "urn:uuid:" + r["resourceType"].lower() + "-" + r["id"], "resource": r,
         "request": {"method": "PUT", "url": r["resourceType"] + "/" + r["id"]}} for r in entries]}


def write(name, entries):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(bundle(entries), f, indent=2, ensure_ascii=False)
        f.write("\n")


# ---------------------------------------------------------------- fillers (directory side, referenced LOGICALLY)
# Fillers are taken from the directory seed (../directory/*.json) so every referral reference resolves there.
# filler number -> (directory org, directory location, {modality: directory HealthcareService number})
DIRSEED = os.path.join(OUT, "..", "directory")
FILLER_MAP = {
    1: ("01", "01", {"CT": "01", "MRI": "03", "US": "04", "XR": "02"}),   # Cairns
    2: ("04", "07", {"CT": "15", "MRI": "16"}),                           # Herston
    3: ("02", "03", {"CT": "08", "XR": "07", "MAM": "09"}),               # Rockhampton
    4: ("03", "05", {"MRI": "11"}),                                       # Toowoomba
    5: ("06", "10", {"CT": "22", "MRI": "23"}),                           # Southport
    6: ("05", "08", {"US": "19", "XR": "20"}),                            # Caboolture
}
# (old filler, modality) -> filler: the referral table below was drafted before the directory existed
REMAP = {(1, "CT"): 1, (1, "US"): 1, (1, "XR"): 1, (2, "CT"): 2, (2, "MRI"): 2, (2, "US"): 1,
         (3, "CT"): 5, (3, "MAM"): 3, (3, "MRI"): 5, (3, "XR"): 3, (4, "CT"): 5, (4, "US"): 6,
         (4, "XR"): 6, (6, "MRI"): 4}


def _dir(name):
    with open(os.path.join(DIRSEED, name)) as fh:
        return {e["resource"]["id"]: e["resource"] for e in json.load(fh)["entry"]}


_ORG, _LOC, _HCS = _dir("02-organizations.json"), _dir("03-locations.json"), _dir("04-healthcareservices.json")
SEED_SRC = "https://github.com/aehrc/qh-connectathon/id/track2-seed-source"


def _key(res):
    return [i["value"] for i in res["identifier"] if i["system"] == SEED_SRC][0]


FILLERS, FILLER_ORG, FILLER_LOC, FILLER_HCS = {}, {}, {}, {}
for _f, (_o, _l, _m) in FILLER_MAP.items():
    _org, _loc = _ORG["qhd-org-" + _o], _LOC["qhd-loc-" + _l]
    _hpio = [i["value"] for i in _org["identifier"] if i["system"] == HPIO][0]
    FILLERS[_f] = (_org["name"], _loc["address"]["city"].title(), _loc["address"]["postalCode"], _hpio, list(_m))
    FILLER_ORG[_f], FILLER_LOC[_f] = _org, _loc
    for _mod, _h in _m.items():
        assert _HCS["qhd-hcs-" + _h]["providedBy"]["reference"] == "Organization/qhd-org-" + _o
        assert _HCS["qhd-hcs-" + _h]["location"][0]["reference"] == "Location/qhd-loc-" + _l
        FILLER_HCS[(_f, _mod)] = _HCS["qhd-hcs-" + _h]
MOD = {  # modality -> (service type code, display, slot minutes)
    "CT": ("310128004", "Computed tomography service", 30),
    "MRI": ("310127009", "Magnetic resonance imaging service", 45),
    "US": ("310169008", "Ultrasound service", 30),
    "XR": ("310125001", "Radiology service", 15),
    "MAM": ("310125001", "Radiology service", 20),
}


def filler_org(f):
    n, _, _, h, _ = FILLERS[f]
    # literal reference (to the filler Organization on THIS server, see referrer_entries) plus the HPI-O: the UI's filler views
    # list organisations through Task?_include=Task:owner, which needs a resolvable reference, not just an identifier
    return {"reference": "Organization/qhc-org-fill%d" % f, "type": "Organization", "identifier": {"system": HPIO, "value": h}, "display": n}


def filler_hcs(f, m):
    # literal reference to the HealthcareService on THIS server (the booking screens search it by organisation and service
    # type and find Slots through it), plus the directory identifier it mirrors
    h = FILLER_HCS[(f, m)]
    return {"reference": "HealthcareService/qhc-hcs-f%d-%s" % (f, m.lower()), "type": "HealthcareService",
            "identifier": {"system": SEED_SRC, "value": _key(h)}, "display": h["name"]}


def filler_loc(f):
    loc = FILLER_LOC[f]
    return {"reference": "Location/qhc-loc-fill%d" % f, "type": "Location",
            "identifier": {"system": SEED_SRC, "value": _key(loc)}, "display": loc["name"]}


def svc_type(f, m):
    """Service type of the directory HealthcareService, so Schedule/Slot match the directory entry."""
    c = FILLER_HCS[(f, m)]["type"][0]["coding"][0]
    return cc(SCT, c["code"], c["display"])


# ---------------------------------------------------------------- referrers (live on the referral server)
REFERRERS = {
    1: ("Riverside Family Practice", "Brisbane", "4000", "8003621566684455", "0755505001",
        ("Alex", "Chen", 1, "Dr", "General practitioner", "62247001", "8003619900015717", "2426621B")),
    2: ("Wattle Grove Medical Centre", "Ipswich", "4305", hpio(2), "0755505002",
        ("Meera", "Joshi", 2, "Dr", "General practitioner", "62247001", None, "29990201")),
    3: ("Reef View Medical Practice", "Cairns", "4870", hpio(3), "0755505003",
        ("Liam", "O'Connell", 3, "Dr", "General practitioner", "62247001", None, "29990301")),
    4: ("Cane Valley Family Clinic", "Mackay", "4740", hpio(4), "0755505004",
        ("Beatrice", "Hartmann", 4, "Dr", "General practitioner", "62247001", None, "29990401")),
    5: ("Toowoomba Range Medical", "Toowoomba", "4350", hpio(5), "0755505005",
        ("Samuel", "Okoro", 5, "Dr", "General practitioner", "62247001", None, "29990501")),
    6: ("Bayside Community Hospital Outpatients", "Wynnum", "4178", hpio(6), "0755505006",
        ("Hannah", "Whitfield", 6, "Dr", "Physician", "309343006", None, "29990601")),
}


def pgn_system(r): return "http://ns.electronichealth.net.au/id/hpio-scoped/order/1.0/" + REFERRERS[r][3]


def referrer_entries():
    es = []
    for k, (name, city, pc, h, ph, gp) in REFERRERS.items():
        es.append({"resourceType": "Organization", "id": "qhc-org-ref%d" % k,
                   "meta": {"profile": [P + "au-erequesting-organization"]},
                   "identifier": [{"type": {"coding": [{"system": AUV2, "code": "NOI", "display": "National Organisation Identifier"}], "text": "HPI-O"},
                                   "system": HPIO, "value": h}],
                   "active": True, "name": name,
                   "telecom": [{"system": "phone", "value": ph}],
                   "address": [{"city": city, "state": "QLD", "postalCode": pc, "country": "AU"}]})
        given, fam, hn, pre, rdisp, rcode, hi, mpn = gp
        es.append({"resourceType": "Practitioner", "id": "qhc-prac-%d" % k,
                   "meta": {"profile": [P + "au-erequesting-practitioner"]},
                   "identifier": [{"type": {"coding": [{"system": V2, "code": "NPI", "display": "National provider identifier"}], "text": "HPI-I"},
                                   "system": HPII, "value": hi or hpii(k)}],
                   "name": [{"family": fam, "given": [given], "prefix": [pre]}]})
        es.append({"resourceType": "PractitionerRole", "id": "qhc-role-%d" % k,
                   "meta": {"profile": [P + "au-erequesting-practitionerrole"]},
                   "identifier": [{"type": {"coding": [{"system": AUV2, "code": "UPIN", "display": "Medicare Provider Number"}], "text": "Medicare Provider Number"},
                                   "system": MPN, "value": mpn}],
                   "practitioner": ref("Practitioner/qhc-prac-%d" % k, "%s %s %s" % (pre, given, fam)),
                   "organization": ref("Organization/qhc-org-ref%d" % k, name),
                   "code": [cc(SCT, rcode, rdisp)],
                   "telecom": [{"system": "phone", "value": ph}]})
    # The imaging providers (fillers) also exist HERE as Organizations, typed as diagnostic imaging, with the SAME HPI-O as in the
    # directory seed. The UI's "Select Provider Organisation" dropdown searches THIS server for Organization?type=<imaging codes>,
    # and a referral's performer/owner is a real Organization on this server. (The referral Tasks still point at the filler by HPI-O.)
    for f, (name, city, pc, h, mods) in FILLERS.items():
        es.append({"resourceType": "Organization", "id": "qhc-org-fill%d" % f,
                   "meta": {"profile": [P + "au-erequesting-organization"]},
                   "identifier": [{"type": {"coding": [{"system": AUV2, "code": "NOI", "display": "National Organisation Identifier"}], "text": "HPI-O"},
                                   "system": HPIO, "value": h}],
                   "active": True, "name": name,
                   "type": [cc(SCT, "708175003", "Diagnostic imaging service")],
                   "address": [{"city": city, "state": "QLD", "postalCode": pc, "country": "AU"}]})
        # ... with the Location and one HealthcareService per modality, copied from the directory seed (same names and service types),
        # because the app's booking screens expect them on THIS server: Location?organization (publish availability),
        # HealthcareService?organization&service-type (find the provider's service for a request), Slot?schedule.actor.
        loc = FILLER_LOC[f]
        a = loc.get("address", {})
        es.append({"resourceType": "Location", "id": "qhc-loc-fill%d" % f, "status": "active", "name": loc["name"],
                   "managingOrganization": ref("Organization/qhc-org-fill%d" % f, name),
                   "address": {"line": a.get("line", []), "city": a.get("city", city), "state": "QLD",
                               "postalCode": a.get("postalCode", pc), "country": "AU"}})
        for m in mods:
            h = FILLER_HCS[(f, m)]
            c = h["type"][0]["coding"][0]
            es.append({"resourceType": "HealthcareService", "id": "qhc-hcs-f%d-%s" % (f, m.lower()), "active": True,
                       "providedBy": ref("Organization/qhc-org-fill%d" % f, name),
                       "type": [cc(SCT, c["code"], c["display"])], "name": h["name"],
                       "location": [ref("Location/qhc-loc-fill%d" % f, loc["name"])]})
    return es


# ---------------------------------------------------------------- patients (fictional)
# (given, family, sex, dob, street, suburb, postcode, phone, indigenous-code)
PATIENTS = [
    ("Harold", "Mitchell-Voss", "male", "1958-02-11", "14 Wattle St", "Chermside", "4032", "0491570006", None),
    ("Priya", "Raghunathan", "female", "1984-07-30", "7 Bottlebrush Cl", "Ipswich", "4305", "0491570156", None),
    ("Tamika", "Cooper", "female", "1990-11-05", "22 Mulgrave Rd", "Cairns City", "4870", "0491570157", "1"),
    ("Giovanni", "Ferrante", "male", "1971-04-19", "3 Hartley St", "Edge Hill", "4870", "0491570158", None),
    ("Margaret", "O'Dwyer", "female", "1949-09-23", "91 Sugar Mill Rd", "Mackay", "4740", "0491570159", None),
    ("Ngoc Anh", "Tran", "female", "1977-01-14", "5 Margaret St", "Toowoomba City", "4350", "0491570110", None),
    ("Bruce", "Hollingworth", "male", "1963-12-02", "48 Ruthven St", "Toowoomba City", "4350", "0491570313", None),
    ("Aroha", "Kemp", "female", "2001-06-26", "17 Klingner Rd", "Redcliffe", "4020", "0491570737", None),
    ("Dmitri", "Volkov", "male", "1992-03-08", "60 Sandgate Rd", "Nundah", "4012", "0491570006", None),
    ("Chloe", "Nguyen", "female", "1996-10-17", "12 Redbank Plains Rd", "Redbank Plains", "4301", "0491570156", None),
    ("Kevin", "Patel", "male", "1980-05-29", "8 Cedar Rd", "Smithfield", "4878", "0491570157", None),
    ("Sandra", "Whitlock", "female", "1966-08-15", "33 Flinders St", "Townsville City", "4810", "0491570158", None),
    ("Darren", "Pascoe", "male", "1955-01-22", "26 Taylor St", "Harristown", "4350", "0491570159", None),
    ("Imogen", "Radcliffe", "female", "1988-02-02", "19 Oxford St", "Bulimba", "4171", "0491570110", None),
    ("Joseph", "Kaufusi", "male", "1974-11-11", "41 Wembley Rd", "Logan Central", "4114", "0491570313", None),
    ("Lila", "Sorensen", "female", "1999-09-09", "2 King St", "Caboolture", "4510", "0491570737", "4"),
    ("Ernest", "Maguire", "male", "1945-03-30", "70 Trinity Beach Rd", "Trinity Beach", "4879", "0491570006", None),
    ("Fatima", "Al-Rashid", "female", "1969-07-07", "15 Kirwan Dr", "Kirwan", "4817", "0491570156", None),
    ("Callum", "Brennan", "male", "1983-12-25", "9 Kearneys Spring Rd", "Kearneys Spring", "4350", "0491570157", None),
    ("Yolanda", "Ibarra", "female", "1991-04-04", "28 Bay Terrace", "Wynnum", "4178", "0491570158", None),
]
INDIG = {"1": "Aboriginal but not Torres Strait Islander origin", "4": "Neither Aboriginal nor Torres Strait Islander origin"}


def patient(i):
    g, f, sex, dob, st, sub, pc, ph, ind = PATIENTS[i - 1]
    r = {"resourceType": "Patient", "id": "qhc-pat-%02d" % i,
         "meta": {"profile": [CORE + "au-core-patient", P + "au-erequesting-patient"]}}
    if ind:
        r["extension"] = [{"url": "http://hl7.org.au/fhir/StructureDefinition/indigenous-status",
                           "valueCoding": {"system": "https://healthterminologies.gov.au/fhir/CodeSystem/australian-indigenous-status-1",
                                           "code": ind, "display": INDIG[ind]}}]
    r["identifier"] = [
        {"type": {"coding": [{"system": V2, "code": "NI"}], "text": "IHI"}, "system": IHI, "value": ihi(i)},
        {"type": {"coding": [{"system": V2, "code": "MC", "display": "Patient's Medicare Number"}], "text": "Medicare Number"},
         "system": MEDICARE, "value": medicare(i)}]
    r["name"] = [{"use": "usual", "family": f, "given": g.split(" ")[:1] if False else [g]}]
    r["telecom"] = [{"system": "phone", "value": ph, "use": "mobile"}]
    r["gender"] = sex
    r["birthDate"] = dob
    r["address"] = [{"use": "home", "line": [st], "city": sub, "state": "QLD", "postalCode": pc, "country": "AU"}]
    return r


# ---------------------------------------------------------------- referral storylines
PROC = {  # key -> (code, display, modality, contrast)
    "CTAP": ("432370003", "CT of abdomen and pelvis with contrast", "CT", True),
    "CTHEAD": ("303653007", "CT of head", "CT", False),
    "CTCHEST": ("169069000", "CT of chest", "CT", False),
    "CTSINUS": ("241526005", "CT of paranasal sinuses", "CT", False),
    "MRLS": ("241648005", "MRI of lumbar spine", "MRI", False),
    "MRKNEE": ("241641004", "MRI of knee", "MRI", False),
    "MRBRAIN": ("816077007", "MRI of brain", "MRI", False),
    "USABD": ("45036003", "Ultrasound of abdomen", "US", False),
    "USTHY": ("433175006", "Ultrasound of thyroid and parathyroid", "US", False),
    "USPEL": ("24848001", "Ultrasound scan of pelvis", "US", False),
    "XRCHEST": ("399208008", "Plain chest X-ray", "XR", False),
    "XRLS": ("840361000", "Plain X-ray of lumbar spine", "XR", False),
    "XRSHO": ("783543007", "Plain X-ray of shoulder", "XR", False),
    "MAM": ("24623002", "Screening mammography", "MAM", False),
}
REASON = {
    "ruq": ("301717006", "Right upper quadrant pain"), "abd": ("21522001", "Abdominal pain"),
    "back": ("161891005", "Back pain"), "head": ("25064002", "Headache"),
    "knee": ("1003722009", "Pain of knee region"), "sho": ("45326000", "Shoulder pain"),
    "cough": ("49727002", "Cough"), "goitre": ("3716002", "Goitre"),
    "dysp": ("267036007", "Dyspnea"), "sinus": ("40055000", "Chronic sinusitis"),
    "pelvic": ("30473006", "Pain in pelvis"), "screen": None,
}
# state: req/rec/acc = active, no booking; book = active + booked appt; done = completed; donebk = completed + fulfilled appt
# (n, patient, referrer, filler, proc, reason, priority, state, authoredOn, appointment date, condition?)
REFERRALS = [
    (1, 1, 1, 1, "CTAP", "ruq", "routine", "req", "2026-10-14", None, True),
    (2, 2, 2, 1, "USABD", "abd", "routine", "req", "2026-10-15", None, False),
    (3, 3, 3, 2, "MRLS", "back", "routine", "rec", "2026-10-12", None, True),
    (4, 4, 3, 2, "CTHEAD", "head", "urgent", "acc", "2026-10-16", None, False),
    (5, 5, 4, 3, "MRKNEE", "knee", "routine", "donebk", "2026-09-08", "2026-09-22", True),
    (6, 5, 4, 3, "XRSHO", "sho", "routine", "req", "2026-10-17", None, False),
    (7, 6, 5, 4, "CTCHEST", "cough", "routine", "book", "2026-10-09", "2026-11-02", True),
    (8, 7, 5, 4, "USTHY", "goitre", "routine", "done", "2026-09-15", None, False),
    (9, 8, 6, 1, "XRCHEST", "dysp", "urgent", "donebk", "2026-09-30", "2026-10-02", False),
    (10, 9, 1, 1, "CTSINUS", "sinus", "routine", "req", "2026-10-18", None, False),
    (11, 10, 2, 1, "USPEL", "pelvic", "routine", "acc", "2026-10-13", None, False),
    (12, 11, 3, 2, "MRBRAIN", "head", "routine", "book", "2026-10-08", "2026-11-03", True),
    (13, 12, 4, 3, "MAM", "screen", "routine", "donebk", "2026-09-01", "2026-09-18", False),
    (14, 13, 5, 4, "XRLS", "back", "routine", "donebk", "2026-08-12", "2026-08-20", False),
    (15, 13, 5, 4, "USABD", "abd", "routine", "rec", "2026-10-17", None, False),
    (16, 14, 6, 1, "CTAP", "abd", "urgent", "donebk", "2026-09-22", "2026-09-25", True),
    (17, 15, 2, 1, "XRSHO", "sho", "routine", "done", "2026-09-10", None, False),
    (18, 16, 2, 6, "MRKNEE", "knee", "routine", "req", "2026-10-19", None, False),
    (19, 17, 3, 2, "USABD", "abd", "routine", "donebk", "2026-10-01", "2026-10-06", False),
    (20, 18, 4, 3, "CTHEAD", "head", "routine", "done", "2026-09-24", None, False),
    (21, 19, 5, 4, "CTCHEST", "cough", "urgent", "req", "2026-10-18", None, False),
    (22, 20, 6, 1, "USABD", "abd", "routine", "book", "2026-10-07", "2026-11-02", False),
]
REFERRALS = [r[:3] + (REMAP[(r[3], PROC[r[4]][2])],) + r[4:] for r in REFERRALS]  # fillers now come from the directory seed
TASKSTATUS = {"req": "requested", "rec": "received", "acc": "accepted", "book": "in-progress", "done": "completed", "donebk": "completed"}


def tz(d, hh=9, mm=0): return "%sT%02d:%02d:00+10:00" % (d, hh, mm)


def slot_id(f, m, day, hh, mm): return "qhc-slot-f%d-%s-%s-%02d%02d" % (f, m.lower(), day.replace("-", ""), hh, mm)


def sched_id(f, m): return "qhc-sched-f%d-%s" % (f, m.lower())


def end_time(day, hh, mm, mins):
    t = dt.datetime.strptime("%s %02d:%02d" % (day, hh, mm), "%Y-%m-%d %H:%M") + dt.timedelta(minutes=mins)
    return t.strftime("%Y-%m-%dT%H:%M:00+10:00")




def appt_time(state): return (8, 0) if state == "book" else (9, 0)


def referral_entries(row):
    n, pi, rf, f, pk, rk, prio, state, auth, apday, cond = row
    code, disp, mod, contrast = PROC[pk]
    st = MOD[mod]
    pid = "Patient/qhc-pat-%02d" % pi
    role = "PractitionerRole/qhc-role-%d" % rf
    rdisp = "%s %s" % (REFERRERS[rf][5][3], REFERRERS[rf][5][1])
    pgn = "RFP-QHC-%04d" % n
    sysn = pgn_system(rf)
    assigner = ref("Organization/qhc-org-ref%d" % rf, REFERRERS[rf][0])
    sr_id, tk_id, gt_id = "qhc-sr-%04d" % n, "qhc-task-%04d" % n, "qhc-taskgroup-%04d" % n
    es = []
    reason = REASON[rk]
    cond_id = None
    if cond and reason:
        cond_id = "qhc-cond-%04d" % n
        es.append({"resourceType": "Condition", "id": cond_id, "meta": {"profile": [CORE + "au-core-condition"]},
                   "clinicalStatus": cc("http://terminology.hl7.org/CodeSystem/condition-clinical", "active"),
                   "category": [cc("http://terminology.hl7.org/CodeSystem/condition-category", "problem-list-item")],
                   "code": cc(SCT, reason[0], reason[1]), "subject": ref(pid),
                   "onsetDateTime": (dt.date.fromisoformat(auth) - dt.timedelta(days=14)).isoformat()})
    egfr_id = None
    if contrast:
        egfr_id = "qhc-egfr-%04d" % n
        es.append({"resourceType": "Observation", "id": egfr_id, "status": "final",
                   "category": [cc("http://terminology.hl7.org/CodeSystem/observation-category", "laboratory")],
                   "code": cc("http://loinc.org", "98979-8", "Glomerular filtration rate [Volume Rate/Area] in Serum, Plasma or Blood by Creatinine-based formula (CKD-EPI 2021)/1.73 sq M"),
                   "subject": ref(pid),
                   "effectiveDateTime": (dt.date.fromisoformat(auth) - dt.timedelta(days=3)).isoformat(),
                   "valueQuantity": {"value": 60 + (n * 7) % 35, "unit": "mL/min/{1.73_m2}", "system": "http://unitsofmeasure.org", "code": "mL/min/{1.73_m2}"}})
    completed = state in ("done", "donebk")
    sr = {"resourceType": "ServiceRequest", "id": sr_id, "meta": {"profile": [RR + "referral-servicerequest"]},
          "identifier": [{"system": sysn, "value": pgn + "-1"}],
          "requisition": {"type": {"coding": [{"system": V2, "code": "PGN"}]}, "system": sysn, "value": pgn},
          "status": "completed" if completed else "active", "intent": "order",
          "category": [cc(SCT, "3457005", "Patient referral"), cc(SCT, "363679005", "Imaging")],
          "priority": prio,
          "code": {"coding": [{"system": SCT, "code": code, "display": disp}], "text": disp},
          "subject": ref(pid),
          "occurrencePeriod": {"start": auth, "end": (dt.date.fromisoformat(auth) + dt.timedelta(days=14 if prio == "routine" else 3)).isoformat()},
          "authoredOn": tz(auth, 10, 15),
          "requester": ref(role, rdisp),
          "performerType": cc(SCT, st[0], st[1]),
          "performer": [filler_org(f)]}
    if reason:
        sr["reasonCode"] = [cc(SCT, reason[0], reason[1])]
    if cond_id:
        sr["reasonReference"] = [ref("Condition/" + cond_id)]
    if egfr_id:
        sr["supportingInfo"] = [ref("Observation/" + egfr_id)]
        sr["note"] = [{"text": "No known allergy to iodinated contrast. eGFR attached."}]
    elif prio == "urgent":
        sr["note"] = [{"text": "Urgent - please triage same day."}]
    es.append(sr)
    last = tz(auth, 14, 0) if state == "req" else tz((dt.date.fromisoformat(auth) + dt.timedelta(days=1)).isoformat(), 9, 0)
    if completed:
        last = tz(apday or (dt.date.fromisoformat(auth) + dt.timedelta(days=9)).isoformat(), 16, 30)
    gstatus = TASKSTATUS[state]
    biz = {"book": "service-booked", "done": "image-acquired", "donebk": "image-acquired"}.get(state)
    common_group_id = {"type": {"coding": [{"system": V2, "code": "PGN"}], "text": "Placer Group Number"}, "system": sysn, "value": pgn, "assigner": assigner}

    def task(rid, profile, tagcode):
        t = {"resourceType": "Task", "id": rid, "meta": {"profile": [profile], "tag": [{"system": TAG, "code": tagcode}]}}
        return t
    gt = task(gt_id, P + "au-erequesting-task-group", "fulfilment-task-group")
    gt.update({"groupIdentifier": common_group_id, "status": gstatus})
    tk = task(tk_id, RR + "referral-task", "fulfilment-task")
    tk.update({"identifier": [{"type": {"coding": [{"system": V2, "code": "PLAC", "display": "Placer Identifier"}]},
                               "system": sysn, "value": pgn + "-1", "assigner": assigner}],
               "groupIdentifier": common_group_id, "partOf": [ref("Task/" + gt_id)], "status": gstatus})
    for t in (gt, tk):
        if biz: t["businessStatus"] = cc(TBS, biz)
        t.update({"intent": "order", "priority": prio, "code": cc(TCODE, "fulfill"), "for": ref(pid),
                  "authoredOn": tz(auth, 10, 15), "lastModified": last, "requester": ref(role, rdisp),
                  "owner": filler_org(f)})
    tk["focus"] = ref("ServiceRequest/" + sr_id)
    es += [gt, tk]
    if apday:
        hh, mm = appt_time(state)
        sid = slot_id(f, mod, apday, hh, mm)
        booked = state == "book"
        ap = {"resourceType": "Appointment", "id": "qhc-appt-%04d" % n, "meta": {"profile": [RR + "referral-appointment"]},
              "status": "booked" if booked else "fulfilled",
              "serviceType": [svc_type(f, mod)],
              "start": tz(apday, hh, mm), "end": end_time(apday, hh, mm, st[2]),
              "created": (dt.date.fromisoformat(auth) + dt.timedelta(days=1)).isoformat(),
              "slot": [ref("Slot/" + sid)], "basedOn": [ref("ServiceRequest/" + sr_id)],
              "patientInstruction": "Please arrive 15 minutes early and bring your Medicare card." + (" Fast for 4 hours before your scan." if contrast else ""),
              "participant": [{"actor": ref(pid), "status": "accepted"},
                              {"actor": filler_loc(f), "status": "accepted"},
                              {"actor": filler_hcs(f, mod), "status": "accepted"}]}
        if cond_id: ap["reasonReference"] = [ref("Condition/" + cond_id)]
        es.append(ap)
    return es


def schedules_and_slots():
    es = []
    # one schedule per (filler, modality) offered, so participants can browse any of them
    for f, (name, city, pc, h, mods) in FILLERS.items():
        for m in mods:
            st = MOD[m]
            sid = sched_id(f, m)
            es.append({"resourceType": "Schedule", "id": sid, "meta": {"profile": [RR + "booking-schedule"]},
                       "active": True, "serviceType": [svc_type(f, m)],
                       "actor": [filler_hcs(f, m), filler_loc(f)],
                       "planningHorizon": {"start": "2026-08-01T00:00:00+10:00", "end": "2026-12-31T23:59:59+10:00"}})
            # free slots: two days, 3 each  (08:00 is reserved for the pre-booked demo appointments)
            for day in ("2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10"):
                for hh, mm in ((9, 0), (9, 45), (10, 30)):
                    es.append(_slot(f, m, day, hh, mm, "free"))
    # busy slots backing appointments
    for r in REFERRALS:
        n, pi, rf, f, pk, rk, prio, state, auth, apday, cond = r
        if apday:
            hh, mm = appt_time(state)
            es.append(_slot(f, PROC[pk][2], apday, hh, mm, "busy"))
    return es


def _slot(f, m, day, hh, mm, status):
    st = MOD[m]
    return {"resourceType": "Slot", "id": slot_id(f, m, day, hh, mm), "meta": {"profile": [RR + "booking-slot"]},
            "serviceType": [svc_type(f, m)], "schedule": ref("Schedule/" + sched_id(f, m)),
            "status": status, "start": tz(day, hh, mm), "end": end_time(day, hh, mm, st[2])}


if __name__ == "__main__":
    write("00-referrers.json", referrer_entries())
    write("01-schedules-slots.json", schedules_and_slots())
    for i in range(1, 21):
        es = [patient(i)]
        for row in REFERRALS:
            if row[1] == i:
                es += referral_entries(row)
        write("patient-%02d.json" % i, es)
    print("written")
