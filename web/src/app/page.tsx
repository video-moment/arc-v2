'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { getAgents, getSessions, type Agent, type ChatMessage } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import AgentCard from '@/components/AgentCard';

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const agentList = await getAgents();
        setAgents(agentList);

        // 각 에이전트의 최근 세션 → 최근 메시지 1개 로드
        const msgMap: Record<string, ChatMessage> = {};
        await Promise.all(
          agentList.map(async (agent) => {
            try {
              const sessions = await getSessions(agent.id);
              if (sessions.length > 0) {
                const { data } = await supabase
                  .from('chat_messages')
                  .select('*')
                  .eq('session_id', sessions[0].id)
                  .order('created_at', { ascending: false })
                  .limit(1);
                if (data && data[0]) {
                  msgMap[agent.id] = {
                    id: data[0].id,
                    sessionId: data[0].session_id,
                    role: data[0].role,
                    content: data[0].content,
                    mediaUrl: data[0].media_url,
                    mediaType: data[0].media_type,
                    createdAt: data[0].created_at,
                  };
                }
              }
            } catch {}
          })
        );
        setLastMessages(msgMap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();

    // 에이전트 상태 실시간 구독
    const channel = supabase
      .channel('agents-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new;
            setAgents(prev => {
              if (prev.some(a => a.id === n.id)) return prev;
              return [...prev, {
                id: n.id, name: n.name, description: n.description, type: n.type,
                status: n.status, lastSeen: n.last_seen,
                telegramBotToken: n.telegram_bot_token, telegramChatId: n.telegram_chat_id,
                metadata: n.metadata, createdAt: n.created_at, updatedAt: n.updated_at,
              }];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setAgents(prev =>
              prev.map(a =>
                a.id === updated.id
                  ? { ...a, name: updated.name, description: updated.description, status: updated.status, lastSeen: updated.last_seen }
                  : a
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAgents(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new;
          // session_id → agent_id 매핑 (이미 로드된 세션 기반)
          setLastMessages(prev => {
            const updated = { ...prev };
            for (const [agentId, existing] of Object.entries(prev)) {
              if (existing.sessionId === msg.session_id) {
                updated[agentId] = {
                  id: msg.id,
                  sessionId: msg.session_id,
                  role: msg.role,
                  content: msg.content,
                  mediaUrl: msg.media_url,
                  mediaType: msg.media_type,
                  createdAt: msg.created_at,
                };
                break;
              }
            }
            return updated;
          });
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
                {online.map(a => <AgentCard key={a.id} agent={a} lastMessage={lastMessages[a.id]} />)}
              </div>
            </section>
          )}
          {offline.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
                오프라인 ({offline.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {offline.map(a => <AgentCard key={a.id} agent={a} lastMessage={lastMessages[a.id]} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
