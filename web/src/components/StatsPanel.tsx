'use client';

import type { PomoTask, PomoGoal } from '@/lib/api';

interface Props {
  tasks: PomoTask[];
  goals: PomoGoal[];
}

export default function StatsPanel({ tasks, goals }: Props) {
  const activeGoals = goals.filter(g => g.status === 'active');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const highPriorityPending = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
  const agentTasks = tasks.filter(t => t.assigneeType === 'agent').length;
  const myTasks = totalTasks - agentTasks;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          통계
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          전체 {totalTasks}개
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={completedTasks} label="완료" color="var(--green)" />
        <StatCard value={pendingTasks} label="진행 중" color="var(--accent)" />
        <StatCard value={completionRate + '%'} label="달성률" color="var(--blue)" />
      </div>

      {/* Sub stats */}
      {(highPriorityPending > 0 || agentTasks > 0) && (
        <div className="flex items-center gap-4">
          {highPriorityPending > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--red)' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                높은 우선순위 {highPriorityPending}개
              </span>
            </div>
          )}
          {agentTasks > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--blue)' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                에이전트 {agentTasks}개 · 나 {myTasks}개
              </span>
            </div>
          )}
        </div>
      )}

      {/* Goal progress */}
      {activeGoals.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>
            목표별 진행률
          </p>
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const goalTasks = tasks.filter(t => t.goalId === goal.id);
              const goalCompleted = goalTasks.filter(t => t.status === 'completed').length;
              const goalTotal = goalTasks.length;
              const pct = goalTotal > 0 ? Math.round((goalCompleted / goalTotal) * 100) : 0;

              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: goal.color || 'var(--accent)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {goal.title}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {goalCompleted}/{goalTotal} · {pct}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: pct + '%',
                        background: pct === 100 ? 'var(--green)' : (goal.color || 'var(--accent)'),
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeGoals.length === 0 && totalTasks === 0 && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
          할 일과 목표를 추가하면 통계가 여기에 표시됩니다
        </p>
      )}
    </div>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center py-4 rounded-xl text-center"
      style={{ background: 'var(--bg-page, var(--bg-tertiary))' }}
    >
      <span className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
    </div>
  );
}
