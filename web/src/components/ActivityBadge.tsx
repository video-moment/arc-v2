import type { ChatMessage } from '@/lib/api';

interface Props {
  status: string;
  lastMessage?: ChatMessage | null;
}

const ACTIVITY: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: 'var(--blue-soft)',   color: 'var(--blue)',           label: '활동 중' },
  idle:    { bg: 'rgba(113,113,122,0.08)', color: 'var(--text-tertiary)', label: '대기 중' },
  offline: { bg: 'rgba(113,113,122,0.08)', color: 'var(--text-tertiary)', label: '비활성' },
  schedule:{ bg: 'var(--yellow-soft)', color: 'var(--yellow)',         label: '스케줄 진행' },
};

export function getActivity(agentStatus: string, lastMessage?: ChatMessage | null) {
  if (agentStatus !== 'online') return ACTIVITY.offline;

  if (!lastMessage) return ACTIVITY.idle;

  const content = lastMessage.content || '';
  if (content.includes('[스케줄]') || content.includes('📋')) {
    return ACTIVITY.schedule;
  }

  const diff = Date.now() - new Date(lastMessage.createdAt).getTime();
  if (diff < 5 * 60 * 1000) return ACTIVITY.active;

  return ACTIVITY.idle;
}

export default function ActivityBadge({ status, lastMessage }: Props) {
  const activity = getActivity(status, lastMessage);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: activity.bg, color: activity.color }}
    >
      {activity.label}
    </span>
  );
}
