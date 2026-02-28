import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { Agent, AgentType } from '../types.js';

export function createAgentRoutes(db: ArcDatabase): Router {
  const router = Router();

  // List agents
  router.get('/', (_req, res) => {
    res.json(db.listAgents());
  });

  // Get agent
  router.get('/:id', (req, res) => {
    const agent = db.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  });

  // Register agent
  router.post('/', (req, res) => {
    const { name, description, type, telegramBotToken, telegramChatId, metadata } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const now = Date.now();
    const agent: Agent = {
      id: req.body.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: description || '',
      type: (type as AgentType) || 'custom',
      telegramBotToken,
      telegramChatId,
      status: 'offline',
      lastSeen: now,
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    db.upsertAgent(agent);
    res.status(201).json(agent);
  });

  // Update agent
  router.put('/:id', (req, res) => {
    const existing = db.getAgent(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });

    const updated: Agent = {
      ...existing,
      ...req.body,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };
    db.upsertAgent(updated);
    res.json(updated);
  });

  // Delete agent
  router.delete('/:id', (req, res) => {
    const ok = db.deleteAgent(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Agent not found' });
    res.json({ deleted: true });
  });

  return router;
}
