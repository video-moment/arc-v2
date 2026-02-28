'use client';

import { useEffect, useState } from 'react';
import { getTasks, getSquads, createTask, updateTask, deleteTask, type Task, type Squad } from '@/lib/api';
import TaskCard from '@/components/TaskCard';

const STATUSES: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'in_progress', label: '진행중' },
  { key: 'completed', label: '완료' },
  { key: 'failed', label: '실패' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [squadId, setSquadId] = useState('');

  const load = () => {
    const statusParam = filter === 'all' ? undefined : filter;
    Promise.all([getTasks(undefined, statusParam), getSquads()])
      .then(([t, s]) => { setTasks(t); setSquads(s); if (!squadId && s.length > 0) setSquadId(s[0].id); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleCreate = async () => {
    if (!title.trim() || !squadId) return;
    await createTask({ squadId, title, description: desc });
    setTitle(''); setDesc(''); setShowForm(false);
    load();
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    await updateTask(id, { status });
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-20 justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>불러오는 중...</span>
      </div>
    );
  }

  const counts: Record<string, number> = { all: tasks.length };
  tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">태스크</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tasks.length}개의 태스크</p>
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
          {showForm ? '취소' : '+ 새 태스크'}
        </button>
      </div>

      {/* Filter */}
      <div
        className="flex gap-1 p-1 mb-6 rounded-xl w-fit"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className="text-[12px] px-3.5 py-2 rounded-lg font-medium transition-all duration-150 cursor-pointer"
            style={{
              background: filter === s.key ? 'var(--accent-soft)' : 'transparent',
              color: filter === s.key ? 'var(--accent-hover)' : 'var(--text-tertiary)',
            }}
          >
            {s.label}
            {(counts[s.key] ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] opacity-60">{counts[s.key]}</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-6 mb-8 animate-fade-in"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h3 className="text-sm font-bold mb-4">새 태스크 만들기</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>스쿼드</label>
              <select
                value={squadId} onChange={e => setSquadId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">스쿼드를 선택하세요</option>
                {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>제목</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="태스크 제목을 입력하세요"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>설명</label>
              <input
                value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="태스크에 대한 설명 (선택)"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !squadId}
              className="text-[13px] px-5 py-2.5 rounded-xl font-semibold disabled:opacity-30 cursor-pointer transition-all hover:brightness-110"
              style={{ background: 'var(--gradient-accent)', color: 'white' }}
            >
              태스크 생성
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div
          className="text-center py-24 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <p className="font-medium mb-1">
            {filter !== 'all' ? '"' + STATUSES.find(s => s.key === filter)?.label + '" 상태의 태스크가 없습니다' : '태스크가 없습니다'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>스쿼드에 태스크를 추가하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
