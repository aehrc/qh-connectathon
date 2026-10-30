#!/usr/bin/env node
// Check a Questionnaire: structure, expressions, and population and extraction for each test patient.
//
//   node check.mjs <questionnaire.json> [--data sample.json | --server <base>]
//                  [--patient <id>] [--user <id>] [--prefix <p>] [--answers answers.json] [--json]
//
// answers.json: {"<linkId>": [{"valueString": "..."}], ...}, added to each prepopulated response before
// extraction, standing in for what the person types in.
//
// Exits 0 if nothing failed, 1 otherwise.
import { readFileSync } from 'node:fs';
import { checkAll } from './lib/check.mjs';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    fail(e.code === 'ENOENT' ? `Can't find ${file}` : `Can't read ${file} as JSON: ${e.message}`);
  }
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const json = args.includes('--json') && args.splice(args.indexOf('--json'), 1);
const opts = { data: flag('--data'), server: flag('--server'), patientId: flag('--patient'), userId: flag('--user'), prefix: flag('--prefix'), answers: flag('--answers') };
if (args.length !== 1) fail('Usage: node check.mjs <questionnaire.json> [--data sample.json | --server <base>] [--patient id] [--user id] [--prefix p] [--answers answers.json] [--json]');

const report = await checkAll({
  questionnaire: readJson(args[0]),
  sampleBundle: opts.data ? readJson(opts.data) : undefined,
  server: opts.server,
  patientId: opts.patientId,
  userId: opts.userId,
  prefix: opts.prefix,
  answers: opts.answers ? readJson(opts.answers) : undefined,
});

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const s of report.sections) {
    console.log(`\n== ${s.name} ==`);
    for (const line of s.lines) console.log(`  ${line}`);
  }
  console.log(`\nOverall: ${report.pass ? 'PASS' : 'FAIL'}`);
}
process.exit(report.pass ? 0 : 1);
