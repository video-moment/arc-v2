'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TaskItem from '@/components/TaskItem';
import StatsPanel from '@/components/StatsPanel';
import { PlusIcon } from '@/components/Icons';
import GoalStrip, { type CreateGoalInput } from '@/components/GoalStrip';
import GoalDetailPanel from '@/components/GoalDetailPanel';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  type TaskProject, type TaskSubproject, type Task, type TaskGoal,
  getTaskProjects, getTaskSubprojects,
  getTasks, createTask, updateTask, deleteTask,
  getTaskGoals, createTaskGoal, updateTaskGoal, deleteTaskGoal,
  createTaskProject, deleteTaskProject, updateTaskProject,
  createTaskEpisode, reorderTasks,
} from '@/lib/api';
import CalendarSidebar from '@/components/CalendarSidebar';
import UndoToast, { useUndo } from '@/components/UndoToast';

// Funnel icon
function FunnelIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );
}

// Bar chart icon
function ChartIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

interface AgentItem {
  id: string;
  name: string;
  status?: string;
}

function calcScore(task: Task): number {
  const now = new Date();
  let urgency = 0;
  if (task.dueDate) {
    const daysLeft = (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 0) urgency = 40;
    else if (daysLeft <= 1) urgency = 35;
    else if (daysLeft <= 3) urgency = 25;
    else if (daysLeft <= 7) urgency = 15;
  }
  const priorityScore = task.priority === 'high' ? 30 : task.priority === 'medium' ? 15 : 5;
  return urgency + priorityScore;
}

type FilterType = 'all' | 'high' | 'due_soon' | 'in_progress' | 'assignee_me' | 'assignee_agent';
type SortType = 'recommended' | 'priority' | 'due_date' | 'recent';

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

