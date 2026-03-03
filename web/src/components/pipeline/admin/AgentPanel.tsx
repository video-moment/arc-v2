'use client';

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

interface AgentStatus {
  status: 'idle' | 'active';
  lastActivity?: number;
}

interface AgentPanelProps {
  agentStates: Record<'planner' | 'actor' | 'reviewer', AgentStatus>;
}

export function AgentPanel({ agentStates }: AgentPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {(['planner', 'actor', 'reviewer'] as const).map(agentName => {
        const state = agentStates[agentName];
        const config = agentConfig[agentName];
        const isActive = state.status === 'active';

        return (
          <div
            key={agentName}
            className="glass p-4 transition-all duration-500"
            style={{
              borderColor: isActive ? config.color : undefined,
              background: isActive ? config.bg : undefined,
              boxShadow: isActive ? `0 0 20px ${config.bg}` : undefined,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${isActive ? 'animate-pulse-dot' : ''}`}
                  style={{
                    background: config.color,
                    opacity: isActive ? 1 : 0.3,
                  }}
                />
                <span
                  className="text-sm font-bold"
                  style={{ color: isActive ? config.color : 'var(--text-secondary)' }}
                >
                  {config.label}
                </span>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: isActive ? config.soft : 'var(--bg-hover)',
                  color: isActive ? config.color : 'var(--text-tertiary)',
                }}
              >
                {isActive ? '활동중' : '대기'}
              </span>
            </div>

            <p className="text-[10px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
              {config.description}
            </p>

            {isActive && state.lastActivity && (
              <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                마지막 활동{' '}
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(state.lastActivity).toLocaleTimeString('ko-KR')}
                </span>
              </div>
            )}

            {!isActive && (
              <div className="text-[10px] italic" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                대기 중...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
