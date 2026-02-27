import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { ChatManager } from '../communication/chat-manager.js';
import type { AgentRegistry } from '../engine/agent-registry.js';
import type { Task, TaskStatus } from '../types.js';

export function createTaskRoutes(db: ArcDatabase, chatManager: ChatManager, registry: AgentRegistry): Router {
  const router = Router();

  // List tasks (filter by squadId, status)
  router.get('/', (req, res) => {
    const squadId = req.query.squadId as string | undefined;
    const status = req.query.status as TaskStatus | undefined;
    res.json(db.listTasks(squadId, status));
  });

  // Get task
  router.get('/:id', (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  // Create task
  router.post('/', (req, res) => {
    const { squadId, title, description } = req.body;
    if (!squadId || !title) return res.status(400).json({ error: 'squadId and title are required' });

    const squad = db.getSquad(squadId);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });

    const now = Date.now();
    const task: Task = {
      id: uuid(),
      squadId,
      title,
      description: description || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    db.createTask(task);
    res.status(201).json(task);
  });

  // Update task
  router.patch('/:id', (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    db.updateTask(req.params.id, req.body);
    res.json(db.getTask(req.params.id));
  });

  // Execute task — assign to an agent and run
  router.post('/:id/execute', async (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const squad = db.getSquad(task.squadId);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });

    // Pick agent: use assignedAgentId, or requested agentId, or first in squad
    const agentId = req.body.agentId || task.assignedAgentId || squad.agentIds[0];
    if (!agentId) return res.status(400).json({ error: 'No agent available in squad' });

    const agent = registry.get(agentId);
    if (!agent) return res.status(404).json({ error: `Agent not found: ${agentId}` });

    // Mark in progress
    db.updateTask(task.id, { status: 'in_progress', assignedAgentId: agentId });

    // Create a chat session for this task
    const session = chatManager.createSession(agentId, task.title);

    // Build task prompt
    const prompt = `## Task\n\n**${task.title}**\n\n${task.description}`;

    // Fire-and-forget: agent runs in background
    chatManager.sendMessageAsync(session.id, prompt, agent);

    // Listen for completion to update task
    const onDone = () => {
      const messages = chatManager.getMessages(session.id);
      const lastAssistant = messages.filter(m => m.role === 'assistant').pop();
      db.updateTask(task.id, {
        status: 'completed',
        result: lastAssistant?.content || '(no result)',
      });
    };

    // Simple: check after a delay (agent_done event would be better for production)
    chatManager.bus.once('event', function check(event: any) {
      if (event.type === 'agent_done' && event.payload?.sessionId === session.id) {
        onDone();
      } else {
        chatManager.bus.once('event', check);
      }
    });

    res.status(202).json({
      taskId: task.id,
      sessionId: session.id,
      agentId,
      status: 'in_progress',
    });
  });

  // Delete task
  router.delete('/:id', (req, res) => {
    const ok = db.deleteTask(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    res.json({ deleted: true });
  });

  return router;
}
