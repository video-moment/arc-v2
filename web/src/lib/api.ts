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

// ── Task Types ──

export interface TaskProject {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSubproject {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId?: string;
  subprojectId?: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  category?: string;
  dueDate?: string;
  sortOrder: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  goalId?: string;
  assigneeType: 'me' | 'agent';
  assigneeAgentId?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceParentId?: string;
  blockedBy?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  notes: string;
}

export type AssigneeType = 'me' | 'agent';

export interface TaskComment {
  id: string;
  taskId: string;
  agentId?: string;
  content: string;
  createdAt: string;
}

export interface TaskGoal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  goalType: 'achievement' | 'series';
  targetDate?: string;
  color: string;
  sortOrder: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  episodeCount: number;
  episodeTarget?: string;
  lastEpisodeAt?: string;
  category?: string;
  pausedAt?: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  agentId: string;
  emoji: string;
  createdAt: string;
}

export interface TaskMilestone {
  id: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  completedAt?: string;
  createdAt: string;
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

function toTaskProject(row: any): TaskProject {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTaskSubproject(row: any): TaskSubproject {
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

function toTask(row: any): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    subprojectId: row.subproject_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    dueDate: row.due_date,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    goalId: row.goal_id ?? undefined,
    assigneeType: row.assignee_type ?? 'me',
    assigneeAgentId: row.assignee_agent_id ?? undefined,
    recurrence: row.recurrence ?? null,
    recurrenceParentId: row.recurrence_parent_id ?? undefined,
    blockedBy: row.blocked_by ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    actualMinutes: row.actual_minutes ?? undefined,
    notes: row.notes || '',
  };
}

function toTaskGoal(row: any): TaskGoal {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority,
    targetDate: row.target_date ?? undefined,
    color: row.color || '#6366f1',
    sortOrder: row.sort_order ?? 0,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    projectId: row.project_id ?? undefined,
    goalType: row.goal_type || 'achievement',
    episodeCount: row.episode_count ?? 0,
    episodeTarget: row.episode_target ?? undefined,
    lastEpisodeAt: row.last_episode_at ?? undefined,
    category: row.category ?? undefined,
    pausedAt: row.paused_at ?? undefined,
  };
}

