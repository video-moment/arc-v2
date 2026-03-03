import type {
  DashboardStats,
  SessionInfo,
  SessionDetail,
  FlaggedItem,
  FlagStatus,
  DomainRule,
  DomainInfo,
  LearningStats,
  LearningReport,
  FeedbackLog,
  ConfidenceHistory,
} from './arc-types';

// ── Domain Management ──

export async function getDomains(): Promise<DomainInfo[]> {
  const res = await fetch('/api/admin/domains');
  const data = await res.json();
  return data.domains;
}

export async function createDomain(id: string, name: string, description: string): Promise<DomainInfo> {
  const res = await fetch('/api/admin/domains', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, description }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create domain');
  }
  return res.json();
}

export async function updateDomain(id: string, updates: { name?: string; description?: string }): Promise<DomainInfo> {
  const res = await fetch(`/api/admin/domains/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update domain');
  }
  return res.json();
}

// ── Stats & Monitoring ──

export async function getStats(domainId?: string): Promise<DashboardStats> {
  const params = domainId ? `?domainId=${domainId}` : '';
  const res = await fetch(`/api/admin/stats${params}`);
  return res.json();
}

export async function getSessions(domainId?: string): Promise<SessionInfo[]> {
  const params = domainId ? `?domainId=${domainId}` : '';
  const res = await fetch(`/api/admin/sessions${params}`);
  const data = await res.json();
  return data.sessions;
}

export async function getActiveSessions(): Promise<SessionInfo[]> {
  const res = await fetch('/api/admin/sessions/active');
  const data = await res.json();
  return data.sessions;
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const res = await fetch(`/api/admin/sessions/${sessionId}`);
  return res.json();
}

// ── Flagging System ──

export async function getFlags(filters?: { domainId?: string; status?: FlagStatus }): Promise<FlaggedItem[]> {
  const params = new URLSearchParams();
  if (filters?.domainId) params.set('domainId', filters.domainId);
  if (filters?.status) params.set('status', filters.status);
  const res = await fetch(`/api/admin/flags?${params}`);
  const data = await res.json();
  return data.flags;
}

export async function resolveFlag(flagId: string, status: 'approved' | 'rejected'): Promise<void> {
  await fetch(`/api/admin/flags/${flagId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

// ── Rules Management ──

export async function getRules(domainId: string): Promise<DomainRule[]> {
  const res = await fetch(`/api/admin/rules?domainId=${domainId}`);
  const data = await res.json();
  return data.rules;
}

export async function createRule(domainId: string, rule: Omit<DomainRule, 'id'>): Promise<DomainRule> {
  const res = await fetch('/api/admin/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainId, ...rule }),
  });
  return res.json();
}

export async function updateRule(ruleId: string, domainId: string, rule: Omit<DomainRule, 'id'>): Promise<DomainRule> {
  const res = await fetch(`/api/admin/rules/${ruleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainId, ...rule }),
  });
  return res.json();
}

export async function deleteRule(ruleId: string): Promise<void> {
  await fetch(`/api/admin/rules/${ruleId}`, { method: 'DELETE' });
}

// ── Plan Approval ──

export async function approvePlan(sessionId: string, comment?: string): Promise<void> {
  const res = await fetch(`/api/arc/sessions/${sessionId}/approve-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to approve plan');
  }
}

// ── Learning System ──

export async function getLearningStats(domainId?: string): Promise<LearningStats> {
  const params = domainId ? `?domainId=${domainId}` : '';
  const res = await fetch(`/api/admin/learning/stats${params}`);
  return res.json();
}

export async function getPromotionQueue(domainId?: string): Promise<FlaggedItem[]> {
  const params = domainId ? `?domainId=${domainId}` : '';
  const res = await fetch(`/api/admin/learning/promotion-queue${params}`);
  const data = await res.json();
  return data.flags;
}

export async function promoteFlag(flagId: string, action: 'confirm' | 'reject'): Promise<void> {
  await fetch(`/api/admin/learning/promote/${flagId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

export async function getConfidenceHistory(flagId: string): Promise<ConfidenceHistory[]> {
  const res = await fetch(`/api/admin/learning/confidence-history/${flagId}`);
  const data = await res.json();
  return data.history;
}

export async function getFeedbackLogs(domainId?: string): Promise<FeedbackLog[]> {
  const params = domainId ? `?domainId=${domainId}` : '';
  const res = await fetch(`/api/admin/learning/feedback${params}`);
  const data = await res.json();
  return data.feedback;
}

export async function getLearningReports(domainId?: string, limit?: number): Promise<LearningReport[]> {
  const params = new URLSearchParams();
  if (domainId) params.set('domainId', domainId);
  if (limit) params.set('limit', String(limit));
  const res = await fetch(`/api/admin/learning/reports?${params}`);
  const data = await res.json();
  return data.reports;
}

export async function triggerAnalysis(domainId?: string): Promise<LearningReport> {
  const res = await fetch('/api/admin/learning/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainId }),
  });
  const data = await res.json();
  return data.report;
}
