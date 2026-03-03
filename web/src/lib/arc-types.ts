// ── Agent Names ──
export type AgentName = 'planner' | 'actor' | 'reviewer' | 'user' | 'system';

// ── Message Types ──
export type MessageType =
  | 'plan'
  | 'action_request'
  | 'action_result'
  | 'review'
  | 'revision_request'
  | 'complete'
  | 'user_input'
  | 'user_interrupt'
  | 'error'
  | 'research'
  | 'plan_proposal'
  | 'plan_approved'
  | 'safety_violation';

// ── Agent Message ──
export interface AgentMessage {
  id: string;
  sessionId: string;
  from: AgentName;
  to: AgentName;
  type: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

// ── Run Result ──
export interface RunResult {
  sessionId: string;
  output: string;
  messages: AgentMessage[];
  metadata: {
    totalTurns: number;
    revisionCount: number;
    durationMs: number;
  };
}

// ── Domain Config ──
export interface DomainConfig {
  id: string;
  name: string;
  description: string;
  prompts: {
    planner: string;
    actor: string;
    reviewer: string;
  };
  rules: DomainRule[];
  seed?: {
    knowledge: SeedKnowledge[];
    rules: DomainRule[];
  };
  settings?: {
    maxTurns?: number;
    maxRevisions?: number;
    timeout?: number;
    requirePlanApproval?: boolean;
    actorMaxTurns?: number;
  };
  app?: { url: string; projectDir?: string };
  safety?: SafetyConfig;
}

export interface DomainRule {
  id: string;
  category: string;
  content: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SeedKnowledge {
  id: string;
  content: string;
  tags: string[];
}

// ── Session ──
export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface SessionInfo {
  sessionId: string;
  domainId: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
}

// ── WebSocket Events ──
export type WsEventType =
  | 'agent_message'
  | 'status_change'
  | 'session_created'
  | 'session_completed'
  | 'pipeline_error'
  | 'error';

export interface WsEvent {
  type: WsEventType;
  payload: AgentMessage | SessionInfo | WsErrorPayload;
}

export interface WsErrorPayload {
  sessionId?: string;
  domainId?: string;
  error: string;
}

// ── Domain Info ──
export interface DomainInfo {
  id: string;
  name: string;
  description: string;
  app?: { url: string; projectDir?: string };
}

// ── API Types ──
export interface RunRequest {
  input: string;
  domainId?: string;
  sessionId?: string;
}

export interface FeedbackRequest {
  sessionId: string;
  messageId: string;
  feedback: 'approve' | 'reject' | 'revise';
  comment?: string;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  score: number;
  tags?: string[];
}

// ── Flag System ──
export type FlagStatus = 'pending' | 'approved' | 'rejected';

export interface FlaggedItem {
  id: string;
  sessionId: string;
  domainId: string;
  ruleId?: string;
  category: string;
  content: string;
  context: string;
  severity: 'error' | 'warning' | 'info';
  confidence: number;
  status: FlagStatus;
  resolvedBy?: string;
  resolvedAt?: number;
  createdAt: number;
}

// ── Admin Stats ──
export interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  errorSessions: number;
  totalMessages: number;
  totalFlags: number;
  pendingFlags: number;
  approvedFlags: number;
  rejectedFlags: number;
  avgTurnsPerSession: number;
  avgDurationMs: number;
}

export interface SessionDetail extends SessionInfo {
  messages: AgentMessage[];
  flags: FlaggedItem[];
  metadata?: {
    totalTurns: number;
    revisionCount: number;
    durationMs: number;
  };
}

// ── Learning System ──
export interface CotTrace {
  id: number;
  sessionId: string;
  agentName: string;
  trace: string;
  qualityScore: number;
  domainId: string;
  createdAt: number;
}

export type FeedbackType = 'thumbs_up' | 'thumbs_down';

export interface FeedbackLog {
  id: string;
  sessionId: string;
  domainId: string;
  feedbackType: FeedbackType;
  comment?: string;
  flaggedExpressions: string[];
  processed: boolean;
  learningAction?: string;
  createdAt: number;
}

export type ConfidenceChangeReason =
  | 'repeated_flag'
  | 'negative_feedback'
  | 'positive_context'
  | 'human_confirm'
  | 'human_reject'
  | 'pattern_discovery';

export interface ConfidenceHistory {
  id: number;
  flagId: string;
  previousConfidence: number;
  newConfidence: number;
  reason: ConfidenceChangeReason;
  details?: string;
  createdAt: number;
}

export type PromotionTier = 'candidate' | 'warn' | 'semi_ban' | 'confirmed';

export function getPromotionTier(confidence: number): PromotionTier {
  if (confidence >= 0.85) return 'confirmed';
  if (confidence >= 0.7) return 'semi_ban';
  if (confidence >= 0.5) return 'warn';
  return 'candidate';
}

export interface LearningReport {
  id: string;
  domainId: string;
  periodStart: number;
  periodEnd: number;
  summary: LearningStats;
  generatedAt: number;
}

export interface LearningStats {
  totalTraces: number;
  avgTraceQuality: number;
  totalFeedback: number;
  positiveFeedbackRate: number;
  promotionQueue: number;
  recentPromotions: number;
}

// ── Safety System ──
export type RiskLevel = 'safe' | 'moderate' | 'dangerous';

export interface SafetyConfig {
  enabled: boolean;
  rules: SafetyRule[];
  blockedCommands: string[];
  blockedPaths: string[];
}

export interface SafetyRule {
  id: string;
  pattern: string;
  riskLevel: RiskLevel;
  description: string;
  action: 'block' | 'warn' | 'log';
}
