'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Code2, Video, Settings, Palette, BookOpen, MoreHorizontal, Target } from 'lucide-react';
import type { TaskGoal, Task, TaskProject } from '@/lib/api';
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
  goalType?: string;
  targetDate?: string;
  color?: string;
  projectId?: string;
  episodeTarget?: string;
  category?: string;
}

const GOAL_CATEGORIES = [
  { value: '', label: '없음' },
  { value: 'dev', label: '개발' },
  { value: 'video', label: '영상' },
  { value: 'ops', label: '운영' },
  { value: 'design', label: '디자인' },
  { value: 'study', label: '학습' },
  { value: 'etc', label: '기타' },
];

function CategoryIcon({ category, size = 14, color }: { category?: string; size?: number; color?: string }) {
  const style = { color: color || 'var(--text-tertiary)', flexShrink: 0 } as const;
  switch (category) {
    case 'dev': return <Code2 size={size} style={style} />;
    case 'video': return <Video size={size} style={style} />;
    case 'ops': return <Settings size={size} style={style} />;
    case 'design': return <Palette size={size} style={style} />;
    case 'study': return <BookOpen size={size} style={style} />;
    case 'etc': return <MoreHorizontal size={size} style={style} />;
    default: return <Target size={size} style={style} />;
  }
}

interface GoalCardProps {
  goal: TaskGoal;
  tasks: Task[];
  isSelected: boolean;
  onSelect: () => void;
  onOpenDetail?: (goal: TaskGoal) => void;
  onDoubleClick?: () => void;
}

