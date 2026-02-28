'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAgent, getSessions, createSession, getMessages, sendMessage, sendTelegram, syncTelegram, type Agent, type ChatMessage } from '@/lib/api';
import { useRealtimeMessages } from '@/lib/ws';
import ChatBubble from '@/components/ChatBubble';
import StatusBadge from '@/components/StatusBadge';
import TypingIndicator from '@/components/TypingIndicator';

export default function AgentChatPage() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loading, setLoading] = useState(true);
  const [waitingReply, setWaitingReply] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set<string>());
  const syncingRef = useRef(false);
  const originalTitle = useRef('');

  // 에이전트 로드 + 세션 자동 생성/조회
  useEffect(() => {
    originalTitle.current = document.title;

    (async () => {
      try {
        const [agentData, sessions] = await Promise.all([
          getAgent(id),
          getSessions(id),
        ]);
        setAgent(agentData);

        let sid: string;
        if (sessions.length > 0) {
          sid = sessions[0].id;
        } else {
          const newSession = await createSession(id, agentData.name + ' 대화');
          sid = newSession.id;
        }
        setSessionId(sid);

        const msgs = await getMessages(sid);
        setMessages(msgs);
        msgs.forEach(m => seenIds.current.add(m.id));

        // 페이지 로드 시 1회 동기화
        syncTelegram(id).catch(() => {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    return () => { document.title = originalTitle.current; };
  }, [id]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 탭 복귀 시 읽음 처리
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setUnreadCount(0);
        document.title = originalTitle.current;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleNewMessage = useCallback((msg: ChatMessage) => {
    if (!seenIds.current.has(msg.id)) {
      seenIds.current.add(msg.id);
      setMessages(prev => [...prev, msg]);

      // assistant 메시지 수신 시 타이핑 인디케이터 해제
      if (msg.role === 'assistant') {
        setWaitingReply(false);
      }

      // 탭 비활성 시 읽지 않은 메시지 카운트 + 브라우저 알림
      if (document.visibilityState === 'hidden' && msg.role === 'assistant') {
        setUnreadCount(prev => {
          const next = prev + 1;
          document.title = `(${next}) ${originalTitle.current}`;
          return next;
        });

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const n = new Notification('새 메시지', {
            body: msg.content.slice(0, 100) || '미디어 메시지',
            icon: '/favicon.ico',
          });
          n.onclick = () => { window.focus(); n.close(); };
        }
      }
    }
  }, []);

  useRealtimeMessages(sessionId, handleNewMessage);

  // 텔레그램 메시지 주기적 동기화 (3초마다)
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      syncTelegram(id).catch(() => {}).finally(() => { syncingRef.current = false; });
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waitingReply]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !sessionId) return;

    setSending(true);
    setSendError('');
    setInput('');
    try {
      // Supabase에 저장
      const msg = await sendMessage(sessionId, text);
      seenIds.current.add(msg.id);
      setMessages(prev => [...prev, msg]);

      // 텔레그램 전송
      await sendTelegram(id, text);

      // 타이핑 인디케이터 표시
      setWaitingReply(true);

      // 봇 답변 대기 후 1회 동기화 (잠금으로 중복 방지)
      setTimeout(async () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        try {
          await syncTelegram(id);
        } finally {
          syncingRef.current = false;
        }
      }, 3000);
    } catch (err: any) {
      console.error('Send error:', err);
      setSendError(err?.message || '메시지 전송 실패');
      setInput(text);
    } finally {
      setSending(false);
    }
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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl animate-fade-in">
      {/* Header */}
      <div
        className="flex items-center gap-4 pb-4 mb-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link
          href="/"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-hover)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </Link>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'var(--accent-soft)' }}
        >
          ⚡
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold">{agent.name}</h1>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {agent.description || agent.type} · {agent.id}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        {messages.length === 0 && !waitingReply && (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>아직 메시지가 없습니다</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>메시지를 보내거나 텔레그램에서 대화를 시작하세요</p>
          </div>
        )}
        {messages.map(m => <ChatBubble key={m.id} message={m} />)}
        {waitingReply && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        {sendError && (
          <p className="text-xs mb-2 px-1" style={{ color: 'var(--red)' }}>{sendError}</p>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-[var(--accent)]/30"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-30 cursor-pointer hover:brightness-110"
            style={{ background: 'var(--gradient-accent)', color: 'white', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}
          >
            {sending ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