function toReaction(row: any): MessageReaction {
  return {
    id: row.id,
    messageId: row.message_id,
    agentId: row.agent_id,
    emoji: row.emoji,
    createdAt: row.created_at,
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

// ── Reactions ──

export async function getReactions(messageIds: string[]): Promise<MessageReaction[]> {
  if (messageIds.length === 0) return [];
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .in('message_id', messageIds);
  if (error) throw error;
  return (data || []).map(toReaction);
}

// ── Task Projects ──

export async function getTaskProjects(): Promise<TaskProject[]> {
  const { data, error } = await supabase
    .from('pomo_projects')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(toTaskProject);
}

export async function createTaskProject(name: string, color = '#6366f1'): Promise<TaskProject> {
  const { data, error } = await supabase
    .from('pomo_projects')
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return toTaskProject(data);
}

export async function updateTaskProject(id: string, updates: Partial<Pick<TaskProject, 'name' | 'color' | 'sortOrder'>>): Promise<TaskProject> {
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
  return toTaskProject(data);
}

export async function deleteTaskProject(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_projects').delete().eq('id', id);
  if (error) throw error;
}

// ── Task Subprojects ──

export async function getTaskSubprojects(projectId?: string): Promise<TaskSubproject[]> {
  let query = supabase.from('pomo_subprojects').select('*').order('sort_order');
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toTaskSubproject);
}

export async function createTaskSubproject(projectId: string, name: string, color = '#8b5cf6'): Promise<TaskSubproject> {
  const { data, error } = await supabase
    .from('pomo_subprojects')
    .insert({ project_id: projectId, name, color })
    .select()
    .single();
  if (error) throw error;
  return toTaskSubproject(data);
}

export async function updateTaskSubproject(id: string, updates: Partial<Pick<TaskSubproject, 'name' | 'color' | 'sortOrder'>>): Promise<TaskSubproject> {
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
  return toTaskSubproject(data);
}

export async function deleteTaskSubproject(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_subprojects').delete().eq('id', id);
  if (error) throw error;
}

// ── Tasks ──

export async function getTasks(filter?: { projectId?: string; subprojectId?: string }): Promise<Task[]> {
  let query = supabase.from('pomo_tasks').select('*').order('sort_order');
  if (filter?.subprojectId) query = query.eq('subproject_id', filter.subprojectId);
  else if (filter?.projectId) query = query.eq('project_id', filter.projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toTask);
}

export async function createTask(input: {
  projectId?: string;
  subprojectId?: string;
  title: string;
  description?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  goalId?: string;
  assigneeType?: string;
  assigneeAgentId?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceParentId?: string;
  blockedBy?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  notes?: string;
}): Promise<Task> {
  const insertObj: Record<string, any> = {
    project_id: input.projectId || null,
    subproject_id: input.subprojectId || null,
    title: input.title,
    description: input.description || '',
    priority: input.priority || 'medium',
    category: input.category,
    due_date: input.dueDate,
    goal_id: input.goalId || null,
    assignee_type: input.assigneeType || 'me',
    assignee_agent_id: input.assigneeAgentId || null,
    notes: input.notes || '',
  };
  if (input.recurrence !== undefined) insertObj.recurrence = input.recurrence;
  if (input.recurrenceParentId !== undefined) insertObj.recurrence_parent_id = input.recurrenceParentId;
  if (input.blockedBy !== undefined) insertObj.blocked_by = input.blockedBy;
  if (input.estimatedMinutes !== undefined) insertObj.estimated_minutes = input.estimatedMinutes;
  if (input.actualMinutes !== undefined) insertObj.actual_minutes = input.actualMinutes;

  const { data, error } = await supabase
    .from('pomo_tasks')
    .insert(insertObj)
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
}

export async function updateTask(id: string, updates: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  goalId: string | null;
  assigneeType: string;
  assigneeAgentId: string | null;
  recurrence: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceParentId: string | null;
  blockedBy: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  notes: string;
}>): Promise<Task> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId;
  if (updates.assigneeType !== undefined) dbUpdates.assignee_type = updates.assigneeType;
  if (updates.assigneeAgentId !== undefined) dbUpdates.assignee_agent_id = updates.assigneeAgentId;
  if (updates.recurrence !== undefined) dbUpdates.recurrence = updates.recurrence;
  if (updates.recurrenceParentId !== undefined) dbUpdates.recurrence_parent_id = updates.recurrenceParentId;
  if (updates.blockedBy !== undefined) dbUpdates.blocked_by = updates.blockedBy;
  if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_minutes = updates.estimatedMinutes;
  if (updates.actualMinutes !== undefined) dbUpdates.actual_minutes = updates.actualMinutes;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  const { data, error } = await supabase
    .from('pomo_tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateTaskForRecurrence(task: Task): Promise<Task> {
  // Calculate next due date based on recurrence type
  let nextDueDate: string | undefined;
  if (task.dueDate && task.recurrence) {
    const d = new Date(task.dueDate);
    if (task.recurrence === 'daily') d.setDate(d.getDate() + 1);
    else if (task.recurrence === 'weekly') d.setDate(d.getDate() + 7);
    else if (task.recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
    nextDueDate = d.toISOString().split('T')[0];
  }

  return createTask({
    title: task.title,
    description: task.description,
    priority: task.priority,
    category: task.category,
    dueDate: nextDueDate,
    goalId: task.goalId,
    projectId: task.projectId,
    subprojectId: task.subprojectId,
    assigneeType: task.assigneeType,
    assigneeAgentId: task.assigneeAgentId,
    recurrence: task.recurrence,
    recurrenceParentId: task.recurrenceParentId || task.id,
    estimatedMinutes: task.estimatedMinutes,
    notes: task.notes,
  });
}

// ── Task Goals ──

export async function getTaskGoals(filter?: { status?: string; projectId?: string }): Promise<TaskGoal[]> {
  let query = supabase.from('pomo_goals').select('*').order('sort_order');
  if (filter?.status) query = query.eq('status', filter.status);
  if (filter?.projectId) query = query.eq('project_id', filter.projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toTaskGoal);
}

export async function createTaskGoal(input: {
  title: string;
  description?: string;
  priority?: string;
  goalType?: string;
  targetDate?: string;
  color?: string;
  projectId?: string;
  episodeTarget?: string;
  category?: string;
}): Promise<TaskGoal> {
  const { data, error } = await supabase
    .from('pomo_goals')
    .insert({
      title: input.title,
      description: input.description || '',
      priority: input.priority || 'medium',
      goal_type: input.goalType || 'achievement',
      target_date: input.targetDate || null,
      color: input.color || '#6366f1',
      project_id: input.projectId || null,
      episode_target: input.episodeTarget || null,
      category: input.category || null,
    })
    .select()
    .single();
  if (error) throw error;
  return toTaskGoal(data);
}

export async function updateTaskGoal(id: string, updates: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  targetDate: string | null;
  color: string;
  sortOrder: number;
  completedAt: string | null;
  projectId: string | null;
  goalType: string;
  episodeCount: number;
  episodeTarget: string | null;
  lastEpisodeAt: string | null;
  category: string | null;
}>): Promise<TaskGoal> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
  if (updates.goalType !== undefined) dbUpdates.goal_type = updates.goalType;
  if (updates.episodeCount !== undefined) dbUpdates.episode_count = updates.episodeCount;
  if (updates.episodeTarget !== undefined) dbUpdates.episode_target = updates.episodeTarget;
  if (updates.lastEpisodeAt !== undefined) dbUpdates.last_episode_at = updates.lastEpisodeAt;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  const { data, error } = await supabase
    .from('pomo_goals')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toTaskGoal(data);
}

