'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PomodoroTimer from '@/components/PomodoroTimer';
import type { PomodoroDurations } from '@/components/PomodoroTimer';
import ProjectList from '@/components/ProjectList';
import TaskItem from '@/components/TaskItem';
import StatsPanel from '@/components/StatsPanel';
import { TomatoIcon, TargetIcon, PlusIcon, SearchIcon, ZapIcon, CalendarIcon } from '@/components/Icons';
import {
  type PomoProject, type PomoSubproject, type PomoTask, type PomoSession,
  getPomoProjects, createPomoProject, deletePomoProject,
  getPomoSubprojects, createPomoSubproject, deletePomoSubproject,
  getPomoTasks, createPomoTask, updatePomoTask, deletePomoTask,
  createPomoSession, completePomoSession, getPomoStats,
} from '@/lib/api';

const DEFAULT_DURATIONS: PomodoroDurations = { work: 25, break: 5, longBreak: 15 };
const STORAGE_KEY = 'pomo-durations';

function loadDurations(): PomodoroDurations {
  if (typeof window === 'undefined') return DEFAULT_DURATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        work: Number(parsed.work) || DEFAULT_DURATIONS.work,
        break: Number(parsed.break) || DEFAULT_DURATIONS.break,
        longBreak: Number(parsed.longBreak) || DEFAULT_DURATIONS.longBreak,
      };
    }
  } catch {}
  return DEFAULT_DURATIONS;
}

function calcScore(task: PomoTask): number {
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
  const remaining = task.estimatedPomodoros - task.completedPomodoros;
  const fitScore = remaining <= 1 ? 20 : remaining <= 3 ? 15 : 8;
  const progressScore = task.completedPomodoros > 0 ? 10 : 0;
  return urgency + priorityScore + fitScore + progressScore;
}

type FilterType = 'all' | 'high' | 'due_soon' | 'in_progress';
type SortType = 'recommended' | 'priority' | 'due_date' | 'recent';

