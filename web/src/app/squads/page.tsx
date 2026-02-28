'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { getSquads, getAgents, createSquad, deleteSquad, type Squad, type Agent } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const load = () => {
    Promise.all([getSquads(), getAgents()])
      .then(([s, a]) => { setSquads(s); setAgents(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createSquad({ name, description: desc, agentIds: selectedAgents });
    setName(''); setDesc(''); setSelectedAgents([]); setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteSquad(id);
    load();
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-20 justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">스쿼드</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{squads.length}개의 스쿼드</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[13px] px-4 py-2.5 rounded-xl font-semibold transition-all duration-150 cursor-pointer hover:brightness-110"
          style={{
            background: showForm ? 'var(--bg-hover)' : 'var(--gradient-accent)',
            color: 'white',
            boxShadow: showForm ? 'none' : '0 2px 8px rgba(139,92,246,0.3)',
          }}
        >
          {showForm ? '취소' : '+ 새 스쿼드'}
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-6 mb-8 animate-fade-in"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h3 className="text-sm font-bold mb-4">새 스쿼드 만들기</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>이름</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="스쿼드 이름을 입력하세요"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>설명</label>
              <input
                value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="스쿼드에 대한 설명 (선택)"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>에이전트 선택</label>
              <div className="flex flex-wrap gap-2">
                {agents.map(a => {
                  const selected = selectedAgents.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAgent(a.id)}
                      className="text-xs px-3.5 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer"
                      style={{
                        background: selected ? 'var(--accent)' : 'var(--bg-hover)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                        border: '1px solid ' + (selected ? 'var(--accent)' : 'var(--border)'),
                      }}
                    >
                      {a.name}
                    </button>
                  );
                })}
                {agents.length === 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>등록된 에이전트가 없습니다</span>
                )}
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="text-[13px] px-5 py-2.5 rounded-xl font-semibold disabled:opacity-30 cursor-pointer transition-all hover:brightness-110"
              style={{ background: 'var(--gradient-accent)', color: 'white' }}
            >
              스쿼드 생성
            </button>
          </div>
        </div>
      )}

      {squads.length === 0 ? (
        <div
          className="text-center py-24 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="font-medium mb-1">스쿼드가 없습니다</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>에이전트를 그룹으로 묶어 관리하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {squads.map(s => (
            <div
              key={s.id}
              className="rounded-2xl p-5 animate-fade-in transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{s.name}</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {s.description || '설명 없음'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer transition-colors hover:bg-[var(--red-soft)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  삭제
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {s.agents && s.agents.length > 0 ? (
                  s.agents.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-hover)' }}
                    >
                      <span
                        className={'w-1.5 h-1.5 rounded-full' + (a.status === 'online' ? ' animate-pulse-dot' : '')}
                        style={{ background: a.status === 'online' ? 'var(--green)' : 'var(--text-tertiary)' }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>에이전트 없음</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
