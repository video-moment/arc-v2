'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMembers, type Member } from '@/lib/nextcamp-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Crown, CheckSquare } from 'lucide-react';

function MemberCard({ member }: { member: Member }) {
  return (
    <Link
      href={`/members/${encodeURIComponent(member.name)}`}
      className="block rounded-2xl p-5 border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'var(--agent-planner-soft)', color: 'var(--agent-planner)' }}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm text-foreground truncate">{member.name}</h3>
              {member.is_leader && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: 'var(--color-yellow-soft)', color: 'var(--color-yellow)' }}>
                  <Crown size={9} />
                  리더
                </span>
              )}
            </div>
            <p className="text-[11px] mt-0.5 text-muted-foreground truncate">{member.role}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span
          className="text-[11px] px-2 py-1 rounded-lg font-medium"
          style={{ background: 'var(--agent-reviewer-soft)', color: 'var(--agent-reviewer)' }}
        >
          {member.team}
        </span>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <CheckSquare size={11} />
          <span>{member.total_tasks}개 완료</span>
        </div>
      </div>
    </Link>
  );
}

function MemberCardSkeleton() {
  return (
    <div className="rounded-2xl p-5 border border-border bg-card">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMembers()
      .then(setMembers)
      .catch(() => setError('멤버 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--agent-planner-soft)' }}>
          <Users size={18} style={{ color: 'var(--agent-planner)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">멤버</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground">{members.length}명의 멤버</p>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-center py-12 rounded-2xl border border-border bg-card"
          style={{ color: 'var(--color-red)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <MemberCardSkeleton key={i} />)
          : members.map(m => <MemberCard key={m.name} member={m} />)
        }
      </div>

      {!loading && members.length === 0 && !error && (
        <div className="text-center py-24 rounded-2xl border border-border bg-card">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--agent-planner-soft)' }}>
            <Users size={28} style={{ color: 'var(--agent-planner)' }} />
          </div>
          <p className="font-medium mb-1">등록된 멤버가 없습니다</p>
          <p className="text-xs text-muted-foreground">팀에 멤버를 추가하세요</p>
        </div>
      )}
    </div>
  );
}