export default function TasksPage() {
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [subprojects, setSubprojects] = useState<TaskSubproject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<TaskGoal[]>([]);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [detailGoal, setDetailGoal] = useState<TaskGoal | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string | null>(null);
  const undo = useUndo();
  const [showStats, setShowStats] = useState(false);
  const [showInbox, setShowInbox] = useState(false);

  // Quick add state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskGoalId, setNewTaskGoalId] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<'me' | 'agent'>('me');
  const [newTaskAgentId, setNewTaskAgentId] = useState('');
  const [quickAddExpanded, setQuickAddExpanded] = useState(false);

  // Filter / Sort / Search
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Completed tasks collapsed by default
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const load = useCallback(async () => {
    const [p, sp, t, g, agentResult] = await Promise.all([
      getTaskProjects(), getTaskSubprojects(), getTasks(),
      getTaskGoals({ status: 'active' }),
      fetch('http://localhost:3300/api/agents').then(r => r.json()).catch(() => ({ agents: [] })),
    ]);
    setProjects(p);
    setSubprojects(sp);
    setTasks(t);
    setGoals(g);
    setAgents(agentResult.agents || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Quick add input ref for re-focus after submit
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // Goal completion notification
  const notifiedGoalsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    for (const goal of goals) {
      if (goal.status !== 'active') continue;
      const goalTasks = tasks.filter(t => t.goalId === goal.id);
      if (goalTasks.length === 0) continue;
      const allCompleted = goalTasks.every(t => t.status === 'completed');
      if (allCompleted && !notifiedGoalsRef.current.has(goal.id)) {
        notifiedGoalsRef.current.add(goal.id);
        if (Notification.permission === 'granted') {
          new Notification('목표 달성!', { body: '"' + goal.title + '"의 모든 할 일이 완료되었습니다.' });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              new Notification('목표 달성!', { body: '"' + goal.title + '"의 모든 할 일이 완료되었습니다.' });
            }
          });
        }
      }
    }
  }, [tasks, goals]);

  // Filtered tasks by project/inbox/goal selection
  const baseTasks = useMemo(() => {
    if (selectedGoalId) {
      return tasks.filter(t => t.goalId === selectedGoalId);
    }
    if (showInbox) {
      return tasks.filter(t => !t.projectId && !t.subprojectId);
    }
    if (selectedSubprojectId) {
      return tasks.filter(t => t.subprojectId === selectedSubprojectId);
    }
    if (selectedProjectId) {
      return tasks.filter(t => {
        if (t.projectId === selectedProjectId) return true;
        const subIds = subprojects.filter(s => s.projectId === selectedProjectId).map(s => s.id);
        return t.subprojectId !== undefined && t.subprojectId !== null && subIds.includes(t.subprojectId);
      });
    }
    return tasks;
  }, [tasks, showInbox, selectedProjectId, selectedSubprojectId, subprojects, selectedGoalId]);

  // Apply filter + search + sort
  const { pendingTasks, completedTasks } = useMemo(() => {
    const now = new Date();
    let pending = baseTasks.filter(t => t.status !== 'completed');
    const completed = baseTasks.filter(t => t.status === 'completed');

    // Filter
    if (filterType === 'high') {
      pending = pending.filter(t => t.priority === 'high');
    } else if (filterType === 'due_soon') {
      pending = pending.filter(t => {
        if (!t.dueDate) return false;
        const daysLeft = (new Date(t.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysLeft <= 3;
      });
    } else if (filterType === 'in_progress') {
      pending = pending.filter(t => t.status === 'in_progress');
    } else if (filterType === 'assignee_me') {
      pending = pending.filter(t => !t.assigneeType || t.assigneeType === 'me');
    } else if (filterType === 'assignee_agent') {
      pending = pending.filter(t => t.assigneeType === 'agent');
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pending = pending.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortType === 'recommended') {
      pending.sort((a, b) => calcScore(b) - calcScore(a));
    } else if (sortType === 'priority') {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      pending.sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
    } else if (sortType === 'due_date') {
      pending.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortType === 'recent') {
      pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return { pendingTasks: pending, completedTasks: completed };
  }, [baseTasks, filterType, sortType, searchQuery]);

  // Today dashboard summary (uses ALL tasks, not filtered)
  const todaySummary = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const threeDaysStr = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allPending = tasks.filter(t => t.status !== 'completed');
    return {
      todayDue: allPending.filter(t => t.dueDate?.startsWith(todayStr)).length,
      overdue: allPending.filter(t => t.dueDate && t.dueDate.slice(0, 10) < todayStr).length,
      upcoming: allPending.filter(t => t.dueDate && t.dueDate.slice(0, 10) > todayStr && t.dueDate.slice(0, 10) <= threeDaysStr).length,
      completedToday: tasks.filter(t => t.status === 'completed' && t.completedAt?.startsWith(todayStr)).length,
    };
  }, [tasks]);

  // Top recommended task IDs (for star marking)
  const recommendedIds = useMemo(() => {
    const sorted = [...tasks.filter(t => t.status !== 'completed')]
      .sort((a, b) => calcScore(b) - calcScore(a))
      .slice(0, 3);
    return new Set(sorted.map(t => t.id));
  }, [tasks]);

  // Handlers
  const [creating, setCreating] = useState(false);
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || creating) return;

    const input: Parameters<typeof createTask>[0] = {
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
    };

    if (newTaskDueDate) input.dueDate = newTaskDueDate;
    if (newTaskCategory.trim()) input.category = newTaskCategory.trim();
    if (newTaskGoalId) input.goalId = newTaskGoalId;
    input.assigneeType = newTaskAssignee;
    if (newTaskAssignee === 'agent' && newTaskAgentId) input.assigneeAgentId = newTaskAgentId;

    if (selectedSubprojectId) {
      input.subprojectId = selectedSubprojectId;
    } else if (selectedProjectId && !selectedGoalId) {
      input.projectId = selectedProjectId;
    }

    setCreating(true);
    try {
      await createTask(input);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      // Quick Add stays open — refocus for continuous entry
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
    // Optimistic: update local state
    setTasks(prev => {
      const map = new Map(updates.map(u => [u.id, u.sortOrder]));
      return prev.map(t => map.has(t.id) ? { ...t, sortOrder: map.get(t.id)! } : t);
    });
    await reorderTasks(updates);
  };

  const handleAddEpisode = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newCount = goal.episodeCount + 1;
    await Promise.all([
      createTaskEpisode(goalId, newCount),
      updateTaskGoal(goalId, { episodeCount: newCount, lastEpisodeAt: new Date().toISOString() }),
    ]);
    load();
  };

  const handleSelectGoal = (id: string | null) => {
    setSelectedGoalId(id);
    setNewTaskGoalId(id || '');
    if (id) {
      setShowInbox(false);
      setShowStats(false);
    }
  };

  const handleCreateGoal = async (input: CreateGoalInput) => {
    await createTaskGoal(input);
    load();
  };

  const handleUpdateGoal = async (id: string, updates: Parameters<typeof updateTaskGoal>[1]) => {
    await updateTaskGoal(id, updates);
    load();
  };

  const handleDeleteGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    await deleteTaskGoal(id);
    setDetailGoal(null);
    if (selectedGoalId === id) setSelectedGoalId(null);
    load();
    if (goal) {
      undo.push({
        message: '"' + goal.title + '" 목표 삭제됨',
        onUndo: async () => {
          await createTaskGoal({
            title: goal.title,
            description: goal.description,
            priority: goal.priority,
            goalType: goal.goalType,
            targetDate: goal.targetDate,
            color: goal.color,
            projectId: goal.projectId,
            episodeTarget: goal.episodeTarget,
          });
          load();
        },
      });
    }
  };

  const handleCreateProject = async (name: string, color: string) => {
    await createTaskProject(name, color);
    load();
  };

  const handleDeleteProject = async (id: string) => {
    const project = projects.find(p => p.id === id);
    await deleteTaskProject(id);
    if (selectedProjectId === id) setSelectedProjectId(null);
    load();
    if (project) {
      undo.push({
        message: '"' + project.name + '" 프로젝트 삭제됨',
        onUndo: async () => {
          await createTaskProject(project.name, project.color);
          load();
        },
      });
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<{ name: string; color: string }>) => {
    await updateTaskProject(id, updates);
    load();
  };

  const handleShowStats = () => {
    setShowStats(s => !s);
    setShowInbox(false);
    setSelectedProjectId(null);
    setSelectedSubprojectId(null);
  };

  const handleShowInbox = () => {
    setShowInbox(true);
    setShowStats(false);
    setSelectedProjectId(null);
    setSelectedSubprojectId(null);
    setSelectedGoalId(null);
  };


  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'high', label: '높은 우선순위' },
    { key: 'due_soon', label: '마감 임박' },
    { key: 'in_progress', label: '진행 중' },
    { key: 'assignee_me', label: '내 할일' },
    { key: 'assignee_agent', label: '에이전트' },
  ];

  const SORTS: { key: SortType; label: string }[] = [
    { key: 'recommended', label: '추천순' },
    { key: 'priority', label: '우선순위' },
    { key: 'due_date', label: '마감일' },
    { key: 'recent', label: '최근 추가' },
  ];

  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + (sortType !== 'recommended' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  // CustomSelect options
  const priorityOptions = [
    { value: 'high', label: '높음', color: 'var(--red)' },
    { value: 'medium', label: '보통', color: 'var(--yellow)' },
    { value: 'low', label: '낮음' },
  ];

  const goalOptions = [
    { value: '', label: '목표 없음' },
    ...goals.map(g => ({ value: g.id, label: g.title, color: g.color })),
  ];

  const assigneeOptions = [
    { value: 'me', label: '나' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ];

  const sortOptions = SORTS.map(s => ({ value: s.key, label: s.label }));

  return (
    <div className="animate-fade-in h-[100dvh] flex flex-col overflow-hidden">
      {/* Goal detail side panel */}
      <GoalDetailPanel
        goal={detailGoal}
        tasks={tasks}
        agents={agents}
        onClose={() => setDetailGoal(null)}
        onUpdateGoal={handleUpdateGoal}
        onDeleteGoal={handleDeleteGoal}
      />

      {/* Scrollable main content + calendar sidebar */}
      <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-page)' }}>
        <div className="px-8 py-6">

          {/* Top header: date + stats toggle */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <button
              onClick={handleShowStats}
              className="p-1.5 rounded-md transition-all"
              style={{
                background: showStats ? 'var(--accent-soft)' : 'transparent',
                color: showStats ? 'var(--accent)' : 'var(--text-tertiary)',
              }}
              title={showStats ? '통계 닫기' : '통계 보기'}
            >
              <ChartIcon size={15} />
            </button>
          </div>

          {/* Today dashboard summary cards */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {todaySummary.overdue > 0 && (
              <div style={{ padding: '8px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', minWidth: '70px' }}>
                <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>{todaySummary.overdue}</div>
                <div style={{ fontSize: '11px', color: '#991b1b' }}>기한 초과</div>
              </div>
            )}
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: todaySummary.todayDue > 0 ? '#fffbeb' : 'var(--bg-elevated)', border: '1px solid ' + (todaySummary.todayDue > 0 ? '#fde68a' : 'var(--border-subtle)'), minWidth: '70px' }}>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: todaySummary.todayDue > 0 ? '#d97706' : 'var(--text-primary)' }}>{todaySummary.todayDue}</div>
              <div style={{ fontSize: '11px', color: todaySummary.todayDue > 0 ? '#92400e' : 'var(--text-tertiary)' }}>오늘 마감</div>
            </div>
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', minWidth: '70px' }}>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{todaySummary.upcoming}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>3일 내 예정</div>
            </div>
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: todaySummary.completedToday > 0 ? '#f0fdf4' : 'var(--bg-elevated)', border: '1px solid ' + (todaySummary.completedToday > 0 ? '#bbf7d0' : 'var(--border-subtle)'), minWidth: '70px' }}>
              <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: todaySummary.completedToday > 0 ? '#16a34a' : 'var(--text-primary)' }}>{todaySummary.completedToday}</div>
              <div style={{ fontSize: '11px', color: todaySummary.completedToday > 0 ? '#166534' : 'var(--text-tertiary)' }}>오늘 완료</div>
            </div>
          </div>

          {/* Stats panel */}
          {showStats && (
            <div
              className="mb-6 rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                padding: '24px 28px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
              }}
            >
              <StatsPanel tasks={tasks} goals={goals} />
            </div>
          )}

          {/* Block 1: 목표 섹션 */}
          <div
            className="mb-6 rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              padding: '24px 28px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
          >
            <GoalStrip
              goals={goals}
              tasks={tasks}
              projects={projects}
              selectedGoalId={selectedGoalId}
              selectedProjectId={selectedProjectId}
              onSelectGoal={handleSelectGoal}
              onSelectProject={setSelectedProjectId}
              onCreateGoal={handleCreateGoal}
              onUpdateGoal={handleUpdateGoal}
              onAddEpisode={handleAddEpisode}
              onOpenDetail={setDetailGoal}
            />
          </div>

          {/* Block 2: 할일 섹션 */}
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
                  {/* Auto-linked goal indicator */}
                  {newTaskGoalId && !quickAddExpanded && (() => {
                    const g = goals.find(gl => gl.id === newTaskGoalId);
                    return g ? (
                      <span className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: g.color || '#6366f1' }} />
                        {g.title}
                      </span>
                    ) : null;
                  })()}
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
                    {goals.length > 0 && (
                      <CustomSelect
                        size="sm"
                        value={newTaskGoalId}
                        options={goalOptions}
                        onChange={setNewTaskGoalId}
                        placeholder="목표"
                      />
                    )}
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

            {/* Task list header with inline filter toggle */}
            <div className="flex items-center gap-2 mb-4">
              <h3
                className="text-sm font-semibold flex-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showInbox ? '인박스' : '할 일'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({pendingTasks.length})</span>
              </h3>

              {/* Filter toggle icon */}
              {tasks.length > 0 && (
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className="p-1.5 rounded-md transition-all relative"
                  style={{
                    background: showFilters ? 'var(--accent-soft)' : 'transparent',
                    color: showFilters ? 'var(--accent)' : 'var(--text-tertiary)',
                  }}
                  title="필터"
                >
                  <FunnelIcon size={13} />
                  {activeFilterCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-medium"
                      style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Filter/Sort/Search panel — collapsible */}
            {showFilters && tasks.length > 0 && (
              <div className="mb-4 space-y-2">
                {/* Filter chips */}
                <div className="flex gap-1 flex-wrap">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilterType(f.key)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                      style={{
                        background: filterType === f.key ? 'var(--accent-soft)' : 'transparent',
                        color: filterType === f.key ? 'var(--accent)' : 'var(--text-tertiary)',
                        border: filterType === f.key ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort + Search row */}
                <div className="flex items-center gap-2">
                  <CustomSelect
                    size="sm"
                    value={sortType}
                    options={sortOptions}
                    onChange={val => setSortType(val as SortType)}
                  />

                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="검색..."
                    className="flex-1 bg-transparent text-[11px] outline-none px-2 py-1 rounded-md"
                    style={{
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                </div>
              </div>
            )}

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
                    {recommendedIds.has(t.id) && !selectedGoalId && !showInbox && !searchQuery && filterType === 'all' && (
                      <span
                        className="flex-shrink-0 mt-3 mr-1.5 text-xs leading-none"
                        style={{ color: 'var(--yellow)', opacity: 0.7 }}
                        title="오늘의 추천"
                      >
                        ★
                      </span>
                    )}
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
                  {searchQuery ? (
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>검색 결과가 없습니다</p>
                  ) : (
                    <>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>할 일이 없습니다</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        위에서 할 일을 추가하거나<br />목표를 만들어 시작해보세요
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            </SortableContext>
            </DndContext>

            {/* Completed tasks — collapsible */}
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
          </div>{/* end Block 2 */}

        </div>
      </div>

      {/* Calendar sidebar — right fixed panel */}
      <div className="flex-shrink-0 overflow-y-auto" style={{ width: '300px', borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <CalendarSidebar
          tasks={tasks}
          goals={goals}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onUpdateProject={handleUpdateProject}
        />
      </div>
      </div>{/* end flex row */}
      <UndoToast entries={undo.entries} onRemove={undo.remove} />
    </div>
  );
}
