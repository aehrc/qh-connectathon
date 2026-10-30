# Sample data

Sample data lets the person *see* their form work: open it for a test patient, watch it fill in,
complete it, and see what it writes back. It stands in for the upstream systems, so it should
look like them.

## What to make

* **A transaction Bundle** of `PUT` entries (so it can be loaded again and cleaned up by id).
  Every id starts with the person's **prefix** (default: their initials and a hyphen, `js-`).
* **One test patient per way the form varies.** If the form behaves differently for women and
  men, adults and children, or pregnant patients, include one of each that matters, so the demo
  can show the difference. Name them so it's obvious: `js-f1` (adult female), `js-m1` (adult
  male), `js-c1` (child).
* **The resources the prepopulation searches read**, in the upstream shape (`upstream-shapes.md`):
  for a "latest Hb" search, two or three Hb Observations on different dates, so "latest" is
  tested.
* **A Practitioner** if the form uses `%user`.
* **An answers file** (`{"<linkId>": [{"valueX": ...}]}`) for the items a person would type in,
  so `check` can exercise extraction.
* **A cleanup Bundle** of `DELETE`s for every id, or point the person at `load.mjs --cleanup`.

See `snippets/demo-sample-data.json` and `snippets/demo-answers.json`.

## Synthetic only

* Values are made up. If the person shared a filled-in form, use it only for the *shape* of
  values (a date written dd/mm/yyyy, a weight in kg, a three-letter code), never the values
  themselves. Names like `Fran Example`; dates of birth that give the ages you need.
* Never reuse or refer to shared test patients (in the connectathon setup, `pam-001`..`pam-040`
  and `pam-demo`): `check` and `load` refuse sample data that does.
* Never load anything to a server without the person saying yes, and never to a server holding
  real patients.

## Checking it

```
node scripts/check.mjs form.json --data sample-data.json --answers answers.json [--user <practitioner id>]
```

It lints the Bundle (prefix, PUTs, shared patients), prepopulates the form for every test
patient, works out calculated items, applies the answers (skipping items the form would hide
for that patient), and extracts. Read the per-patient lines back to the person: they're the
demo in text.
