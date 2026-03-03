'use client';

import Link from 'next/link';
import type { DomainInfo } from '@/lib/arc-types';
import type { AgentState, PipelineStage } from '@/hooks/use-team-stream';

interface LastSessionInfo {
  status: string;
  createdAt: number;
}

interface TeamCardProps {
  domain: DomainInfo;
  agentStates?: Record<'planner' | 'actor' | 'reviewer', AgentState>;
  pipelineStage?: PipelineStage;
  lastSession?: LastSessionInfo;
  onSettingsClick?: (domainId: string) => void;
}

const agentConfig = {
  planner: { label: 'P', fullLabel: 'Planner', color: 'var(--agent-planner)', soft: 'var(--agent-planner-soft)', bg: 'var(--agent-planner-bg)' },
  actor: { label: 'A', fullLabel: 'Actor', color: 'var(--agent-actor)', soft: 'var(--agent-actor-soft)', bg: 'var(--agent-actor-bg)' },
  reviewer: { label: 'R', fullLabel: 'Reviewer', color: 'var(--agent-reviewer)', soft: 'var(--agent-reviewer-soft)', bg: 'var(--agent-reviewer-bg)' },
} as const;

const stageLabels: Record<PipelineStage, string> = {
  idle: '대기',
  planner: '계획 수립 중',
  actor: '작업 실행 중',
  reviewer: '검토 중',
  completed: '완료',
  error: '오류',
};

const sessionStatusLabels: Record<string, string> = {
  idle: '대기',
  running: '실행 중',
  paused: '일시정지',
  completed: '완료',
  error: '오류',
};

const sessionStatusColors: Record<string, string> = {
  idle: 'var(--text-tertiary)',
  running: 'var(--accent)',
  paused: 'var(--yellow)',
  completed: 'var(--green)',
  error: 'var(--red)',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function TeamCard({ domain, agentStates, pipelineStage, lastSession, onSettingsClick }: TeamCardProps) {
  const activeAgents = agentStates
    ? (['planner', 'actor', 'reviewer'] as const).filter(a => agentStates[a].status === 'active')
    : [];
  const isActive = activeAgents.length > 0;
  const stage = pipelineStage ?? 'idle';

  return (
    <div className="glass glow-hover group relative">
      <Link
        href={`/pipeline/chat?domain=${domain.id}`}
        className="block p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-bold truncate transition-colors"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {domain.name}
            </h3>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {domain.id}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {isActive && (
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ background: 'var(--green)' }}
                />
                <span className="text-[10px]" style={{ color: 'var(--green)' }}>
                  활성
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {domain.description && (
          <p
            className="text-[11px] mb-4 line-clamp-2 leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {domain.description}
          </p>
        )}

        {/* Pipeline stage */}
        {stage !== 'idle' && (
          <div
            className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-md text-[10px] font-medium w-fit"
            style={{
              background: stage === 'error' ? 'var(--red-soft)' : stage === 'completed' ? 'var(--green-soft)' : 'var(--accent-soft)',
              color: stage === 'error' ? 'var(--red)' : stage === 'completed' ? 'var(--green)' : 'var(--accent-hover)',
            }}
          >
            {stage !== 'completed' && stage !== 'error' && (
              <span className="w-1.5 h-1.5 rounded-full pipeline-active" style={{ background: 'currentColor' }} />
            )}
            {stageLabels[stage]}
          </div>
        )}

        {/* Agent mini-status */}
        <div className="flex items-center gap-2">
          {(['planner', 'actor', 'reviewer'] as const).map(agentName => {
            const state = agentStates?.[agentName];
            const config = agentConfig[agentName];
            const agentActive = state?.status === 'active';

            return (
              <div
                key={agentName}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all"
                style={{
                  background: agentActive ? config.soft : 'var(--bg-hover)',
                  color: agentActive ? config.color : 'var(--text-tertiary)',
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${agentActive ? 'animate-pulse-dot' : ''}`}
                  style={{
                    background: config.color,
                    opacity: agentActive ? 1 : 0.3,
                  }}
                />
                <span className="font-medium">{config.label}</span>
              </div>
            );
          })}
        </div>

        {/* Last session + chat link */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {lastSession ? (
            <span className="text-[10px]" style={{ color: sessionStatusColors[lastSession.status] || 'var(--text-tertiary)' }}>
              최근: {formatDate(lastSession.createdAt)} {sessionStatusLabels[lastSession.status] || lastSession.status}
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>세션 없음</span>
          )}
          <span
            className="flex items-center gap-1 text-[10px] font-medium transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            채팅
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>

      {/* Settings button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSettingsClick?.(domain.id);
        }}
        className="absolute top-4 right-4 p-1.5 rounded-md opacity-40 hover:opacity-100 transition-all"
        style={{ color: 'var(--text-tertiary)' }}
        title="팀 설정"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" />
        </svg>
      </button>
    </div>
  );
}
