'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UndoEntry {
  id: string;
  message: string;
  onUndo: () => Promise<void> | void;
  onExpire?: () => Promise<void> | void;
  duration?: number; // ms, default 4000
}

interface ToastItemProps {
  entry: UndoEntry;
  onDone: (id: string) => void;
}

function ToastItem({ entry, onDone }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const undoneRef = useRef(false);
  const duration = entry.duration ?? 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        if (!undoneRef.current) entry.onExpire?.();
        onDone(entry.id);
      }, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [entry, duration, onDone]);

  const handleUndo = async () => {
    undoneRef.current = true;
    try {
      await entry.onUndo();
    } catch (err) {
      console.error('Undo failed:', err);
    }
    setExiting(true);
    setTimeout(() => onDone(entry.id), 200);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: '#1f2937',
        color: '#f9fafb',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        fontSize: '13px',
        fontWeight: 500,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        animation: 'undo-slide-up 0.3s ease',
      }}
    >
      <span style={{ flex: 1 }}>{entry.message}</span>
      <button
        onClick={handleUndo}
        style={{
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          border: 'none',
          background: 'var(--btn-primary)',
          color: 'var(--btn-primary-text)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        되돌리기
      </button>
    </div>
  );
}

interface Props {
  entries: UndoEntry[];
  onRemove: (id: string) => void;
}

export default function UndoToast({ entries, onRemove }: Props) {
  if (entries.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes undo-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'auto',
        }}
      >
        {entries.map(entry => (
          <ToastItem key={entry.id} entry={entry} onDone={onRemove} />
        ))}
      </div>
    </>
  );
}

// Hook
let counter = 0;
export function useUndo() {
  const [entries, setEntries] = useState<UndoEntry[]>([]);

  const push = useCallback((entry: Omit<UndoEntry, 'id'>) => {
    const id = 'undo-' + (++counter);
    setEntries(prev => [...prev, { ...entry, id }]);
  }, []);

  const remove = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return { entries, push, remove };
}
