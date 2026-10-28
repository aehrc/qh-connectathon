# Track 1 kick-off decks

Five Marp decks for Track 1 (FHIR for Users). Read them as HTML on GitHub Pages; present from PDF or PPTX.

## Build

Needs `marp` (Marp CLI) and, for pdf/pptx/preview, a Chrome/Chromium (the Makefile finds Google Chrome on macOS or chromium on Linux; override with `CHROME_PATH=...`).

```
make html      # build/<deck>.html and build/img/
make pdf       # build/<deck>.pdf
make pptx      # build/<deck>.pptx
make preview   # PNG per slide in build/preview/
make check     # build everything, fail on missing img/ references
make shots     # re-capture screenshots (node tools/shoot-*.mjs), needs playwright
make verify    # check the FHIR examples and FHIRPath (node examples/verify.mjs)
```

## Layout

- `[0-9]-*.md`: the decks (theme `track1`, `theme/track1.css`)
- `img/<deck>/`: screenshots, written by `tools/shoot-*.mjs`
- `examples/`: the FHIR JSON and FHIRPath shown on slides, plus `verify.mjs`
- `build/`: generated, git-ignored

## Slide classes

Set per slide with `<!-- _class: demo -->`.

- `title`: dark navy title slide; `section`: dark divider
- `demo`: orange "Demo" eyebrow (presenter switches to the browser)
- `tryit`: "Now you try" slide
- helpers: `<div class="cards">` for scenario cards, `.small` for smaller text
