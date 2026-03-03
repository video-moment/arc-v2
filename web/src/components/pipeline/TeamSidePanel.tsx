'use client';

import { useEffect, useState } from 'react';
import type { DomainInfo } from '@/lib/arc-types';
import type { AgentState } from '@/hooks/use-team-stream';

interface TeamSidePanelProps {
  domains: DomainInfo[];
  agentStates: Record<'planner' | 'actor' | 'reviewer', AgentState>;
  activeSessionCount: number;
  onClose: () => void;
}

const agentConfig = {
  planner: {
    label: 'Planner',
    description: '작업 분해 및 계획 수립',
    color: 'var(--agent-planner)',
    soft: 'var(--agent-planner-soft)',
    bg: 'var(--agent-planner-bg)',
  },
  actor: {
    label: 'Actor',
    description: '실제 작업 수행 및 실행',
    color: 'var(--agent-actor)',
    soft: 'var(--agent-actor-soft)',
    bg: 'var(--agent-actor-bg)',
  },
  reviewer: {
    label: 'Reviewer',
    description: '결과 검토 및 품질 평가',
    color: 'var(--agent-reviewer)',
    soft: 'var(--agent-reviewer-soft)',
    bg: 'var(--agent-reviewer-bg)',
  },
} as const;

export function TeamSidePanel({ domains, agentStates, activeSessionCount, onClose }: TeamSidePanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const activeAgents = (['planner', 'actor', 'reviewer'] as const).filter(
    a => agentStates[a].status === 'active'
  );

  return (
    <div className="fixed inset-0 z-40">
      {/* Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0, 0, 0, 0.4)' }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`absolute inset-y-0 right-0 w-80 flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--gradient-accent)', color: 'white' }}
            >
              P
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                파이프라인 현황
              </h2>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                전체 도메인 요약
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Summary stats */}
          <div>
            <p
              className="text-[10px] uppercase tracking-wider font-medium mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              요약
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>등록 도메인</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{domains.length}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>활성 세션</p>
                <p className="text-lg font-bold" style={{ color: activeSessionCount > 0 ? 'var(--green)' : 'var(--text-primary)' }}>
                  {activeSessionCount}
                </p>
              </div>
            </div>
          </div>

          {/* Agent states */}
          <div>
            <p
              className="text-[10px] uppercase tracking-wider font-medium mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              에이전트 상태
            </p>
            <div className="space-y-2">
              {(['planner', 'actor', 'reviewer'] as const).map(agentName => {
                const state = agentStates[agentName];
                const config = agentConfig[agentName];
                const isActive = state.status === 'active';

                return (
                  <div
                    key={agentName}
                    className="rounded-lg p-3 transition-all duration-300"
                    style={{
                      background: isActive ? config.soft : 'var(--bg-card)',
                      border: `1px solid ${isActive ? config.color + '33' : 'var(--border-subtle)'}`,
                      boxShadow: isActive ? `0 0 16px ${config.color}15` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${isActive ? 'animate-pulse-dot' : ''}`}
                          style={{ background: config.color, opacity: isActive ? 1 : 0.3 }}
                        />
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: isActive ? config.color : 'var(--text-secondary)' }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <span
                        className="text-[10px]"
                        style={{ color: isActive ? config.color : 'var(--text-tertiary)' }}
                      >
                        {isActive ? '활동중' : '대기'}
                      </span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {config.description}
                    </p>
                    {isActive && state.lastMessage && (
                      <p
                        className="text-[10px] mt-1.5 line-clamp-2 leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {state.lastMessage}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active agents summary */}
          {activeAgents.length > 0 && (
            <div>
              <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="my-4" />
              <p
                className="text-[10px] uppercase tracking-wider font-medium mb-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                활동 요약
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                현재 <span style={{ color: 'var(--accent-hover)' }} className="font-medium">{activeAgents.length}</span>개
                에이전트가 활동 중입니다.
                {activeAgents.map(a => agentConfig[a].label).join(', ')} 단계 진행 중.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
