import { Router } from 'express';
import type { ArcDatabase } from '../db/database.js';
import type { AgentRegistry } from '../engine/agent-registry.js';
import type { ChatManager } from '../communication/chat-manager.js';

export function createStatusRoutes(
  db: ArcDatabase,
  registry: AgentRegistry,
  chatManager: ChatManager
): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const agents = registry.list();
    const sessions = chatManager.listSessions();

    res.json({
      status: 'ok',
      version: '0.1.0',
      timestamp: Date.now(),
      agents: agents.length,
      sessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
    });
  });

  return router;
}
