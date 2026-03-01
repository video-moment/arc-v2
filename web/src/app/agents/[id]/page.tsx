'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAgent, getSessions, createSession, getMessages, sendTelegram, syncTelegram, updateAgent, getScheduleMessages, type Agent, type ChatMessage } from '@/lib/api';
import ChatBubble from '@/components/ChatBubble';
import StatusBadge from '@/components/StatusBadge';
import TypingIndicator from '@/components/TypingIndicator';

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span className="text-[11px] font-medium px-2" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  );
}

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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [schedules, setSchedules] = useState<ChatMessage[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // 스크롤 위치 감지 — 바닥에서 멀면 스크롤 버튼 표시
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 텔레그램 메시지 주기적 동기화 (탭 활성 시에만 3초마다)
  useEffect(() => {
    if (!id || !sessionId) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    const doSync = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncTelegram(id);
        const freshMessages = await getMessages(sessionId);
        let hasNewAssistant = false;
        for (const msg of freshMessages) {
          if (!seenIds.current.has(msg.id)) {
            seenIds.current.add(msg.id);
            if (msg.role === 'assistant') {
              hasNewAssistant = true;
              // 브라우저 알림
              if (document.visibilityState === 'hidden') {
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
  }, [id, sessionId]);

  useEffect(() => {
    if (!showScrollBtn) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, waitingReply]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // textarea 자동 높이 조절
  const adjustTextareaHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !sessionId) return;

    setSending(true);
    setSendError('');
    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    try {
      // 낙관적 UI: 임시 메시지 표시 (DB 삽입 X — syncTelegram이 처리)
      const tempId = '_temp_' + Date.now();
      setMessages(prev => [...prev, {
        id: tempId,
        sessionId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      }]);

      await sendTelegram(id, text);

      setWaitingReply(true);
    } catch (err: any) {
      console.error('Send error:', err);
      setSendError(err?.message || '메시지 전송 실패');
      setInput(text);
      // 실패 시 낙관적 메시지 제거
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

  // 날짜 구분선 삽입을 위한 메시지 + 날짜 매핑
  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    let lastDate = '';

    for (const m of messages) {
      const msgDate = new Date(m.createdAt).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        items.push(<DateSeparator key={'date-' + msgDate} label={formatDateLabel(m.createdAt)} />);
      }
      items.push(<ChatBubble key={m.id} message={m} />);
    }
    return items;
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={async () => {
                  const trimmed = editName.trim();
                  if (trimmed && trimmed !== agent.name) {
                    const updated = await updateAgent(id, { name: trimmed });
                    setAgent(updated);
                  }
                  setEditingName(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') { setEditName(agent.name); setEditingName(false); }
                }}
                className="text-sm font-bold outline-none rounded px-1 -ml-1"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
              />
            ) : (
              <h1
                className="text-sm font-bold cursor-pointer hover:text-[var(--accent)] transition-colors"
                onClick={() => { setEditName(agent.name); setEditingName(true); }}
                title="클릭하여 이름 수정"
              >
                {agent.name}
              </h1>
            )}
            <StatusBadge status={agent.status} />
          </div>
          {editingDesc ? (
            <input
              autoFocus
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              onBlur={async () => {
                const trimmed = editDesc.trim();
                if (trimmed !== (agent.description || '')) {
                  const updated = await updateAgent(id, { description: trimmed });
                  setAgent(updated);
                }
                setEditingDesc(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') { setEditDesc(agent.description || ''); setEditingDesc(false); }
              }}
              className="text-[11px] mt-0.5 outline-none rounded px-1 -ml-1 w-full"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--accent)', color: 'var(--text-tertiary)' }}
              placeholder="설명을 입력하세요"
            />
          ) : (
            <p
              className="text-[11px] mt-0.5 cursor-pointer hover:text-[var(--text-secondary)] transition-colors truncate"
              style={{ color: 'var(--text-tertiary)' }}
              onClick={() => { setEditDesc(agent.description || ''); setEditingDesc(true); }}
              title="클릭하여 설명 수정"
            >
              {agent.description || agent.type} · {agent.id}
            </p>
          )}
        </div>
        <button
          onClick={async () => {
            if (!showSchedule && schedules.length === 0) {
              setLoadingSchedule(true);
              try {
                const msgs = await getScheduleMessages(id);
                setSchedules(msgs);
              } catch (e) { console.error(e); }
              setLoadingSchedule(false);
            }
            setShowSchedule(!showSchedule);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          style={{ background: showSchedule ? 'var(--accent-soft)' : 'var(--bg-hover)', color: showSchedule ? 'var(--accent)' : 'var(--text-secondary)' }}
          title="자동화 스케줄"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>

      {/* Schedule Panel */}
      {showSchedule && (
        <div
          className="mb-4 rounded-xl overflow-hidden animate-fade-in"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>자동화 스케줄</h3>
            <button
              onClick={() => setShowSchedule(false)}
              className="text-[11px] cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
            >
              닫기
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {loadingSchedule ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>불러오는 중...</span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>등록된 스케줄이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {schedules.map(msg => (
                  <div key={msg.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{
                        background: msg.role === 'assistant' ? 'var(--accent-soft)' : 'var(--bg-hover)',
                        color: msg.role === 'assistant' ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                        {msg.role === 'assistant' ? '에이전트' : '사용자'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(msg.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                      {msg.content.replace(/#+\s/g, '').replace(/\*+([^*]+)\*+/g, '$1').trim()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-2 pb-4 relative">
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
        {renderMessages()}
        {waitingReply && <TypingIndicator />}
        <div ref={bottomRef} />

        {/* 스크롤 투 바텀 버튼 */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:brightness-110 cursor-pointer animate-fade-in"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 12px rgba(139,92,246,0.4)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Input */}
      <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        {sendError && (
          <p className="text-xs mb-2 px-1" style={{ color: 'var(--red)' }}>{sendError}</p>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); adjustTextareaHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            rows={1}
            className="flex-1 rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-30 cursor-pointer hover:brightness-110 shrink-0"
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
