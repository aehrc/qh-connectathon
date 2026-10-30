#!/usr/bin/env node
// Show the form to the person: the real Smart Forms renderer in their browser, prefilled for a
// test patient from the sample data, with what it would write back. Offline apart from the
// terminology server. It reloads by itself when the form, data or answers files change, so run it
// once and leave it open.
//
//   node preview.mjs form.json --data sample-data.json [--answers answers.json] [--user <id>]
//                    [--port 4173] [--no-open]
//
// The page is preview-app/dist (the renderer bundled with esbuild; rebuild with
// `npm run build-preview` after changing preview-app/app.jsx). The server prepopulates and extracts
// with the same code as check.mjs.
import http from 'node:http';
import { readFileSync, watch } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeLocalFetch } from './lib/localServer.mjs';
import { runPopulate, runExtract } from './lib/sdc.mjs';
import { withAnswers } from './lib/fill.mjs';
import { contextsFor } from './lib/contexts.mjs';
import { isMain } from './lib/isMain.mjs';

const APP = fileURLToPath(new URL('./preview-app/dist/', import.meta.url));
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Form preview</title>
<link rel="stylesheet" href="/app/app.css">
<style>
  body { margin: 0; font-family: Inter, Roboto, sans-serif; background: #f6f7f9; color: #1a1a1a; }
  header { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center;
    padding: 12px 20px; background: #fff; border-bottom: 1px solid #ddd; }
  header h1 { font-size: 1.1rem; margin: 0; } .files { margin: 2px 0 0; font-size: .8rem; color: #666; }
  header label { margin-left: auto; } select, button { font: inherit; padding: 6px 10px; }
  main { max-width: 1100px; margin: 16px auto; padding: 0 16px; }
  .written, details.warn, p.err { max-width: 1100px; margin: 16px auto; padding: 12px 16px; background: #fff; border: 1px solid #ddd; border-radius: 6px; }
  .written h2 { font-size: 1rem; margin: 0 0 8px; } .written ul { margin: 0; padding-left: 20px; }
  pre { font-size: .75rem; overflow-x: auto; background: #f4f4f4; padding: 8px; }
  .warn { color: #8a5a00; } .err { color: #b00020; }
</style></head>
<body><div id="root">Loading…</div><script type="module" src="/app/app.js"></script></body></html>`;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

function patientLabel(p) {
  const n = p.name?.[0];
  const name = n?.text ?? [n?.given?.join(' '), n?.family].filter(Boolean).join(' ');
  return [p.id, name, p.gender, p.birthDate && `born ${p.birthDate}`].filter(Boolean).join(', ');
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body);
}

export function startPreview({ formPath, dataPath, answersPath, userId, port = 4173 }) {
  const files = [formPath, dataPath, answersPath].filter(Boolean).map((f) => resolve(f));
  const clients = new Set();

  // Read the files on every request, so the page always shows the latest saved version.
  const current = () => {
    const q = readJson(formPath);
    const bundle = readJson(dataPath);
    const resources = (bundle.entry || []).map((e) => e.resource).filter(Boolean);
    return { q, bundle, resources, answers: answersPath ? readJson(answersPath) : null };
  };

  const api = {
    'GET /api/state': () => {
      const { q, resources, answers } = current();
      return [200, {
        title: q.title ?? q.name ?? basename(formPath),
        files: files.map((f) => basename(f)),
        patients: resources.filter((r) => r.resourceType === 'Patient').map((p) => ({ id: p.id, label: patientLabel(p) })),
        hasAnswers: Boolean(answers),
      }];
    },
    'GET /api/populate': async (url) => {
      const { q, bundle, resources, answers } = current();
      const id = url.searchParams.get('patient');
      const patient = resources.find((r) => r.resourceType === 'Patient' && r.id === id);
      if (!patient) return [404, { error: `No patient "${id}" in ${basename(dataPath)}` }];
      const { contexts } = contextsFor(q, resources, patient, userId);
      const r = await runPopulate(q, { fetchFn: makeLocalFetch(bundle), patient, ...contexts });
      if (!r.ok) return [500, { error: `Prepopulation failed: ${r.issues.map((i) => i.diagnostics).join('; ')}` }];
      const response = url.searchParams.get('answers') && answers ? withAnswers(r.response, q, answers) : r.response;
      // The renderer's own FHIRPath context: launch contexts plus the prepopulation searches' results.
      const context = { ...r.context, patient, ...contexts };
      return [200, { questionnaire: q, response, context, issues: r.issues.map((i) => i.diagnostics ?? i.details?.text) }];
    },
    'POST /api/extract': async (url, req) => {
      const { q } = current();
      const x = await runExtract(await readBody(req), q);
      if (!x.ok) return [500, { error: 'Extraction failed', warnings: x.warnings }];
      return [200, { resources: x.resources, warnings: x.warnings }];
    },
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(PAGE);
      }
      if (url.pathname.startsWith('/app/')) {
        const file = join(APP, basename(url.pathname));
        res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
        return res.end(readFileSync(file));
      }
      if (url.pathname === '/api/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        res.write(': connected\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return undefined;
      }
      const handler = api[`${req.method} ${url.pathname}`];
      if (!handler) return send(res, 404, { error: `Not found: ${url.pathname}` });
      const [status, body] = await handler(url, req);
      return send(res, status, body);
    } catch (e) {
      return send(res, e.code === 'ENOENT' ? 404 : 500, { error: e.message });
    }
  });

  // Editors often save by replacing the file, so watch each file's folder, by name. Debounced:
  // one save can fire several events.
  let timer = null;
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { for (const c of clients) c.write('event: changed\ndata: {}\n\n'); }, 150);
  };
  const watchers = [...new Set(files.map((f) => dirname(f)))].map((d) => watch(d, (event, name) => {
    if (files.some((f) => dirname(f) === d && basename(f) === name)) changed();
  }));

  return new Promise((resolveStart, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const url = `http://localhost:${server.address().port}`;
      resolveStart({
        url,
        server,
        close: () => new Promise((done) => {
          watchers.forEach((w) => w.close());
          clearTimeout(timer);
          for (const c of clients) c.end();
          server.close(() => done());
        }),
      });
    });
  });
}

function openBrowser(url) {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

async function main(argv) {
  const opt = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const formPath = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.match(/^--(data|answers|user|port)$/));
  const dataPath = opt('data');
  if (!formPath || !dataPath) {
    throw new Error('Usage: node preview.mjs form.json --data sample-data.json [--answers answers.json] [--user <id>] [--port 4173] [--no-open]');
  }
  readJson(formPath);
  readJson(dataPath);
  const { url } = await startPreview({ formPath, dataPath, answersPath: opt('answers'), userId: opt('user'), port: Number(opt('port') ?? 4173) });
  console.log(`Preview: ${url}\nIt reloads when ${[formPath, dataPath, opt('answers')].filter(Boolean).map((f) => basename(f)).join(', ')} change. Ctrl-C to stop.`);
  if (!argv.includes('--no-open')) openBrowser(url);
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`${e.code === 'EADDRINUSE' ? 'That port is in use: try --port 4174' : e.message}\n`);
    process.exit(1);
  });
}
