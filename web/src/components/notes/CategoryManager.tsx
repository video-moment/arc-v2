'use client';

import { useState, useRef, useEffect } from 'react';
import type { NoteCategory } from '@/lib/api';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#6b7280',
];

interface CategoryManagerProps {
  categories: NoteCategory[];
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
  onRename: (id: string, name: string, color?: string) => void;
  onDelete: (id: string) => void;
}

export default function CategoryManager({
  categories,
  open,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const createRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      createRef.current?.focus();
    } else {
      setNewName('');
      setNewColor('#6366f1');
      setEditingId(null);
    }
  }, [open]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const commitCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim(), newColor);
    }
    setNewName('');
    setNewColor('#6366f1');
    setTimeout(() => createRef.current?.focus(), 50);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim(), editColor || undefined);
    }
    setEditingId(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>카테고리 관리</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 새 카테고리 추가 */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-tertiary)' }}>새 카테고리</label>
          <div className="flex items-center gap-3 mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-6 h-6 rounded-full transition-all cursor-pointer"
                style={{
                  background: c,
                  transform: newColor === c ? 'scale(1.2)' : 'scale(1)',
                  outline: newColor === c ? '2px solid var(--accent)' : '2px solid transparent',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: newColor }} />
            <input
              ref={createRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate();
              }}
              className="flex-1 text-sm bg-transparent outline-none px-3 py-2 rounded-lg"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', background: 'var(--bg-input)' }}
              placeholder="카테고리 이름 입력..."
            />
            <button
              onClick={commitCreate}
              className="px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: newName.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                color: newName.trim() ? '#fff' : 'var(--text-tertiary)',
              }}
            >
              추가
            </button>
          </div>
        </div>

        {/* 카테고리 목록 */}
        <div className="px-6 py-4 max-h-[320px] overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
              아직 카테고리가 없습니다
            </p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* 색상 dot — 편집 모드에서는 색상 선택 */}
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className="w-4 h-4 rounded-full transition-all cursor-pointer"
                          style={{
                            background: c,
                            outline: editColor === c ? '2px solid var(--accent)' : '2px solid transparent',
                            outlineOffset: '1px',
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  )}

                  {/* 이름 */}
                  {editingId === cat.id ? (
                    <input
                      ref={editRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 text-sm bg-transparent outline-none px-2 py-1 rounded-md"
                      style={{ color: 'var(--text-primary)', border: '1px solid var(--accent)', background: 'var(--bg-input)' }}
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm cursor-default"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {cat.name}
                    </span>
                  )}

                  {/* 액션 버튼 */}
                  {editingId !== cat.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-input)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        title="이름 변경"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${cat.name}" 카테고리를 삭제할까요?`)) {
                            onDelete(cat.id);
                          }
                        }}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                        title="삭제"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
