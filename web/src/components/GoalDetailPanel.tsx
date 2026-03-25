'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { TaskGoal, Task, TaskMilestone, TaskEpisode } from '@/lib/api';
import {
  getTaskMilestones,
  createTaskMilestone,
  updateTaskMilestone,
  deleteTaskMilestone,
  getTaskEpisodes,
  deleteTaskEpisode,
} from '@/lib/api';
import type { GoalUpdates } from '@/components/GoalStrip';

interface AgentItem {
  id: string;
  name: string;
  status?: string;
}

const GOAL_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#f59e0b',
  '#ec4899',
];

const PRIORITY_LABEL: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const STATUS_LABEL: Record<string, string> = {
  active: '진행 중',
  completed: '완료',
  archived: '보관됨',
};

const TASK_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  in_progress: '진행 중',
  completed: '완료',
};


interface Props {
  goal: TaskGoal | null;
  tasks: Task[];
  agents: AgentItem[];
  onClose: () => void;
  onUpdateGoal: (id: string, updates: GoalUpdates) => void;
  onDeleteGoal: (id: string) => void;
}

// ── Inline editable title ──
function EditableTitle({ value, color, onSave }: { value: string; color: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        autoFocus
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--accent)',
          outline: 'none',
          width: '100%',
          lineHeight: 1.3,
          padding: 0,
        }}
      />
    );
  }

  return (
    <h2
      onClick={() => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 10); }}
      title="클릭하여 편집"
      style={{
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: 0,
        lineHeight: 1.3,
        cursor: 'text',
      }}
    >
      {value}
    </h2>
  );
}

// ── Inline editable description ──
function EditableDescription({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        autoFocus
        rows={2}
        style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--border-subtle)',
          outline: 'none',
          width: '100%',
          resize: 'none',
          marginLeft: '18px',
          padding: 0,
        }}
      />
    );
  }

  if (!value) {
    return (
      <span
        onClick={() => setEditing(true)}
        style={{
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          marginLeft: '18px',
          cursor: 'text',
          fontStyle: 'italic',
        }}
      >
        + 설명 추가
      </span>
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
      style={{
        fontSize: '13px',
        color: 'var(--text-tertiary)',
        margin: 0,
        marginLeft: '18px',
        cursor: 'text',
      }}
    >
      {value}
    </p>
  );
}

