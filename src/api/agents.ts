import { Router } from 'express';
import type { AgentRegistry } from '../engine/agent-registry.js';

export function createAgentRoutes(registry: AgentRegistry): Router {
  const router = Router();

  // List agents
  router.get('/', (_req, res) => {
    res.json(registry.list());
  });

  // Get agent
  router.get('/:id', (req, res) => {
    const agent = registry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  });

  // Create agent
  router.post('/', (req, res) => {
    const { name, description, systemPrompt, model, maxTurns, allowedTools, workingDir } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const agent = registry.create({
      name,
      description: description || '',
      systemPrompt: systemPrompt || '',
      model,
      maxTurns,
      allowedTools,
      workingDir,
    });
    res.status(201).json(agent);
  });

  // Update agent
  router.put('/:id', (req, res) => {
    const updated = registry.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Agent not found' });
    res.json(updated);
  });

  // Delete agent
  router.delete('/:id', (req, res) => {
    const ok = registry.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Agent not found' });
    res.json({ deleted: true });
  });

  return router;
}
