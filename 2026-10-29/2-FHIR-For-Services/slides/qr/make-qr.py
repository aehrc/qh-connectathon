#!/usr/bin/env python3
"""Render a QR code SVG for every URL in qr/urls.txt (one 'name url' pair per line) into qr/<name>.svg.

Needs `pip install segno`. The deck refers to the images as slides/qr/<name>.svg and wraps each in a link to the same URL.
"""
import pathlib, sys
try:
    import segno
except ImportError:
    sys.exit("segno is required: pip install segno")

here = pathlib.Path(__file__).resolve().parent
for line in (here / "urls.txt").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    name, url = line.split(None, 1)
    segno.make(url.strip(), error="m").save(str(here / (name + ".svg")), scale=10, border=2, dark="#001D34", xmldecl=False)
    print("qr/%s.svg  %s" % (name, url.strip()))
