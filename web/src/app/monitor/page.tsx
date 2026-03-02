'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getAgents, type Agent } from '@/lib/api';
import ChatPane from '@/components/ChatPane';
import { useSidebar } from '@/components/SidebarContext';

export default function MonitorPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [slots, setSlots] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [focusedSlot, setFocusedSlot] = useState(0);
  const { collapsed } = useSidebar();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    (async () => {
      try {
        const allAgents = await getAgents();
        setAgents(allAgents);
        const online = allAgents.filter(a => a.status === 'online');
        const offline = allAgents.filter(a => a.status !== 'online');
        const sorted = [...online, ...offline];
        const initial = Array.from({ length: 4 }, (_, i) => sorted[i]?.id || '');
        setSlots(initial);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cmd+1~4 단축키 + 좌우 방향키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+1 ~ Cmd+4
      if (e.metaKey && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        setFocusedSlot(idx);
        setTimeout(() => inputRefs.current[idx]?.focus(), 50);
        return;
      }

      // 좌우 방향키 (입력창에 텍스트가 없을 때만)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const active = document.activeElement as HTMLInputElement;
        // 입력창에 포커스돼 있고 텍스트가 있으면 기본 커서 이동
        if (active?.tagName === 'INPUT' && active.value) return;

        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        setFocusedSlot(prev => {
          const next = (prev + dir + 4) % 4;
          setTimeout(() => inputRefs.current[next]?.focus(), 50);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChangeAgent = (slotIndex: number, newId: string) => {
    setSlots(prev => {
      const next = [...prev];
      next[slotIndex] = newId;
      return next;
    });
  };

  const registerInputRef = useCallback((index: number, el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-20 justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>불러오는 중...</span>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>등록된 에이전트가 없습니다</p>
      </div>
    );
  }

  const sidebarWidth = collapsed ? '56px' : '240px';

  return (
    <div
      className="fixed inset-0 flex flex-col p-2 overflow-hidden animate-fade-in transition-all duration-200"
      style={{ left: sidebarWidth }}
    >
      <div className="grid grid-cols-4 gap-2 flex-1 min-h-0">
        {slots.map((agentId, i) => (
          <div
            key={i}
            className="min-w-0 min-h-0 overflow-hidden cursor-pointer"
            onClick={() => {
              setFocusedSlot(i);
              inputRefs.current[i]?.focus();
            }}
          >
            {agentId ? (
              <ChatPane
                agentId={agentId}
                agents={agents}
                onChangeAgent={(newId) => handleChangeAgent(i, newId)}
                focused={focusedSlot === i}
                slotIndex={i}
                inputRef={(el) => registerInputRef(i, el)}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center h-full rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>빈 슬롯</p>
                <select
                  value=""
                  onChange={e => handleChangeAgent(i, e.target.value)}
                  className="text-[11px] rounded-md px-2 py-1.5 outline-none cursor-pointer"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <option value="" disabled>에이전트 선택</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 단축키 안내 */}
      <div className="flex items-center justify-center gap-4 py-1.5 shrink-0">
        {[1, 2, 3, 4].map(n => (
          <span key={n} className="text-[10px] flex items-center gap-1" style={{ color: focusedSlot === n - 1 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>⌘{n}</kbd>
          </span>
        ))}
        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>← →</kbd>
          이동
        </span>
      </div>
    </div>
  );
}
