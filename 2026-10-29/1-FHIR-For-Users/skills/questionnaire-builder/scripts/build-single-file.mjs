#!/usr/bin/env node
// Build dist/questionnaire-builder.md: the skill in one file, for agents that don't load skill
// folders. SKILL.md (without its frontmatter) plus the references it can't do without, inlined;
// everything else becomes a link to the full skill on GitHub.
//
//   node build-single-file.mjs        (writes ../dist/questionnaire-builder.md)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { isMain } from './lib/isMain.mjs';

const SKILL = new URL('../', import.meta.url);
const GITHUB = 'https://github.com/aehrc/qh-connectathon/blob/main/2026-10-29/1-FHIR-For-Users/skills/questionnaire-builder/';
const INLINED = ['probing.md', 'starting-points.md', 'change-log-template.md', 'sdc-cheatsheet.md'];

const read = (path) => readFileSync(new URL(path, SKILL), 'utf8');
const titleOf = (md) => md.match(/^# (.+)$/m)[1];
const titles = Object.fromEntries(INLINED.map((f) => [f, titleOf(read(`references/${f}`))]));

// Point a path (relative to the skill folder) either at its inlined section or at GitHub.
function target(path) {
  const name = path.replace(/^references\//, '');
  return INLINED.includes(name) ? { inline: titles[name] } : { url: GITHUB + path };
}

// dir: the folder the markdown came from, relative to the skill folder ('' or 'references/').
function relink(md, dir) {
  const known = (p) => /\.(md|json)$/.test(p);
  return md
    // [text](relative/path)
    .replace(/\]\((?!https?:|#)([^)\s]+)\)/g, (m, p) => {
      if (!known(p)) return m;
      const t = target(dir + p);
      return t.url ? `](${t.url})` : `](#${t.inline.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-')})`;
    })
    // `references/x.md`, `x.md` (from inside references/), `snippets/x.json`
    .replace(/`((?:references\/)?(?:snippets\/)?[\w.-]+\.(?:md|json))`/g, (m, p) => {
      const path = p.startsWith('references/') ? p : (dir + p);
      if (!path.startsWith('references/')) return m;
      const t = target(path);
      return t.url ? `[\`${p}\`](${t.url})` : `the "${t.inline}" section below`;
    });
}

const demote = (md) => md.replace(/^(#+) /gm, '#$1 ');

export function buildSingleFile() {
  const skill = read('SKILL.md').replace(/^---\n[\s\S]*?\n---\n/, '');
  const parts = [
    '<!-- Generated from SKILL.md and references/ by scripts/build-single-file.mjs. Do not edit; edit those and rebuild. -->',
    '',
    `> This is the **questionnaire-builder** skill in a single file, for AI agents that don't load skill folders. Follow it as your instructions. It can do a little less than the full skill: the checking scripts, the sample form and some reference pages are only in the full version, linked where they're mentioned: ${GITHUB}`,
    '',
    relink(skill, '').trim(),
  ];
  for (const f of INLINED) {
    parts.push('', '---', '', demote(relink(read(`references/${f}`), 'references/')).trim());
  }
  return `${parts.join('\n')}\n`;
}

if (isMain(import.meta.url)) {
  mkdirSync(new URL('dist/', SKILL), { recursive: true });
  writeFileSync(new URL('dist/questionnaire-builder.md', SKILL), buildSingleFile());
  console.log('Wrote dist/questionnaire-builder.md');
}
