import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const server = new URL('../mcp-server.mjs', import.meta.url).pathname;
const fixture = (f) => JSON.parse(readFileSync(new URL(`fixtures/${f}`, import.meta.url)));
const resultOf = (r) => JSON.parse(r.content[0].text);

test('the MCP server lists its two tools and evaluates FHIRPath', async () => {
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(new StdioClientTransport({ command: 'node', args: [server] }));
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['check_questionnaire', 'evaluate_fhirpath']);

    const ok = await client.callTool({ name: 'evaluate_fhirpath',
      arguments: { expression: 'Patient.gender', resource: { resourceType: 'Patient', gender: 'female' } } });
    assert.deepEqual(resultOf(ok), { value: ['female'] });

    const bad = await client.callTool({ name: 'evaluate_fhirpath',
      arguments: { expression: '%nope', resource: {}, variables: {} } });
    assert.match(resultOf(bad).error, /nope/);

    const report = await client.callTool({ name: 'check_questionnaire',
      arguments: { questionnaire: fixture('pop-q.json'), sampleBundle: fixture('pop-data.json') } });
    assert.equal(resultOf(report).pass, true);
  } finally {
    await client.close();
  }
});
