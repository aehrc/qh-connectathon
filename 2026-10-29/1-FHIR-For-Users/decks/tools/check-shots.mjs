// Completeness check run at the end of `make shots`.
// Every screenshot named in Presenter-Guide.md (as img/<deck>/<file>.png or <deck>/<file>.png)
// must exist under img/ and be at least 20 KB, except those on a line that says
// "screenshot by Jim" (taken by hand). Exits 1 on any missing or small file.
import fs from 'node:fs';
import path from 'node:path';
import { DECKS } from './lib.mjs';

const MIN = 20000;
const guide = fs.readFileSync(path.join(DECKS, 'Presenter-Guide.md'), 'utf8');
const re = /(?:img\/)?((?:questionnaires|prepop|writeback|smart)\/[\w.-]+\.png)/g;

const required = new Set();
const manual = new Set();
for (const line of guide.split('\n')) {
  const isManual = /screenshot by Jim/i.test(line);
  for (const m of line.matchAll(re)) (isManual ? manual : required).add(m[1]);
}
for (const f of manual) required.delete(f);

let bad = 0;
for (const f of [...required].sort()) {
  const p = path.join(DECKS, 'img', f);
  if (!fs.existsSync(p)) { console.log(`MISSING  img/${f}`); bad++; continue; }
  const size = fs.statSync(p).size;
  if (size < MIN) { console.log(`SMALL    img/${f}  ${size} B`); bad++; }
}
for (const f of [...manual].sort()) {
  if (!fs.existsSync(path.join(DECKS, 'img', f))) console.log(`manual   img/${f}  (screenshot by Jim, not taken yet)`);
}
console.log(`check-shots: ${required.size} required, ${manual.size} manual, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
