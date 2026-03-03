'use client';

import { useState, useEffect, useRef } from 'react';
import { getDomains } from '@/lib/arc-api';
import type { DomainInfo } from '@/lib/arc-types';

interface TeamSelectorProps {
  value: string | null;
  onChange: (domainId: string) => void;
}

export function TeamSelector({ value, onChange }: TeamSelectorProps) {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDomains()
      .then(setDomains)
      .catch(() => setDomains([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = domains.find((d) => d.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-lg border transition-colors"
        style={{
          borderColor: open ? 'var(--accent)' : 'var(--border)',
          background: 'var(--bg-card)',
          color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
        }}
      >
        {loading ? (
          <span style={{ color: 'var(--text-tertiary)' }}>...</span>
        ) : selected ? (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: 'var(--green)' }}
            />
            <span className="font-medium">{selected.name}</span>
          </>
        ) : (
          <>
            <span>팀 선택</span>
            {domains.length > 0 && (
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                {domains.length}
              </span>
            )}
          </>
        )}
        <svg
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{
            color: open ? 'var(--accent)' : 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-64 rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          {/* Dropdown header */}
          <div
            className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider"
            style={{
              color: 'var(--text-tertiary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            도메인 선택
          </div>
          {domains.length === 0 ? (
            <div
              className="px-4 py-3 text-[12px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              등록된 도메인이 없습니다
            </div>
          ) : (
            domains.map((d) => {
              const isSelected = d.id === value;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    onChange(d.id);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 transition-colors hover:opacity-80 flex items-center gap-3"
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[12px] font-medium"
                      style={{
                        color: isSelected
                          ? 'var(--accent-hover)'
                          : 'var(--text-primary)',
                      }}
                    >
                      {d.name}
                    </div>
                    {d.description && (
                      <div
                        className="text-[10px] mt-0.5 truncate"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {d.description}
                      </div>
                    )}
                  </div>
                  {/* Checkmark for selected */}
                  {isSelected && (
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: 'var(--accent)' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
