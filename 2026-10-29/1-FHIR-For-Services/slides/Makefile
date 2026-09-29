# Makefile — Track 2 slide build
#
# Renders PlantUML diagrams and builds the kick-off deck from Marp Markdown.
#
# Requirements (all present on the CSIRO dev image):
#   - marp        (Marp CLI)         https://github.com/marp-team/marp-cli
#   - plantuml    (+ Java, Graphviz) for diagram rendering
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

DECK        := ../Track2-KickOff-Deck.md
PPTX        := ../Track2-KickOff-Deck.pptx
PDF         := ../Track2-KickOff-Deck.pdf

DIAGRAM_SRC := $(wildcard diagrams/*.puml)
DIAGRAM_SVG := $(DIAGRAM_SRC:.puml=.svg)

BUILD       := build
PREVIEW     := $(BUILD)/preview

# Marp needs a browser; prefer an explicit chromium if present.
CHROME_PATH ?= $(firstword $(wildcard /usr/bin/chromium-browser /usr/bin/chromium /snap/bin/chromium))
MARP        := CHROME_PATH=$(CHROME_PATH) marp --allow-local-files

PLANTUML    := plantuml

# ---- Targets --------------------------------------------------------------

.PHONY: all diagrams pptx pdf preview clean help

all: diagrams pptx

## Render every PlantUML diagram to SVG
diagrams: $(DIAGRAM_SVG)

diagrams/%.svg: diagrams/%.puml
	$(PLANTUML) -tsvg $<

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
	rm -f $(DIAGRAM_SVG)
	rm -rf $(BUILD)

## Show this help
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //'
	@echo ""
	@echo "Targets: all diagrams pptx pdf preview clean help"
