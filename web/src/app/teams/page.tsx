'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTeams, getCamps, getRoles, type Team, type Camp, type Role } from '@/lib/nextcamp-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Crown, ArrowRight, Plus } from 'lucide-react';
import CreateTeamDialog from '@/components/CreateTeamDialog';

function TeamCardSkeleton() {
  return (
    <div className="rounded-2xl p-5 border border-border bg-card">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-3 border-t border-border">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  return (
    <Link href={`/teams/${team.id}`} className="block group">
      <div className="rounded-2xl p-5 border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-primary/10 text-primary">
              {team.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                {team.name}
              </h3>
              <p className="text-[12px] leading-snug line-clamp-2 text-muted-foreground">
                {team.description || '설명 없음'}
              </p>
            </div>
          </div>
          <ArrowRight size={14} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
        </div>

        <div className="flex items-center gap-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Crown size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{team.leader.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{team.members.length}명</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([getTeams(), getCamps(), getRoles()])
      .then(([t, c, r]) => { setTeams(t); setCamps(c); setRoles(r); })
      .catch(err => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">팀</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '불러오는 중...' : `${teams.length}개 팀`}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} /> 팀 만들기
        </button>
      </div>

      {error && (
        <div className="rounded-2xl p-4 mb-6 text-sm bg-destructive/10 text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <TeamCardSkeleton key={i} />)
          : teams.length === 0
          ? (
            <div className="col-span-full text-center py-24 rounded-2xl border border-border bg-card">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-primary/10">
                <Users size={28} className="text-primary" />
              </div>
              <p className="font-medium mb-1">아직 팀이 없습니다</p>
              <p className="text-xs text-muted-foreground mb-4">팀을 만들어 에이전트를 구성하세요</p>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-sm text-primary font-medium hover:underline"
              >
                첫 번째 팀 만들기
              </button>
            </div>
          )
          : teams.map(team => <TeamCard key={team.id} team={team} />)
        }
      </div>

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        camps={camps}
        roles={roles}
        onCreated={loadData}
      />
    </div>
  );
}
