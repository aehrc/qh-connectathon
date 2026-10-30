#!/usr/bin/env node
// Optional MCP server: the same checks as check.mjs, for agents that support MCP.
// Read-only on purpose: loading data stays in load.mjs, behind --yes.
//
//   node mcp-server.mjs        (stdio)
import fhirpath from 'fhirpath';
import r4 from 'fhirpath/fhir-context/r4/index.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { checkAll } from './lib/check.mjs';

const reply = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] });

const server = new McpServer({ name: 'questionnaire-builder', version: '0.1.0' });

server.registerTool('evaluate_fhirpath', {
  description: 'Evaluate a FHIRPath expression (R4, fhirpath.js: the engine Smart Forms uses) against a resource. '
    + 'variables become %names, e.g. {"patient": {...}, "latestHb": [...]}.',
  inputSchema: {
    expression: z.string(),
    resource: z.record(z.string(), z.any()),
    variables: z.record(z.string(), z.any()).optional(),
  },
}, async ({ expression, resource, variables }) => {
  try {
    return reply({ value: fhirpath.evaluate(resource, expression, { resource, ...variables }, r4) });
  } catch (e) {
    return reply({ error: e.message });
  }
});

server.registerTool('check_questionnaire', {
  description: 'Check a Questionnaire: structure, every FHIRPath expression, and population and template extraction '
    + 'for each Patient in the sample transaction Bundle (offline) or against a FHIR server base URL.',
  inputSchema: {
    questionnaire: z.record(z.string(), z.any()),
    sampleBundle: z.record(z.string(), z.any()).optional(),
    server: z.string().optional(),
    patientId: z.string().optional(),
    userId: z.string().optional(),
    prefix: z.string().optional(),
  },
}, async (args) => reply(await checkAll(args)));

await server.connect(new StdioServerTransport());
