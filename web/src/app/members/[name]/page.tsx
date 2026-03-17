'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMember, type Member } from '@/lib/nextcamp-api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Crown,
  Calendar,
  CheckSquare,
  Zap,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Users2,
} from 'lucide-react';

function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: pct + '%',
            background: pct >= 80
              ? 'var(--color-green)'
              : pct >= 50
              ? 'var(--color-yellow)'
              : 'var(--color-red)',
          }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

function MemberDetailSkeleton() {
  return (
    <div className="max-w-3xl space-y-4 animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export default function MemberDetailPage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMember(decodedName)
      .then(setMember)
      .catch(() => setError('멤버 정보를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [decodedName]);

  if (loading) return <MemberDetailSkeleton />;

  if (error || !member) {
    return (
      <div className="max-w-3xl">
        <div className="text-center py-24 rounded-2xl border border-border bg-card">
          <p className="text-sm" style={{ color: 'var(--color-red)' }}>
            {error || '멤버를 찾을 수 없습니다'}
          </p>
          <Link href="/members" className="inline-block mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
            멤버 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const createdDate = new Date(member.created).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-3xl space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link
          href="/members"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted shrink-0 mt-1"
          style={{ background: 'var(--muted)' }}
        >
          <ArrowLeft size={15} className="text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: 'var(--agent-planner-soft)', color: 'var(--agent-planner)' }}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{member.name}</h1>
              {member.is_leader && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--color-yellow-soft)', color: 'var(--color-yellow)' }}
                >
                  <Crown size={10} />
                  리더
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{member.role}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span
                className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                style={{ background: 'var(--agent-reviewer-soft)', color: 'var(--agent-reviewer)' }}
              >
                {member.team}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar size={10} />
                {createdDate}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckSquare size={10} />
                {member.total_tasks}개 완료
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {member.strengths.length > 0 && (
        <Section icon={<Zap size={15} />} title="강점">
          <div className="flex flex-wrap gap-2">
            {member.strengths.map((s, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-xl font-medium"
                style={{ background: 'var(--color-green-soft)', color: 'var(--color-green)' }}
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Weaknesses */}
      {member.weaknesses.length > 0 && (
        <Section icon={<AlertTriangle size={15} />} title="약점">
          <div className="flex flex-wrap gap-2">
            {member.weaknesses.map((w, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-xl font-medium"
                style={{ background: 'var(--color-red-soft)', color: 'var(--color-red)' }}
              >
                {w}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Learned Rules */}
      {member.learned.length > 0 && (
        <Section icon={<BookOpen size={15} />} title="학습된 규칙">
          <div className="space-y-4">
            {member.learned.map((rule, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm text-foreground leading-relaxed">{rule.rule}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{rule.source}</span>
                  <span className="text-[10px] text-muted-foreground">{rule.added}</span>
                </div>
                <ConfidenceBar value={rule.confidence} />
                {i < member.learned.length - 1 && (
                  <div className="pt-2 border-b border-border" />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Growth Log */}
      {member.growth_log.length > 0 && (
        <Section icon={<TrendingUp size={15} />} title="성장 기록">
          <div className="space-y-0">
            {member.growth_log.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: 'var(--agent-planner)' }}
                  />
                  {i < member.growth_log.length - 1 && (
                    <div className="w-px flex-1 my-1" style={{ background: 'var(--border)' }} />
                  )}
                </div>
                <div className="pb-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-muted-foreground">{entry.date}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{entry.event}</p>
                  {entry.trigger && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      트리거: {entry.trigger}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Team Chemistry */}
      {member.team_chemistry && member.team_chemistry.length > 0 && (
        <Section icon={<Users2 size={15} />} title="팀 케미">
          <div className="space-y-3">
            {member.team_chemistry.map((chem, i) => (
              <div
                key={i}
                className="rounded-xl p-4 border border-border"
                style={{ background: 'var(--agent-reviewer-bg)' }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {chem.combo.map((c, j) => (
                      <span
                        key={j}
                        className="text-[11px] px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: 'var(--agent-reviewer-soft)', color: 'var(--agent-reviewer)' }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color: 'var(--agent-reviewer)' }}>
                      {Math.round(chem.success_rate * 100)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{chem.tasks}개 작업</div>
                  </div>
                </div>
                {chem.note && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{chem.note}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