export async function deleteTaskGoal(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_goals').delete().eq('id', id);
  if (error) throw error;
}

// ── Task Episodes (Series goals) ──

export interface TaskEpisode {
  id: string;
  goalId: string;
  title: string | null;
  episodeNumber: number;
  createdAt: string;
}

function toTaskEpisode(row: any): TaskEpisode {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title ?? null,
    episodeNumber: row.episode_number,
    createdAt: row.created_at,
  };
}

export async function getTaskEpisodes(goalId: string): Promise<TaskEpisode[]> {
  const { data, error } = await supabase
    .from('pomo_episodes')
    .select('*')
    .eq('goal_id', goalId)
    .order('episode_number', { ascending: false });
  if (error) throw error;
  return (data || []).map(toTaskEpisode);
}

export async function createTaskEpisode(goalId: string, episodeNumber: number, title?: string): Promise<TaskEpisode> {
  const { data, error } = await supabase
    .from('pomo_episodes')
    .insert({ goal_id: goalId, episode_number: episodeNumber, title: title || null })
    .select()
    .single();
  if (error) throw error;
  return toTaskEpisode(data);
}

export async function deleteTaskEpisode(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_episodes').delete().eq('id', id);
  if (error) throw error;
}

// ── Task Reorder ──

export async function reorderTasks(updates: { id: string; sortOrder: number }[]): Promise<void> {
  await Promise.all(
    updates.map(u => supabase.from('pomo_tasks').update({ sort_order: u.sortOrder }).eq('id', u.id))
  );
}

// ── Task Milestones ──

function toTaskMilestone(row: any): TaskMilestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    isCompleted: row.is_completed,
    sortOrder: row.sort_order,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getTaskMilestones(goalId: string): Promise<TaskMilestone[]> {
  const { data, error } = await supabase
    .from('pomo_goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(toTaskMilestone);
}

export async function createTaskMilestone(goalId: string, title: string): Promise<TaskMilestone> {
  const { data, error } = await supabase
    .from('pomo_goal_milestones')
    .insert({ goal_id: goalId, title })
    .select()
    .single();
  if (error) throw error;
  return toTaskMilestone(data);
}

export async function updateTaskMilestone(
  id: string,
  updates: Partial<{ title: string; isCompleted: boolean; sortOrder: number; completedAt: string | null }>
): Promise<TaskMilestone> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  const { data, error } = await supabase
    .from('pomo_goal_milestones')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toTaskMilestone(data);
}

