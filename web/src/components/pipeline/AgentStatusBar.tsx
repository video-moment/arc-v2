'use client';

import type { AgentMessage } from '@/lib/arc-types';

interface AgentStatusBarProps {
  messages: AgentMessage[];
  completed: boolean;
  paused: boolean;
  connected?: boolean;
  pipelineError?: string | null;
}

type Stage = 'planner' | 'actor' | 'reviewer';

const STAGES: { key: Stage; label: string }[] = [
  { key: 'planner', label: '계획' },
  { key: 'actor', label: '실행' },
  { key: 'reviewer', label: '검수' },
];

function getStageColor(stage: Stage): string {
  switch (stage) {
    case 'planner':
      return 'var(--agent-planner)';
    case 'actor':
      return 'var(--agent-actor)';
    case 'reviewer':
      return 'var(--agent-reviewer)';
  }
}

function getActiveStageSoft(stage: Stage): string {
  switch (stage) {
    case 'planner':
      return 'var(--agent-planner-soft)';
    case 'actor':
      return 'var(--agent-actor-soft)';
    case 'reviewer':
      return 'var(--agent-reviewer-soft)';
  }
}

function deriveActiveStage(messages: AgentMessage[]): Stage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.from === 'reviewer' || m.type === 'review') return 'reviewer';
    if (m.from === 'actor' || m.type === 'action_result') return 'actor';
    if (m.from === 'planner' || m.type === 'plan' || m.type === 'plan_proposal' || m.type === 'research') return 'planner';
  }
  return 'planner';
}

function deriveCompletedStages(messages: AgentMessage[]): Set<Stage> {
  const done = new Set<Stage>();
  const hasPlan = messages.some(
    (m) => m.from === 'planner' && (m.type === 'plan' || m.type === 'plan_approved')
  );
  if (hasPlan) done.add('planner');

  const hasAction = messages.some(
    (m) => m.from === 'actor' && m.type === 'action_result'
  );
  if (hasAction) done.add('actor');

  const hasReview = messages.some(
    (m) => m.from === 'reviewer' && m.type === 'review'
  );
  if (hasReview) done.add('reviewer');

  return done;
}

function getStatusText(
  completed: boolean,
  paused: boolean,
  pipelineError: string | null | undefined,
  activeStage: Stage | null
): string {
  if (pipelineError) return '에러';
  if (completed) return '완료';
  if (paused) return '검토 대기';
  if (!activeStage) return '대기 중';
  return '실행 중';
}

export function AgentStatusBar({
  messages,
  completed,
  paused,
  connected,
  pipelineError,
}: AgentStatusBarProps) {
  const activeStage = completed ? null : deriveActiveStage(messages);
  const completedStages = completed
    ? new Set<Stage>(['planner', 'actor', 'reviewer'])
    : deriveCompletedStages(messages);
  const statusText = getStatusText(completed, paused, pipelineError, activeStage);

  return (
    <div
      className="glass rounded-xl px-5 py-3 flex items-center justify-between"
    >
      {/* Pipeline stages */}
      <div className="flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const isActive = activeStage === stage.key && !completed;
          const isDone = completedStages.has(stage.key) || completed;

          return (
            <div key={stage.key} className="flex items-center gap-1">
              {/* Stage pill */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  isActive ? 'pipeline-active' : ''
                }`}
                style={{
                  background: isActive
                    ? getActiveStageSoft(stage.key)
                    : isDone
                    ? 'var(--bg-hover)'
                    : 'transparent',
                  color: isActive
                    ? getStageColor(stage.key)
                    : isDone
                    ? 'var(--text-secondary)'
                    : 'var(--text-tertiary)',
                }}
              >
                {isDone && !isActive ? (
                  <svg
                    className="w-3 h-3"
                    style={{ color: 'var(--green)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isActive ? (
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: getStageColor(stage.key) }}
                  />
                ) : null}
                {stage.label}
              </div>

              {/* Arrow between stages */}
              {idx < STAGES.length - 1 && (
                <svg
                  className="w-3 h-3"
                  style={{ color: 'var(--text-tertiary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Right side: status + connection */}
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-md"
          style={{
            background: pipelineError
              ? 'var(--red-soft)'
              : completed
              ? 'var(--green-soft)'
              : paused
              ? 'var(--yellow-soft)'
              : 'var(--blue-soft)',
            color: pipelineError
              ? 'var(--red)'
              : completed
              ? 'var(--green)'
              : paused
              ? 'var(--yellow)'
              : 'var(--blue)',
          }}
        >
          {statusText}
        </span>
        {connected !== undefined && (
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connected ? 'var(--green)' : 'var(--red)',
              }}
            />
            {connected ? 'Live' : 'Offline'}
          </div>
        )}
      </div>
    </div>
  );
}
