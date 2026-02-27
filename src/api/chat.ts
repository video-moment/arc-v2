import { Router } from 'express';
import type { ChatManager } from '../communication/chat-manager.js';
import type { AgentRegistry } from '../engine/agent-registry.js';

export function createChatRoutes(chatManager: ChatManager, registry: AgentRegistry): Router {
  const router = Router();

  // List sessions (optionally filter by agentId)
  router.get('/sessions', (req, res) => {
    const agentId = req.query.agentId as string | undefined;
    res.json(chatManager.listSessions(agentId));
  });

  // Get session
  router.get('/sessions/:id', (req, res) => {
    const session = chatManager.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  });

  // Create session
  router.post('/sessions', (req, res) => {
    const { agentId, title } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });

    const agent = registry.get(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const session = chatManager.createSession(agentId, title);
    res.status(201).json(session);
  });

  // Update session
  router.patch('/sessions/:id', (req, res) => {
    const updated = chatManager.updateSession(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Session not found' });
    res.json(updated);
  });

  // Delete session
  router.delete('/sessions/:id', (req, res) => {
    const session = chatManager.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    chatManager.updateSession(req.params.id, { status: 'archived' });
    res.json({ deleted: true });
  });

  // Get messages
  router.get('/sessions/:id/messages', (req, res) => {
    const session = chatManager.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(chatManager.getMessages(req.params.id));
  });

  // Send message
  // ?stream=true → returns user message immediately, agent response via WS
  // default → waits for full agent response
  router.post('/sessions/:id/messages', async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const session = chatManager.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const agent = registry.get(session.agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const stream = req.query.stream === 'true';

    if (stream) {
      // Async: return user message immediately, agent runs in background
      const userMsg = chatManager.sendMessageAsync(req.params.id, content, agent);
      res.status(202).json(userMsg);
    } else {
      // Sync: wait for full response
      const response = await chatManager.sendMessageSync(req.params.id, content, agent);
      res.status(201).json(response);
    }
  });

  // Stop agent
  router.post('/sessions/:id/stop', (req, res) => {
    chatManager.stopAgent(req.params.id);
    res.json({ stopped: true });
  });

  return router;
}
