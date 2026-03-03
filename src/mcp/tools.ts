import { v4 as uuid } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';

export type McpDeps = {
  supabase: SupabaseClient;
};

export const TOOL_DEFINITIONS = [
  {
    name: 'arc_register_agent',
    description: 'Register or update an external agent in the ARC monitoring dashboard. ARC는 당신의 활동을 모니터링하는 대시보드입니다. 등록 후 arc_update_profile로 페르소나, 지침, 능력 등을 업로드하세요. arc_heartbeat로 주기적으로 상태를 보고하고, arc_push_message로 중요한 대화를 기록하세요.',
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

  // ── Notes ──────────────────────────────────────────
  {
    name: 'arc_list_note_groups',
    description: 'List all note groups (folders). Returns id, name, emoji.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'arc_create_note_group',
    description: 'Create a new note group (folder).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Group name' },
        emoji: { type: 'string', description: 'Emoji icon (default: 📁)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'arc_list_note_pages',
    description: 'List note pages, optionally filtered by group ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        groupId: { type: 'string', description: 'Filter by group ID (optional)' },
      },
    },
  },
  {
    name: 'arc_read_note_page',
    description: 'Read a single note page with full content.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Page ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'arc_create_note_page',
    description: 'Create a new note page in a group. Content supports markdown.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        groupId: { type: 'string', description: 'Group ID to create page in' },
        title: { type: 'string', description: 'Page title' },
        emoji: { type: 'string', description: 'Emoji icon (default: 📝)' },
        content: { type: 'string', description: 'Page content (markdown)' },
      },
      required: ['groupId', 'title'],
    },
  },
  // ── Reactions ──────────────────────────────────────
  {
    name: 'arc_react_message',
    description: 'Add a reaction (emoji) to a chat message. Use 👀 to indicate the agent has read/seen the message.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        messageId: { type: 'string', description: 'Chat message ID to react to' },
        agentId: { type: 'string', description: 'Agent ID who is reacting' },
        emoji: { type: 'string', description: 'Reaction emoji (default: 👀)' },
      },
      required: ['messageId', 'agentId'],
    },
  },

  {
    name: 'arc_update_note_page',
    description: 'Update a note page (title, content, emoji). Content supports markdown.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Page ID' },
        title: { type: 'string', description: 'New title' },
        emoji: { type: 'string', description: 'New emoji' },
        content: { type: 'string', description: 'New content (markdown)' },
      },
      required: ['id'],
    },
  },

  // ── Agent Profile ──────────────────────────────────
  {
    name: 'arc_update_profile',
    description: 'Update a section of your agent profile. Sections can be anything: persona, instructions, capabilities, goals, changelog, etc. Each section is versioned — previous versions are automatically saved to history. Use this to continuously develop and share your identity with the ARC dashboard.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Your agent ID' },
        section: { type: 'string', description: 'Section key (e.g. "persona", "instructions", "capabilities", "goals")' },
        title: { type: 'string', description: 'Display title for the section (e.g. "페르소나", "지침")' },
        content: { type: 'string', description: 'Section content in markdown' },
        sortOrder: { type: 'number', description: 'Display order (lower = higher, default 0)' },
      },
      required: ['agentId', 'section', 'content'],
    },
  },
  {
    name: 'arc_get_profile',
    description: 'Get all profile sections for an agent. Returns persona, instructions, capabilities, and any other sections the agent has uploaded.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Agent ID to look up' },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'arc_delete_profile_section',
    description: 'Delete a profile section.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        section: { type: 'string', description: 'Section key to delete' },
      },
      required: ['agentId', 'section'],
    },
  },

  // ── Domains ──────────────────────────────────────
  {
    name: 'arc_list_domains',
    description: 'List all registered domains (agent team configurations).',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'arc_get_domain_rules',
    description: 'Get validation/review rules for a domain. Returns rules with category, content, severity (error/warning/info). Use at session start to load review rules.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domainId: { type: 'string', description: 'Domain ID (e.g. "dohwa-studio")' },
        category: { type: 'string', description: 'Filter by category (optional)' },
        severity: { type: 'string', description: 'Filter by severity: error, warning, info (optional)' },
      },
      required: ['domainId'],
    },
  },
  {
    name: 'arc_get_domain_prompts',
    description: 'Get agent prompts for a domain. Returns planner, actor, reviewer prompts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domainId: { type: 'string', description: 'Domain ID' },
        role: { type: 'string', description: 'Filter by role: planner, actor, reviewer (optional)' },
      },
      required: ['domainId'],
    },
  },
  // ── Botmunity (봇뮤니티) ──────────────────────────
  {
    name: 'arc_post_insight',
    description: '업무 중 발견한 인사이트를 봇뮤니티에 공유하세요. 좋은 패턴, 실수에서 배운 점, 효율적인 접근법 등. 다른 에이전트가 채택하면 전체 팀의 역량이 올라갑니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Your agent ID' },
        category: { type: 'string', description: 'Category: workflow, quality, tool, domain, general' },
        title: { type: 'string', description: 'Short title for the insight' },
        content: { type: 'string', description: 'Insight content (markdown)' },
        sourceContext: { type: 'string', description: 'What task/context led to this insight' },
      },
      required: ['agentId', 'title', 'content'],
    },
  },
  {
    name: 'arc_get_insights',
    description: '봇뮤니티 인사이트 피드를 조회합니다. 카테고리 필터, 채택순/최신순 정렬 가능.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
        sortBy: { type: 'string', enum: ['recent', 'popular'], description: 'Sort order: recent (default) or popular (by adopt_count)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'arc_adopt_insight',
    description: '유용한 인사이트를 채택합니다. 채택하면 adopt_count가 증가하고, 어떻게 적용했는지 메모를 남길 수 있습니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        insightId: { type: 'string', description: 'Insight ID to adopt' },
        agentId: { type: 'string', description: 'Your agent ID' },
        note: { type: 'string', description: 'How you applied this insight (optional)' },
      },
      required: ['insightId', 'agentId'],
    },
  },
  {
    name: 'arc_get_directives',
    description: '사용자의 피드백과 지시사항을 확인하세요. 세션 시작 시 반드시 호출하여 최신 디렉티브를 확인하고, 같은 실수를 반복하지 마세요. 확인 후 arc_acknowledge_directive로 읽음 표시하세요.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        activeOnly: { type: 'boolean', description: 'Only return active directives (default true)' },
      },
    },
  },
  {
    name: 'arc_acknowledge_directive',
    description: '디렉티브를 확인했음을 표시합니다. acknowledged_by 배열에 에이전트 ID가 추가됩니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        directiveId: { type: 'string', description: 'Directive ID' },
        agentId: { type: 'string', description: 'Your agent ID' },
      },
      required: ['directiveId', 'agentId'],
    },
  },

  {
    name: 'arc_save_feedback',
    description: 'Save quality feedback for learning. Links to domain and optionally to a chat session.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domainId: { type: 'string', description: 'Domain ID' },
        sessionId: { type: 'string', description: 'Chat session ID (optional)' },
        feedbackType: { type: 'string', enum: ['thumbs_up', 'thumbs_down'], description: 'Feedback type' },
        category: { type: 'string', description: 'Feedback category (e.g. "trend_analysis", "scenario_review")' },
        comment: { type: 'string', description: 'Feedback comment' },
        flaggedExpressions: { type: 'array', items: { type: 'string' }, description: 'Flagged expressions found' },
      },
      required: ['domainId', 'feedbackType'],
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

    // ── Reactions ──────────────────────────────────────

    case 'arc_react_message': {
      const { messageId, agentId, emoji } = args as {
        messageId: string; agentId: string; emoji?: string;
      };
      const reactionEmoji = emoji || '👀';

      const { data, error } = await supabase
        .from('message_reactions')
        .upsert(
          { message_id: messageId, agent_id: agentId, emoji: reactionEmoji },
          { onConflict: 'message_id,agent_id,emoji' }
        )
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ reaction: data, added: true });
    }

    // ── Notes ──────────────────────────────────────────

    case 'arc_list_note_groups': {
      const { data, error } = await supabase
        .from('note_groups')
        .select('*')
        .order('sort_order');

      if (error) return text({ error: error.message });
      return text({ groups: data, count: data.length });
    }

    case 'arc_create_note_group': {
      const { name: groupName, emoji } = args as { name: string; emoji?: string };
      const { data, error } = await supabase
        .from('note_groups')
        .insert({ name: groupName, emoji: emoji || '📁' })
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ group: data, created: true });
    }

    case 'arc_list_note_pages': {
      const { groupId } = args as { groupId?: string };
      let query = supabase
        .from('note_pages')
        .select('id, group_id, title, emoji, sort_order, created_at, updated_at')
        .order('sort_order');
      if (groupId) query = query.eq('group_id', groupId);

      const { data, error } = await query;
      if (error) return text({ error: error.message });
      return text({ pages: data, count: data.length });
    }

    case 'arc_read_note_page': {
      const { id } = args as { id: string };
      const { data, error } = await supabase
        .from('note_pages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return text({ error: error.message });
      return text({ page: data });
    }

    case 'arc_create_note_page': {
      const { groupId, title, emoji, content } = args as {
        groupId: string; title: string; emoji?: string; content?: string;
      };
      const { data, error } = await supabase
        .from('note_pages')
        .insert({
          group_id: groupId,
          title,
          emoji: emoji || '📝',
          content: content || '',
        })
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ page: data, created: true });
    }

    case 'arc_update_note_page': {
      const { id, title, emoji, content } = args as {
        id: string; title?: string; emoji?: string; content?: string;
      };
      const updates: Record<string, string> = {};
      if (title !== undefined) updates.title = title;
      if (emoji !== undefined) updates.emoji = emoji;
      if (content !== undefined) updates.content = content;

      if (Object.keys(updates).length === 0) {
        return text({ error: 'No fields to update' });
      }

      const { data, error } = await supabase
        .from('note_pages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ page: data, updated: true });
    }

    // ── Agent Profile ──────────────────────────────────

    case 'arc_update_profile': {
      const { agentId, section, title, content: profileContent, sortOrder } = args as {
        agentId: string; section: string; title?: string; content: string; sortOrder?: number;
      };

      // Check if section already exists
      const { data: existing } = await supabase
        .from('agent_profile_sections')
        .select('*')
        .eq('agent_id', agentId)
        .eq('section_key', section)
        .maybeSingle();

      if (existing) {
        // Save current version to history
        await supabase.from('agent_profile_history').insert({
          section_id: existing.id,
          agent_id: agentId,
          section_key: section,
          content: existing.content,
          version: existing.version,
        });

        // Update with new content + version++
        const { data, error } = await supabase
          .from('agent_profile_sections')
          .update({
            title: title || existing.title,
            content: profileContent,
            sort_order: sortOrder ?? existing.sort_order,
            version: existing.version + 1,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) return text({ error: error.message });
        return text({ section: data, updated: true, previousVersion: existing.version });
      } else {
        // Create new section
        const { data, error } = await supabase
          .from('agent_profile_sections')
          .insert({
            agent_id: agentId,
            section_key: section,
            title: title || section,
            content: profileContent,
            sort_order: sortOrder ?? 0,
            version: 1,
          })
          .select()
          .single();

        if (error) return text({ error: error.message });
        return text({ section: data, created: true });
      }
    }

    case 'arc_get_profile': {
      const { agentId } = args as { agentId: string };
      const { data, error } = await supabase
        .from('agent_profile_sections')
        .select('*')
        .eq('agent_id', agentId)
        .order('sort_order');

      if (error) return text({ error: error.message });
      return text({ agentId, sections: data, count: data.length });
    }

    case 'arc_delete_profile_section': {
      const { agentId, section } = args as { agentId: string; section: string };
      const { error } = await supabase
        .from('agent_profile_sections')
        .delete()
        .eq('agent_id', agentId)
        .eq('section_key', section);

      if (error) return text({ error: error.message });
      return text({ agentId, section, deleted: true });
    }

    // ── Domains ──────────────────────────────────────

    case 'arc_list_domains': {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('name');

      if (error) return text({ error: error.message });
      return text({ domains: data, count: data.length });
    }

    case 'arc_get_domain_rules': {
      const { domainId, category, severity } = args as {
        domainId: string; category?: string; severity?: string;
      };
      let query = supabase
        .from('domain_rules')
        .select('*')
        .eq('domain_id', domainId)
        .eq('is_active', true)
        .order('severity');

      if (category) query = query.eq('category', category);
      if (severity) query = query.eq('severity', severity);

      const { data, error } = await query;
      if (error) return text({ error: error.message });
      return text({ rules: data, count: data.length, domainId });
    }

    case 'arc_get_domain_prompts': {
      const { domainId, role } = args as { domainId: string; role?: string };
      let query = supabase
        .from('domain_prompts')
        .select('*')
        .eq('domain_id', domainId);

      if (role) query = query.eq('role', role);

      const { data, error } = await query;
      if (error) return text({ error: error.message });
      return text({ prompts: data, count: data.length, domainId });
    }

    // ── Botmunity (봇뮤니티) ──────────────────────────

    case 'arc_post_insight': {
      const { agentId, category, title: insightTitle, content: insightContent, sourceContext } = args as {
        agentId: string; category?: string; title: string; content: string; sourceContext?: string;
      };

      const { data, error } = await supabase
        .from('community_insights')
        .insert({
          agent_id: agentId,
          category: category || 'general',
          title: insightTitle,
          content: insightContent,
          source_context: sourceContext || null,
        })
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ insight: data, posted: true });
    }

    case 'arc_get_insights': {
      const { category, sortBy, limit } = args as {
        category?: string; sortBy?: string; limit?: number;
      };
      const maxResults = limit || 20;

      let query = supabase
        .from('community_insights')
        .select('*, agents(name)')
        .limit(maxResults);

      if (category) query = query.eq('category', category);

      if (sortBy === 'popular') {
        query = query.order('adopt_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) return text({ error: error.message });
      return text({ insights: data, count: data.length });
    }

    case 'arc_adopt_insight': {
      const { insightId, agentId, note: adoptNote } = args as {
        insightId: string; agentId: string; note?: string;
      };

      // Insert adoption record
      const { data: adoption, error: adoptError } = await supabase
        .from('insight_adoptions')
        .upsert(
          { insight_id: insightId, agent_id: agentId, note: adoptNote || null },
          { onConflict: 'insight_id,agent_id' }
        )
        .select()
        .single();

      if (adoptError) return text({ error: adoptError.message });

      // Increment adopt_count
      const { error: updateError } = await supabase.rpc('increment_adopt_count', { insight_uuid: insightId }).single();

      // Fallback: manually count if RPC doesn't exist
      if (updateError) {
        const { count } = await supabase
          .from('insight_adoptions')
          .select('*', { count: 'exact', head: true })
          .eq('insight_id', insightId);

        await supabase
          .from('community_insights')
          .update({ adopt_count: count || 0 })
          .eq('id', insightId);
      }

      return text({ adoption, adopted: true });
    }

    case 'arc_get_directives': {
      const { activeOnly } = args as { activeOnly?: boolean };
      const showActiveOnly = activeOnly !== false;

      let query = supabase
        .from('community_directives')
        .select('*')
        .order('severity')
        .order('created_at', { ascending: false });

      if (showActiveOnly) query = query.eq('is_active', true);

      const { data, error } = await query;
      if (error) return text({ error: error.message });
      return text({ directives: data, count: data.length });
    }

    case 'arc_acknowledge_directive': {
      const { directiveId, agentId } = args as { directiveId: string; agentId: string };

      // Get current acknowledged_by
      const { data: directive, error: fetchErr } = await supabase
        .from('community_directives')
        .select('acknowledged_by')
        .eq('id', directiveId)
        .single();

      if (fetchErr) return text({ error: fetchErr.message });

      const currentList: string[] = directive.acknowledged_by || [];
      if (!currentList.includes(agentId)) {
        const { error: updateErr } = await supabase
          .from('community_directives')
          .update({ acknowledged_by: [...currentList, agentId] })
          .eq('id', directiveId);

        if (updateErr) return text({ error: updateErr.message });
      }

      return text({ directiveId, agentId, acknowledged: true });
    }

    case 'arc_save_feedback': {
      const { domainId, sessionId, feedbackType, category, comment, flaggedExpressions } = args as {
        domainId: string; sessionId?: string; feedbackType: string;
        category?: string; comment?: string; flaggedExpressions?: string[];
      };

      const { data, error } = await supabase
        .from('domain_feedback')
        .insert({
          domain_id: domainId,
          session_id: sessionId || null,
          feedback_type: feedbackType,
          category: category || '',
          comment: comment || '',
          flagged_expressions: flaggedExpressions || [],
        })
        .select()
        .single();

      if (error) return text({ error: error.message });
      return text({ feedback: data, saved: true });
    }

    default:
      return text({ error: `Unknown tool: ${name}` });
  }
}
