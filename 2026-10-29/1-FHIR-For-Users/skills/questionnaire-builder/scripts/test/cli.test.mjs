import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = fileURLToPath(new URL('../', import.meta.url));
const FIXTURE = fileURLToPath(new URL('./fixtures/pop-data.json', import.meta.url));

// Installing the skill by symlink (as the README suggests) must not stop its scripts running.
test('a CLI run through a symlinked skill folder still runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qb-link-'));
  const link = join(dir, 'scripts');
  symlinkSync(SCRIPTS, link, 'dir');
  const out = execFileSync(process.execPath, [join(link, 'load.mjs'), FIXTURE, '--server', 'https://example.org/fhir', '--prefix', 't-'], { encoding: 'utf8' });
  assert.match(out, /Nothing sent/);
});
