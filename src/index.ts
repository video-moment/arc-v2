// Remove Claude Code env vars early to prevent nested session issues
delete process.env['CLAUDECODE'];
delete process.env['CLAUDE_CODE_ENTRYPOINT'];

import 'dotenv/config';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './server.js';
import { ArcDatabase } from './db/database.js';
import { AgentRegistry } from './engine/agent-registry.js';
import { ChatManager } from './communication/chat-manager.js';
import { setupWebSocket } from './ws/handler.js';

const PORT = parseInt(process.env.PORT || '3100');
const DB_PATH = process.env.DB_PATH || './data/arc.db';
const AGENTS_DIR = process.env.AGENTS_DIR || './data/agents';

// Ensure data directory exists
mkdirSync(resolve(DB_PATH, '..'), { recursive: true });

// Initialize core
const db = new ArcDatabase(DB_PATH);
const registry = new AgentRegistry(db, AGENTS_DIR);
const chatManager = new ChatManager(db);

// Load agents from YAML
registry.loadAll();

// Create Express app + HTTP server
const app = createApp(db, registry, chatManager);
const server = createServer(app);

// WebSocket
setupWebSocket(server, chatManager);

server.listen(PORT, () => {
  console.log(`ARC V2 running on http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT}/ws`);
  console.log(`Agents dir: ${resolve(AGENTS_DIR)}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down...');
  db.close();
  server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
