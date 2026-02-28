import { Router } from 'express';
import type { ArcDatabase } from '../db/database.js';
import type { Monitor } from '../communication/monitor.js';
import { TelegramBot, type TelegramUpdate } from '../telegram/bot.js';

// Cache bot instances by agent ID
const botCache = new Map<string, TelegramBot>();

function getBot(token: string, agentId: string): TelegramBot {
  if (!botCache.has(agentId)) {
    botCache.set(agentId, new TelegramBot(token));
  }
  return botCache.get(agentId)!;
}

export function createTelegramRoutes(db: ArcDatabase, monitor: Monitor): Router {
  const router = Router();

  // Send message from app → Telegram
  router.post('/send', async (req, res) => {
    const { agentId, chatId, text } = req.body;
    if (!agentId || !text) {
      return res.status(400).json({ error: 'agentId and text are required' });
    }

    const agent = db.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (!agent.telegramBotToken) {
      return res.status(400).json({ error: 'Agent has no Telegram bot token' });
    }

    const targetChatId = chatId || agent.telegramChatId;
    if (!targetChatId) {
      return res.status(400).json({ error: 'No chatId provided and agent has no default chatId' });
    }

    try {
      const bot = getBot(agent.telegramBotToken, agentId);
      const result = await bot.sendMessage(targetChatId, text);

      // Also store in ARC as a message
      const sessions = monitor.listSessions(agentId);
      const activeSession = sessions.find(s => s.status === 'active');
      if (activeSession) {
        monitor.receiveMessage(activeSession.id, 'user', text);
      }

      res.json({ sent: true, messageId: result.message_id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  // Telegram webhook receiver
  router.post('/webhook/:agentId', (req, res) => {
    const { agentId } = req.params;
    const update: TelegramUpdate = req.body;

    const agent = db.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (update.message?.text) {
      const chatId = String(update.message.chat.id);
      const senderName = update.message.from?.first_name || 'Unknown';
      const text = update.message.text;

      // Update agent's chat ID if not set
      if (!agent.telegramChatId) {
        db.upsertAgent({ ...agent, telegramChatId: chatId, updatedAt: Date.now() });
      }

      // Find or create session for this agent
      const sessions = monitor.listSessions(agentId);
      let session = sessions.find(s => s.status === 'active');
      if (!session) {
        session = monitor.createSession(agentId, `Telegram: ${senderName}`);
      }

      // Store the incoming message
      const role = senderName === agent.name ? 'assistant' : senderName;
      monitor.receiveMessage(session.id, role, text);

      // Update agent status
      db.updateAgentStatus(agentId, 'online');
    }

    res.json({ ok: true });
  });

  // List connected bots
  router.get('/bots', async (_req, res) => {
    const agents = db.listAgents().filter(a => a.type === 'telegram' && a.telegramBotToken);
    const bots = [];

    for (const agent of agents) {
      try {
        const bot = getBot(agent.telegramBotToken!, agent.id);
        const info = await bot.getMe();
        bots.push({ agentId: agent.id, name: agent.name, botUsername: info.username, status: agent.status });
      } catch {
        bots.push({ agentId: agent.id, name: agent.name, botUsername: null, status: 'error' });
      }
    }

    res.json(bots);
  });

  return router;
}
