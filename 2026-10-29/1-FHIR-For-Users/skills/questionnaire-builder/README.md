# questionnaire-builder: an AI-agent skill for building FHIR Questionnaires

Bring a form you already use (a scanned or photographed paper form, a PDF, a screenshot of a web
form, a REDCap data dictionary) or just a list of the questions you want. The skill helps your
AI agent turn it into a FHIR Questionnaire that fills itself in from the patient record and
writes back what matters, by asking you about **why the form is the way it is**: who fills it
in, what's already recorded elsewhere, what happens to the answers, and how it should change for
different patients.

You get:

* the **Questionnaire** (FHIR R4, SDC, tested with the Smart Forms renderer),
* **sample data** (synthetic test patients) to show it working,
* a **change log** for the form's owner, explaining every change and assumption.

You don't need to know FHIR. Please **don't share forms with real patient details** on them:
use a blank copy, or cover the details first.

Made for the FHIR in Queensland Health Connectathon 2026 (Track 1, FHIR for Users), by CSIRO's
Australian e-Health Research Centre.

## Install

The skill is this folder (`SKILL.md` plus `references/` and `scripts/`), in the open
Agent Skills format.

* **Claude Code:** copy the folder to `~/.claude/skills/questionnaire-builder/` (for you) or
  `.claude/skills/questionnaire-builder/` in a project. It's picked up automatically.
* **Claude (claude.ai, desktop):** download `questionnaire-builder.skill` (or zip this folder) and
  upload it under *Settings → Capabilities → Skills*.
* **Other agents that read Agent Skills** (a `SKILL.md` folder): put the folder where your agent
  looks for skills.
* **Any other agent:** paste [`dist/questionnaire-builder.md`](dist/questionnaire-builder.md) in
  as instructions (or attach it). It's the skill in one file; it can do a little less (no
  bundled scripts or sample form).

Then start with something like: *"I'd like to turn our pre-admission form into a FHIR
Questionnaire"*, and attach the blank form.

## The optional checking tools

If your agent can run code, it can check its own work with the tools in `scripts/` (Node.js 20
or later; run `npm install` there once):

```
node scripts/check.mjs form.json --data sample-data.json --answers answers.json
```

prepopulates the form for each test patient and runs extraction, with the same libraries as the
Smart Forms renderer, offline.

```
node scripts/preview.mjs form.json --data sample-data.json --answers answers.json
```

opens the form in your browser in the real Smart Forms renderer, filled in for a test patient
you pick, with what it would write back. It updates by itself each time the agent saves a new
version. (It uses a prebuilt copy of the renderer in `scripts/preview-app/dist`; maintainers
rebuild it with `npm run build-preview`.) `scripts/load.mjs` loads sample data to a FHIR server (only with
`--yes`) and cleans it up again. `scripts/mcp-server.mjs` offers the same checks as an MCP
server, for agents that use MCP:

```json
{ "mcpServers": { "questionnaire-builder": { "command": "node", "args": ["<path>/scripts/mcp-server.mjs"] } } }
```

The skill works without any of them; the agent just tells you what it couldn't check.

## What's in here

| Path | What |
|---|---|
| `SKILL.md` | The skill: how the session runs, what to ask, the rules |
| `references/` | Detail the agent reads when it needs it: the probing guide, reading forms, an SDC cheat-sheet, data shapes, test environments, sample data, the change-log template |
| `references/snippets/` | A small working form ("pre-op bloods") with sample data, used by the cheat-sheet |
| `scripts/` | The optional checking tools and their tests (`npm test`) |
| `evals/` | Test cases used to develop the skill |
| `dist/` | The single-file version |

## Feedback

Issues and suggestions: [aehrc/qh-connectathon](https://github.com/aehrc/qh-connectathon/issues).
