'use client';

import type { DashboardStats } from '@/lib/arc-types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const completionRate = stats.totalSessions > 0
    ? ((stats.completedSessions / stats.totalSessions) * 100).toFixed(0)
    : '0';

  const avgDurationSec = Math.round(stats.avgDurationMs / 1000);

  const cards = [
    {
      label: '총 세션',
      value: stats.totalSessions,
      sub: stats.completedSessions + ' 완료 / ' + stats.errorSessions + ' 오류',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      color: 'var(--blue)',
      soft: 'var(--blue-soft)',
    },
    {
      label: '완료율',
      value: completionRate + '%',
      sub: stats.completedSessions + '/' + stats.totalSessions,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'var(--green)',
      soft: 'var(--green-soft)',
    },
    {
      label: '총 플래그',
      value: stats.totalFlags,
      sub: stats.pendingFlags + ' 대기중',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21V3h18l-6 9 6 9H3z" />
        </svg>
      ),
      color: 'var(--yellow)',
      soft: 'var(--yellow-soft)',
    },
    {
      label: '평균 턴',
      value: stats.avgTurnsPerSession.toFixed(1),
      sub: '평균 ' + avgDurationSec + '초',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      color: 'var(--accent)',
      soft: 'var(--accent-soft)',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(card => (
        <div
          key={card.label}
          className="glass p-4"
          style={{ borderLeft: '3px solid ' + card.color }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: card.color, opacity: 0.7 }}>{card.icon}</span>
          </div>
          <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {card.value}
          </div>
          <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {card.label}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
