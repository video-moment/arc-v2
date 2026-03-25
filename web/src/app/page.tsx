'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText, Users, UserCircle, Target, CheckCircle2,
  Clock, ArrowRight, TrendingUp, Layers, AlertCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getTasks, getTaskGoals, type Task, type TaskGoal } from '@/lib/api';
import { getOverview, getMembers, type Overview, type Member } from '@/lib/nextcamp-api';

// ── Stat Card ──
function StatCard({ label, value, icon, href, color }: {
  label: string; value: number | string; icon: React.ReactNode; href: string; color: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="rounded-2xl p-5 border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </Link>
  );
}

// ── Task Row ──
function TaskRow({ task }: { task: Task }) {
  const priorityColor = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  }[task.priority] || 'bg-gray-400';

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors group">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColor}`} />
      <span className="text-sm flex-1 truncate">{task.title}</span>
      {isOverdue && <AlertCircle size={13} className="text-destructive shrink-0" />}
      {task.status === 'in_progress' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 shrink-0">진행중</span>
      )}
      {task.dueDate && (
        <span className={`text-[10px] shrink-0 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
          {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}

// ── Goal Row ──
function GoalRow({ goal }: { goal: TaskGoal }) {
  const colorMap: Record<string, string> = {
    '#7c3aed': 'bg-violet-500', '#3b82f6': 'bg-blue-500', '#059669': 'bg-emerald-500',
    '#e11d48': 'bg-rose-500', '#d97706': 'bg-amber-500', '#6366f1': 'bg-indigo-500',
  };
  const dotColor = colorMap[goal.color] || 'bg-primary';

  return (
    <Link href={`/tasks/goals/${goal.id}`} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="text-sm flex-1 truncate">{goal.title}</span>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {goal.goalType === 'series' ? `EP ${goal.episodeCount}` : goal.status}
      </span>
    </Link>
  );
}

// ── Section Header ──
function SectionHeader({ title, href, count }: { title: string; href: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        {title}
        {count !== undefined && (
          <span className="text-[10px] font-normal text-muted-foreground bg-accent px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </h2>
      <Link href={href} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
        전체 보기 <ArrowRight size={11} />
      </Link>
    </div>
  );
}

// ── Main Dashboard ──
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<TaskGoal[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    Promise.all([
      getTasks(),
      getTaskGoals({ status: 'active' }),
      getOverview().catch(() => null),
      getMembers().catch(() => []),
    ])
      .then(([t, g, o, m]) => {
        setTasks(t);
        setGoals(g);
        setOverview(o);
        setMembers(m);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Derived data
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < todayStr);
  const completedToday = tasks.filter(t => t.completedAt?.startsWith(todayStr));

  // Priority tasks: overdue first, then today, then in-progress, then by priority
  const priorityTasks = [...pendingTasks]
    .sort((a, b) => {
      const aOverdue = a.dueDate && a.dueDate < todayStr ? -2 : 0;
      const bOverdue = b.dueDate && b.dueDate < todayStr ? -2 : 0;
      const aToday = a.dueDate?.startsWith(todayStr) ? -1 : 0;
      const bToday = b.dueDate?.startsWith(todayStr) ? -1 : 0;
      const aInProg = a.status === 'in_progress' ? -1 : 0;
      const bInProg = b.status === 'in_progress' ? -1 : 0;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (aOverdue + aToday + aInProg) - (bOverdue + bToday + bInProg)
        || (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    })
    .slice(0, 8);

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">현황</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="진행중 태스크"
          value={inProgressTasks.length}
          icon={<Clock size={18} className="text-blue-600" />}
          href="/tasks"
          color="bg-blue-500/10"
        />
        <StatCard
          label="오늘 완료"
          value={completedToday.length}
          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
          href="/tasks"
          color="bg-emerald-500/10"
        />
        <StatCard
          label="활성 목표"
          value={goals.length}
          icon={<Target size={18} className="text-violet-600" />}
          href="/tasks"
          color="bg-violet-500/10"
        />
        <StatCard
          label="팀"
          value={overview?.teams ?? 0}
          icon={<Users size={18} className="text-amber-600" />}
          href="/teams"
          color="bg-amber-500/10"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Priority Tasks */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader title="우선 태스크" href="/tasks" count={pendingTasks.length} />
          {priorityTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500" />
              <p className="text-sm text-muted-foreground">모든 태스크를 완료했습니다</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {priorityTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle size={12} />
                기한 초과 {overdueTasks.length}건
              </p>
            </div>
          )}
        </div>

        {/* Active Goals */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader title="활성 목표" href="/tasks" count={goals.length} />
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Target size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">활성 목표가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {goals.slice(0, 8).map(goal => <GoalRow key={goal.id} goal={goal} />)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Organization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Teams */}
        <Link href="/teams" className="group block">
          <div className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
                <Users size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{overview?.teams ?? 0}개 팀</p>
                <p className="text-[11px] text-muted-foreground">{overview?.members ?? 0}명의 멤버</p>
              </div>
            </div>
            {overview?.campHierarchy && overview.campHierarchy.length > 0 && (
              <div className="space-y-1.5">
                {overview.campHierarchy.flatMap(c => c.teams).slice(0, 3).map(team => (
                  <div key={team.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{team.name}</span>
                    <span className="text-muted-foreground">{team.memberCount}명</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Members */}
        <Link href="/members" className="group block">
          <div className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10">
                <UserCircle size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">{members.length}명 멤버</p>
                <p className="text-[11px] text-muted-foreground">성장 프로필</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {members.slice(0, 3).map(m => (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex items-center gap-1.5">
                    {m.is_leader && <span className="text-amber-500">★</span>}
                    {m.name}
                  </span>
                  <span className="text-muted-foreground">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </Link>

        {/* Quick Links */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold mb-3">빠른 이동</p>
          <div className="space-y-1.5">
            {[
              { href: '/tasks', label: '목표', icon: <CheckCircle2 size={14} />, desc: '목표 및 태스크 관리' },
              { href: '/tasks/weekly', label: '주간 리뷰', icon: <TrendingUp size={14} />, desc: '주간 통계' },
              { href: '/notes', label: '노트', icon: <FileText size={14} />, desc: '위키 노트' },
              { href: '/camps', label: '캠프', icon: <Layers size={14} />, desc: '환경 관리' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm group">
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
