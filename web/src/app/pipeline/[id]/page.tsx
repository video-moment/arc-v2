'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import type { DomainInfo, DashboardStats } from '@/lib/arc-types';
import { getDomains, getStats } from '@/lib/arc-admin-api';
import { LayoutMain } from '@/components/LayoutMain';
import { DomainSwitcher } from '@/components/pipeline/admin/DomainSwitcher';
import { AgentPanel } from '@/components/pipeline/admin/AgentPanel';
import { StatsCards } from '@/components/pipeline/admin/StatsCards';
import { SessionList } from '@/components/pipeline/admin/SessionList';
import { SessionDetail } from '@/components/pipeline/admin/SessionDetail';
import { FlagList } from '@/components/pipeline/admin/FlagList';
import { RuleEditor } from '@/components/pipeline/admin/RuleEditor';
import { LearningOverview } from '@/components/pipeline/admin/LearningOverview';
import { FeedbackList } from '@/components/pipeline/admin/FeedbackList';
import { LearningReports } from '@/components/pipeline/admin/LearningReports';

type Tab = 'sessions' | 'flags' | 'rules' | 'learning';

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: domainId } = use(params);
  const [domain, setDomain] = useState<DomainInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tab, setTab] = useState<Tab>('sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Auto-select first session callback
  const handleFirstLoad = useCallback((firstSessionId: string) => {
    setSelectedSessionId(prev => prev ?? firstSessionId);
  }, []);

  // Agent states (placeholder -- would be fed by WebSocket in production)
  const [agentStates] = useState<Record<'planner' | 'actor' | 'reviewer', { status: 'idle' | 'active'; lastActivity?: number }>>({
    planner: { status: 'idle' },
    actor: { status: 'idle' },
    reviewer: { status: 'idle' },
  });

  // Load domain info
  useEffect(() => {
    getDomains()
      .then(domains => {
        const found = domains.find(d => d.id === domainId);
        if (found) setDomain(found);
      })
      .catch(() => {});
  }, [domainId]);

  // Load stats
  const refreshStats = useCallback(async () => {
    const s = await getStats(domainId).catch(() => null);
    if (s) setStats(s);
  }, [domainId]);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10_000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  const tabs: { key: Tab; label: string; badge?: string }[] = [
    { key: 'sessions', label: '세션' },
    { key: 'flags', label: '플래그', badge: stats?.pendingFlags ? String(stats.pendingFlags) : undefined },
    { key: 'rules', label: '규칙' },
    { key: 'learning', label: '학습' },
  ];

  return (
    <LayoutMain>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/pipeline"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              title="파이프라인 목록으로"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'var(--gradient-accent)' }}
            >
              {domain?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {domain?.name || domainId}
              </h1>
              <p className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                {domainId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DomainSwitcher currentDomainId={domainId} />
            <Link
              href={'/pipeline/chat?domain=' + domainId}
              className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            >
              채팅 UI
            </Link>
            <button
              onClick={refreshStats}
              className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              새로고침
            </button>
          </div>
        </header>

        {/* Agent panel */}
        <AgentPanel agentStates={agentStates} />

        {/* Stats cards */}
        {stats && <StatsCards stats={stats} />}

        {/* Error rate alert */}
        {stats && stats.errorSessions > stats.completedSessions && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
            style={{
              background: 'var(--yellow-soft)',
              border: '1px solid var(--yellow)',
              color: 'var(--yellow)',
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>
              오류율이 높습니다 ({stats.totalSessions > 0 ? ((stats.errorSessions / stats.totalSessions) * 100).toFixed(0) : 0}%) — 설정을 점검해주세요
            </span>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2.5 text-sm transition-all font-medium"
              style={{
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {t.label}
              {t.badge && (
                <span
                  className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'var(--yellow-soft)',
                    color: 'var(--yellow)',
                    border: '1px solid var(--yellow)30',
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 glass p-4 max-h-[600px] overflow-y-auto">
              <SessionList
                domainId={domainId}
                selectedId={selectedSessionId}
                onSelect={setSelectedSessionId}
                onFirstLoad={handleFirstLoad}
              />
            </div>
            <div className="lg:col-span-2 glass p-4 max-h-[600px] overflow-y-auto">
              {selectedSessionId ? (
                <SessionDetail sessionId={selectedSessionId} />
              ) : (
                <div className="flex items-center justify-center h-full py-20">
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    세션을 선택하여 상세 정보를 확인하세요
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'flags' && (
          <div className="glass p-5">
            <FlagList domainId={domainId} />
          </div>
        )}

        {tab === 'rules' && (
          <div className="glass p-5">
            <RuleEditor domainId={domainId} />
          </div>
        )}

        {tab === 'learning' && (
          <div className="space-y-6">
            <div className="glass p-5">
              <LearningOverview domainId={domainId} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass p-5">
                <FeedbackList domainId={domainId} />
              </div>
              <div className="glass p-5">
                <LearningReports domainId={domainId} />
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutMain>
  );
}
