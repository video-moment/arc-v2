import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { AgentRegistry } from '../engine/agent-registry.js';
import type { Squad } from '../types.js';

export function createSquadRoutes(db: ArcDatabase, registry: AgentRegistry): Router {
  const router = Router();

  // List squads
  router.get('/', (_req, res) => {
    const squads = db.listSquads();
    // Enrich with agent details
    const enriched = squads.map(s => ({
      ...s,
      agents: s.agentIds.map(id => registry.get(id)).filter(Boolean),
    }));
    res.json(enriched);
  });

  // Get squad
  router.get('/:id', (req, res) => {
    const squad = db.getSquad(req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });
    const agents = squad.agentIds.map(id => registry.get(id)).filter(Boolean);
    res.json({ ...squad, agents });
  });

  // Create squad
  router.post('/', (req, res) => {
    const { name, description, agentIds } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Validate agent IDs
    const ids: string[] = agentIds || [];
    for (const id of ids) {
      if (!registry.get(id)) return res.status(400).json({ error: `Agent not found: ${id}` });
    }

    const now = Date.now();
    const squad: Squad = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: description || '',
      agentIds: ids,
      createdAt: now,
      updatedAt: now,
    };
    db.createSquad(squad);
    res.status(201).json(squad);
  });

  // Update squad
  router.put('/:id', (req, res) => {
    const squad = db.getSquad(req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });
    db.updateSquad(req.params.id, req.body);
    res.json(db.getSquad(req.params.id));
  });

  // Delete squad
  router.delete('/:id', (req, res) => {
    const ok = db.deleteSquad(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Squad not found' });
    res.json({ deleted: true });
  });

  return router;
}
