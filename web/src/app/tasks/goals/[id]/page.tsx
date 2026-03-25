'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TaskItem from '@/components/TaskItem';
import { PlusIcon } from '@/components/Icons';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';
import UndoToast, { useUndo } from '@/components/UndoToast';
import { Code2, Video, Settings, Palette, BookOpen, MoreHorizontal, Target, ArrowLeft } from 'lucide-react';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  type TaskProject, type Task, type TaskGoal, type TaskEpisode,
  getTaskProjects, getTasks,
  createTask, updateTask, deleteTask,
  getTaskGoals, updateTaskGoal, deleteTaskGoal,
  createTaskEpisode, getTaskEpisodes,
  reorderTasks,
} from '@/lib/api';

// ── Constants ──

const GOAL_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ec4899',
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

// ── Category icon ──

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

// ── Sortable wrapper ──

function SortableTaskItem(props: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative' }}
      {...attributes}
      {...listeners}
    >
      {props.children}
    </div>
  );
}

// ── Episode Section ──

function EpisodeSection({ goalId }: { goalId: string }) {
  const [episodes, setEpisodes] = useState<TaskEpisode[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await getTaskEpisodes(goalId);
      setEpisodes(data);
    } catch { /* silently ignore */ }
  }, [goalId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
        에피소드 기록 ({episodes.length})
      </h3>
      {episodes.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>아직 기록이 없습니다</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
          {episodes.map(ep => (
            <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 2px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '36px' }}>
                #{ep.episodeNumber}
              </span>
              {ep.title && (
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{ep.title}</span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {new Date(ep.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Editable title ──

function EditableTitle({ value, onSave }: { value: string; onSave: (v: string) => void }) {
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
        className="text-xl font-bold tracking-tight bg-transparent outline-none w-full"
        style={{ color: 'var(--text-primary)', border: 'none', borderBottom: '1px solid var(--color-accent)' }}
      />
    );
  }

  return (
    <h1
      onClick={() => { setDraft(value); setEditing(true); }}
      title="클릭하여 편집"
      className="text-xl font-bold tracking-tight cursor-text"
      style={{ color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}
    >
      {value}
    </h1>
  );
}

// ── Editable description ──

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
        className="text-sm bg-transparent outline-none w-full resize-none"
        style={{ color: 'var(--text-tertiary)', border: 'none', borderBottom: '1px solid var(--border-subtle)' }}
      />
    );
  }

  if (!value) {
    return (
      <span
        onClick={() => setEditing(true)}
        className="text-sm cursor-text"
        style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}
      >
        + 설명 추가
      </span>
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
      className="text-sm cursor-text"
      style={{ color: 'var(--text-tertiary)', margin: 0 }}
    >
      {value}
    </p>
  );
}

// ── Main Page ──

interface AgentItem {
  id: string;
  name: string;
  status?: string;
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<TaskGoal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<TaskGoal[]>([]);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const undo = useUndo();
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Quick add state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<'me' | 'agent'>('me');
  const [newTaskAgentId, setNewTaskAgentId] = useState('');
  const [quickAddExpanded, setQuickAddExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // Completed tasks collapsed
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, g, p, agentResult] = await Promise.all([
        getTasks(),
        getTaskGoals(),
        getTaskProjects(),
        fetch('http://localhost:3300/api/agents').then(r => r.json()).catch(() => ({ agents: [] })),
      ]);
      setTasks(t);
      setGoals(g);
      setProjects(p);
      setAgents(agentResult.agents || []);
      const found = g.find((gl: TaskGoal) => gl.id === goalId);
      setGoal(found || null);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => { load(); }, [load]);

  // Filtered tasks for this goal
  const goalTasks = useMemo(() => tasks.filter(t => t.goalId === goalId), [tasks, goalId]);
  const pendingTasks = useMemo(() => goalTasks.filter(t => t.status !== 'completed').sort((a, b) => a.sortOrder - b.sortOrder), [goalTasks]);
  const completedTasks = useMemo(() => goalTasks.filter(t => t.status === 'completed'), [goalTasks]);

  // Progress
  const totalCount = goalTasks.length;
  const completedCount = completedTasks.length;
  const progress = totalCount > 0 ? Math.min(completedCount / totalCount, 1) : 0;
  const progressPct = Math.round(progress * 100);

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || creating) return;

    const input: Parameters<typeof createTask>[0] = {
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      goalId: goalId,
    };

    if (newTaskDueDate) input.dueDate = newTaskDueDate;
    if (newTaskCategory.trim()) input.category = newTaskCategory.trim();
    input.assigneeType = newTaskAssignee;
    if (newTaskAssignee === 'agent' && newTaskAgentId) input.assigneeAgentId = newTaskAgentId;

    setCreating(true);
    try {
      await createTask(input);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      quickAddInputRef.current?.focus();
      await load();
    } catch (err) {
      console.error('할일 추가 실패:', err);
      alert('할일 추가에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const prevStatus = task.status;
    const prevCompletedAt = task.completedAt;
    if (task.status === 'completed') {
      await updateTask(task.id, { status: 'pending', completedAt: null });
    } else {
      await updateTask(task.id, { status: 'completed', completedAt: new Date().toISOString() });
    }
    load();
    undo.push({
      message: task.status === 'completed' ? '"' + task.title + '" 미완료로 변경됨' : '"' + task.title + '" 완료 처리됨',
      onUndo: async () => {
        await updateTask(task.id, { status: prevStatus, completedAt: prevCompletedAt ?? null });
        load();
      },
    });
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await deleteTask(id);
    load();
    undo.push({
      message: '"' + task.title + '" 삭제됨',
      onUndo: async () => {
        await createTask({
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          dueDate: task.dueDate,
          goalId: task.goalId,
          assigneeType: task.assigneeType,
          assigneeAgentId: task.assigneeAgentId,
          projectId: task.projectId,
          subprojectId: task.subprojectId,
        });
        load();
      },
    });
  };

  const handleUpdateTask = async (id: string, updates: Parameters<typeof updateTask>[1]) => {
    await updateTask(id, updates);
    load();
  };

  const handleReorderTasks = async (activeId: string, overId: string) => {
    const ids = pendingTasks.map(t => t.id);
    const oldIdx = ids.indexOf(activeId);
    const newIdx = ids.indexOf(overId);
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
    const reordered = [...ids];
    reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, activeId);
    const updates = reordered.map((id, i) => ({ id, sortOrder: (i + 1) * 1000 }));
    setTasks(prev => {
      const map = new Map(updates.map(u => [u.id, u.sortOrder]));
      return prev.map(t => map.has(t.id) ? { ...t, sortOrder: map.get(t.id)! } : t);
    });
    await reorderTasks(updates);
  };

  const handleAddEpisode = async () => {
    if (!goal) return;
    const newCount = goal.episodeCount + 1;
    await Promise.all([
      createTaskEpisode(goalId, newCount),
      updateTaskGoal(goalId, { episodeCount: newCount, lastEpisodeAt: new Date().toISOString() }),
    ]);
    load();
  };

  const handleUpdateGoal = async (updates: Parameters<typeof updateTaskGoal>[1]) => {
    await updateTaskGoal(goalId, updates);
    load();
  };

  const handleDeleteGoal = async () => {
    if (!confirm('이 목표를 삭제하시겠습니까?')) return;
    await deleteTaskGoal(goalId);
    router.push('/tasks');
  };

  // Options for quick add
  const priorityOptions = [
    { value: 'high', label: '높음', color: 'var(--red)' },
    { value: 'medium', label: '보통', color: 'var(--yellow)' },
    { value: 'low', label: '낮음' },
  ];

  const assigneeOptions = [
    { value: 'me', label: '나' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ];

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
        <div className="px-8 py-6 max-w-4xl">
          <div className="h-6 w-20 rounded bg-accent/10 mb-6" />
          <div className="h-8 w-64 rounded bg-accent/10 mb-4" />
          <div className="h-4 w-96 rounded bg-accent/10 mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-accent/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="animate-fade-in" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
        <div className="px-8 py-6 max-w-4xl">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ArrowLeft size={14} />
            목표
          </Link>
          <div className="text-center py-16">
            <Target size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>목표를 찾을 수 없습니다</p>
          </div>
        </div>
      </div>
    );
  }

  const barColor = progress >= 1 ? 'var(--green)' : goal.color || 'var(--color-accent)';

  // Deadline info
  const now = new Date();
  const isOverdue = goal.targetDate ? new Date(goal.targetDate) < now : false;
  const daysLeft = goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  let deadlineLabel = '';
  if (goal.targetDate) {
    if (isOverdue) {
      deadlineLabel = new Date(goal.targetDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' 초과';
    } else if (daysLeft === 0) {
      deadlineLabel = 'D-Day';
    } else if (daysLeft !== null && daysLeft <= 7) {
      deadlineLabel = 'D-' + daysLeft;
    } else if (goal.targetDate) {
      deadlineLabel = new Date(goal.targetDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
    }
  }

  return (
    <div className="animate-fade-in" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <div className="px-8 py-6 max-w-4xl">

        {/* Back button */}
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft size={14} />
          목표
        </Link>

        {/* Goal header card */}
        <div
          className="rounded-xl mb-6"
          style={{
            background: 'var(--bg-elevated)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
            overflow: 'hidden',
          }}
        >
          {/* Color bar at top */}
          <div style={{ height: '4px', background: goal.color || 'var(--color-accent)' }} />

          <div style={{ padding: '24px 28px' }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
              <CategoryIcon category={goal.category} size={20} color={goal.color || '#6366f1'} />
              <div style={{ flex: 1 }}>
                <EditableTitle value={goal.title} onSave={v => handleUpdateGoal({ title: v })} />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginLeft: '32px', marginBottom: '16px' }}>
              <EditableDescription value={goal.description} onSave={v => handleUpdateGoal({ description: v })} />
            </div>

            {/* Meta badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginLeft: '32px', marginBottom: '16px' }}>
              <span
                style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                  background: goal.priority === 'high' ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)',
                  color: goal.priority === 'high' ? '#ef4444' : 'var(--text-secondary)',
                }}
              >
                {PRIORITY_LABEL[goal.priority] ?? goal.priority}
              </span>
              <span
                style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                }}
              >
                {STATUS_LABEL[goal.status] ?? goal.status}
              </span>
              {goal.goalType === 'series' && (
                <span
                  style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                    background: (goal.color || '#6366f1') + '15', color: goal.color || '#6366f1',
                  }}
                >
                  시리즈
                </span>
              )}
              {deadlineLabel && (
                <span
                  style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    color: isOverdue ? '#991b1b' : isDueSoon ? '#dc2626' : 'var(--text-secondary)',
                    background: isOverdue ? '#fecaca' : isDueSoon ? 'rgba(239,68,68,0.08)' : 'var(--bg-secondary)',
                  }}
                >
                  {deadlineLabel}
                </span>
              )}
            </div>

            {/* Progress bar (achievement) or Episode info (series) */}
            <div style={{ marginLeft: '32px' }}>
              {goal.goalType === 'series' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '13px', fontWeight: 600,
                      color: goal.color || '#6366f1',
                      background: (goal.color || '#6366f1') + '15',
                      padding: '4px 12px', borderRadius: '8px',
                    }}
                  >
                    {goal.episodeCount}회
                  </span>
                  {goal.episodeTarget && (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>목표 {goal.episodeTarget}</span>
                  )}
                  {goal.lastEpisodeAt && (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      최근 {new Date(goal.lastEpisodeAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={handleAddEpisode}
                    style={{
                      padding: '5px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                      border: 'none', background: goal.color || '#6366f1', color: '#fff', cursor: 'pointer',
                    }}
                  >
                    +1 에피소드
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '3px', width: progressPct + '%', background: barColor, transition: 'width 0.4s ease' }} />
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: barColor, minWidth: '40px', textAlign: 'right' }}>
                      {progressPct}%
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {completedCount}/{totalCount} 완료
                  </span>
                </div>
              )}
            </div>

            {/* Actions row */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', marginLeft: '32px' }}>
              {goal.status === 'active' && (
                <button
                  onClick={() => handleUpdateGoal({ status: 'completed', completedAt: new Date().toISOString() })}
                  style={{
                    padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                    border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  완료로 변경
                </button>
              )}
              {goal.status === 'completed' && (
                <button
                  onClick={() => handleUpdateGoal({ status: 'active', completedAt: null })}
                  style={{
                    padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                    border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  다시 활성화
                </button>
              )}
              <button
                onClick={handleDeleteGoal}
                style={{
                  padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)',
                  color: '#ef4444', cursor: 'pointer',
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>

        {/* Episode section */}
        {goal.goalType === 'series' && (
          <div className="mb-6">
            <div
              className="rounded-xl"
              style={{
                background: 'var(--bg-elevated)',
                padding: '20px 24px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
              }}
            >
              <EpisodeSection goalId={goalId} />
            </div>
          </div>
        )}

        {/* Task list section */}
        <div
          className="rounded-xl"
          style={{
            background: 'var(--bg-elevated)',
            padding: '24px 28px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
          }}
        >
          {/* Quick add form */}
          <form onSubmit={handleCreateTask} className="mb-6">
            <div
              className="rounded-lg overflow-hidden transition-all"
              style={{
                background: quickAddExpanded ? 'var(--bg-secondary)' : 'transparent',
                boxShadow: quickAddExpanded ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <div className="flex items-center gap-3 px-2 py-3">
                <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex' }}><PlusIcon size={14} /></span>
                <input
                  ref={quickAddInputRef}
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onFocus={() => setQuickAddExpanded(true)}
                  placeholder="할 일 추가..."
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: 'var(--text-primary)', fontSize: '14px' }}
                />
                {/* Goal indicator */}
                {!quickAddExpanded && goal && (
                  <span className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: goal.color || '#6366f1' }} />
                    {goal.title}
                  </span>
                )}
                {newTaskTitle.trim() && (
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all flex-shrink-0"
                    style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)', opacity: creating ? 0.5 : 1 }}
                  >
                    {creating ? '추가 중...' : '추가'}
                  </button>
                )}
              </div>
              {quickAddExpanded && (
                <div
                  className="flex items-center gap-2 px-1 py-2 flex-wrap"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <CustomSelect
                    size="sm"
                    value={newTaskPriority}
                    options={priorityOptions}
                    onChange={setNewTaskPriority}
                  />
                  <CustomDatePicker
                    size="sm"
                    value={newTaskDueDate}
                    onChange={setNewTaskDueDate}
                    placeholder="날짜"
                  />
                  <input
                    value={newTaskCategory}
                    onChange={e => setNewTaskCategory(e.target.value)}
                    placeholder="카테고리"
                    className="px-2 py-1 rounded-md text-xs outline-none w-24"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                  <CustomSelect
                    size="sm"
                    value={newTaskAssignee === 'agent' ? newTaskAgentId : 'me'}
                    options={assigneeOptions}
                    onChange={val => {
                      if (val === 'me') {
                        setNewTaskAssignee('me');
                        setNewTaskAgentId('');
                      } else {
                        setNewTaskAssignee('agent');
                        setNewTaskAgentId(val);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setQuickAddExpanded(false)}
                    className="ml-auto text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    접기
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Task list header */}
          <div className="flex items-center gap-2 mb-4">
            <h3
              className="text-sm font-semibold flex-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              할 일 <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({pendingTasks.length})</span>
            </h3>
          </div>

          {/* Pending tasks */}
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (over && active.id !== over.id) handleReorderTasks(active.id as string, over.id as string);
            }}
          >
            <SortableContext items={pendingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {pendingTasks.map(t => (
                  <SortableTaskItem key={t.id} id={t.id}>
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <TaskItem
                          task={t}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDeleteTask}
                          onUpdate={handleUpdateTask}
                          goals={goals}
                          agents={agents}
                        />
                      </div>
                    </div>
                  </SortableTaskItem>
                ))}
                {pendingTasks.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>할 일이 없습니다</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      위에서 할 일을 추가해보세요
                    </p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-8 pb-2">
              <button
                className="flex items-center gap-1.5 mb-3 transition-colors"
                onClick={() => setCompletedExpanded(e => !e)}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  완료됨 <span style={{ fontWeight: 400 }}>({completedTasks.length})</span>
                </span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: 'var(--text-tertiary)',
                    transform: completedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {completedExpanded && (
                <div className="space-y-2">
                  {completedTasks.map(t => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteTask}
                      onUpdate={handleUpdateTask}
                      goals={goals}
                      agents={agents}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      <UndoToast entries={undo.entries} onRemove={undo.remove} />
    </div>
  );
}