function GoalCard({ goal, tasks, isSelected, onSelect, onOpenDetail, onDoubleClick }: GoalCardProps) {
  const goalTasks = tasks.filter(t => t.goalId === goal.id);
  const completedCount = goalTasks.filter(t => t.status === 'completed').length;
  const totalCount = goalTasks.length;
  const progress = totalCount > 0 ? Math.min(completedCount / totalCount, 1) : 0;
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
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.(); }}
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
        {/* Title + Category icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <CategoryIcon category={goal.category} size={15} color={goal.color || '#6366f1'} />
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {goal.title}
          </div>
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
              {isOverdue ? new Date(goal.targetDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' 초과' : '기한: ' + new Date(goal.targetDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
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

export type GoalUpdates = Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  goalType: string;
  targetDate: string | null;
  color: string;
  sortOrder: number;
  completedAt: string | null;
  projectId: string | null;
  episodeCount: number;
  episodeTarget: string | null;
  lastEpisodeAt: string | null;
  category: string | null;
}>;

// ── Goal Edit Modal ──
function GoalEditModal({
  goal,
  projects,
  onSave,
  onClose,
}: {
  goal: TaskGoal;
  projects: TaskProject[];
  onSave: (id: string, updates: GoalUpdates) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [desc, setDesc] = useState(goal.description || '');
  const [priority, setPriority] = useState<string>(goal.priority);
  const [targetDate, setTargetDate] = useState(goal.targetDate?.slice(0, 10) || '');
  const [color, setColor] = useState(goal.color || GOAL_COLORS[0]);
  const [projectId, setProjectId] = useState(goal.projectId || '');
  const [episodeTarget, setEpisodeTarget] = useState(goal.episodeTarget || '');
  const [goalType, setGoalType] = useState<'achievement' | 'series'>(goal.goalType);
  const [category, setCategory] = useState(goal.category || '');
  const isSeries = goalType === 'series';
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    if (!title.trim()) return;
    const updates: GoalUpdates = {};
    if (title.trim() !== goal.title) updates.title = title.trim();
    if (desc !== (goal.description || '')) updates.description = desc;
    if (priority !== goal.priority) updates.priority = priority;
    const newDate = targetDate || null;
    const oldDate = goal.targetDate?.slice(0, 10) || null;
    if (newDate !== oldDate) updates.targetDate = newDate;
    if (color !== (goal.color || GOAL_COLORS[0])) updates.color = color;
    const newProjId = projectId || null;
    const oldProjId = goal.projectId || null;
    if (newProjId !== oldProjId) updates.projectId = newProjId;
    if (goalType !== goal.goalType) updates.goalType = goalType;
    const newCat = category || null;
    const oldCat = goal.category || null;
    if (newCat !== oldCat) updates.category = newCat;
    if (isSeries) {
      const newEpTarget = episodeTarget || null;
      const oldEpTarget = goal.episodeTarget || null;
      if (newEpTarget !== oldEpTarget) updates.episodeTarget = newEpTarget;
    }
    if (Object.keys(updates).length > 0) {
      onSave(goal.id, updates);
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 999,
          backdropFilter: 'blur(2px)',
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '480px',
          maxWidth: '92vw',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          zIndex: 1000,
          overflow: 'hidden',
        }}
      >
        {/* Header with color accent */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>목표 수정</span>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>제목</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSave(); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>설명</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="목표에 대한 설명을 입력하세요"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Type toggle */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>유형</label>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '3px' }}>
              {([['achievement', '달성형'], ['series', '시리즈형']] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setGoalType(type)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: goalType === type ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    background: goalType === type ? 'var(--bg-elevated)' : 'transparent',
                    color: goalType === type ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: goalType === type ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Project + Category + Priority + Date/EpisodeTarget row */}
          <div style={{ display: 'flex', gap: '14px' }}>
            {projects.length > 0 && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>프로젝트</label>
                <CustomSelect
                  size="md"
                  value={projectId}
                  options={[
                    { value: '', label: '없음' },
                    ...projects.map(p => ({ value: p.id, label: p.name, color: p.color })),
                  ]}
                  onChange={setProjectId}
                />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>카테고리</label>
              <CustomSelect
                size="md"
                value={category}
                options={GOAL_CATEGORIES}
                onChange={setCategory}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>우선순위</label>
              <CustomSelect
                size="md"
                value={priority}
                options={[
                  { value: 'high', label: '높음', color: 'var(--red)' },
                  { value: 'medium', label: '보통', color: 'var(--yellow)' },
                  { value: 'low', label: '낮음' },
                ]}
                onChange={setPriority}
              />
            </div>
            {isSeries ? (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>목표 주기</label>
                <input
                  value={episodeTarget}
                  onChange={e => setEpisodeTarget(e.target.value)}
                  placeholder="예: 주 3회"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>기한</label>
                <CustomDatePicker
                  size="md"
                  value={targetDate}
                  onChange={setTargetDate}
                  placeholder="기한 선택"
                />
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>색상</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {GOAL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0,
                    transition: 'border-color 0.15s, transform 0.15s',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              background: 'var(--btn-secondary)',
              color: 'var(--btn-secondary-text)',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{
              padding: '9px 24px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              background: title.trim() ? 'var(--btn-primary)' : 'var(--bg-tertiary)',
              color: title.trim() ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
              cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            저장
          </button>
        </div>
      </div>
    </>
  );
}

interface Props {
  goals: TaskGoal[];
  tasks: Task[];
  projects: TaskProject[];
  selectedGoalId: string | null;
  selectedProjectId: string | null;
  onSelectGoal: (id: string | null) => void;
  onSelectProject: (id: string | null) => void;
  onCreateGoal: (input: CreateGoalInput) => void;
  onUpdateGoal: (id: string, updates: GoalUpdates) => void;
  onAddEpisode?: (goalId: string) => void;
  onOpenDetail?: (goal: TaskGoal) => void;
}

export default function GoalStrip({ goals, tasks, projects, selectedGoalId, selectedProjectId, onSelectGoal, onSelectProject, onCreateGoal, onUpdateGoal, onAddEpisode, onOpenDetail }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formDate, setFormDate] = useState('');
  const [formColor, setFormColor] = useState(GOAL_COLORS[0]);
  const [formGoalType, setFormGoalType] = useState<'achievement' | 'series'>('achievement');
  const [formEpisodeTarget, setFormEpisodeTarget] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [editingGoal, setEditingGoal] = useState<TaskGoal | null>(null);

  // Filter goals by selected project
  const filteredGoals = useMemo(() => {
    if (!selectedProjectId) return goals;
    return goals.filter(g => g.projectId === selectedProjectId);
  }, [goals, selectedProjectId]);
  const titleRef = useRef<HTMLInputElement>(null);

  const goalStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const goal of filteredGoals) {
      map.set(goal.id, { total: 0, completed: 0 });
    }
    for (const task of tasks) {
      if (!task.goalId) continue;
      const stat = map.get(task.goalId);
      if (!stat) continue;
      stat.total++;
      if (task.status === 'completed') stat.completed++;
    }
    return map;
  }, [filteredGoals, tasks]);

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
      goalType: formGoalType,
      targetDate: formGoalType === 'achievement' ? (formDate || undefined) : undefined,
      color: formColor,
      projectId: selectedProjectId || undefined,
      episodeTarget: formGoalType === 'series' ? (formEpisodeTarget || undefined) : undefined,
      category: formCategory || undefined,
    });
    setShowForm(false);
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormDate('');
    setFormColor(GOAL_COLORS[0]);
    setFormGoalType('achievement');
    setFormEpisodeTarget('');
    setFormCategory('');
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
    return filteredGoals.filter(goal => {
      const goalTasks = tasks.filter(t => t.goalId === goal.id);
      if (goalTasks.length === 0) return false;
      return goalTasks.every(t => t.status === 'completed');
    }).length;
  }, [filteredGoals, tasks]);

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
          {filteredGoals.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {filteredGoals.length}개 중 {completedGoalsCount}개 완료
            </span>
          )}
        </div>

        {/* View toggle — only show when there are goals */}
        {filteredGoals.length > 0 && (
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

      {/* Project tabs */}
      {projects.length > 0 && (
        <div className="flex items-center gap-1 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => onSelectProject(null)}
            className="text-xs px-2.5 py-1 rounded-md transition-all flex-shrink-0"
            style={{
              background: !selectedProjectId ? 'var(--accent-soft)' : 'transparent',
              color: !selectedProjectId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: !selectedProjectId ? 600 : 400,
            }}
          >
            전체
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProject(selectedProjectId === p.id ? null : p.id)}
              className="text-xs px-2.5 py-1 rounded-md transition-all flex-shrink-0 flex items-center gap-1.5"
              style={{
                background: selectedProjectId === p.id ? 'var(--accent-soft)' : 'transparent',
                color: selectedProjectId === p.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: selectedProjectId === p.id ? 600 : 400,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredGoals.length === 0 && !showForm && (
        <div className="mb-3 py-4">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            목표를 추가하면 진행률을 추적할 수 있습니다
          </p>
        </div>
      )}

      {/* List view — 2-line card with color bar */}
      {filteredGoals.length > 0 && viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {filteredGoals.map(goal => {
            const stat = goalStats.get(goal.id) ?? { total: 0, completed: 0 };
            const progress = stat.total > 0 ? Math.min(stat.completed / stat.total, 1) : 0;
            const pct = Math.round(progress * 100);
            const isSelected = selectedGoalId === goal.id;
            const barColor = progress >= 1 ? 'var(--green)' : goal.color || 'var(--accent)';
            const dueSoon = isDueSoon(goal.targetDate);
            const goalTasks = tasks.filter(t => t.goalId === goal.id);
            const completedCount = goalTasks.filter(t => t.status === 'completed').length;

            // Deadline info
            let deadlineLabel = '';
            let deadlineOverdue = false;
            let deadlineSoon = false;
            if (goal.targetDate) {
              const now = new Date();
              const target = new Date(goal.targetDate);
              const daysLeft = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              deadlineOverdue = daysLeft < 0;
              deadlineSoon = dueSoon;
              deadlineLabel = deadlineOverdue
                ? target.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' 초과'
                : daysLeft === 0
                ? 'D-Day'
                : daysLeft <= 7
                ? 'D-' + daysLeft
                : target.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
            }

            return (
              <div
                key={goal.id}
                className="group cursor-pointer transition-all"
                style={{
                  borderRadius: '8px',
                  background: isSelected ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'background 0.15s',
                }}
                onClick={() => handleRowClick(goal.id)}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingGoal(goal); }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isSelected ? 'var(--bg-hover)' : 'var(--bg-elevated)'; }}
              >
                  {/* Row 1: Title + deadline + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CategoryIcon category={goal.category} size={14} color={goal.color || '#6366f1'} />
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {goal.title}
                    </span>

                    {deadlineLabel && (
                      <span
                        className="flex-shrink-0"
                        style={{
                          fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px',
                          color: deadlineOverdue ? '#991b1b' : deadlineSoon ? '#dc2626' : 'var(--text-secondary)',
                          background: deadlineOverdue ? '#fecaca' : deadlineSoon ? 'rgba(239,68,68,0.08)' : 'var(--bg-tertiary)',
                        }}
                      >
                        {deadlineLabel}
                      </span>
                    )}

                    {onOpenDetail && (
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); onOpenDetail(goal); }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        style={{ color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                        title="상세 보기"
                      >
                        ›
                      </span>
                    )}
                  </div>

                  {/* Row 2: Progress (achievement) or Episode info (series) */}
                  {goal.goalType === 'series' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: '11px', fontWeight: 600,
                          color: goal.color || '#6366f1',
                          background: (goal.color || '#6366f1') + '15',
                          padding: '2px 8px', borderRadius: '6px',
                        }}
                      >
                        {goal.episodeCount}회
                      </span>
                      {goal.episodeTarget && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>목표 {goal.episodeTarget}</span>
                      )}
                      {goal.lastEpisodeAt && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          · 최근 {new Date(goal.lastEpisodeAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                        </span>
                      )}
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onAddEpisode ? onAddEpisode(goal.id) : onUpdateGoal(goal.id, { episodeCount: goal.episodeCount + 1, lastEpisodeAt: new Date().toISOString() });
                        }}
                        style={{ padding: '3px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: 'none', background: goal.color || '#6366f1', color: '#fff', cursor: 'pointer' }}
                      >
                        +1
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '2px', width: pct + '%', background: barColor, transition: 'width 0.4s ease' }} />
                      </div>
                      <span className="tabular-nums flex-shrink-0" style={{ fontSize: '12px', fontWeight: 600, color: barColor, minWidth: '32px', textAlign: 'right' }}>
                        {pct}%
                      </span>
                      {goalTasks.length > 0 && (
                        <span className="flex-shrink-0" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {completedCount}/{goalTasks.length}
                        </span>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* Card view — grid */}
      {filteredGoals.length > 0 && viewMode === 'card' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '12px',
          }}
        >
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              tasks={tasks}
              isSelected={selectedGoalId === goal.id}
              onSelect={() => handleRowClick(goal.id)}
              onOpenDetail={onOpenDetail}
              onDoubleClick={() => setEditingGoal(goal)}
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

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '2px' }}>
              {([['achievement', '달성형'], ['series', '시리즈형']] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormGoalType(type)}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: formGoalType === type ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    background: formGoalType === type ? 'var(--bg-elevated)' : 'transparent',
                    color: formGoalType === type ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: formGoalType === type ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

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
              {/* Category */}
              <CustomSelect
                size="sm"
                value={formCategory}
                options={GOAL_CATEGORIES}
                onChange={setFormCategory}
                placeholder="카테고리"
              />

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

              {/* Date or Episode target */}
              {formGoalType === 'achievement' ? (
                <CustomDatePicker
                  size="sm"
                  value={formDate}
                  onChange={setFormDate}
                  placeholder="기한"
                />
              ) : (
                <input
                  value={formEpisodeTarget}
                  onChange={e => setFormEpisodeTarget(e.target.value)}
                  placeholder="목표 주기 (예: 주 3회)"
                  className="text-xs outline-none rounded-md"
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    width: '120px',
                  }}
                />
              )}

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
                className="text-xs px-3 py-1.5 rounded-md transition-colors"
                style={{ color: 'var(--btn-secondary-text)', background: 'var(--btn-secondary)' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!formTitle.trim()}
                className="text-xs px-3 py-1.5 rounded-md transition-all font-medium"
                style={{
                  background: formTitle.trim() ? 'var(--btn-primary)' : 'var(--bg-tertiary)',
                  color: formTitle.trim() ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
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

      {/* Edit modal */}
      {editingGoal && (
        <GoalEditModal
          goal={editingGoal}
          projects={projects}
          onSave={onUpdateGoal}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  );
}
