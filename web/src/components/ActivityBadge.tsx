import type { ChatMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  status: string;
  lastMessage?: ChatMessage | null;
}

const ACTIVITY: Record<string, { bgClass: string; textClass: string; label: string }> = {
  active:   { bgClass: 'bg-blue-500/10',                  textClass: 'text-blue-600',        label: '활동 중' },
  idle:     { bgClass: 'bg-muted-foreground/8',           textClass: 'text-muted-foreground', label: '대기 중' },
  offline:  { bgClass: 'bg-muted-foreground/8',           textClass: 'text-muted-foreground', label: '비활성' },
  schedule: { bgClass: 'bg-yellow-500/10',                textClass: 'text-yellow-600',       label: '스케줄 진행' },
};

export function getActivity(agentStatus: string, lastMessage?: ChatMessage | null) {
  if (agentStatus !== 'online') return ACTIVITY.offline;

  if (lastMessage) {
    const content = lastMessage.content || '';
    if (content.includes('[스케줄]') || content.includes('📋')) {
      return ACTIVITY.schedule;
    }
  }

  return ACTIVITY.active;
}

export default function ActivityBadge({ status, lastMessage }: Props) {
  const activity = getActivity(status, lastMessage);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold',
        activity.bgClass,
        activity.textClass
      )}
    >
      {activity.label}
    </span>
  );
}
