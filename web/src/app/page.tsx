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
function StatCard({ label, value, icon, href, color, gradient, delay }: {
  label: string; value: number | string; icon: React.ReactNode; href: string; color: string; gradient: string; delay?: string;
}) {
  return (
    <Link href={href} className={`group block ${delay || ''}`}>
      <div className="relative rounded-2xl p-5 border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
        {/* Subtle gradient background */}
        <div className={`absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300 bg-gradient-to-br ${gradient}`} />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} transition-transform duration-300 group-hover:scale-110`}>
              {icon}
            </div>
            <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
      </div>
    </Link>
  );
}

// ── Task Row ──
function TaskRow({ task }: { task: Task }) {
  const priorityConfig = {
    high: { color: 'bg-rose-500', ring: 'ring-rose-500/20' },
    medium: { color: 'bg-amber-500', ring: 'ring-amber-500/20' },
    low: { color: 'bg-blue-500', ring: 'ring-blue-500/20' },
  }[task.priority] || { color: 'bg-gray-400', ring: '' };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-accent/40 transition-all duration-200 group cursor-default">
      <span className={`w-2 h-2 rounded-full shrink-0 ${priorityConfig.color} ring-2 ${priorityConfig.ring}`} />
      <span className="text-sm flex-1 truncate group-hover:text-foreground transition-colors">{task.title}</span>
      {isOverdue && <AlertCircle size={13} className="text-destructive shrink-0" />}
      {task.status === 'in_progress' && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium shrink-0">진행중</span>
      )}
      {task.dueDate && (
        <span className={`text-[10px] shrink-0 font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
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
    <Link href={`/tasks/goals/${goal.id}`} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-accent/40 transition-all duration-200 group">
      <span className={`w-2.5 h-2.5 rounded-md shrink-0 ${dotColor}`} />
      <span className="text-sm flex-1 truncate group-hover:text-foreground transition-colors">{goal.title}</span>
      <span className="text-[10px] text-muted-foreground shrink-0 font-medium px-2 py-0.5 rounded-full bg-accent">
        {goal.goalType === 'series' ? `EP ${goal.episodeCount}` : goal.status}
      </span>
    </Link>
  );
}

// ── Section Header ──
function SectionHeader({ title, href, count, icon }: { title: string; href: string; count?: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {title}
        {count !== undefined && (
          <span className="text-[10px] font-medium text-muted-foreground bg-accent/80 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </h2>
      <Link href={href} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium">
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
      <div className="max-w-6xl mx-auto px-8 py-10 space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
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
    <div className="max-w-6xl mx-auto px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">현황</h1>
                  </div>
        <p className="text-sm text-muted-foreground font-medium">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        <StatCard
          label="진행중 태스크"
          value={inProgressTasks.length}
          icon={<Clock size={18} className="text-blue-600 dark:text-blue-400" />}
          href="/tasks"
          color="bg-blue-500/10"
          gradient="from-blue-500 to-cyan-500"
          delay="animate-fade-in-delay-1"
        />
        <StatCard
          label="오늘 완료"
          value={completedToday.length}
          icon={<CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />}
          href="/tasks"
          color="bg-emerald-500/10"
          gradient="from-emerald-500 to-teal-500"
          delay="animate-fade-in-delay-2"
        />
        <StatCard
          label="활성 목표"
          value={goals.length}
          icon={<Target size={18} className="text-violet-600 dark:text-violet-400" />}
          href="/tasks"
          color="bg-violet-500/10"
          gradient="from-violet-500 to-purple-500"
          delay="animate-fade-in-delay-3"
        />
        <StatCard
          label="팀"
          value={overview?.teams ?? 0}
          icon={<Users size={18} className="text-amber-600 dark:text-amber-400" />}
          href="/teams"
          color="bg-amber-500/10"
          gradient="from-amber-500 to-orange-500"
          delay="animate-fade-in-delay-4"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
        {/* Priority Tasks */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <SectionHeader title="우선 태스크" href="/tasks" count={pendingTasks.length} icon={<Clock size={14} />} />
          {priorityTasks.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground">모든 태스크를 완료했습니다</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {priorityTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <p className="text-xs text-destructive flex items-center gap-2 font-medium">
                <AlertCircle size={13} />
                기한 초과 {overdueTasks.length}건
              </p>
            </div>
          )}
        </div>

        {/* Active Goals */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <SectionHeader title="활성 목표" href="/tasks" count={goals.length} icon={<Target size={14} />} />
          {goals.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Target size={22} className="text-primary/60" />
              </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Teams */}
        <Link href="/teams" className="group block">
          <div className="relative rounded-2xl border border-border/60 bg-card p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity bg-gradient-to-br from-violet-500 to-indigo-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{overview?.teams ?? 0}개 팀</p>
                  <p className="text-[11px] text-muted-foreground">{overview?.members ?? 0}명의 멤버</p>
                </div>
              </div>
              {overview?.campHierarchy && overview.campHierarchy.length > 0 && (
                <div className="space-y-2">
                  {overview.campHierarchy.flatMap(c => c.teams).slice(0, 3).map(team => (
                    <div key={team.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{team.name}</span>
                      <span className="text-muted-foreground font-medium">{team.memberCount}명</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Members */}
        <Link href="/members" className="group block">
          <div className="relative rounded-2xl border border-border/60 bg-card p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity bg-gradient-to-br from-emerald-500 to-teal-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 transition-transform duration-300 group-hover:scale-110">
                  <UserCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{members.length}명 멤버</p>
                  <p className="text-[11px] text-muted-foreground">성장 프로필</p>
                </div>
              </div>
              <div className="space-y-2">
                {members.slice(0, 3).map(m => (
                  <div key={m.name} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex items-center gap-1.5">
                      {m.is_leader && <span className="text-amber-600 dark:text-amber-400">★</span>}
                      {m.name}
                    </span>
                    <span className="text-muted-foreground font-medium">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Links */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                        빠른 이동
          </p>
          <div className="space-y-1">
            {[
              { href: '/tasks', label: '목표', icon: <CheckCircle2 size={14} />, desc: '목표 및 태스크', gradient: 'group-hover:text-violet-600 dark:group-hover:text-violet-400' },
              { href: '/tasks/weekly', label: '주간 리뷰', icon: <TrendingUp size={14} />, desc: '주간 통계', gradient: 'group-hover:text-blue-600 dark:group-hover:text-blue-400' },
              { href: '/notes', label: '노트', icon: <FileText size={14} />, desc: '위키 노트', gradient: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' },
              { href: '/camps', label: '캠프', icon: <Layers size={14} />, desc: '환경 관리', gradient: 'group-hover:text-amber-600 dark:group-hover:text-amber-400' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-accent/40 transition-all duration-200 text-sm group">
                <span className={`text-muted-foreground transition-colors duration-200 ${item.gradient}`}>{item.icon}</span>
                <span className="flex-1 font-medium">{item.label}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
