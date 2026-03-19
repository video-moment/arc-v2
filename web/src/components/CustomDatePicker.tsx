'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  value: string; // YYYY-MM-DD or ''
  onChange: (date: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
}

const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

function CalendarIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronLeft({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function buildCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let r = 0; r < cells.length / 7; r++) {
    rows.push(cells.slice(r * 7, r * 7 + 7));
  }
  return rows;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function formatDisplay(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return parts[0] + '년 ' + parseInt(parts[1]) + '월 ' + parseInt(parts[2]) + '일';
}

export default function CustomDatePicker({ value, onChange, placeholder = '날짜 선택', size = 'md' }: Props) {
  const today = new Date();
  const todayYMD = toYMD(today);

  const initYear = value ? parseInt(value.slice(0, 4)) : today.getFullYear();
  const initMonth = value ? parseInt(value.slice(5, 7)) - 1 : today.getMonth();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.slice(0, 4)));
      setViewMonth(parseInt(value.slice(5, 7)) - 1);
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < popupHeight ? rect.top - popupHeight - 4 : rect.bottom + 4;
    setPos({ top, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popupRef.current && !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const isSm = size === 'sm';
  const rows = buildCalendarGrid(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleSelect = (date: Date) => {
    onChange(toYMD(date));
    setOpen(false);
  };

  const handleToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    onChange(todayYMD);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isSm ? '4px' : '6px',
    padding: isSm ? '3px 7px' : '5px 10px',
    borderRadius: '6px',
    fontSize: isSm ? '11px' : '13px',
    cursor: 'pointer',
    background: 'var(--bg-input, var(--bg-secondary))',
    color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
    border: '1px solid var(--border)',
    outline: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const popup = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: pos.top + 'px',
        left: pos.left + 'px',
        width: '280px',
        background: 'var(--bg-elevated)',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        zIndex: 9999,
        overflow: 'hidden',
        padding: '12px',
        animation: 'fadeInUp 0.15s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={prevMonth}
          style={{
            width: '26px', height: '26px', borderRadius: '6px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button
          type="button"
          onClick={nextMonth}
          style={{
            width: '26px', height: '26px', borderRadius: '6px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {DAYS_KR.map((d, i) => (
          <div
            key={d}
            style={{
              textAlign: 'center', fontSize: '11px', fontWeight: 600,
              color: i === 0 ? 'var(--red, #ef4444)' : i === 6 ? 'var(--accent)' : 'var(--text-tertiary)',
              padding: '2px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {row.map((date, ci) => {
              if (!date) return <div key={ci} />;
              const ymd = toYMD(date);
              const isToday = ymd === todayYMD;
              const isSelected = ymd === value;
              const isCurrentMonth = date.getMonth() === viewMonth;

              return (
                <button
                  key={ci}
                  type="button"
                  onClick={() => handleSelect(date)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: 'none', cursor: 'pointer', fontSize: '12px',
                    fontWeight: isToday || isSelected ? 600 : 400,
                    background: isSelected ? '#10b981' : isToday ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? '#10b981' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    opacity: isCurrentMonth ? 1 : 0.4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto', transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(16,185,129,0.15)' : 'transparent';
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          type="button" onClick={handleToday}
          style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          오늘
        </button>
        <button
          type="button" onClick={handleClear}
          style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          초기화
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
          <CalendarIcon size={isSm ? 11 : 13} />
        </span>
        <span>{value ? formatDisplay(value) : placeholder}</span>
      </button>
      {popup}
    </div>
  );
}
