import { supabase } from './supabase';

// ── Types ──

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  agentId: string;
  title: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface Squad {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  agents?: Agent[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  squadId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgentId?: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers: snake_case ↔ camelCase ──

function toAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    lastSeen: row.last_seen,
    telegramBotToken: row.telegram_bot_token,
    telegramChatId: row.telegram_chat_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSession(row: any): ChatSession {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: any): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function toSquad(row: any): Squad {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    agentIds: row.agent_ids || [],
    agents: row._agents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTask(row: any): Task {
  return {
    id: row.id,
    squadId: row.squad_id,
    title: row.title,
    description: row.description,
    status: row.status,
    assignedAgentId: row.assigned_agent_id,
    result: row.result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Agents ──

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(toAgent);
}

export async function getAgent(id: string): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return toAgent(data);
}

// ── Sessions ──

export async function getSessions(agentId?: string): Promise<ChatSession[]> {
  let query = supabase.from('chat_sessions').select('*').order('created_at', { ascending: false });
  if (agentId) query = query.eq('agent_id', agentId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toSession);
}

export async function createSession(agentId: string, title: string): Promise<ChatSession> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ agent_id: agentId, title })
    .select()
    .single();
  if (error) throw error;
  return toSession(data);
}

// ── Messages ──

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at');
  if (error) throw error;
  return (data || []).map(toMessage);
}

export async function sendMessage(sessionId: string, content: string, role = 'user'): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role, content })
    .select()
    .single();
  if (error) throw error;
  return toMessage(data);
}

// ── Telegram ──

export async function sendTelegram(agentId: string, message: string): Promise<{ ok: boolean }> {
  const res = await fetch('/api/telegram/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message }),
  });
  if (!res.ok) throw new Error('텔레그램 전송 실패');
  return res.json();
}

// ── Squads ──

export async function getSquads(): Promise<Squad[]> {
  const { data, error } = await supabase
    .from('squads')
    .select('*')
    .order('name');
  if (error) throw error;

  const squads = (data || []).map(toSquad);

  // agent_ids로 에이전트 정보 채우기
  const allAgentIds = [...new Set(squads.flatMap(s => s.agentIds))];
  if (allAgentIds.length > 0) {
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .in('id', allAgentIds);
    const agentMap = new Map((agents || []).map(a => [a.id, toAgent(a)]));
    for (const squad of squads) {
      squad.agents = squad.agentIds.map(id => agentMap.get(id)).filter(Boolean) as Agent[];
    }
  }

  return squads;
}

export async function createSquad(input: { name: string; description?: string; agentIds?: string[] }): Promise<Squad> {
  const id = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const { data, error } = await supabase
    .from('squads')
    .insert({
      id,
      name: input.name,
      description: input.description || '',
      agent_ids: input.agentIds || [],
    })
    .select()
    .single();
  if (error) throw error;
  return toSquad(data);
}

export async function deleteSquad(id: string): Promise<{ deleted: boolean }> {
  const { error } = await supabase.from('squads').delete().eq('id', id);
  if (error) throw error;
  return { deleted: true };
}

// ── Tasks ──

export async function getTasks(squadId?: string, status?: string): Promise<Task[]> {
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (squadId) query = query.eq('squad_id', squadId);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toTask);
}

export async function createTask(input: { squadId: string; title: string; description?: string }): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      squad_id: input.squadId,
      title: input.title,
      description: input.description || '',
    })
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const dbUpdates: any = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.assignedAgentId !== undefined) dbUpdates.assigned_agent_id = updates.assignedAgentId;
  if (updates.result !== undefined) dbUpdates.result = updates.result;

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
}

export async function deleteTask(id: string): Promise<{ deleted: boolean }> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
  return { deleted: true };
}
