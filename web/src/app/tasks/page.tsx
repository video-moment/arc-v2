'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

export default function TasksPageWrapper() {
  return (
    <Suspense>
      <TasksPage />
    </Suspense>
  );
}

function TasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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

  // Feature 1: 오늘 포커스 뷰
  const [focusMode, setFocusMode] = useState(false);

  // Feature 2: 할일 그룹핑
  const [groupBy, setGroupBy] = useState<'none' | 'goal' | 'priority' | 'dueDate'>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Feature 3: 벌크 액션
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // URL sync initialized flag
  const urlInitialized = useRef(false);

  // Completed tasks collapsed by default
  const [completedExpanded, setCompletedExpanded] = useState(true);

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

  // Feature 4: URL sync — read on mount
  useEffect(() => {
    if (urlInitialized.current) return;
    urlInitialized.current = true;
    const f = searchParams.get('filter');
    const s = searchParams.get('sort');
    const q = searchParams.get('search');
    const g = searchParams.get('group');
    const fc = searchParams.get('focus');
    if (f && ['all', 'high', 'due_soon', 'in_progress', 'assignee_me', 'assignee_agent'].includes(f)) {
      setFilterType(f as FilterType);
    }
    if (s && ['recommended', 'priority', 'due_date', 'recent'].includes(s)) {
      setSortType(s as SortType);
    }
    if (q) setSearchQuery(q);
    if (g && ['none', 'goal', 'priority', 'dueDate'].includes(g)) {
      setGroupBy(g as 'none' | 'goal' | 'priority' | 'dueDate');
    }
    if (fc === '1') setFocusMode(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feature 4: URL sync — write on change
  useEffect(() => {
    if (!urlInitialized.current) return;
    const params = new URLSearchParams();
    if (filterType !== 'all') params.set('filter', filterType);
    if (sortType !== 'recommended') params.set('sort', sortType);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (groupBy !== 'none') params.set('group', groupBy);
    if (focusMode) params.set('focus', '1');
    const qs = params.toString();
    router.replace(pathname + (qs ? '?' + qs : ''), { scroll: false });
  }, [filterType, sortType, searchQuery, groupBy, focusMode, pathname, router]);

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
    const todayStr = now.toISOString().split('T')[0];
    let pending = baseTasks.filter(t => t.status !== 'completed');
    const completed = baseTasks.filter(t => t.status === 'completed');

    // Feature 1: Focus mode override
    if (focusMode) {
      const allScored = [...baseTasks.filter(t => t.status !== 'completed')]
        .sort((a, b) => calcScore(b) - calcScore(a))
        .slice(0, 3);
      const top3Ids = new Set(allScored.map(t => t.id));
      pending = pending.filter(t =>
        (t.dueDate && t.dueDate.slice(0, 10) <= todayStr) ||
        t.status === 'in_progress' ||
        top3Ids.has(t.id)
      );
    }

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
  }, [baseTasks, filterType, sortType, searchQuery, focusMode]);

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

  // Feature 2: grouped tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return null;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + (7 - now.getDay()));
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const groupMap = new Map<string, Task[]>();

    for (const task of pendingTasks) {
      let key: string;
      if (groupBy === 'goal') {
        const g = task.goalId ? goals.find(x => x.id === task.goalId) : null;
        key = g ? g.title : '미분류';
      } else if (groupBy === 'priority') {
        key = task.priority === 'high' ? '높음' : task.priority === 'medium' ? '보통' : '낮음';
      } else { // dueDate
        if (!task.dueDate) {
          key = '미설정';
        } else {
          const d = task.dueDate.slice(0, 10);
          if (d < todayStr) key = '기한 초과';
          else if (d === todayStr) key = '오늘';
          else if (d <= weekEndStr) key = '이번 주';
          else if (d <= monthEnd) key = '이번 달';
          else key = '나중에';
        }
      }
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(task);
    }

    // Sort group keys
    const orderMap: Record<string, number> = groupBy === 'priority'
      ? { '높음': 0, '보통': 1, '낮음': 2 }
      : groupBy === 'dueDate'
      ? { '기한 초과': 0, '오늘': 1, '이번 주': 2, '이번 달': 3, '나중에': 4, '미설정': 5 }
      : {};

    return [...groupMap.entries()]
      .sort(([a], [b]) => {
        const ao = orderMap[a] ?? 99;
        const bo = orderMap[b] ?? 99;
        return ao !== bo ? ao - bo : a.localeCompare(b);
      })
      .map(([label, items]) => ({ label, items }));
  }, [pendingTasks, groupBy, goals]);

  // Feature 3: bulk action handlers
  const handleBulkComplete = async () => {
    await Promise.all([...selectedIds].map(id => updateTask(id, { status: 'completed', completedAt: new Date().toISOString() })));
    setSelectedIds(new Set());
    setSelectMode(false);
    load();
  };

  const handleBulkDelete = async () => {
    if (!confirm(selectedIds.size + '개 항목을 삭제할까요?')) return;
    await Promise.all([...selectedIds].map(id => deleteTask(id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    load();
  };

  const handleBulkPriority = async (priority: string) => {
    await Promise.all([...selectedIds].map(id => updateTask(id, { priority })));
    setSelectedIds(new Set());
    setSelectMode(false);
    load();
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
                color: showStats ? '#7c3aed' : 'var(--text-tertiary)',
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

          {/* Block 2: 오늘의 할 일 */}
          <div
            className="mb-6 rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              padding: '24px 28px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
              오늘의 할 일
            </h3>

            {/* Quick add form */}
            <form onSubmit={handleCreateTask} className="mb-5">
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
                    <CustomSelect size="sm" value={newTaskPriority} options={priorityOptions} onChange={setNewTaskPriority} />
                    <CustomDatePicker size="sm" value={newTaskDueDate} onChange={setNewTaskDueDate} placeholder="날짜" />
                    <input
                      value={newTaskCategory}
                      onChange={e => setNewTaskCategory(e.target.value)}
                      placeholder="카테고리"
                      className="px-2 py-1 rounded-md text-xs outline-none w-24"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    {goals.length > 0 && (
                      <CustomSelect size="sm" value={newTaskGoalId} options={goalOptions} onChange={setNewTaskGoalId} placeholder="목표" />
                    )}
                    <CustomSelect
                      size="sm"
                      value={newTaskAssignee === 'agent' ? newTaskAgentId : 'me'}
                      options={assigneeOptions}
                      onChange={val => {
                        if (val === 'me') { setNewTaskAssignee('me'); setNewTaskAgentId(''); }
                        else { setNewTaskAssignee('agent'); setNewTaskAgentId(val); }
                      }}
                    />
                    <button type="button" onClick={() => setQuickAddExpanded(false)} className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>접기</button>
                  </div>
                )}
              </div>
            </form>

            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const allPending = tasks.filter(t => t.status !== 'completed');
              const overdue = allPending.filter(t => t.dueDate && t.dueDate.slice(0, 10) < todayStr);
              const todayDue = allPending.filter(t => t.dueDate?.startsWith(todayStr));
              const inProgress = allPending.filter(t => t.status === 'in_progress' && !t.dueDate?.startsWith(todayStr) && !(t.dueDate && t.dueDate.slice(0, 10) < todayStr));
              const unassigned = allPending.filter(t => !t.goalId && !t.dueDate);
              const completedToday = tasks.filter(t => t.status === 'completed' && t.completedAt?.startsWith(todayStr));
              const sections = [
                { key: 'overdue', label: '기한 초과', tasks: overdue, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                { key: 'today', label: '오늘 마감', tasks: todayDue, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                { key: 'progress', label: '진행 중', tasks: inProgress, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                { key: 'unassigned', label: '미분류', tasks: unassigned, color: 'var(--text-tertiary)', bg: 'var(--bg-secondary)', border: 'var(--border-subtle)' },
              ].filter(s => s.tasks.length > 0);

              if (sections.length === 0 && completedToday.length === 0) {
                return (
                  <div className="py-8 text-center">
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>오늘 예정된 할 일이 없습니다</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      목표에서 할 일을 추가하거나 위에서 빠르게 추가해보세요
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {sections.map(section => (
                    <div key={section.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: section.color }} />
                        <span className="text-xs font-semibold" style={{ color: section.color }}>{section.label}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{section.tasks.length}</span>
                      </div>
                      <div className="space-y-1">
                        {section.tasks.map(t => (
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
                    </div>
                  ))}
                  {completedToday.length > 0 && (
                    <div>
                      <button
                        className="flex items-center gap-1.5 mb-2 transition-colors"
                        onClick={() => setCompletedExpanded(e => !e)}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#16a34a' }} />
                        <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>오늘 완료</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{completedToday.length}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ color: 'var(--text-tertiary)', transform: completedExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {completedExpanded && (
                        <div className="space-y-1">
                          {completedToday.map(t => (
                            <TaskItem key={t.id} task={t} onToggleComplete={handleToggleComplete} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} goals={goals} agents={agents} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>{/* end Block 2 */}

          {/* Block 3: 이번 주 일정 */}
          <div
            className="rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              padding: '24px 28px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
              이번 주 일정
            </h3>
            {(() => {
              const now = new Date();
              const day = now.getDay();
              const mon = new Date(now);
              mon.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
              mon.setHours(0, 0, 0, 0);

              const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(mon);
                d.setDate(mon.getDate() + i);
                return d;
              });

              const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
              const todayStr = now.toISOString().split('T')[0];
              const allPending = tasks.filter(t => t.status !== 'completed');

              return (
                <div className="space-y-1">
                  {days.map((d, i) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const isToday = dateStr === todayStr;
                    const isPast = dateStr < todayStr;
                    const dayTasks = allPending.filter(t => t.dueDate?.startsWith(dateStr));
                    const completedDay = tasks.filter(t => t.status === 'completed' && t.completedAt?.startsWith(dateStr));

                    return (
                      <div
                        key={dateStr}
                        className="flex gap-3 py-2.5 rounded-lg px-3 transition-colors"
                        style={{
                          background: isToday ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                          opacity: isPast && !isToday ? 0.6 : 1,
                        }}
                      >
                        <div className="flex-shrink-0 w-14 text-right">
                          <span className="text-xs font-semibold" style={{ color: isToday ? '#7c3aed' : 'var(--text-secondary)' }}>
                            {DAY_LABELS[i]}
                          </span>
                          <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>
                            {d.getMonth() + 1}/{d.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {dayTasks.length === 0 && completedDay.length === 0 ? (
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                          ) : (
                            <div className="space-y-0.5">
                              {dayTasks.map(t => {
                                const goal = t.goalId ? goals.find(g => g.id === t.goalId) : null;
                                return (
                                  <div key={t.id} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                                      background: t.priority === 'high' ? '#dc2626' : t.priority === 'medium' ? '#d97706' : '#3b82f6',
                                    }} />
                                    <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                                    {goal && (
                                      <span className="text-[10px] flex-shrink-0" style={{ color: goal.color || 'var(--text-tertiary)' }}>{goal.title}</span>
                                    )}
                                  </div>
                                );
                              })}
                              {completedDay.map(t => (
                                <div key={t.id} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#16a34a' }} />
                                  <span className="text-xs truncate line-through" style={{ color: 'var(--text-secondary)' }}>{t.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>{/* end Block 3 */}

          {/* Block 4: 전체 할 일 (filter + group + focus + bulk) */}
          <div
            className="mt-6 rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              padding: '24px 28px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
          >
            {/* Section header row */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                전체 할 일
                {pendingTasks.length > 0 && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>{pendingTasks.length}개</span>
                )}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Feature 1: Focus mode toggle */}
                <button
                  onClick={() => setFocusMode(m => !m)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: focusMode ? '#fef3c7' : 'var(--bg-secondary)',
                    color: focusMode ? '#92400e' : 'var(--text-secondary)',
                    border: '1px solid ' + (focusMode ? '#fde68a' : 'var(--border-subtle)'),
                  }}
                  title="오늘 포커스 모드"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  오늘 포커스
                </button>

                {/* Feature 3: Select mode toggle */}
                <button
                  onClick={() => { setSelectMode(m => !m); setSelectedIds(new Set()); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: selectMode ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                    color: selectMode ? '#7c3aed' : 'var(--text-secondary)',
                    border: '1px solid ' + (selectMode ? '#c4b5fd' : 'var(--border-subtle)'),
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  선택
                </button>
              </div>
            </div>

            {/* Filter pills + sort + search row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Search */}
              <div className="relative flex items-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="absolute left-2.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="검색..."
                  className="pl-7 pr-3 py-1 rounded-md text-xs outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    width: '130px',
                  }}
                />
              </div>

              {/* Filter pills */}
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: filterType === f.key ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                    color: filterType === f.key ? '#7c3aed' : 'var(--text-secondary)',
                    border: '1px solid ' + (filterType === f.key ? '#c4b5fd' : 'var(--border-subtle)'),
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort + Group controls row */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {/* Sort */}
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>정렬:</span>
              {SORTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortType(s.key)}
                  className="px-2 py-0.5 rounded text-xs transition-all"
                  style={{
                    background: sortType === s.key ? 'var(--bg-secondary)' : 'transparent',
                    color: sortType === s.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontWeight: sortType === s.key ? 600 : 400,
                  }}
                >
                  {s.label}
                </button>
              ))}

              <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>그룹:</span>
              {([
                { key: 'none', label: '없음' },
                { key: 'goal', label: '목표별' },
                { key: 'priority', label: '우선순위' },
                { key: 'dueDate', label: '마감일' },
              ] as const).map(g => (
                <button
                  key={g.key}
                  onClick={() => setGroupBy(g.key)}
                  className="px-2 py-0.5 rounded text-xs transition-all"
                  style={{
                    background: groupBy === g.key ? 'var(--bg-secondary)' : 'transparent',
                    color: groupBy === g.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontWeight: groupBy === g.key ? 600 : 400,
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Task list: grouped or flat */}
            {pendingTasks.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {focusMode ? '포커스 할 일이 없습니다' : '표시할 할 일이 없습니다'}
                </p>
              </div>
            ) : groupBy !== 'none' && groupedTasks ? (
              <div className="space-y-4">
                {groupedTasks.map(({ label, items }) => {
                  const isCollapsed = collapsedGroups.has(label);
                  const groupColor = groupBy === 'priority'
                    ? (label === '높음' ? '#dc2626' : label === '보통' ? '#d97706' : '#3b82f6')
                    : 'var(--text-secondary)';
                  return (
                    <div key={label}>
                      <button
                        className="flex items-center gap-2 mb-2 w-full text-left"
                        onClick={() => setCollapsedGroups(prev => {
                          const next = new Set(prev);
                          if (next.has(label)) next.delete(label);
                          else next.add(label);
                          return next;
                        })}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: groupColor }} />
                        <span className="text-xs font-semibold" style={{ color: groupColor }}>{label}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
                        >
                          {items.length}
                        </span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ color: 'var(--text-tertiary)', marginLeft: 'auto', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {!isCollapsed && (
                        <div className="space-y-1 pl-4">
                          {items.map(t => (
                            <div key={t.id} className="flex items-center gap-2">
                              {selectMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(t.id)}
                                  onChange={() => toggleSelectId(t.id)}
                                  className="flex-shrink-0 cursor-pointer"
                                  style={{ accentColor: '#7c3aed', width: '14px', height: '14px' }}
                                />
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
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {pendingTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelectId(t.id)}
                        className="flex-shrink-0 cursor-pointer"
                        style={{ accentColor: '#7c3aed', width: '14px', height: '14px' }}
                      />
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
                ))}
              </div>
            )}
          </div>{/* end Block 4 */}

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

      {/* Feature 3: Floating bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {selectedIds.size}개 선택됨
          </span>
          <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
          <button
            onClick={handleBulkComplete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            완료
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
              우선순위 변경
            </button>
            <div
              className="absolute bottom-full mb-2 left-0 hidden group-hover:flex flex-col gap-1 p-1 rounded-lg z-10"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
            >
              {[
                { val: 'high', label: '높음', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                { val: 'medium', label: '보통', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                { val: 'low', label: '낮음', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
              ].map(p => (
                <button
                  key={p.val}
                  onClick={() => handleBulkPriority(p.val)}
                  className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap"
                  style={{ background: p.bg, color: p.color, border: '1px solid ' + p.border }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            삭제
          </button>
          <button
            onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
            className="px-2 py-1 rounded-lg text-xs transition-all"
            style={{ color: 'var(--text-tertiary)' }}
          >
            취소
          </button>
        </div>
      )}

      <UndoToast entries={undo.entries} onRemove={undo.remove} />
    </div>
  );
}
