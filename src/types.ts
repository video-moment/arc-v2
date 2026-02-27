// ── Agent Definition ──
export interface AgentDef {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model?: string;
  maxTurns?: number;
  allowedTools?: string[];
  workingDir?: string;
  createdAt: number;
  updatedAt: number;
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

export type MessageRole = 'user' | 'assistant';

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
  | 'agent_typing'
  | 'agent_done'
  | 'error';

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
}

// ── Agent YAML ──
export interface AgentYaml {
  name: string;
  description: string;
  system_prompt: string;
  model?: string;
  max_turns?: number;
  allowed_tools?: string[];
  working_dir?: string;
}
