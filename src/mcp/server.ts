// Remove Claude Code env vars to prevent nested session issues
delete process.env['CLAUDECODE'];
delete process.env['CLAUDE_CODE_ENTRYPOINT'];

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ArcDatabase } from '../db/database.js';
import { Monitor } from '../communication/monitor.js';
import { TOOL_DEFINITIONS, handleToolCall } from './tools.js';

const DB_PATH = process.env.DB_PATH || './data/arc.db';

const db = new ArcDatabase(DB_PATH);
const monitor = new Monitor(db);
const deps = { db, monitor };

const server = new Server(
  { name: 'arc-monitor-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, (args || {}) as Record<string, unknown>, deps);
});

const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
