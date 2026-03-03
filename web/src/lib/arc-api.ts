import type { RunRequest, MemorySearchResult, DomainInfo } from './arc-types';

export interface StartResult {
  sessionId: string;
  status: string;
}

export async function startArc(request: RunRequest): Promise<StartResult> {
  const res = await fetch('/api/arc/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDomains(): Promise<DomainInfo[]> {
  const res = await fetch('/api/arc/domains');
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.domains;
}

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

export async function searchMemory(query: string, domainId?: string): Promise<MemorySearchResult[]> {
  const params = new URLSearchParams({ query });
  if (domainId) params.set('domainId', domainId);
  const res = await fetch(`/api/arc/memory/search?${params}`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.results;
}

export async function getSessionMessages(sessionId: string) {
  const res = await fetch(`/api/arc/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.messages;
}

export async function getPipelineStage(sessionId: string) {
  const res = await fetch(`/api/arc/sessions/${sessionId}/pipeline`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
