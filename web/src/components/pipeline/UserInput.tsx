'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UserInputProps {
  onSend: (input: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UserInput({ onSend, disabled, placeholder }: UserInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="border-t px-6 py-4"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
    >
      <div className="max-w-4xl mx-auto flex items-end gap-3">
        <div
          className="flex-1 rounded-xl px-4 py-3 transition-colors"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={
              placeholder ??
              (disabled
                ? '파이프라인 실행 중...'
                : '에이전트 팀에 지시할 내용을 입력하세요 (Ctrl+Enter)')
            }
            className="w-full bg-transparent text-[13px] resize-none outline-none disabled:opacity-40"
            style={{
              color: 'var(--text-primary)',
              maxHeight: '200px',
            }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: value.trim() && !disabled ? 'var(--accent)' : 'var(--bg-hover)',
          }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: 'var(--text-primary)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M12 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