// ── Inline color picker dot ──
function ColorDot({ color, onSave }: { color: string; onSave: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="색상 변경"
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color || 'var(--accent)',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
        }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: 0,
            display: 'flex',
            gap: '6px',
            padding: '8px 10px',
            background: 'var(--bg-elevated)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          {GOAL_COLORS.map(c => (
            <button
              key={c}
              onClick={() => { onSave(c); setOpen(false); }}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: c,
                border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
                outline: 'none',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline priority badge ──
function EditablePriority({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
          background: value === 'high' ? 'var(--red-soft)' : 'var(--bg-elevated)',
          color: value === 'high' ? 'var(--red)' : 'var(--text-secondary)',
          border: '1px solid transparent',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {PRIORITY_LABEL[value] ?? value} ▾
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '26px',
            left: 0,
            background: 'var(--bg-elevated)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {(['high', 'medium', 'low'] as const).map(p => (
            <button
              key={p}
              onClick={() => { onSave(p); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                textAlign: 'left',
                fontSize: '12px',
                background: value === p ? 'var(--accent-soft)' : 'transparent',
                color: value === p ? 'var(--accent)' : 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline date editor ──
function EditableDate({ value, onSave }: { value?: string; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ? value.slice(0, 10) : '');

  useEffect(() => { setDraft(value ? value.slice(0, 10) : ''); }, [value]);

  const now = new Date();
  const isOverdue = value ? new Date(value) < now : false;
  const daysLeft = value ? (new Date(value).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;
  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const isWarning = isOverdue || isSoon;

  if (editing) {
    return (
      <input
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          onSave(draft || null);
          setEditing(false);
        }}
        autoFocus
        style={{
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
          outline: 'none',
        }}
      />
    );
  }

  if (!value) {
    return (
      <span
        onClick={() => setEditing(true)}
        style={{
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-tertiary)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          fontStyle: 'italic',
        }}
      >
        + 기한 설정
      </span>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="클릭하여 기한 변경"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        background: 'var(--bg-elevated)',
        color: isWarning ? '#ef4444' : 'var(--text-tertiary)',
        border: '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      마감: {new Date(value).toLocaleDateString('ko-KR')}
      {isOverdue && (
        <span
          style={{
            padding: '1px 5px',
            borderRadius: '8px',
            fontSize: '10px',
            background: 'rgba(239,68,68,0.15)',
            color: '#ef4444',
          }}
        >
          기한 초과
        </span>
      )}
    </span>
  );
}

// ── Milestone section component ──
function MilestoneSection({ goalId }: { goalId: string }) {
  const [milestones, setMilestones] = useState<TaskMilestone[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await getTaskMilestones(goalId);
      setMilestones(data);
    } catch {
      // silently ignore if table doesn't exist yet
    }
  }, [goalId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (m: TaskMilestone) => {
    try {
      await updateTaskMilestone(m.id, {
        isCompleted: !m.isCompleted,
        completedAt: m.isCompleted ? null : new Date().toISOString(),
      });
      load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTaskMilestone(id);
      load();
    } catch { /* ignore */ }
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) { setAdding(false); return; }
    try {
      await createTaskMilestone(goalId, title);
      setNewTitle('');
      setAdding(false);
      load();
    } catch { /* ignore */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
  };

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 30);
  }, [adding]);

  const completedCount = milestones.filter(m => m.isCompleted).length;

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3
          style={{
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-tertiary)',
            margin: 0,
          }}
        >
          마일스톤 {milestones.length > 0 && '(' + completedCount + '/' + milestones.length + ')'}
        </h3>
      </div>

      {milestones.length === 0 && !adding && (
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '0 0 6px' }}>없음</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {milestones.map(m => (
          <div
            key={m.id}
            className="group"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}
          >
            {/* Checkbox */}
            <button
              onClick={() => handleToggle(m)}
              style={{
                flexShrink: 0,
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                border: m.isCompleted ? 'none' : '1.5px solid var(--border-subtle)',
                background: m.isCompleted ? 'var(--green)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                outline: 'none',
              }}
            >
              {m.isCompleted && (
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>

            {/* Title */}
            <span
              style={{
                flex: 1,
                fontSize: '13px',
                color: m.isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)',
                textDecoration: m.isCompleted ? 'line-through' : 'none',
              }}
            >
              {m.title}
            </span>

            {/* Delete — hover only */}
            <button
              onClick={() => handleDelete(m.id)}
              className="opacity-0 group-hover:opacity-100"
              style={{
                flexShrink: 0,
                padding: '1px 4px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '13px',
                lineHeight: 1,
                borderRadius: '4px',
                transition: 'opacity 0.1s ease',
              }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Inline add input */}
        {adding && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
            <div
              style={{
                flexShrink: 0,
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                border: '1.5px solid var(--border-subtle)',
                background: 'transparent',
              }}
            />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAdd}
              placeholder="마일스톤 입력..."
              style={{
                flex: 1,
                fontSize: '13px',
                color: 'var(--text-primary)',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                outline: 'none',
                padding: '0 0 2px',
              }}
            />
          </div>
        )}
      </div>

      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          + 마일스톤 추가
        </button>
      )}
    </div>
  );
}

