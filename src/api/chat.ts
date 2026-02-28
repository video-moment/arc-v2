import { Router } from 'express';
import type { Monitor } from '../communication/monitor.js';
import type { ArcDatabase } from '../db/database.js';

export function createChatRoutes(monitor: Monitor, db: ArcDatabase): Router {
  const router = Router();

  // List sessions (optionally filter by agentId)
  router.get('/sessions', (req, res) => {
    const agentId = req.query.agentId as string | undefined;
    res.json(monitor.listSessions(agentId));
  });

  // Get session
  router.get('/sessions/:id', (req, res) => {
    const session = monitor.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  });

  // Create session
  router.post('/sessions', (req, res) => {
    const { agentId, title } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });

    const agent = db.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const session = monitor.createSession(agentId, title);
    res.status(201).json(session);
  });

  // Update session
  router.patch('/sessions/:id', (req, res) => {
    const updated = monitor.updateSession(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Session not found' });
    res.json(updated);
  });

  // Delete session (archive)
  router.delete('/sessions/:id', (req, res) => {
    const session = monitor.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    monitor.updateSession(req.params.id, { status: 'archived' });
    res.json({ deleted: true });
  });

  // Get messages
  router.get('/sessions/:id/messages', (req, res) => {
    const session = monitor.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(monitor.getMessages(req.params.id));
  });

  // Send message from app (stored + broadcast via WS)
  router.post('/sessions/:id/messages', (req, res) => {
    const { content, role } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const session = monitor.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const message = monitor.receiveMessage(req.params.id, role || 'user', content);
    res.status(201).json(message);
  });

  return router;
}
