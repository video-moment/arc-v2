import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { Monitor } from '../communication/monitor.js';
import type { Agent, AgentType } from '../types.js';

export interface McpDeps {
  db: ArcDatabase;
  monitor: Monitor;
}

export const TOOL_DEFINITIONS = [
  {
    name: 'arc_register_agent',
    description: 'Register or update an external agent in the ARC monitoring dashboard.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Agent ID (lowercase, hyphens)' },
        name: { type: 'string', description: 'Display name' },
        description: { type: 'string', description: 'What this agent does' },
        type: { type: 'string', enum: ['telegram', 'discord', 'slack', 'custom'], description: 'Agent type' },
        telegramBotToken: { type: 'string', description: 'Telegram bot token (for telegram type)' },
        telegramChatId: { type: 'string', description: 'Default Telegram chat ID' },
        metadata: { type: 'object', description: 'Arbitrary metadata' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'arc_push_message',
    description: 'Push a conversation message into ARC (agent → ARC). Stored in DB and broadcast via WebSocket.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string', description: 'Chat session ID' },
        agentId: { type: 'string', description: 'Agent ID (creates session if sessionId not provided)' },
        role: { type: 'string', description: 'Message role (user, assistant, or agent name)' },
        content: { type: 'string', description: 'Message content' },
      },
      required: ['role', 'content'],
    },
  },
  {
    name: 'arc_heartbeat',
    description: 'Report agent status/heartbeat. Updates lastSeen and status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        status: { type: 'string', enum: ['online', 'offline', 'error'], description: 'Agent status' },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'arc_list_agents',
    description: 'List all registered agents with their status.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'arc_get_messages',
    description: 'Get messages for a specific chat session.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string', description: 'Chat session ID' },
      },
      required: ['sessionId'],
    },
  },
];

export function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  deps: McpDeps,
): { content: Array<{ type: 'text'; text: string }> } {
  const text = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  });

  switch (name) {
    case 'arc_register_agent': {
      const { id, name: agentName, description, type, telegramBotToken, telegramChatId, metadata } = args as {
        id: string; name: string; description?: string; type?: AgentType;
        telegramBotToken?: string; telegramChatId?: string; metadata?: Record<string, unknown>;
      };
      const now = Date.now();
      const existing = deps.db.getAgent(id);
      const agent: Agent = {
        id,
        name: agentName,
        description: description || '',
        type: (type as AgentType) || 'custom',
        telegramBotToken,
        telegramChatId,
        status: 'online',
        lastSeen: now,
        metadata,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      deps.db.upsertAgent(agent);
      deps.monitor.bus.emitAgentStatus(id, 'online');
      return text({ agent, registered: true });
    }

    case 'arc_push_message': {
      let { sessionId, agentId, role, content } = args as {
        sessionId?: string; agentId?: string; role: string; content: string;
      };

      // Auto-create session if needed
      if (!sessionId && agentId) {
        const session = deps.monitor.createSession(agentId);
        sessionId = session.id;
      }
      if (!sessionId) {
        return text({ error: 'Either sessionId or agentId is required' });
      }

      const message = deps.monitor.receiveMessage(sessionId, role, content);
      return text({ message, pushed: true });
    }

    case 'arc_heartbeat': {
      const { agentId, status } = args as { agentId: string; status?: string };
      const agentStatus = (status as 'online' | 'offline' | 'error') || 'online';
      deps.db.updateAgentStatus(agentId, agentStatus);
      deps.monitor.bus.emitAgentStatus(agentId, agentStatus);
      return text({ agentId, status: agentStatus, lastSeen: Date.now() });
    }

    case 'arc_list_agents': {
      const agents = deps.db.listAgents();
      return text({ agents, count: agents.length });
    }

    case 'arc_get_messages': {
      const { sessionId } = args as { sessionId: string };
      const messages = deps.monitor.getMessages(sessionId);
      return text({ messages, count: messages.length });
    }

    default:
      return text({ error: `Unknown tool: ${name}` });
  }
}
