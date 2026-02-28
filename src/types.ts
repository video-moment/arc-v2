// ── Agent (external agent registration) ──
export type AgentType = 'telegram' | 'discord' | 'slack' | 'custom';
export type AgentStatus = 'online' | 'offline' | 'error';

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  telegramBotToken?: string;
  telegramChatId?: string;
  status: AgentStatus;
  lastSeen: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ── Telegram ──
export interface TelegramConfig {
  botToken: string;
  chatId?: string;
  webhookUrl?: string;
}

// ── Chat ──
export interface ChatSession {
  id: string;
  agentId: string;
  title: string;
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export type MessageRole = 'user' | 'assistant' | string; // string allows agent names

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

// ── WebSocket ──
export type WsEventType =
  | 'chat_message'
  | 'session_created'
  | 'session_updated'
  | 'agent_status'
  | 'agent_typing'
  | 'agent_chunk'
  | 'agent_done'
  | 'error';

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
}

// ── Squad ──
export interface Squad {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  createdAt: number;
  updatedAt: number;
}

// ── Task ──
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Task {
  id: string;
  squadId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedAgentId?: string;
  result?: string;
  createdAt: number;
  updatedAt: number;
}
