import express from 'express';
import type { Request, Response, NextFunction } from 'express';
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

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const start = Date.now();
    _res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`${req.method} ${req.path} ${_res.statusCode} ${ms}ms`);
    });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // API routes
  app.use('/api/agents', createAgentRoutes(registry));
  app.use('/api/chat', createChatRoutes(chatManager, registry));
  app.use('/api/status', createStatusRoutes(db, registry, chatManager));

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
