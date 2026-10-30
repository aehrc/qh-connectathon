#!/usr/bin/env node
// Load sample data to a FHIR server, or remove it again.
//
//   node load.mjs <bundle.json> --server <base> --prefix <p> [--yes]
//   node load.mjs --cleanup <bundle.json> --server <base> --prefix <p> [--yes]
//
// Without --yes it only prints what it would send. It refuses sample data that touches the shared
// test patients or has ids outside the prefix; cleanup deletes only ids under the prefix.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lintBundle } from './lib/lint.mjs';

async function send(transaction, { server, fetchFn }) {
  const res = await fetchFn(server.replace(/\/$/, ''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    body: JSON.stringify(transaction),
  });
  if (!res.ok) throw new Error(`The server answered HTTP ${res.status}`);
  return res.json();
}

export async function loadBundle(bundle, { server, prefix, yes = false, fetchFn = fetch }) {
  const { errors } = lintBundle(bundle, { prefix });
  if (errors.length) throw new Error(`Not loading:\n${errors.map((e) => `  ${e.message}`).join('\n')}`);
  const plan = bundle.entry.map((e) => `${e.request.method} ${e.request.url}`);
  if (!yes) return { sent: false, plan };
  return { sent: true, plan, response: await send(bundle, { server, fetchFn }) };
}

export async function cleanupBundle(bundle, { server, prefix, yes = false, fetchFn = fetch }) {
  const shared = lintBundle(bundle, { prefix }).errors.filter((e) => e.code === 'shared-patient');
  if (shared.length) throw new Error(`Not cleaning up:\n${shared.map((e) => `  ${e.message}`).join('\n')}`);
  // Patients last, so nothing that refers to them is left dangling mid-way.
  const mine = bundle.entry.map((e) => e.resource).filter((r) => r?.id?.startsWith(prefix))
    .sort((a, b) => (a.resourceType === 'Patient') - (b.resourceType === 'Patient'));
  const entry = mine.map((r) => ({ request: { method: 'DELETE', url: `${r.resourceType}/${r.id}` } }));
  const plan = entry.map((e) => `${e.request.method} ${e.request.url}`);
  if (!yes) return { sent: false, plan };
  return { sent: true, plan, response: await send({ resourceType: 'Bundle', type: 'transaction', entry }, { server, fetchFn }) };
}

async function main(argv) {
  const args = [...argv];
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const take = (name) => args.includes(name) && Boolean(args.splice(args.indexOf(name), 1));
  const cleanup = take('--cleanup');
  const yes = take('--yes');
  const server = flag('--server');
  const prefix = flag('--prefix');
  if (args.length !== 1 || !server || !prefix) {
    throw new Error('Usage: node load.mjs [--cleanup] <bundle.json> --server <base> --prefix <p> [--yes]');
  }
  const bundle = JSON.parse(readFileSync(args[0], 'utf8'));
  const r = await (cleanup ? cleanupBundle : loadBundle)(bundle, { server, prefix, yes });
  console.log(r.plan.join('\n'));
  console.log(r.sent ? `\nSent ${r.plan.length} requests to ${server}.` : `\nNothing sent. Add --yes to send these ${r.plan.length} requests to ${server}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  });
}
