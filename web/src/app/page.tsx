'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { getAgents, type Agent } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import AgentCard from '@/components/AgentCard';

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));

    // 에이전트 상태 실시간 구독
    const channel = supabase
      .channel('agents-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agents' },
        (payload) => {
          const updated = payload.new;
          setAgents(prev =>
            prev.map(a =>
              a.id === updated.id
                ? { ...a, status: updated.status, lastSeen: updated.last_seen }
                : a
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const online = agents.filter(a => a.status === 'online');
  const offline = agents.filter(a => a.status !== 'online');

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">에이전트</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          총 {agents.length}개 등록 · {online.length}개 온라인
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-20 justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>불러오는 중...</span>
        </div>
      ) : agents.length === 0 ? (
        <div
          className="text-center py-24 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/>
            </svg>
          </div>
          <p className="font-medium mb-1">등록된 에이전트가 없습니다</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>MCP 또는 API를 통해 에이전트를 등록하세요</p>
        </div>
      ) : (
        <div className="space-y-8">
          {online.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--green)' }} />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--green)' }}>
                  온라인 ({online.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {online.map(a => <AgentCard key={a.id} agent={a} />)}
              </div>
            </section>
          )}
          {offline.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
                오프라인 ({offline.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {offline.map(a => <AgentCard key={a.id} agent={a} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
