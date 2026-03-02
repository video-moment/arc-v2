'use client';

import { useEffect, useState, useRef } from 'react';
import { getSessions, createSession, getMessages, sendTelegram, syncTelegram, type Agent, type ChatMessage } from '@/lib/api';
import ChatBubble from '@/components/ChatBubble';
import StatusBadge from '@/components/StatusBadge';
import TypingIndicator from '@/components/TypingIndicator';

interface ChatPaneProps {
  agentId: string;
  agents: Agent[];
  onChangeAgent: (newId: string) => void;
}

export default function ChatPane({ agentId, agents, onChangeAgent }: ChatPaneProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitingReply, setWaitingReply] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set<string>());
  const syncingRef = useRef(false);

  const agent = agents.find(a => a.id === agentId);

  // 세션 로드
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setSessionId(null);
    seenIds.current.clear();

    (async () => {
      try {
        const sessions = await getSessions(agentId);
        let sid: string;
        if (sessions.length > 0) {
          sid = sessions[0].id;
        } else {
          const newSession = await createSession(agentId, (agent?.name || agentId) + ' 대화');
          sid = newSession.id;
        }
        setSessionId(sid);
        const msgs = await getMessages(sid);
        setMessages(msgs);
        msgs.forEach(m => seenIds.current.add(m.id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  // 폴링
  useEffect(() => {
    if (!agentId || !sessionId) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    const doSync = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncTelegram(agentId);
        const freshMessages = await getMessages(sessionId);
        let hasNewAssistant = false;
        for (const msg of freshMessages) {
          if (!seenIds.current.has(msg.id)) {
            seenIds.current.add(msg.id);
            if (msg.role === 'assistant') hasNewAssistant = true;
          }
        }
        setMessages(freshMessages);
        if (hasNewAssistant) setWaitingReply(false);
      } catch {}
      syncingRef.current = false;
    };

    const startPolling = () => {
      if (interval) return;
      doSync();
      interval = setInterval(doSync, 3000);
    };

    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') startPolling();
      else stopPolling();
    };

    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [agentId, sessionId]);

  // 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waitingReply]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !sessionId) return;

    setSending(true);
    setInput('');
    try {
      const tempId = '_temp_' + Date.now();
      setMessages(prev => [...prev, {
        id: tempId, sessionId, role: 'user', content: text, createdAt: new Date().toISOString(),
      }]);
      await sendTelegram(agentId, text);
      setWaitingReply(true);
    } catch (err: any) {
      console.error('Send error:', err);
      setInput(text);
      setMessages(prev => prev.filter(m => !m.id.startsWith('_temp_')));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
          style={{ background: 'var(--accent-soft)' }}
        >
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {agent?.name || agentId}
            </span>
            {agent && <StatusBadge status={agent.status} size="sm" />}
          </div>
        </div>
        <select
          value={agentId}
          onChange={e => onChangeAgent(e.target.value)}
          className="text-[10px] rounded-md px-1.5 py-1 outline-none cursor-pointer"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>불러오는 중...</span>
          </div>
        ) : messages.length === 0 && !waitingReply ? (
          <div className="text-center py-8">
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>메시지 없음</p>
          </div>
        ) : (
          <>
            {messages.map(m => (
              <ChatBubble key={m.id} message={m} compact />
            ))}
            {waitingReply && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력..."
            className="flex-1 rounded-lg px-3 py-2 text-[11px] outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-3 py-2 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-30 cursor-pointer hover:brightness-110 shrink-0"
            style={{ background: 'var(--gradient-accent)', color: 'white' }}
          >
            {sending ? (
              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