export async function deleteTaskMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('pomo_goal_milestones').delete().eq('id', id);
  if (error) throw error;
}

// ── Task Comments ──

function toTaskComment(row: any): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    agentId: row.agent_id ?? undefined,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('pomo_task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(toTaskComment);
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

// ── Notes ──

export interface NoteCategory {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteGroup {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotePage {
  id: string;
  groupId: string;
  categoryId?: string;
  category?: NoteCategory;
  title: string;
  emoji: string;
  content: string;
  sortOrder: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

function toNoteCategory(row: any): NoteCategory {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#6366f1',
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNoteGroup(row: any): NoteGroup {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji || '📁',
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNotePage(row: any): NotePage {
  return {
    id: row.id,
    groupId: row.group_id,
    categoryId: row.category_id ?? undefined,
    category: row.note_categories ? toNoteCategory(row.note_categories) : undefined,
    title: row.title,
    emoji: row.emoji || '📝',
    content: row.content || '',
    sortOrder: row.sort_order,
    isPinned: row.is_pinned ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getNoteCategories(): Promise<NoteCategory[]> {
  const { data, error } = await supabase
    .from('note_categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(toNoteCategory);
}

export async function createNoteCategory(name: string, color = '#6366f1'): Promise<NoteCategory> {
  const { data, error } = await supabase
    .from('note_categories')
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return toNoteCategory(data);
}

export async function updateNoteCategory(id: string, updates: Partial<Pick<NoteCategory, 'name' | 'color' | 'sortOrder'>>): Promise<NoteCategory> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  const { data, error } = await supabase
    .from('note_categories')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toNoteCategory(data);
}

export async function deleteNoteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('note_categories').delete().eq('id', id);
  if (error) throw error;
}

export async function getNoteGroups(): Promise<NoteGroup[]> {
  const { data, error } = await supabase
    .from('note_groups')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(toNoteGroup);
}

export async function createNoteGroup(name: string, emoji = '📁'): Promise<NoteGroup> {
  const { data, error } = await supabase
    .from('note_groups')
    .insert({ name, emoji })
    .select()
    .single();
  if (error) throw error;
  return toNoteGroup(data);
}

export async function updateNoteGroup(id: string, updates: Partial<Pick<NoteGroup, 'name' | 'emoji' | 'sortOrder'>>): Promise<NoteGroup> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  const { data, error } = await supabase
    .from('note_groups')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toNoteGroup(data);
}

export async function deleteNoteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('note_groups').delete().eq('id', id);
  if (error) throw error;
}

export async function getNotePages(groupId?: string): Promise<NotePage[]> {
  let query = supabase.from('note_pages').select('*, note_categories(*)').order('sort_order');
  if (groupId) query = query.eq('group_id', groupId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toNotePage);
}

export async function createNotePage(groupId: string, title: string, emoji = '📝'): Promise<NotePage> {
  const { data, error } = await supabase
    .from('note_pages')
    .insert({ group_id: groupId, title, emoji })
    .select()
    .single();
  if (error) throw error;
  return toNotePage(data);
}

export async function updateNotePage(id: string, updates: Partial<Pick<NotePage, 'title' | 'emoji' | 'content' | 'sortOrder' | 'isPinned' | 'categoryId' | 'groupId'>>): Promise<NotePage> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
  if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
  if ('categoryId' in updates) dbUpdates.category_id = updates.categoryId ?? null;
  const { data, error } = await supabase
    .from('note_pages')
    .update(dbUpdates)
    .eq('id', id)
    .select('*, note_categories(*)')
    .single();
  if (error) throw error;
  return toNotePage(data);
}

export async function deleteNotePage(id: string): Promise<void> {
  const { error } = await supabase.from('note_pages').delete().eq('id', id);
  if (error) throw error;
}

// ── Summaries ──

export interface Summary {
  id: string;
  sourceType: 'youtube' | 'web' | 'pdf';
  sourceUrl?: string;
  sourceTitle: string;
  originalText: string;
  summary: string;
  model: string;
  notePageId?: string;
  goalId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

function toSummary(row: any): Summary {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceUrl: row.source_url ?? undefined,
    sourceTitle: row.source_title,
    originalText: row.original_text || '',
    summary: row.summary,
    model: row.model,
    notePageId: row.note_page_id ?? undefined,
    goalId: row.goal_id ?? undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSummaries(filter?: { sourceType?: string }): Promise<Summary[]> {
  let query = supabase
    .from('summaries')
    .select('*')
    .order('created_at', { ascending: false });
  if (filter?.sourceType) query = query.eq('source_type', filter.sourceType);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toSummary);
}

export async function getSummary(id: string): Promise<Summary> {
  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return toSummary(data);
}

export async function createYoutubeSummary(url: string): Promise<Summary> {
  const res = await fetch('/api/summarizer/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '요약 실패' }));
    throw new Error(err.error || '요약 실패');
  }
  const json = await res.json();
  return toSummary(json.summary);
}

export async function createWebSummary(url: string): Promise<Summary> {
  const res = await fetch('/api/summarizer/web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '요약 실패' }));
    throw new Error(err.error || '요약 실패');
  }
  const json = await res.json();
  return toSummary(json.summary);
}

export async function createPdfSummary(file: File): Promise<Summary> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/summarizer/pdf', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '요약 실패' }));
    throw new Error(err.error || '요약 실패');
  }
  const json = await res.json();
  return toSummary(json.summary);
}

export async function updateSummary(id: string, updates: { goalId?: string | null; notePageId?: string | null }): Promise<Summary> {
  const dbUpdates: Record<string, any> = {};
  if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId;
  if (updates.notePageId !== undefined) dbUpdates.note_page_id = updates.notePageId;
  const { data, error } = await supabase
    .from('summaries')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toSummary(data);
}

export async function deleteSummary(id: string): Promise<void> {
  const { error } = await supabase.from('summaries').delete().eq('id', id);
  if (error) throw error;
}

export async function saveSummaryToNotes(id: string, groupId: string): Promise<{ notePageId: string }> {
  const res = await fetch('/api/summarizer/' + id + '/save-to-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '노트 저장 실패' }));
    throw new Error(err.error || '노트 저장 실패');
  }
  const json = await res.json();
  return { notePageId: json.page.id };
}

// ── Goals ──

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  parentId?: string;
  progress: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalCheckItem {
  id: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
}

function toGoal(row: any): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    parentId: row.parent_id ?? undefined,
    progress: row.progress ?? 0,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toGoalCheckItem(row: any): GoalCheckItem {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    isCompleted: row.is_completed ?? false,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export async function getGoals(filter?: { status?: string; parentId?: string | null }): Promise<Goal[]> {
  let query = supabase.from('goals').select('*').order('sort_order');
  if (filter?.status) query = query.eq('status', filter.status);
  if (filter?.parentId !== undefined) {
    if (filter.parentId === null) query = query.is('parent_id', null);
    else query = query.eq('parent_id', filter.parentId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toGoal);
}

export async function createGoal(input: {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  parentId?: string;
}): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      title: input.title,
      description: input.description || '',
      priority: input.priority || 'medium',
      due_date: input.dueDate || null,
      parent_id: input.parentId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return toGoal(data);
}

export async function updateGoal(id: string, updates: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  progress: number;
  sortOrder: number;
}>): Promise<Goal> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  const { data, error } = await supabase
    .from('goals')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toGoal(data);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function getGoalCheckItems(goalId: string): Promise<GoalCheckItem[]> {
  const { data, error } = await supabase
    .from('goal_check_items')
    .select('*')
    .eq('goal_id', goalId)
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(toGoalCheckItem);
}

export async function createGoalCheckItem(goalId: string, title: string): Promise<GoalCheckItem> {
  const { data, error } = await supabase
    .from('goal_check_items')
    .insert({ goal_id: goalId, title })
    .select()
    .single();
  if (error) throw error;
  return toGoalCheckItem(data);
}

export async function updateGoalCheckItem(id: string, updates: Partial<{
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}>): Promise<GoalCheckItem> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  const { data, error } = await supabase
    .from('goal_check_items')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toGoalCheckItem(data);
}

export async function deleteGoalCheckItem(id: string): Promise<void> {
  const { error } = await supabase.from('goal_check_items').delete().eq('id', id);
  if (error) throw error;
}

// ── Agent Profile ──

export interface AgentProfileSection {
  id: string;
  agentId: string;
  sectionKey: string;
  title: string;
  content: string;
  sortOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentProfileHistory {
  id: string;
  sectionId: string;
  agentId: string;
  sectionKey: string;
  content: string;
  version: number;
  createdAt: string;
}

function toProfileSection(row: any): AgentProfileSection {
  return {
    id: row.id,
    agentId: row.agent_id,
    sectionKey: row.section_key,
    title: row.title,
    content: row.content,
    sortOrder: row.sort_order,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProfileHistory(row: any): AgentProfileHistory {
  return {
    id: row.id,
    sectionId: row.section_id,
    agentId: row.agent_id,
    sectionKey: row.section_key,
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
  };
}

export async function getAgentProfile(agentId: string): Promise<AgentProfileSection[]> {
  const { data, error } = await supabase
    .from('agent_profile_sections')
    .select('*')
    .eq('agent_id', agentId)
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(toProfileSection);
}

export async function getProfileHistory(sectionId: string): Promise<AgentProfileHistory[]> {
  const { data, error } = await supabase
    .from('agent_profile_history')
    .select('*')
    .eq('section_id', sectionId)
    .order('version', { ascending: false });
  if (error) throw error;
  return (data || []).map(toProfileHistory);
}

// ── Schedule Messages ──

// ── Botmunity (봇뮤니티) ──

export interface CommunityInsight {
  id: string;
  agentId: string;
  agentName?: string;
  category: string;
  title: string;
  content: string;
  sourceContext?: string;
  adoptCount: number;
  createdAt: string;
}

export interface InsightAdoption {
  id: string;
  insightId: string;
  agentId: string;
  note?: string;
  createdAt: string;
}

export interface InsightComment {
  id: string;
  insightId: string;
  agentId: string;
  agentName?: string;
  content: string;
  createdAt: string;
}

export interface CommunityDirective {
  id: string;
  source: string;
  severity: string;
  title: string;
  content: string;
  tags: string[];
  acknowledgedBy: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toCommunityInsight(row: any): CommunityInsight {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agents?.name,
    category: row.category,
    title: row.title,
    content: row.content,
    sourceContext: row.source_context,
    adoptCount: row.adopt_count,
    createdAt: row.created_at,
  };
}

function toCommunityDirective(row: any): CommunityDirective {
  return {
    id: row.id,
    source: row.source,
    severity: row.severity,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    acknowledgedBy: row.acknowledged_by || [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCommunityInsights(options?: { category?: string; limit?: number }): Promise<CommunityInsight[]> {
  let query = supabase
    .from('community_insights')
    .select('*, agents(name)')
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  if (options?.category) query = query.eq('category', options.category);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toCommunityInsight);
}

export async function getInsightComments(insightId: string): Promise<InsightComment[]> {
  const { data, error } = await supabase
    .from('insight_comments')
    .select('*, agents(name)')
    .eq('insight_id', insightId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    insightId: row.insight_id,
    agentId: row.agent_id,
    agentName: row.agents?.name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function getInsightCommentCounts(insightIds: string[]): Promise<Record<string, number>> {
  if (insightIds.length === 0) return {};
  const { data, error } = await supabase
    .from('insight_comments')
    .select('insight_id')
    .in('insight_id', insightIds);

  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    counts[row.insight_id] = (counts[row.insight_id] || 0) + 1;
  });
  return counts;
}

export async function getCommunityDirectives(activeOnly = true): Promise<CommunityDirective[]> {
  let query = supabase
    .from('community_directives')
    .select('*')
    .order('severity')
    .order('created_at', { ascending: false });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toCommunityDirective);
}

export async function createDirective(input: {
  title: string;
  content: string;
  severity?: string;
  source?: string;
  tags?: string[];
}): Promise<CommunityDirective> {
  const { data, error } = await supabase
    .from('community_directives')
    .insert({
      title: input.title,
      content: input.content,
      severity: input.severity || 'warning',
      source: input.source || 'user_feedback',
      tags: input.tags || [],
    })
    .select()
    .single();
  if (error) throw error;
  return toCommunityDirective(data);
}

export async function updateDirective(id: string, updates: Partial<{
  title: string;
  content: string;
  severity: string;
  tags: string[];
  isActive: boolean;
}>): Promise<CommunityDirective> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('community_directives')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toCommunityDirective(data);
}

export async function deleteDirective(id: string): Promise<void> {
  const { error } = await supabase.from('community_directives').delete().eq('id', id);
  if (error) throw error;
}

// ── Schedule Messages ──

// ── Content Studio ──

export interface AgentRules {
  id: string;
  agentId: string;
  rules: Record<string, any>;
  reviewChecklist: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ThemeSection {
  name: string;
  role: string;
  description?: string;
  fixed?: boolean;
}

export interface ContentTheme {
  id: string;
  name: string;
  description: string;
  structure: ThemeSection[];
  variables: string[];
  rules: Record<string, any>;
  reviewChecklist: any[];
  referenceText: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
  pieceCounts?: Record<string, number>;
}

export interface ContentPiece {
  id: string;
  themeId: string;
  title: string;
  variables: Record<string, string>;
  content: string;
  status: 'draft' | 'generating' | 'review' | 'approved' | 'published';
  reviewNotes: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  theme?: ContentTheme;
}

function toAgentRules(row: any): AgentRules {
  return {
    id: row.id,
    agentId: row.agent_id,
    rules: row.rules || {},
    reviewChecklist: row.review_checklist || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContentTheme(row: any): ContentTheme {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    structure: row.structure || [],
    variables: row.variables || [],
    rules: row.rules || {},
    reviewChecklist: row.review_checklist || [],
    referenceText: row.reference_text || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pieceCounts: row.piece_counts,
  };
}

function toContentPiece(row: any): ContentPiece {
  return {
    id: row.id,
    themeId: row.theme_id,
    title: row.title,
    variables: row.variables || {},
    content: row.content || '',
    status: row.status,
    reviewNotes: row.review_notes || '',
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    theme: row.content_themes ? toContentTheme(row.content_themes) : undefined,
  };
}

export async function getAgentRules(agentId: string): Promise<AgentRules | null> {
  const { data, error } = await supabase
    .from('agent_rules')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle();
  if (error) throw error;
  return data ? toAgentRules(data) : null;
}

export async function getContentThemes(status?: string): Promise<ContentTheme[]> {
  let query = supabase.from('content_themes').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toContentTheme);
}

export async function getContentTheme(id: string): Promise<ContentTheme> {
  const { data, error } = await supabase
    .from('content_themes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return toContentTheme(data);
}

export async function getContentPieces(params?: { themeId?: string; status?: string }): Promise<ContentPiece[]> {
  let query = supabase
    .from('content_pieces')
    .select('*, content_themes(*)')
    .order('created_at', { ascending: false });
  if (params?.themeId) query = query.eq('theme_id', params.themeId);
  if (params?.status) query = query.eq('status', params.status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toContentPiece);
}

export async function getContentPiece(id: string): Promise<ContentPiece> {
  const { data, error } = await supabase
    .from('content_pieces')
    .select('*, content_themes(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return toContentPiece(data);
}

export async function createContentTheme(data: Partial<ContentTheme>): Promise<ContentTheme> {
  const dbData: Record<string, any> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.description !== undefined) dbData.description = data.description;
  if (data.structure !== undefined) dbData.structure = data.structure;
  if (data.variables !== undefined) dbData.variables = data.variables;
  if (data.rules !== undefined) dbData.rules = data.rules;
  if (data.reviewChecklist !== undefined) dbData.review_checklist = data.reviewChecklist;
  if (data.referenceText !== undefined) dbData.reference_text = data.referenceText;
  if (data.status !== undefined) dbData.status = data.status;
  const { data: row, error } = await supabase
    .from('content_themes')
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return toContentTheme(row);
}

export async function updateContentTheme(id: string, data: Partial<ContentTheme>): Promise<ContentTheme> {
  const dbData: Record<string, any> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.description !== undefined) dbData.description = data.description;
  if (data.structure !== undefined) dbData.structure = data.structure;
  if (data.variables !== undefined) dbData.variables = data.variables;
  if (data.rules !== undefined) dbData.rules = data.rules;
  if (data.reviewChecklist !== undefined) dbData.review_checklist = data.reviewChecklist;
  if (data.referenceText !== undefined) dbData.reference_text = data.referenceText;
  if (data.status !== undefined) dbData.status = data.status;
  const { data: row, error } = await supabase
    .from('content_themes')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toContentTheme(row);
}

export async function deleteContentTheme(id: string): Promise<void> {
  const { error } = await supabase.from('content_themes').delete().eq('id', id);
  if (error) throw error;
}

export async function createContentPiece(data: Partial<ContentPiece>): Promise<ContentPiece> {
  const dbData: Record<string, any> = {};
  if (data.themeId !== undefined) dbData.theme_id = data.themeId;
  if (data.title !== undefined) dbData.title = data.title;
  if (data.variables !== undefined) dbData.variables = data.variables;
  if (data.content !== undefined) dbData.content = data.content;
  if (data.status !== undefined) dbData.status = data.status;
  if (data.reviewNotes !== undefined) dbData.review_notes = data.reviewNotes;
  const { data: row, error } = await supabase
    .from('content_pieces')
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return toContentPiece(row);
}

export async function updateContentPiece(id: string, data: Partial<ContentPiece>): Promise<ContentPiece> {
  const dbData: Record<string, any> = {};
  if (data.themeId !== undefined) dbData.theme_id = data.themeId;
  if (data.title !== undefined) dbData.title = data.title;
  if (data.variables !== undefined) dbData.variables = data.variables;
  if (data.content !== undefined) dbData.content = data.content;
  if (data.status !== undefined) dbData.status = data.status;
  if (data.reviewNotes !== undefined) dbData.review_notes = data.reviewNotes;
  if (data.publishedAt !== undefined) dbData.published_at = data.publishedAt;
  const { data: row, error } = await supabase
    .from('content_pieces')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toContentPiece(row);
}

export async function deleteContentPiece(id: string): Promise<void> {
  const { error } = await supabase.from('content_pieces').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertAgentRules(agentId: string, rules: any, reviewChecklist: any[]): Promise<AgentRules> {
  const { data, error } = await supabase
    .from('agent_rules')
    .upsert(
      { agent_id: agentId, rules, review_checklist: reviewChecklist },
      { onConflict: 'agent_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return toAgentRules(data);
}

export async function generateContent(themeId: string, variables: Record<string, string>): Promise<ContentPiece> {
  const res = await fetch('/api/content/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeId, variables }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '콘텐츠 생성 실패' }));
    throw new Error(err.error || '콘텐츠 생성 실패');
  }
  const json = await res.json();
  return toContentPiece(json.piece ?? json);
}

export async function reviewContent(pieceId: string): Promise<ContentPiece> {
  const res = await fetch('/api/content/pieces/' + pieceId + '/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '콘텐츠 검수 실패' }));
    throw new Error(err.error || '콘텐츠 검수 실패');
  }
  const json = await res.json();
  return toContentPiece(json.piece ?? json);
}

export async function approveContent(pieceId: string): Promise<ContentPiece> {
  return updateContentPiece(pieceId, { status: 'approved' });
}

export async function publishContent(pieceId: string): Promise<ContentPiece> {
  return updateContentPiece(pieceId, { status: 'published', publishedAt: new Date().toISOString() });
}

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
