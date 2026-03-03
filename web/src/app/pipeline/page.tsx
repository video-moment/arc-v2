'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutMain } from '@/components/LayoutMain';
import { TeamCard } from '@/components/pipeline/TeamCard';
import { TeamSidePanel } from '@/components/pipeline/TeamSidePanel';
import { useTeamStream } from '@/hooks/use-team-stream';
import { getDomains } from '@/lib/arc-api';
import { getSessions } from '@/lib/arc-admin-api';
import type { DomainInfo, SessionInfo } from '@/lib/arc-types';

export default function PipelineLobbyPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [lastSessions, setLastSessions] = useState<Record<string, { status: string; createdAt: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  const { agentStates, activeSessions, connected, pipeline } = useTeamStream(null);

  const refresh = useCallback(async () => {
    try {
      const doms = await getDomains();
      setDomains(doms);

      // Fetch last session per domain
      const sessionMap: Record<string, { status: string; createdAt: number }> = {};
      await Promise.all(
        doms.map(async (d) => {
          try {
            const sessions = await getSessions(d.id);
            if (sessions.length > 0) {
              // Sort by createdAt descending, pick the most recent
              const sorted = sessions.sort((a, b) => b.createdAt - a.createdAt);
              sessionMap[d.id] = { status: sorted[0].status, createdAt: sorted[0].createdAt };
            }
          } catch {
            // ignore per-domain errors
          }
        })
      );
      setLastSessions(sessionMap);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <LayoutMain>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            파이프라인
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            ARC 에이전트 파이프라인 도메인 관리
            {!loading && domains.length > 0 && (
              <span className="ml-2" style={{ color: 'var(--text-quaternary, var(--text-tertiary))' }}>
                &middot; 총 {domains.length}개 도메인 &middot; {activeSessions.size}개 활성 세션
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: connected ? 'var(--green)' : 'var(--red)',
                boxShadow: connected ? '0 0 6px var(--green)' : 'none',
              }}
            />
            {connected ? '실시간 연결' : '오프라인'}
          </div>

          {/* Summary panel toggle */}
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M15 3v18" />
            </svg>
            현황 보기
          </button>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            새로고침
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            <span className="typing-dot" style={{ animationDelay: '0s' }} />
            <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
            <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      )}

      {/* Team grid */}
      {!loading && domains.length > 0 && (
        <div className="min-h-[60vh] content-start grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map(domain => (
            <TeamCard
              key={domain.id}
              domain={domain}
              agentStates={agentStates}
              pipelineStage={pipeline.sessionId ? pipeline.stage : undefined}
              lastSession={lastSessions[domain.id]}
              onSettingsClick={(id) => router.push(`/pipeline/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && domains.length === 0 && (
        <div className="text-center py-20">
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--accent-soft)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
              <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" />
            </svg>
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            등록된 도메인이 없습니다
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            ARC Framework에서 도메인을 생성한 후 여기에서 모니터링할 수 있습니다
          </p>
        </div>
      )}

      {/* Side panel */}
      {showPanel && (
        <TeamSidePanel
          domains={domains}
          agentStates={agentStates}
          activeSessionCount={activeSessions.size}
          onClose={() => setShowPanel(false)}
        />
      )}
    </LayoutMain>
  );
}
