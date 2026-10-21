# Makefile — Track 2 slide build
#
# Renders PlantUML diagrams and builds the kick-off deck from Marp Markdown.
#
# Requirements (all present on the CSIRO dev image):
#   - marp        (Marp CLI)         https://github.com/marp-team/marp-cli
#   - plantuml    (+ Java, Graphviz) for diagram rendering
#   - ImageMagick (convert)          to trim the diagram PNGs
#   - chromium    for Marp rendering (set CHROME_PATH if not auto-detected)
#   - libreoffice (soffice)          for the editable PPTX export
#
# Common targets:
#   make            # diagrams + editable pptx (default)
#   make diagrams   # render all .puml -> .svg
#   make pptx       # editable PowerPoint
#   make pdf        # PDF
#   make preview    # per-slide PNGs into build/preview/
#   make clean      # remove generated diagrams and build artifacts

# ---- Config ---------------------------------------------------------------

# the deck to build; the architects' deck is built with:  make architects
DECK        ?= ../Track2-KickOff-Deck.md
PPTX        ?= ../Track2-KickOff-Deck.pptx
PDF         ?= ../Track2-KickOff-Deck.pdf

DIAGRAM_SRC := $(wildcard diagrams/*.puml)
DIAGRAM_SVG := $(DIAGRAM_SRC:.puml=.svg)
DIAGRAM_PNG := $(DIAGRAM_SRC:.puml=.png)

BUILD       := build
PREVIEW     := $(BUILD)/preview

# Marp needs a browser; prefer an explicit chromium if present.
CHROME_PATH ?= $(firstword $(wildcard /usr/bin/chromium-browser /usr/bin/chromium /snap/bin/chromium))
MARP        := CHROME_PATH=$(CHROME_PATH) marp --allow-local-files

PLANTUML    := plantuml

# ---- Targets --------------------------------------------------------------

.PHONY: all diagrams qr architects pptx pdf preview clean help

all: diagrams pptx

## Render every PlantUML diagram to SVG
diagrams: $(DIAGRAM_SVG) $(DIAGRAM_PNG)

# The architects' deck uses PNGs: PowerPoint and LibreOffice drop glyphs (for example the 'tti' in 'settings') from SVG text.
diagrams/%.png: diagrams/%.puml
	$(PLANTUML) -tpng -Sdpi=200 $<
	convert $@ -trim +repage -bordercolor none -border 16 $@

diagrams/%.svg: diagrams/%.puml
	$(PLANTUML) -tsvg $<
	@# PlantUML writes preserveAspectRatio="none", which stretches text when Marp sizes by height only
	@sed -i 's/preserveAspectRatio="none"/preserveAspectRatio="xMidYMid meet"/' $@
	@# PlantUML also pins each text run to the width of the font it had at render time (textLength), which
	@# stretches or squeezes text when the slide renderer uses a different font; let the browser lay text out
	@sed -i -E 's/ (textLength|lengthAdjust)="[^"]*"//g' $@

## Render the QR codes listed in qr/urls.txt (needs: pip install segno)
qr:
	python3 qr/make-qr.py

## Build the architects' deck (PDF and editable PPTX), QR codes included
architects: diagrams qr
	$(MAKE) pdf pptx DECK=../Architects-Deck.md PDF=../Architects-Deck.pdf PPTX=../Architects-Deck.pptx

## Build the editable PowerPoint deck
pptx: diagrams
	$(MARP) $(DECK) --pptx-editable -o $(PPTX)

## Build a PDF of the deck
pdf: diagrams
	$(MARP) $(DECK) --pdf -o $(PDF)

## Render per-slide PNG previews into build/preview/
preview: diagrams
	mkdir -p $(PREVIEW)
	$(MARP) $(DECK) --images png -o $(PREVIEW)/slide.png

## Remove generated diagrams and build artifacts
clean:
	rm -f $(DIAGRAM_SVG) $(DIAGRAM_PNG)
	rm -rf $(BUILD)

## Show this help
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //'
	@echo ""
	@echo "Targets: all diagrams pptx pdf preview clean help"
