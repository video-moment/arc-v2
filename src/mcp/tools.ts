import { v4 as uuid } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';

export type McpDeps = {
  supabase: SupabaseClient;
};

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
    description: 'Push a conversation message into ARC. Stored in Supabase and visible on the web dashboard in real-time.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string', description: 'Chat session ID (auto-creates if not provided + agentId given)' },
        agentId: { type: 'string', description: 'Agent ID (used to auto-create session)' },
        role: { type: 'string', description: 'Message role (user, assistant, or agent name)' },
        content: { type: 'string', description: 'Message content' },
      },
      required: ['role', 'content'],
    },
  },
  {
    name: 'arc_heartbeat',
    description: 'Report agent status/heartbeat. Updates last_seen and status.',
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
  {
    name: 'arc_list_sessions',
    description: 'List chat sessions, optionally filtered by agent ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Filter by agent ID (optional)' },
      },
    },
  },
];

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  deps: McpDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { supabase } = deps;
  const text = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  });

  switch (name) {
    case 'arc_register_agent': {
      const { id, name: agentName, description, type, telegramBotToken, telegramChatId, metadata } = args as {
        id: string; name: string; description?: string; type?: string;
        telegramBotToken?: string; telegramChatId?: string; metadata?: Record<string, unknown>;
      };

      const { data, error } = await supabase
        .from('agents')
        .upsert({
          id,
          name: agentName,
          description: description || '',
          type: type || 'custom',
          telegram_bot_token: telegramBotToken,
          telegram_chat_id: telegramChatId,
          status: 'online',
          last_seen: new Date().toISOString(),
          metadata: metadata || {},
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ agent: data, registered: true });
    }

    case 'arc_push_message': {
      let { sessionId, agentId, role, content } = args as {
        sessionId?: string; agentId?: string; role: string; content: string;
      };

      // Auto-create session if needed
      if (!sessionId && agentId) {
        const { data: session, error: sessErr } = await supabase
          .from('chat_sessions')
          .insert({
            id: uuid(),
            agent_id: agentId,
            title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
            status: 'active',
          })
          .select()
          .single();

        if (sessErr) return text({ error: sessErr.message });
        sessionId = session.id;
      }

      if (!sessionId) {
        return text({ error: 'Either sessionId or agentId is required' });
      }

      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          id: uuid(),
          session_id: sessionId,
          role,
          content,
        })
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ message, sessionId, pushed: true });
    }

    case 'arc_heartbeat': {
      const { agentId, status } = args as { agentId: string; status?: string };
      const agentStatus = status || 'online';

      const { error } = await supabase
        .from('agents')
        .update({
          status: agentStatus,
          last_seen: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (error) return text({ error: error.message });
      return text({ agentId, status: agentStatus, lastSeen: new Date().toISOString() });
    }

    case 'arc_list_agents': {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name');

      if (error) return text({ error: error.message });
      return text({ agents: data, count: data.length });
    }

    case 'arc_get_messages': {
      const { sessionId } = args as { sessionId: string };
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) return text({ error: error.message });
      return text({ messages: data, count: data.length });
    }

    case 'arc_list_sessions': {
      const { agentId } = args as { agentId?: string };
      let query = supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false });
      if (agentId) query = query.eq('agent_id', agentId);

      const { data, error } = await query;
      if (error) return text({ error: error.message });
      return text({ sessions: data, count: data.length });
    }

    default:
      return text({ error: `Unknown tool: ${name}` });
  }
}
