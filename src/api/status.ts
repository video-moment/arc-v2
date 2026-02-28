import { Router } from 'express';
import type { ArcDatabase } from '../db/database.js';
import type { Monitor } from '../communication/monitor.js';

export function createStatusRoutes(db: ArcDatabase, monitor: Monitor): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const agents = db.listAgents();
    const sessions = monitor.listSessions();

    res.json({
      status: 'ok',
      version: '0.2.0',
      timestamp: Date.now(),
      agents: {
        total: agents.length,
        online: agents.filter(a => a.status === 'online').length,
        offline: agents.filter(a => a.status === 'offline').length,
      },
      sessions: {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
      },
    });
  });

  return router;
}
