# Track 1 kick-off decks

Five Marp decks for Track 1 (FHIR for Users), in kick-off order. Read them as HTML on GitHub
Pages; present from PDF or PPTX. Presenting? Start with [`Presenter-Guide.md`](Presenter-Guide.md)
(run sheet per deck, then click-by-click notes per site).

| # | Deck | What it covers | On Pages |
|---|---|---|---|
| 1 | [`1-scenarios.md`](1-scenarios.md) | Strands A–D, scenario cards, shared conventions, where things are | https://aehrc.github.io/qh-connectathon/decks/1-scenarios.html |
| 2 | [`2-smart-apps.md`](2-smart-apps.md) | EHR launch on Meld, client IDs and v1 scopes, the CodeSandbox starter, an Hb app | https://aehrc.github.io/qh-connectathon/decks/2-smart-apps.html |
| 3 | [`3-questionnaires.md`](3-questionnaires.md) | Questionnaire basics; build the pathology form in NLM Form Builder; render it in Smart Forms | https://aehrc.github.io/qh-connectathon/decks/3-questionnaires.html |
| 4 | [`4-prepopulation.md`](4-prepopulation.md) | launchContext, x-fhir-query, FHIRPath in fhirpath-lab, Pre-populate in the playground | https://aehrc.github.io/qh-connectathon/decks/4-prepopulation.html |
| 5 | [`5-write-back.md`](5-write-back.md) | Template-based `$extract`, testing template FHIRPath, write back to Meld, close the loop | https://aehrc.github.io/qh-connectathon/decks/5-write-back.html |

## Install

```
npm i -g @marp-team/marp-cli   # marp
npm i                          # in decks/: playwright (make shots) and fhirpath (make verify)
npx playwright install chromium   # once, for make shots
```

pdf, pptx and preview also need Chrome or Chromium. The Makefile looks for Google Chrome on macOS
and chromium / google-chrome on Linux; otherwise pass `make pdf CHROME_PATH=/path/to/chrome`.

## Build and check

```
make html           # build/<deck>.html and build/img/
make pdf            # build/<deck>.pdf
make pptx           # build/<deck>.pptx
make preview        # PNG per slide in build/preview/
make check          # build all HTML, fail on missing img/ references
make verify         # run every FHIRPath and query in examples/expressions.json (reads the Meld open endpoint)
make verify-slides  # decks and examples/expressions.json match (offline)
make shots          # re-capture screenshots (node tools/shoot-*.mjs + tools/check-shots.mjs)
```

* **`make verify-slides`** rule: every `expressions.json` entry's expression appears verbatim in a
  deck, unless the entry has `"slides": false`. In the other direction it checks FHIRPath-looking
  text (`entry.resource`, `item.where(`, `answer.value`, `%resource.`, `repeat(item)`) in fenced
  code and `<pre>` blocks (for a JSON `"expression"` / `"valueString"` line, the string value;
  any `"expression"` value is checked) and inline code of 15+ characters without `...`. Each must
  be an expression or `inForm` text in `expressions.json`. So: put a new expression on a slide
  only by copying it from `examples/`, after adding and verifying it there.
* The Makefile runs marp with `</dev/null`: marp reads Markdown from stdin when stdin isn't a
  terminal (scripts, CI) and then ignores the file arguments.
* `make shots` re-captures every PNG; revert churn you didn't mean to change. The NLM Form Builder
  shots need a browser profile where the terms are already accepted:
  `LHC_PROFILE=/abs/path/to/chromium-profile make shots` (absolute path). Meld launcher and CodeSandbox shots are taken by hand
  (Presenter guide, sections 5 and 6).
* Before a demo session: `examples/reset-demo.sh` puts the demo patient `pam-demo` back to its
  baseline (write-back demos add Observations).

## Publishing

`build/` is git-ignored. [`../apps/deploy-pages.sh`](../apps/deploy-pages.sh) builds the HTML
(`make html`) and copies `build/*.html`, `build/img/` and the list page `index.html` to `decks/` on
the `gh-pages` branch, next to the apps. Deploying is Jim's call.

## Layout

- `[0-9]-*.md`: the decks (theme `track1`, `theme/track1.css`)
- `img/<deck>/`: screenshots, written by `tools/shoot-*.mjs`
- `examples/`: the FHIR JSON and FHIRPath shown on slides, `expressions.json`, `verify.mjs`,
  `verify-slides.mjs`, `reset-demo.sh`
- `Presenter-Guide.md`: run sheets and click-by-click demo notes
- `index.html`: the deck list page published at `/decks/`
- `build/`: generated, git-ignored

## Slide classes

Set per slide with `<!-- _class: demo -->`.

- `title`: dark navy title slide; `section`: dark divider
- `demo`: orange "Demo" eyebrow (presenter switches to the browser)
- `tryit`: "Now you try" slide
- helpers: `<div class="cards">` for scenario cards, `.small` for smaller text
