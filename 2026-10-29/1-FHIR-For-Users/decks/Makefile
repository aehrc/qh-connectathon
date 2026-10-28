# Makefile: Track 1 (FHIR for Users) kick-off decks
#
# Builds every decks/[0-9]*.md with the track1 Marp theme.
#   make html     # build/<deck>.html (+ build/img/)
#   make pdf      # build/<deck>.pdf
#   make pptx     # build/<deck>.pptx
#   make preview  # build/preview/<deck>.NNN.png
#   make shots    # re-capture screenshots: node tools/shoot-*.mjs, then tools/check-shots.mjs
#   make verify   # node examples/verify.mjs
#   make check    # build all HTML, fail on missing ![](img/...) files
#   make clean

DECKS   := $(sort $(wildcard [0-9]*.md))
NAMES   := $(DECKS:.md=)
BUILD   := build
THEME   := theme/track1.css

# Marp needs a browser for pdf/pptx/preview.
CHROME_PATH ?= $(firstword $(wildcard \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  /usr/bin/chromium-browser /usr/bin/chromium /snap/bin/chromium \
  /usr/bin/google-chrome))
export CHROME_PATH
MARP    := marp --theme-set $(THEME) --allow-local-files --html </dev/null

.PHONY: all html pdf pptx preview shots verify check clean help

all: html

html: $(addprefix $(BUILD)/,$(addsuffix .html,$(NAMES)))
	@mkdir -p $(BUILD)/img
	@if [ -d img ]; then cp -R img/. $(BUILD)/img/; fi

$(BUILD)/%.html: %.md $(THEME)
	@mkdir -p $(BUILD)
	$(MARP) $< -o $@

pdf: $(addprefix $(BUILD)/,$(addsuffix .pdf,$(NAMES)))
$(BUILD)/%.pdf: %.md $(THEME)
	@mkdir -p $(BUILD)
	$(MARP) $< --pdf -o $@

pptx: $(addprefix $(BUILD)/,$(addsuffix .pptx,$(NAMES)))
$(BUILD)/%.pptx: %.md $(THEME)
	@mkdir -p $(BUILD)
	$(MARP) $< --pptx -o $@

preview:
	@mkdir -p $(BUILD)/preview
	@for n in $(NAMES); do $(MARP) $$n.md --images png -o $(BUILD)/preview/$$n.png || exit 1; done

shots:
	@set -e; found=0; for s in tools/shoot-*.mjs; do \
	  [ -e "$$s" ] || continue; found=1; echo "== $$s"; node "$$s"; done; \
	  [ $$found = 1 ] || echo "no tools/shoot-*.mjs scripts yet; nothing to do"; \
	  if [ -f tools/check-shots.mjs ]; then node tools/check-shots.mjs; fi

verify:
	@if [ -f examples/verify.mjs ]; then node examples/verify.mjs; \
	else echo "examples/verify.mjs not present yet; skipping"; fi

check: html
	@missing=0; for f in $(DECKS); do \
	  for p in $$(grep -o '!\[[^]]*\](img/[^) ]*' $$f | sed 's/.*](//'); do \
	    [ -e "$$p" ] || { echo "MISSING image in $$f: $$p"; missing=1; }; \
	  done; done; \
	  [ $$missing = 0 ] && echo "check ok: $(words $(DECKS)) deck(s), all images present"

clean:
	rm -rf $(BUILD)

help:
	@sed -n '3,12p' Makefile
