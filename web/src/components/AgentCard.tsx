import Link from 'next/link';
import StatusBadge from './StatusBadge';
import type { Agent } from '@/lib/api';

function timeAgo(ts: string | number): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return mins + '분 전';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + '시간 전';
  const days = Math.floor(hrs / 24);
  return days + '일 전';
}

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  telegram: { icon: '✈', label: '텔레그램', color: '#2AABEE' },
  discord:  { icon: '🎮', label: '디스코드', color: '#5865F2' },
  slack:    { icon: '💬', label: '슬랙',    color: '#4A154B' },
  custom:   { icon: '⚡', label: '커스텀',  color: 'var(--accent)' },
};

export default function AgentCard({ agent }: { agent: Agent }) {
  const meta = TYPE_META[agent.type] || TYPE_META.custom;

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group block rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 animate-fade-in"
      style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'var(--bg-hover)' }}
          >
            {meta.icon}
          </div>
          <div>
            <h3 className="font-semibold text-sm group-hover:text-[var(--accent-hover)] transition-colors">
              {agent.name}
            </h3>
            <span className="text-[11px]" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
        {agent.description || '설명 없음'}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          마지막 활동 {timeAgo(agent.lastSeen)}
        </span>
        <span
          className="text-[11px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}
        >
          상세보기 →
        </span>
      </div>
    </Link>
  );
}
