'use client';

import { useState, useEffect } from 'react';
import type { SessionDetail as SessionDetailType, AgentMessage } from '@/lib/arc-types';
import { getSessionDetail } from '@/lib/arc-admin-api';

const STATUS_LABEL: Record<string, { text: string; color: string; soft: string }> = {
  completed: { text: '완료', color: 'var(--green)', soft: 'var(--green-soft)' },
  running: { text: '실행중', color: 'var(--blue)', soft: 'var(--blue-soft)' },
  error: { text: '오류', color: 'var(--red)', soft: 'var(--red-soft)' },
  idle: { text: '대기', color: 'var(--text-tertiary)', soft: 'var(--bg-hover)' },
  paused: { text: '일시정지', color: 'var(--yellow)', soft: 'var(--yellow-soft)' },
};

const AGENT_COLORS: Record<string, string> = {
  planner: 'var(--agent-planner)',
  actor: 'var(--agent-actor)',
  reviewer: 'var(--agent-reviewer)',
  user: 'var(--accent)',
  system: 'var(--text-tertiary)',
};

interface SessionDetailProps {
  sessionId: string;
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const [session, setSession] = useState<SessionDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSessionDetail(sessionId)
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>로딩 중...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>세션 정보를 불러올 수 없습니다</span>
      </div>
    );
  }

  const status = STATUS_LABEL[session.status] || STATUS_LABEL.idle;

  return (
    <div>
      {/* Header */}
      <div
        className="flex items-center gap-3 mb-4 pb-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          {session.sessionId.slice(0, 12)}
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: status.soft, color: status.color, border: '1px solid ' + status.color + '30' }}
        >
          {status.text}
        </span>
        <span className="text-[10px] ml-auto tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(session.createdAt).toLocaleString('ko-KR')}
        </span>
      </div>

      {/* Metadata */}
      {session.metadata && (
        <div
          className="flex gap-4 mb-4 px-3 py-2 rounded-lg text-[11px]"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}
        >
          <span>턴: <strong style={{ color: 'var(--text-secondary)' }}>{session.metadata.totalTurns}</strong></span>
          <span>리비전: <strong style={{ color: 'var(--text-secondary)' }}>{session.metadata.revisionCount}</strong></span>
          <span>소요 시간: <strong style={{ color: 'var(--text-secondary)' }}>{(session.metadata.durationMs / 1000).toFixed(1)}s</strong></span>
        </div>
      )}

      {/* Flags notice */}
      {session.flags.length > 0 && (
        <div
          className="mb-4 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow)20', color: 'var(--yellow)' }}
        >
          이 세션에서 <strong>{session.flags.length}개</strong>의 플래그가 발견됨
        </div>
      )}

      {/* Messages timeline */}
      <div className="space-y-1">
        {session.messages.map((msg: AgentMessage) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        {session.messages.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            메시지가 없습니다
          </p>
        )}
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: AgentMessage }) {
  const [expanded, setExpanded] = useState(false);
  const color = AGENT_COLORS[message.from] || 'var(--text-tertiary)';
  const isLong = message.content.length > 200;

  return (
    <div
      className="px-3 py-2.5 rounded-lg transition-colors cursor-pointer"
      style={{ borderLeft: '2px solid ' + color }}
      onClick={() => isLong && setExpanded(!expanded)}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-bold uppercase" style={{ color }}>
          {message.from}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>
          {message.type}
        </span>
        {message.to !== 'system' && (
          <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
            &rarr; {message.to}
          </span>
        )}
        <span className="text-[9px] ml-auto tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(message.timestamp).toLocaleTimeString('ko-KR')}
        </span>
      </div>
      <p
        className={`text-[12px] leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {message.content}
      </p>
      {isLong && !expanded && (
        <span className="text-[10px]" style={{ color: 'var(--accent-hover)' }}>...더 보기</span>
      )}
    </div>
  );
}
