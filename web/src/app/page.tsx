'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Monitor, Users, UserCircle, Layers, TrendingUp, ChevronRight,
  Crown, Cpu,
} from 'lucide-react';
import { getOverview, type Overview, type CampHierarchy } from '@/lib/nextcamp-api';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverview()
      .then(setOverview)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">백엔드에 연결할 수 없습니다</p>
        <p className="text-xs text-muted-foreground/60 mt-1">localhost:3300이 실행 중인지 확인하세요</p>
      </div>
    );
  }

  const campHierarchy = overview.campHierarchy ?? [];
  const unassignedTeams = overview.unassignedTeams ?? [];

  const totalMembers = campHierarchy.reduce(
    (sum, camp) => sum + camp.teams.reduce((s, t) => s + t.memberCount, 0), 0
  );

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">NextCamp</h1>
        <p className="text-sm text-muted-foreground">회사 현황</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="캠프" value={overview.camps} icon={<Monitor size={18} />} href="/camps" color="violet" />
        <StatCard label="팀" value={overview.teams} icon={<Users size={18} />} href="/teams" color="emerald" />
        <StatCard label="멤버" value={totalMembers} icon={<UserCircle size={18} />} href="/members" color="blue" />
        <StatCard label="역할 풀" value={overview.roles} icon={<Layers size={18} />} href="/growth" color="amber" />
      </div>

      {/* Camp Hierarchy */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
          조직 구조
        </h2>
        <div className="space-y-6">
          {campHierarchy.map(camp => (
            <CampBlock key={camp.id} camp={camp} />
          ))}

          {/* 미배치 팀 */}
          {unassignedTeams.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">미배치</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unassignedTeams.map(team => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <h4 className="text-sm font-semibold">{team.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">팀장: {team.leader} · {team.memberCount}명</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CampBlock({ camp }: { camp: CampHierarchy }) {
  const totalMembers = camp.teams.reduce((sum, t) => sum + t.memberCount, 0);
  const totalTasks = camp.teams.reduce(
    (sum, t) => sum + t.members.reduce((s, m) => s + m.total_tasks, 0), 0
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Camp header */}
      <Link
        href={`/camps/${camp.id}`}
        className="flex items-center justify-between px-6 py-4 border-b border-border hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Cpu size={18} className="text-violet-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{camp.name}</h3>
              {camp.always_on ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  상시
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-medium">수동</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{camp.machine}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{camp.teams.length}팀</span>
          <span>{totalMembers}명</span>
          {totalTasks > 0 && <span>{totalTasks}건 완료</span>}
          <ChevronRight size={14} className="text-muted-foreground/40" />
        </div>
      </Link>

      {/* Teams under this camp */}
      {camp.teams.length > 0 ? (
        <div className="divide-y divide-border">
          {camp.teams.map(team => (
            <div key={team.id} className="px-6 py-4">
              <Link
                href={`/teams/${team.id}`}
                className="flex items-center justify-between mb-3 group"
              >
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-emerald-500" />
                  <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">{team.name}</h4>
                  <span className="text-[11px] text-muted-foreground/50">{team.description}</span>
                </div>
                <ChevronRight size={12} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </Link>

              {/* Members */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 ml-5">
                {team.members.map(member => (
                  <Link
                    key={member.name}
                    href={`/members/${member.name}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-[11px] font-bold text-blue-500">
                      {member.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium truncate">{member.name}</span>
                        {member.is_leader && (
                          <Crown size={10} className="text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                        <span>{member.role}</span>
                        {member.total_tasks > 0 && (
                          <>
                            <span className="opacity-40">·</span>
                            <span>{member.total_tasks}건</span>
                          </>
                        )}
                        {member.learnedCount > 0 && (
                          <>
                            <span className="opacity-40">·</span>
                            <span className="text-amber-500">{member.learnedCount}규칙</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground/50">배치된 팀이 없습니다</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, href, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    violet: 'bg-violet-500/10 text-violet-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <Link
      href={href}
      className="p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}
