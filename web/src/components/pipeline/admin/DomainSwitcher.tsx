'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { DomainInfo } from '@/lib/arc-types';
import { getDomains } from '@/lib/arc-admin-api';

interface DomainSwitcherProps {
  currentDomainId: string;
}

export function DomainSwitcher({ currentDomainId }: DomainSwitcherProps) {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDomains().then(setDomains).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = domains.find(d => d.id === currentDomainId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
        style={{
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {current?.name || currentDomainId}
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && domains.length > 0 && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[200px] rounded-lg overflow-hidden z-50"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          {domains.map(d => (
            <button
              key={d.id}
              onClick={() => {
                setOpen(false);
                if (d.id !== currentDomainId) {
                  router.push('/pipeline/' + d.id);
                }
              }}
              className="w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2"
              style={{
                background: d.id === currentDomainId ? 'var(--accent-soft)' : 'transparent',
                color: d.id === currentDomainId ? 'var(--accent-hover)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => {
                if (d.id !== currentDomainId) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={e => {
                if (d.id !== currentDomainId) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: d.id === currentDomainId ? 'var(--accent)' : 'var(--text-tertiary)',
                  opacity: d.id === currentDomainId ? 1 : 0.4,
                }}
              />
              <div className="min-w-0">
                <div className="font-medium truncate">{d.name}</div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  {d.id}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
