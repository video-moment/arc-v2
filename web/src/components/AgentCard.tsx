import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import ActivityBadge from './ActivityBadge';
import type { Agent, ChatMessage } from '@/lib/api';

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

const TYPE_META: Record<string, { icon: string; label: string; colorClass: string }> = {
  telegram: { icon: '✈', label: '텔레그램', colorClass: 'text-sky-500' },
  discord:  { icon: '🎮', label: '디스코드', colorClass: 'text-indigo-500' },
  slack:    { icon: '💬', label: '슬랙',    colorClass: 'text-purple-800' },
  custom:   { icon: '⚡', label: '커스텀',  colorClass: 'text-primary' },
};

interface Props {
  agent: Agent;
  lastMessage?: ChatMessage | null;
}

export default function AgentCard({ agent, lastMessage }: Props) {
  const meta = TYPE_META[agent.type] || TYPE_META.custom;
  const lastActivity = lastMessage
    ? Math.max(new Date(agent.lastSeen).getTime(), new Date(lastMessage.createdAt).getTime())
    : agent.lastSeen;

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group block rounded-2xl transition-all duration-200 hover:-translate-y-0.5 animate-fade-in"
    >
      <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-accent">
                {meta.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  {agent.name}
                </h3>
                <span className={`text-[11px] font-medium ${meta.colorClass}`}>
                  {meta.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={agent.status} />
              <ActivityBadge status={agent.status} lastMessage={lastMessage} />
            </div>
          </div>

          <p className="text-xs leading-relaxed mb-3 line-clamp-2 text-muted-foreground">
            {agent.description || '설명 없음'}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/60">
              마지막 활동 {timeAgo(lastActivity)}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
              상세보기
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
