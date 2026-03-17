'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { getMembers, type Member, type GrowthEntry, type LearnedRule } from '@/lib/nextcamp-api';
import { Skeleton } from '@/components/ui/skeleton';

interface FlatGrowthEntry extends GrowthEntry {
  memberName: string;
}

interface FlatLearnedRule extends LearnedRule {
  memberName: string;
}

export default function GrowthPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembers()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Flatten and sort all growth log entries by date descending
  const allGrowthEntries: FlatGrowthEntry[] = loading
    ? []
    : members
        .flatMap((m) =>
          (m.growth_log || []).map((entry) => ({ ...entry, memberName: m.name }))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Flatten all learned rules
  const allLearnedRules: FlatLearnedRule[] = loading
    ? []
    : members.flatMap((m) =>
        (m.learned || []).map((rule) => ({ ...rule, memberName: m.name }))
      );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--primary)', opacity: 0.9 }}
        >
          <TrendingUp size={20} color="white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            성장 현황
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            전체 멤버의 학습 기록과 성장 로그
          </p>
        </div>
      </div>

      {/* Section 1: 전체 성장 기록 */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          전체 성장 기록
        </h2>
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          {loading ? (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-4 w-20 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : allGrowthEntries.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
              성장 기록이 없습니다
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {allGrowthEntries.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4">
                  <span
                    className="text-[11px] shrink-0 mt-0.5 font-mono"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {entry.date}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={'/members/' + entry.memberName}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      {entry.memberName}
                    </Link>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {entry.event}
                    </p>
                    {entry.trigger && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        트리거: {entry.trigger}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: 학습된 규칙 현황 */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          학습된 규칙 현황
        </h2>
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border p-4"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex gap-4 mt-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : allLearnedRules.length === 0 ? (
            <div
              className="rounded-2xl border p-6 text-center"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                학습된 규칙이 없습니다
              </p>
            </div>
          ) : (
            allLearnedRules.map((rule, idx) => {
              const confidencePct = Math.round((rule.confidence ?? 0) * 100);
              return (
                <div
                  key={idx}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Link
                      href={'/members/' + rule.memberName}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      {rule.memberName}
                    </Link>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {confidencePct}%
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                    {rule.rule}
                  </p>
                  {/* Confidence bar */}
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden mb-2"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: confidencePct + '%',
                        background:
                          confidencePct >= 80
                            ? '#10b981'
                            : confidencePct >= 50
                            ? 'var(--primary)'
                            : '#f59e0b',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    {rule.source && (
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        출처: {rule.source}
                      </span>
                    )}
                    {rule.added && (
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {rule.added}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Section 3: 강점/약점 요약 */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          강점 / 약점 요약
        </h2>
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border p-4"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
              >
                <Skeleton className="h-4 w-24 mb-3" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
              </div>
            ))
          ) : members.length === 0 ? (
            <div
              className="rounded-2xl border p-6 text-center"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                멤버 데이터가 없습니다
              </p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl border p-4"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
              >
                <Link
                  href={'/members/' + member.name}
                  className="text-sm font-semibold hover:underline inline-block mb-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {member.name}
                  {member.is_leader && (
                    <span
                      className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full align-middle"
                      style={{ background: 'var(--primary)', color: 'white', opacity: 0.85 }}
                    >
                      리더
                    </span>
                  )}
                </Link>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-medium mb-1.5" style={{ color: '#10b981' }}>
                      강점
                    </p>
                    {(member.strengths || []).length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        없음
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {member.strengths.map((s, i) => (
                          <li
                            key={i}
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            · {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium mb-1.5" style={{ color: '#f59e0b' }}>
                      약점
                    </p>
                    {(member.weaknesses || []).length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        없음
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {member.weaknesses.map((w, i) => (
                          <li
                            key={i}
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            · {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
