'use client';

import { useState, useRef, useMemo } from 'react';
import type { PomoGoal, PomoTask } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';

const GOAL_COLORS = [
  '#8b5cf6', // 보라 (기본)
  '#3b82f6', // 파랑
  '#10b981', // 초록
  '#ef4444', // 빨강
  '#f59e0b', // 주황
  '#ec4899', // 핑크
];

const PRIORITY_LABEL: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export interface CreateGoalInput {
  title: string;
  description?: string;
  priority?: string;
  targetDate?: string;
  color?: string;
}

interface GoalCardProps {
  goal: PomoGoal;
  tasks: PomoTask[];
  isSelected: boolean;
  onSelect: () => void;
  onOpenDetail?: (goal: PomoGoal) => void;
}

function GoalCard({ goal, tasks, isSelected, onSelect, onOpenDetail }: GoalCardProps) {
  const goalTasks = tasks.filter(t => t.goalId === goal.id);
  const completedCount = goalTasks.filter(t => t.status === 'completed').length;
  const totalEst = goalTasks.reduce((s, t) => s + t.estimatedPomodoros, 0);
  const totalComp = goalTasks.reduce((s, t) => s + t.completedPomodoros, 0);
  const progress = totalEst > 0 ? Math.min(totalComp / totalEst, 1) : 0;
  const progressPct = Math.round(progress * 100);
  const barColor = progress >= 1 ? 'var(--green)' : goal.color || 'var(--accent)';

  const meTasks = goalTasks.filter(t => !t.assigneeType || t.assigneeType === 'me');
  const agentTasks = goalTasks.filter(t => t.assigneeType === 'agent');

  const now = new Date();
  const isOverdue = goal.targetDate ? new Date(goal.targetDate) < now : false;
  const daysLeft = goal.targetDate ? (new Date(goal.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  const handleClick = () => {
    onSelect();
    if (onOpenDetail) onOpenDetail(goal);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'var(--bg-elevated)',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: isSelected ? '0 0 0 2px ' + (goal.color || 'var(--accent)') : 'none',
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
      }}
      onMouseEnter={e => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Top color bar */}
      <div style={{ height: '3px', background: goal.color || 'var(--accent)' }} />

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Title */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {goal.title}
        </div>

        {/* Progress bar */}
        <div>
          <div
            style={{
              width: '100%',
              height: '7px',
              borderRadius: '3px',
              background: 'var(--bg-tertiary)',
              overflow: 'hidden',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '3px',
                width: progressPct + '%',
                background: barColor,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {completedCount}/{goalTasks.length} 완료
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: barColor,
              }}
            >
              {progressPct}%
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          {goal.targetDate && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                color: (isOverdue || isDueSoon) ? '#ef4444' : 'var(--text-tertiary)',
              }}
            >
              {isOverdue ? '기한 초과' : '기한: ' + new Date(goal.targetDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
          )}
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              color: goal.priority === 'high' ? '#ef4444' : 'var(--text-tertiary)',
            }}
          >
            {PRIORITY_LABEL[goal.priority] ?? goal.priority}
          </span>
        </div>

        {/* Assignee counts */}
        {(meTasks.length > 0 || agentTasks.length > 0) && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {meTasks.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {'\uD83D\uDC64'}{meTasks.length}
              </span>
            )}
            {agentTasks.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {'\uD83E\uDD16'}{agentTasks.length}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// List/Grid toggle icons
function ListIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
    >
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
    >
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

interface Props {
  goals: PomoGoal[];
  tasks: PomoTask[];
  selectedGoalId: string | null;
  onSelectGoal: (id: string | null) => void;
  onCreateGoal: (input: CreateGoalInput) => void;
  onOpenDetail?: (goal: PomoGoal) => void;
}

export default function GoalStrip({ goals, tasks, selectedGoalId, onSelectGoal, onCreateGoal, onOpenDetail }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formDate, setFormDate] = useState('');
  const [formColor, setFormColor] = useState(GOAL_COLORS[0]);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const titleRef = useRef<HTMLInputElement>(null);

  const goalStats = useMemo(() => {
    const map = new Map<string, { totalEst: number; totalComp: number }>();
    for (const goal of goals) {
      map.set(goal.id, { totalEst: 0, totalComp: 0 });
    }
    for (const task of tasks) {
      if (!task.goalId) continue;
      const stat = map.get(task.goalId);
      if (!stat) continue;
      stat.totalEst += task.estimatedPomodoros;
      stat.totalComp += task.completedPomodoros;
    }
    return map;
  }, [goals, tasks]);

  const handlePlusClick = () => {
    setShowForm(true);
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormDate('');
    setFormColor(GOAL_COLORS[0]);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormTitle('');
  };

  const handleCreate = () => {
    if (!formTitle.trim()) return;
    onCreateGoal({
      title: formTitle.trim(),
      description: formDesc.trim() || undefined,
      priority: formPriority,
      targetDate: formDate || undefined,
      color: formColor,
    });
    setShowForm(false);
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormDate('');
    setFormColor(GOAL_COLORS[0]);
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleCancel();
  };

  const handleRowClick = (id: string) => {
    onSelectGoal(selectedGoalId === id ? null : id);
  };

  // 기한 임박 여부 계산
  const isDueSoon = (targetDate?: string): boolean => {
    if (!targetDate) return false;
    const now = new Date();
    const daysLeft = (new Date(targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 3;
  };

  // Compute completed goals count (all tasks completed)
  const completedGoalsCount = useMemo(() => {
    return goals.filter(goal => {
      const goalTasks = tasks.filter(t => t.goalId === goal.id);
      if (goalTasks.length === 0) return false;
      return goalTasks.every(t => t.status === 'completed');
    }).length;
  }, [goals, tasks]);

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            목표
          </span>
          {goals.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {goals.length}개 중 {completedGoalsCount}개 완료
            </span>
          )}
        </div>

        {/* View toggle — only show when there are goals */}
        {goals.length > 0 && (
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '3px',
                border: 'none',
                background: viewMode === 'list' ? 'var(--accent-soft)' : 'transparent',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="리스트 뷰"
            >
              <ListIcon active={viewMode === 'list'} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              style={{
                padding: '3px',
                border: 'none',
                background: viewMode === 'card' ? 'var(--accent-soft)' : 'transparent',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="카드 뷰"
            >
              <GridIcon active={viewMode === 'card'} />
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {goals.length === 0 && !showForm && (
        <div className="mb-3 py-4">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            목표를 추가하면 진행률을 추적할 수 있습니다
          </p>
        </div>
      )}

      {/* List view — inline progress list */}
      {goals.length > 0 && viewMode === 'list' && (
        <div className="space-y-2 mb-3">
          {goals.map(goal => {
            const stat = goalStats.get(goal.id) ?? { totalEst: 0, totalComp: 0 };
            const progress = stat.totalEst > 0 ? Math.min(stat.totalComp / stat.totalEst, 1) : 0;
            const isSelected = selectedGoalId === goal.id;
            const barColor = progress >= 1 ? 'var(--green)' : goal.color || 'var(--accent)';
            const dueSoon = isDueSoon(goal.targetDate);

            return (
              <div
                key={goal.id}
                className="group flex items-center gap-3 cursor-pointer rounded-lg transition-all"
                style={{
                  padding: '8px 10px',
                  background: isSelected ? 'var(--accent-soft)' : 'transparent',
                }}
                onClick={() => handleRowClick(goal.id)}
              >
                {/* Selected indicator dot */}
                <div
                  className="flex-shrink-0 w-2 h-2 rounded-full transition-all"
                  style={{
                    background: isSelected ? (goal.color || 'var(--accent)') : 'transparent',
                    border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                  }}
                />

                {/* Title */}
                <span
                  className="text-sm font-medium flex-shrink-0"
                  style={{
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    minWidth: '80px',
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {goal.title}
                </span>

                {/* Progress bar */}
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: '7px', background: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: (progress * 100) + '%',
                      background: barColor,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                {/* Percentage */}
                <span
                  className="flex-shrink-0 tabular-nums text-sm"
                  style={{ color: 'var(--text-tertiary)', minWidth: '32px', textAlign: 'right' }}
                >
                  {Math.round(progress * 100)}%
                </span>

                {/* Due soon indicator */}
                {dueSoon && (
                  <span
                    className="flex-shrink-0 text-[10px] leading-none"
                    style={{ color: 'var(--red, #ef4444)' }}
                    title="기한 임박"
                  >
                    ●
                  </span>
                )}

                {/* Detail chevron — hover only */}
                {onOpenDetail && (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); onOpenDetail(goal); }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-sm leading-none"
                    style={{ color: 'var(--text-tertiary)', cursor: 'pointer', paddingLeft: '2px' }}
                    title="상세 보기"
                  >
                    ›
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Card view — grid */}
      {goals.length > 0 && viewMode === 'card' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '12px',
          }}
        >
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              tasks={tasks}
              isSelected={selectedGoalId === goal.id}
              onSelect={() => handleRowClick(goal.id)}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}

      {/* Expanded create form */}
      {showForm && (
        <div
          className="mb-3 rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-elevated)' }}
          onKeyDown={handleFormKeyDown}
        >
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Title input */}
            <input
              ref={titleRef}
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="목표 이름 입력..."
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--text-primary)' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && formTitle.trim()) handleCreate();
              }}
            />

            {/* Description textarea */}
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="설명 (선택)"
              rows={1}
              className="bg-transparent text-xs outline-none w-full resize-none"
              style={{ color: 'var(--text-secondary)' }}
            />

            {/* Options row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Priority */}
              <CustomSelect
                size="sm"
                value={formPriority}
                options={[
                  { value: 'high', label: '높음', color: 'var(--red)' },
                  { value: 'medium', label: '보통', color: 'var(--yellow)' },
                  { value: 'low', label: '낮음' },
                ]}
                onChange={setFormPriority}
              />

              {/* Date */}
              <CustomDatePicker
                size="sm"
                value={formDate}
                onChange={setFormDate}
                placeholder="기한"
              />

              {/* Color dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '2px' }}>
                {GOAL_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: c,
                      border: formColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                      outline: 'none',
                      flexShrink: 0,
                      padding: 0,
                    }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs px-3 py-1 rounded-md transition-colors"
                style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!formTitle.trim()}
                className="text-xs px-3 py-1 rounded-md transition-all"
                style={{
                  background: formTitle.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: formTitle.trim() ? '#fff' : 'var(--text-tertiary)',
                  cursor: formTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <div className="flex justify-end">
          <button
            onClick={handlePlusClick}
            className="text-sm transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            + 목표 추가
          </button>
        </div>
      )}
    </div>
  );
}
