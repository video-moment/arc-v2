'use client';

import { useState, useRef, useEffect } from 'react';
import type { NoteCategory } from '@/lib/api';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#6b7280',
];

interface CategoryManagerProps {
  categories: NoteCategory[];
  onCreate: (name: string, color: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function CategoryManager({
  categories,
  onCreate,
  onRename,
  onDelete,
}: CategoryManagerProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const createRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) createRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const commitCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim(), newColor);
    }
    setCreating(false);
    setNewName('');
    setNewColor('#6366f1');
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
          카테고리
        </span>
        <button
          onClick={() => setCreating(true)}
          className="w-5 h-5 rounded flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          title="카테고리 추가"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-px">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="group flex items-center gap-2 px-2 py-1.5 rounded-md"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: cat.color }}
            />
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
                className="flex-1 text-xs bg-transparent outline-none px-1 py-0.5 rounded"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
              />
            ) : (
              <span
                className="flex-1 text-xs truncate cursor-default"
                style={{ color: 'var(--text-secondary)' }}
                onDoubleClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
              >
                {cat.name}
              </span>
            )}
            <button
              onClick={() => {
                if (confirm(`"${cat.name}" 카테고리를 삭제할까요? 페이지의 카테고리 지정이 해제됩니다.`)) {
                  onDelete(cat.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center transition-opacity"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 인라인 새 카테고리 */}
      {creating && (
        <div className="px-2 py-2 mt-1 rounded-md" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-hover)' }}>
          <div className="flex items-center gap-2 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-4 h-4 rounded-full transition-transform"
                style={{
                  background: c,
                  transform: newColor === c ? 'scale(1.3)' : 'scale(1)',
                  outline: newColor === c ? '2px solid var(--accent)' : 'none',
                  outlineOffset: '1px',
                }}
              />
            ))}
          </div>
          <input
            ref={createRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={commitCreate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCreate();
              if (e.key === 'Escape') { setCreating(false); setNewName(''); }
            }}
            className="w-full text-xs bg-transparent outline-none px-1 py-0.5 rounded"
            style={{ color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
            placeholder="카테고리 이름..."
          />
        </div>
      )}

      {categories.length === 0 && !creating && (
        <p className="text-[10px] px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>
          + 버튼으로 카테고리 추가
        </p>
      )}
    </div>
  );
}