// ── Episode history section (series goals) ──
function EpisodeSection({ goalId }: { goalId: string }) {
  const [episodes, setEpisodes] = useState<TaskEpisode[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await getTaskEpisodes(goalId);
      setEpisodes(data);
    } catch { /* silently ignore */ }
  }, [goalId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTaskEpisode(id);
      load();
    } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
      <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
        에피소드 기록 ({episodes.length})
      </h3>
      {episodes.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>아직 기록이 없습니다</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '200px', overflowY: 'auto' }}>
          {episodes.map(ep => (
            <div
              key={ep.id}
              className="group"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '32px' }}>
                {ep.episodeNumber}회
              </span>
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>
                {ep.title || ep.episodeNumber + '회차'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {new Date(ep.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
              </span>
              <button
                onClick={() => handleDelete(ep.id)}
                className="opacity-0 group-hover:opacity-100"
                style={{ flexShrink: 0, padding: '1px 4px', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '13px', lineHeight: 1, borderRadius: '4px', transition: 'opacity 0.1s ease' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GoalDetailPanel({ goal, tasks, agents, onClose, onUpdateGoal, onDeleteGoal }: Props) {
  const isOpen = goal !== null;

  const goalTasks = goal ? tasks.filter(t => t.goalId === goal.id) : [];
  const meTasks = goalTasks.filter(t => !t.assigneeType || t.assigneeType === 'me');
  const agentTasks = goalTasks.filter(t => t.assigneeType === 'agent');

  const totalTasks = goalTasks.length;
  const completedCount = goalTasks.filter(t => t.status === 'completed').length;
  const progress = totalTasks > 0 ? Math.min(Math.round((completedCount / totalTasks) * 100), 100) : 0;

  const getAgentName = (agentId?: string) => {
    if (!agentId) return '에이전트';
    return agents.find(a => a.id === agentId)?.name ?? '에이전트';
  };

  const save = (updates: GoalUpdates) => {
    if (!goal) return;
    onUpdateGoal(goal.id, updates);
  };

  const handleComplete = () => {
    if (!goal) return;
    onUpdateGoal(goal.id, {
      status: goal.status === 'completed' ? 'active' : 'completed',
      completedAt: goal.status === 'completed' ? null : new Date().toISOString(),
    });
  };

  const handleDelete = () => {
    if (!goal) return;
    if (confirm('"' + goal.title + '" 목표를 삭제하시겠습니까?')) {
      onDeleteGoal(goal.id);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-primary)',
          opacity: isOpen ? 0.5 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 49,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100%',
          width: '420px',
          zIndex: 50,
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
        }}
      >
        {goal && (
          <>
            {/* Header */}
            <div
              style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Title row with color dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ColorDot
                    color={goal.color || '#8b5cf6'}
                    onSave={c => save({ color: c })}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EditableTitle
                      value={goal.title}
                      color={goal.color || '#8b5cf6'}
                      onSave={v => save({ title: v })}
                    />
                  </div>
                </div>
                {/* Description */}
                <EditableDescription
                  value={goal.description || ''}
                  onSave={v => save({ description: v })}
                />
              </div>
              <button
                onClick={onClose}
                style={{
                  flexShrink: 0,
                  padding: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Meta — all inline-editable */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {/* Status (read-only badge, changed via complete button) */}
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {STATUS_LABEL[goal.status] ?? goal.status}
              </span>

              {/* Priority — inline dropdown */}
              <EditablePriority
                value={goal.priority}
                onSave={v => save({ priority: v })}
              />

              {/* Target date — inline */}
              <EditableDate
                value={goal.targetDate}
                onSave={v => save({ targetDate: v })}
              />
            </div>

            {/* Progress */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>달성률</span>
                <span style={{ fontSize: '22px', fontWeight: 700, color: goal.color || 'var(--accent)' }}>
                  {progress}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'var(--bg-elevated)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: '4px',
                    width: progress + '%',
                    background: progress >= 100 ? 'var(--green)' : goal.color || 'var(--accent)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
                {completedCount} / {totalTasks} 완료
              </p>
            </div>

            {/* Milestones */}
            <MilestoneSection goalId={goal.id} />

            {/* Episode history — series goals only */}
            {goal.goalType === 'series' && (
              <EpisodeSection goalId={goal.id} />
            )}

            {/* My tasks */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
                내 할 일 ({meTasks.length})
              </h3>
              {meTasks.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>없음</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {meTasks.map(task => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-elevated)',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: task.status === 'completed' ? 'var(--green)' : 'var(--text-tertiary)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: '13px',
                          color: task.status === 'completed' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.title}
                      </span>
                      {task.status === 'completed' && (
                        <span style={{ fontSize: '11px', color: 'var(--green)', flexShrink: 0 }}>
                          완료
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent tasks */}
            <div style={{ padding: '16px 20px', flex: 1 }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
                에이전트 할 일 ({agentTasks.length})
              </h3>
              {agentTasks.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>없음</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {agentTasks.map(task => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-elevated)',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: task.status === 'completed' ? 'var(--green)' : 'var(--blue)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: '13px',
                          color: task.status === 'completed' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--blue)', flexShrink: 0 }}>
                        {getAgentName(task.assigneeAgentId)}
                      </span>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          background: task.status === 'completed' ? 'var(--green-soft)' : task.status === 'in_progress' ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                          color: task.status === 'completed' ? 'var(--green)' : task.status === 'in_progress' ? 'var(--accent)' : 'var(--text-tertiary)',
                          flexShrink: 0,
                        }}
                      >
                        {TASK_STATUS_LABEL[task.status] ?? task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '8px',
              }}
            >
              <button
                onClick={handleComplete}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: goal.status === 'completed' ? 'var(--btn-secondary)' : 'var(--btn-primary)',
                  color: goal.status === 'completed' ? 'var(--btn-secondary-text)' : 'var(--btn-primary-text)',
                }}
              >
                {goal.status === 'completed' ? '다시 활성화' : '완료 처리'}
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid var(--red-soft)',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--red)',
                }}
              >
                삭제
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
