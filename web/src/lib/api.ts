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
  mediaUrl?: string;
  mediaType?: string;
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

// ── Pomodoro Types ──

export interface PomoProject {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PomoSubproject {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PomoTask {
  id: string;
  projectId?: string;
  subprojectId?: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  category?: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  dueDate?: string;
  sortOrder: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PomoSession {
  id: string;
  taskId: string;
  durationMinutes: number;
  startedAt: string;
  completedAt?: string;
  isCompleted: boolean;
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
    mediaUrl: row.media_url,
    mediaType: row.media_type,
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

function toPomoProject(row: any): PomoProject {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPomoSubproject(row: any): PomoSubproject {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPomoTask(row: any): PomoTask {
  return {
    id: row.id,
    projectId: row.project_id,
    subprojectId: row.subproject_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    estimatedPomodoros: row.estimated_pomodoros,
    completedPomodoros: row.completed_pomodoros,
    dueDate: row.due_date,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPomoSession(row: any): PomoSession {
  return {
    id: row.id,
    taskId: row.task_id,
    durationMinutes: row.duration_minutes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    isCompleted: row.is_completed,
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

export async function updateAgent(id: string, updates: { name?: string; description?: string }): Promise<Agent> {
  const dbUpdates: Record<string, string> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;

  const { data, error } = await supabase
    .from('agents')
    .update(dbUpdates)
    .eq('id', id)
    .select()
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
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .gte('created_at', sixHoursAgo)
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

// ── Pomodoro Projects ──

export async function getPomoProjects(): Promise<PomoProject[]> {
  const { data, error } = await supabase
    .from('pomo_projects')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(toPomoProject);
}

export async function createPomoProject(name: string, color = '#6366f1'): Promise<PomoProject> {
  const { data, error } = await supabase
    .from('pomo_projects')
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return toPomoProject(data);
}

export async function updatePomoProject(id: string, updates: Partial<Pick<PomoProject, 'name' | 'color' | 'sortOrder'>>): Promise<PomoProject> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  const { data, error } = await supabase
    .from('pomo_projects')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toPomoProject(data);
}

export async function deletePomoProject(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_projects').delete().eq('id', id);
  if (error) throw error;
}

// ── Pomodoro Subprojects ──

export async function getPomoSubprojects(projectId?: string): Promise<PomoSubproject[]> {
  let query = supabase.from('pomo_subprojects').select('*').order('sort_order');
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toPomoSubproject);
}

export async function createPomoSubproject(projectId: string, name: string, color = '#8b5cf6'): Promise<PomoSubproject> {
  const { data, error } = await supabase
    .from('pomo_subprojects')
    .insert({ project_id: projectId, name, color })
    .select()
    .single();
  if (error) throw error;
  return toPomoSubproject(data);
}

export async function updatePomoSubproject(id: string, updates: Partial<Pick<PomoSubproject, 'name' | 'color' | 'sortOrder'>>): Promise<PomoSubproject> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  const { data, error } = await supabase
    .from('pomo_subprojects')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toPomoSubproject(data);
}

export async function deletePomoSubproject(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_subprojects').delete().eq('id', id);
  if (error) throw error;
}

// ── Pomodoro Tasks ──

export async function getPomoTasks(filter?: { projectId?: string; subprojectId?: string }): Promise<PomoTask[]> {
  let query = supabase.from('pomo_tasks').select('*').order('sort_order');
  if (filter?.subprojectId) query = query.eq('subproject_id', filter.subprojectId);
  else if (filter?.projectId) query = query.eq('project_id', filter.projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toPomoTask);
}

export async function createPomoTask(input: {
  projectId?: string;
  subprojectId?: string;
  title: string;
  description?: string;
  priority?: string;
  category?: string;
  estimatedPomodoros?: number;
  dueDate?: string;
}): Promise<PomoTask> {
  const { data, error } = await supabase
    .from('pomo_tasks')
    .insert({
      project_id: input.projectId || null,
      subproject_id: input.subprojectId || null,
      title: input.title,
      description: input.description || '',
      priority: input.priority || 'medium',
      category: input.category,
      estimated_pomodoros: input.estimatedPomodoros || 1,
      due_date: input.dueDate,
    })
    .select()
    .single();
  if (error) throw error;
  return toPomoTask(data);
}

export async function updatePomoTask(id: string, updates: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
}>): Promise<PomoTask> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.estimatedPomodoros !== undefined) dbUpdates.estimated_pomodoros = updates.estimatedPomodoros;
  if (updates.completedPomodoros !== undefined) dbUpdates.completed_pomodoros = updates.completedPomodoros;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  const { data, error } = await supabase
    .from('pomo_tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toPomoTask(data);
}

export async function deletePomoTask(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_tasks').delete().eq('id', id);
  if (error) throw error;
}

// ── Pomodoro Sessions ──

export async function createPomoSession(taskId: string, durationMinutes = 25): Promise<PomoSession> {
  const { data, error } = await supabase
    .from('pomo_sessions')
    .insert({ task_id: taskId, duration_minutes: durationMinutes })
    .select()
    .single();
  if (error) throw error;
  return toPomoSession(data);
}

export async function completePomoSession(sessionId: string): Promise<PomoSession> {
  const { data, error } = await supabase
    .from('pomo_sessions')
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return toPomoSession(data);
}

export async function getPomoStats(days = 7): Promise<PomoSession[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('pomo_sessions')
    .select('*')
    .gte('started_at', since)
    .eq('is_completed', true)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toPomoSession);
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

export async function syncTelegram(agentId: string): Promise<{ synced: number }> {
  const res = await fetch('/api/telegram/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId }),
  });
  if (!res.ok) throw new Error('텔레그램 동기화 실패');
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

// ── Schedule Messages ──

export async function getScheduleMessages(agentId: string): Promise<ChatMessage[]> {
  // 에이전트의 모든 세션에서 스케줄 관련 메시지 검색
  const { data: sessionData } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('agent_id', agentId);
  if (!sessionData || sessionData.length === 0) return [];

  const sessionIds = sessionData.map(s => s.id);
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .in('session_id', sessionIds)
    .or('content.ilike.%[스케줄]%,content.ilike.%📋%,content.ilike.%자동화%,content.ilike.%매일%,content.ilike.%매주%,content.ilike.%반복%')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []).map(toMessage);
}
