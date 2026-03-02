'use client';

import { useEffect, useState } from 'react';
import { getAgents, type Agent } from '@/lib/api';
import ChatPane from '@/components/ChatPane';

export default function MonitorPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [slots, setSlots] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const allAgents = await getAgents();
        setAgents(allAgents);

        // 온라인 에이전트 우선 배치
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

  const handleChangeAgent = (slotIndex: number, newId: string) => {
    setSlots(prev => {
      const next = [...prev];
      next[slotIndex] = newId;
      return next;
    });
  };

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

  return (
    <div className="fixed inset-0 left-60 flex flex-col p-2 overflow-hidden animate-fade-in">
      <div className="grid grid-cols-4 gap-2 flex-1 min-h-0">
        {slots.map((agentId, i) => (
          <div key={i} className="min-w-0 min-h-0 overflow-hidden">
            {agentId ? (
              <ChatPane
                agentId={agentId}
                agents={agents}
                onChangeAgent={(newId) => handleChangeAgent(i, newId)}
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
    </div>
  );
}