export default function PomodoroPage() {
  const [projects, setProjects] = useState<PomoProject[]>([]);
  const [subprojects, setSubprojects] = useState<PomoSubproject[]>([]);
  const [tasks, setTasks] = useState<PomoTask[]>([]);
  const [sessions, setSessions] = useState<PomoSession[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<PomoTask | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [durations, setDurations] = useState<PomodoroDurations>(DEFAULT_DURATIONS);
  const [showStats, setShowStats] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [isQuickFocus, setIsQuickFocus] = useState(false);

  // Quick add state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskPomos, setNewTaskPomos] = useState(1);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [quickAddExpanded, setQuickAddExpanded] = useState(false);

  // Filter / Sort / Search
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDurations(loadDurations());
  }, []);

  const handleDurationsChange = useCallback((d: PomodoroDurations) => {
    setDurations(d);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
  }, []);

  const load = useCallback(async () => {
    const [p, sp, t, s] = await Promise.all([
      getPomoProjects(), getPomoSubprojects(), getPomoTasks(), getPomoStats(30),
    ]);
    setProjects(p);
    setSubprojects(sp);
    setTasks(t);
    setSessions(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered tasks by project/inbox selection
  const baseTasks = useMemo(() => {
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
        return t.subprojectId && subIds.includes(t.subprojectId);
      });
    }
    return tasks;
  }, [tasks, showInbox, selectedProjectId, selectedSubprojectId, subprojects]);

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
      pending = pending.filter(t => t.completedPomodoros > 0);
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
      const order = { high: 0, medium: 1, low: 2 };
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

  const recommended = useMemo(() =>
    [...tasks.filter(t => t.status !== 'completed')]
      .sort((a, b) => calcScore(b) - calcScore(a))
      .slice(0, 3),
    [tasks]
  );

  // Handlers
  const handleCreateProject = async (name: string, color: string) => {
    await createPomoProject(name, color);
    load();
  };

  const handleDeleteProject = async (id: string) => {
    await deletePomoProject(id);
    if (selectedProjectId === id) { setSelectedProjectId(null); setSelectedSubprojectId(null); }
    load();
  };

  const handleCreateSubproject = async (projectId: string, name: string) => {
    await createPomoSubproject(projectId, name);
    load();
  };

  const handleDeleteSubproject = async (id: string) => {
    await deletePomoSubproject(id);
    if (selectedSubprojectId === id) setSelectedSubprojectId(null);
    load();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const input: Parameters<typeof createPomoTask>[0] = {
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      estimatedPomodoros: newTaskPomos,
    };

    if (newTaskDueDate) input.dueDate = newTaskDueDate;
    if (newTaskCategory.trim()) input.category = newTaskCategory.trim();

    if (selectedSubprojectId) {
      input.subprojectId = selectedSubprojectId;
    } else if (selectedProjectId) {
      const hasSubs = subprojects.some(s => s.projectId === selectedProjectId);
      if (hasSubs) return;
      input.projectId = selectedProjectId;
    }
    // else: inbox (no projectId, no subprojectId) — allowed by API

    await createPomoTask(input);
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskCategory('');
    setQuickAddExpanded(false);
    load();
  };

  const handleSelectTask = async (task: PomoTask) => {
    setActiveTask(task);
    setIsQuickFocus(false);
    const session = await createPomoSession(task.id);
    setCurrentSessionId(session.id);
  };

  const handleToggleComplete = async (task: PomoTask) => {
    if (task.status === 'completed') {
      await updatePomoTask(task.id, { status: 'pending', completedAt: null });
    } else {
      await updatePomoTask(task.id, { status: 'completed', completedAt: new Date().toISOString() });
    }
    if (activeTask?.id === task.id) setActiveTask(null);
    load();
  };

  const handleDeleteTask = async (id: string) => {
    await deletePomoTask(id);
    if (activeTask?.id === id) setActiveTask(null);
    load();
  };

  const handleUpdateTask = async (id: string, updates: Parameters<typeof updatePomoTask>[1]) => {
    await updatePomoTask(id, updates);
    if (activeTask?.id === id) {
      const updatedTasks = await getPomoTasks();
      const updated = updatedTasks.find(t => t.id === id);
      if (updated) setActiveTask(updated);
    }
    load();
  };

  const handleQuickFocus = async () => {
    const quickTask = await createPomoTask({
      title: '빠른 집중',
      priority: 'medium',
      estimatedPomodoros: 1,
    });
    setActiveTask(quickTask);
    setIsQuickFocus(true);
    const session = await createPomoSession(quickTask.id);
    setCurrentSessionId(session.id);
    load();
  };

  const handleSessionComplete = async () => {
    if (currentSessionId) {
      await completePomoSession(currentSessionId);
    }
    if (activeTask) {
      const updated = await updatePomoTask(activeTask.id, {
        completedPomodoros: activeTask.completedPomodoros + 1,
      });
      setActiveTask(updated);
      const newSession = await createPomoSession(activeTask.id);
      setCurrentSessionId(newSession.id);
    }
    load();
  };

  const handleShowStats = () => {
    setShowStats(true);
    setShowInbox(false);
    setSelectedProjectId(null);
    setSelectedSubprojectId(null);
  };

  const handleShowInbox = () => {
    setShowInbox(true);
    setShowStats(false);
    setSelectedProjectId(null);
    setSelectedSubprojectId(null);
  };

  const handleSelectProject = (id: string | null) => {
    setShowStats(false);
    setShowInbox(false);
    setSelectedProjectId(id);
  };

  const handleSelectSubproject = (id: string | null) => {
    setShowStats(false);
    setShowInbox(false);
    setSelectedSubprojectId(id);
  };

  const inboxCount = tasks.filter(t => !t.projectId && !t.subprojectId && t.status !== 'completed').length;

  const selectedProjectHasSubs = selectedProjectId
    ? subprojects.some(s => s.projectId === selectedProjectId)
    : false;
  const needsSubprojectHint = selectedProjectId && selectedProjectHasSubs && !selectedSubprojectId;

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'high', label: '높은 우선순위' },
    { key: 'due_soon', label: '마감 임박' },
    { key: 'in_progress', label: '진행 중' },
  ];

  const SORTS: { key: SortType; label: string }[] = [
    { key: 'recommended', label: '추천순' },
    { key: 'priority', label: '우선순위' },
    { key: 'due_date', label: '마감일' },
    { key: 'recent', label: '최근 추가' },
  ];

  return (
    <div className="animate-fade-in flex gap-0 -m-8 h-[calc(100vh)]">
      {/* Left — Project tree */}
      <div
        className="w-72 flex-shrink-0 h-full"
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)' }}
      >
        <div className="px-4 py-5">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>프로젝트</h2>
        </div>
        <ProjectList
          projects={projects}
          subprojects={subprojects}
          tasks={tasks}
          selectedProjectId={selectedProjectId}
          selectedSubprojectId={selectedSubprojectId}
          showStats={showStats}
          showInbox={showInbox}
          inboxCount={inboxCount}
          onSelectProject={handleSelectProject}
          onSelectSubproject={handleSelectSubproject}
          onShowStats={handleShowStats}
          onShowInbox={handleShowInbox}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onCreateSubproject={handleCreateSubproject}
          onDeleteSubproject={handleDeleteSubproject}
        />
      </div>

      {/* Center — Timer + Tasks OR Stats */}
      <div className="flex-1 overflow-y-auto">
        {showStats ? (
          <div className="max-w-2xl mx-auto px-8 py-8">
            <StatsPanel sessions={sessions} tasks={tasks} projects={projects} />
          </div>
        ) : (
          <div className="px-12 py-8">
            <div className="py-8">
              <PomodoroTimer
                activeTask={activeTask}
                onSessionComplete={handleSessionComplete}
                durations={durations}
                onDurationsChange={handleDurationsChange}
                onQuickFocus={handleQuickFocus}
                isQuickFocus={isQuickFocus}
              />
            </div>

            {/* Gradient divider */}
            <div
              className="h-px my-2"
              style={{
                background: 'linear-gradient(to right, transparent, var(--border-subtle), transparent)',
              }}
            />

            <div className="pt-6">
              {/* Always-visible quick add input */}
              <form onSubmit={handleCreateTask} className="mb-5">
                <div
                  className="rounded-xl overflow-hidden transition-all"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: quickAddExpanded ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <PlusIcon size={14} />
                    <input
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onFocus={() => setQuickAddExpanded(true)}
                      placeholder="새 할 일 추가... (Enter로 빠르게 추가)"
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    {newTaskTitle.trim() && (
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        추가
                      </button>
                    )}
                  </div>
                  {quickAddExpanded && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 flex-wrap"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                      <select
                        value={newTaskPriority}
                        onChange={e => setNewTaskPriority(e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs outline-none"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        <option value="high">높음</option>
                        <option value="medium">보통</option>
                        <option value="low">낮음</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <TomatoIcon size={13} />
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={newTaskPomos}
                          onChange={e => setNewTaskPomos(Number(e.target.value))}
                          className="w-12 px-2 py-1 rounded-lg text-xs outline-none text-center"
                          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={13} />
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={e => setNewTaskDueDate(e.target.value)}
                          className="px-2 py-1 rounded-lg text-xs outline-none"
                          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <input
                        value={newTaskCategory}
                        onChange={e => setNewTaskCategory(e.target.value)}
                        placeholder="카테고리"
                        className="px-2 py-1 rounded-lg text-xs outline-none w-24"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
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

              {/* Filter chips + Sort + Search */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {/* Filter chips */}
                <div className="flex gap-1">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilterType(f.key)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                      style={{
                        background: filterType === f.key ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        color: filterType === f.key ? 'var(--accent-hover)' : 'var(--text-tertiary)',
                        border: filterType === f.key ? '1px solid var(--accent)' : '1px solid transparent',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1" />

                {/* Sort */}
                <select
                  value={sortType}
                  onChange={e => setSortType(e.target.value as SortType)}
                  className="px-2 py-1 rounded-lg text-[11px] outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  {SORTS.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>

                {/* Search */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                >
                  <SearchIcon size={12} />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="검색..."
                    className="bg-transparent text-[11px] outline-none w-24"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Recommendations */}
              {recommended.length > 0 && !selectedProjectId && !showInbox && !searchQuery && filterType === 'all' && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    <TargetIcon /> 오늘의 추천
                  </h3>
                  <div className="space-y-1">
                    {recommended.map(t => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        isActive={activeTask?.id === t.id}
                        onSelect={handleSelectTask}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDeleteTask}
                        onUpdate={handleUpdateTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Task list header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  {showInbox ? '인박스' : '할 일'} ({pendingTasks.length})
                </h3>
              </div>

              {/* Hint: needs subproject selection */}
              {needsSubprojectHint && pendingTasks.length === 0 && (
                <div className="text-center py-6 mb-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    세부 프로젝트를 선택하면 할 일을 추가할 수 있습니다
                  </p>
                </div>
              )}

              {/* Pending tasks */}
              <div className="space-y-1">
                {pendingTasks.map(t => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    isActive={activeTask?.id === t.id}
                    onSelect={handleSelectTask}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                    onUpdate={handleUpdateTask}
                  />
                ))}
                {pendingTasks.length === 0 && !needsSubprojectHint && (
                  <div className="text-center py-10">
                    <div className="flex justify-center mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>
                      <TomatoIcon size={32} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {searchQuery ? '검색 결과가 없습니다' : '할 일이 없습니다 — 위에서 추가해보세요'}
                    </p>
                  </div>
                )}
              </div>

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    완료됨 ({completedTasks.length})
                  </h3>
                  <div className="space-y-1">
                    {completedTasks.map(t => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        isActive={false}
                        onSelect={() => {}}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDeleteTask}
                        onUpdate={handleUpdateTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
