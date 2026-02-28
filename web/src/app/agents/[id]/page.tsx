'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAgent, getSessions, createSession, type Agent, type ChatSession } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

function formatDate(ts: string | number): string {
  return new Date(ts).toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAgent(id), getSessions(id)])
      .then(([a, s]) => { setAgent(a); setSessions(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleNewSession = async () => {
    const title = '세션 ' + (sessions.length + 1);
    const session = await createSession(id, title);
    router.push('/agents/' + id + '/chat/' + session.id);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-20 justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>불러오는 중...</span>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: 'var(--red)' }}>에이전트를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors hover:text-[var(--accent-hover)]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        에이전트 목록
      </Link>

      {/* Agent Info */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'var(--accent-soft)' }}
            >
              ⚡
            </div>
            <div>
              <h1 className="text-xl font-bold">{agent.name}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {agent.description || '설명 없음'}
              </p>
            </div>
          </div>
          <StatusBadge status={agent.status} size="md" />
        </div>

        <div
          className="grid grid-cols-3 gap-6 pt-5 text-xs"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div>
            <span className="block font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>유형</span>
            <span style={{ color: 'var(--text-primary)' }}>{agent.type}</span>
          </div>
          <div>
            <span className="block font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>ID</span>
            <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)' }}>{agent.id}</code>
          </div>
          <div>
            <span className="block font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>마지막 활동</span>
            <span style={{ color: 'var(--text-primary)' }}>{formatDate(agent.lastSeen)}</span>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">대화 세션</h2>
        <button
          onClick={handleNewSession}
          className="text-[13px] px-4 py-2.5 rounded-xl font-semibold transition-all duration-150 cursor-pointer hover:brightness-110"
          style={{ background: 'var(--gradient-accent)', color: 'white', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}
        >
          + 새 세션
        </button>
      </div>

      {sessions.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>아직 대화 세션이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <Link
              key={s.id}
              href={'/agents/' + id + '/chat/' + s.id}
              className="group flex items-center justify-between p-4 rounded-xl transition-all duration-150"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium group-hover:text-[var(--accent-hover)] transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDate(s.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={s.status} />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
