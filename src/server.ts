import express from 'express';
import cors from 'cors';
import type { ArcDatabase } from './db/database.js';
import type { AgentRegistry } from './engine/agent-registry.js';
import type { ChatManager } from './communication/chat-manager.js';
import { createAgentRoutes } from './api/agents.js';
import { createChatRoutes } from './api/chat.js';
import { createStatusRoutes } from './api/status.js';

export function createApp(
  db: ArcDatabase,
  registry: AgentRegistry,
  chatManager: ChatManager
): express.Express {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // API routes
  app.use('/api/agents', createAgentRoutes(registry));
  app.use('/api/chat', createChatRoutes(chatManager, registry));
  app.use('/api/status', createStatusRoutes(db, registry, chatManager));

  return app;
}
