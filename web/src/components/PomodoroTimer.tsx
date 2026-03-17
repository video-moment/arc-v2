'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PomoTask } from '@/lib/api';
import { TomatoIcon, SettingsIcon } from './Icons';

export interface PomodoroDurations {
  work: number;
  break: number;
  longBreak: number;
}

interface Props {
  activeTask: PomoTask | null;
  onSessionComplete: () => void;
  durations: PomodoroDurations;
  onDurationsChange: (d: PomodoroDurations) => void;
  onQuickFocus?: () => void;
  isQuickFocus?: boolean;
}

type Phase = 'work' | 'break' | 'longBreak';

const PHASE_LABELS: Record<Phase, string> = {
  work: '집중',
  break: '휴식',
  longBreak: '긴 휴식',
};

export default function PomodoroTimer({
  activeTask,
  onSessionComplete,
  durations,
  onDurationsChange,
  onQuickFocus,
  isQuickFocus,
}: Props) {
  const durationsInSeconds: Record<Phase, number> = {
    work: durations.work * 60,
    break: durations.break * 60,
    longBreak: durations.longBreak * 60,
  };

  const [phase, setPhase] = useState<Phase>('work');
  const [secondsLeft, setSecondsLeft] = useState(durationsInSeconds.work);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSets, setCompletedSets] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const totalSeconds = durationsInSeconds[phase];
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const phaseColor =
    phase === 'work' ? 'var(--accent)' : phase === 'break' ? 'var(--green)' : 'var(--blue)';

  const notify = useCallback((title: string, body: string) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(title, { body });
    }
  }, []);

  const handlePhaseEnd = useCallback(() => {
    setIsRunning(false);
    if (phase === 'work') {
      const newSets = completedSets + 1;
      setCompletedSets(newSets);
      onSessionComplete();
      if (newSets % 4 === 0) {
        setPhase('longBreak');
        setSecondsLeft(durationsInSeconds.longBreak);
        notify('긴 휴식 시간!', durations.longBreak + '분 쉬세요.');
      } else {
        setPhase('break');
        setSecondsLeft(durationsInSeconds.break);
        notify('휴식 시간!', durations.break + '분 쉬세요.');
      }
    } else {
      setPhase('work');
      setSecondsLeft(durationsInSeconds.work);
      notify('집중 시간!', '다시 시작합시다.');
    }
  }, [phase, completedSets, onSessionComplete, notify, durationsInSeconds, durations]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handlePhaseEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, handlePhaseEnd]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Reset timer when durations change (only when not running)
  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(durationsInSeconds[phase]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durations.work, durations.break, durations.longBreak]);

  // Close settings when clicking outside
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const handleReset = () => {
    setIsRunning(false);
    setPhase('work');
    setSecondsLeft(durationsInSeconds.work);
    setCompletedSets(0);
  };

  const handleDurationChange = (key: keyof PomodoroDurations, value: number) => {
    onDurationsChange({ ...durations, [key]: value });
  };

  const canStart = phase !== 'work' || !!activeTask || !!isQuickFocus;
  const setDisplay = (Math.floor(completedSets % 4)) + (phase === 'work' && isRunning ? 1 : 0);

  return (
    <div
      className={isRunning ? 'relative timer-running' : 'relative'}
      style={{
        background: 'var(--bg-elevated)',
        boxShadow: '0 1px 0 var(--border-subtle)',
      }}
    >
      {/* Main mini-bar row */}
      <div className="flex items-center gap-3 px-4" style={{ height: '52px' }}>
        {/* Phase badge + time */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              color: phaseColor,
              background: phase === 'work'
                ? 'var(--accent-soft)'
                : phase === 'break'
                ? 'var(--green-soft)'
                : 'var(--blue-soft)',
            }}
          >
            {PHASE_LABELS[phase]}
          </span>
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: 'var(--text-primary)', letterSpacing: '-1px', minWidth: '58px' }}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        {/* Progress bar — fills available space */}
        <div
          className="flex-1 rounded-full overflow-hidden"
          style={{ height: '3px', background: 'var(--border-subtle)' }}
        >
          <div
            className={isRunning ? 'h-full rounded-full progress-active' : 'h-full rounded-full'}
            style={{
              width: (progress * 100) + '%',
              background: phaseColor,
              transition: 'width 0.5s linear',
            }}
          />
        </div>

        {/* Active task info */}
        {activeTask && (
          <div
            className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              maxWidth: '160px',
            }}
          >
            <span className="truncate" style={{ color: 'var(--text-primary)', fontSize: '11px' }}>
              {activeTask.title}
            </span>
            <span className="flex items-center gap-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              <TomatoIcon size={9} />
              <span style={{ fontSize: '10px' }}>{activeTask.completedPomodoros}/{activeTask.estimatedPomodoros}</span>
            </span>
          </div>
        )}

        {/* Set counter */}
        <span
          className="flex-shrink-0 text-[11px] tabular-nums"
          style={{ color: 'var(--text-tertiary)', minWidth: '28px', textAlign: 'center' }}
        >
          {setDisplay}/4
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Start / Pause — accent filled when idle, outline when running */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={!canStart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: isRunning ? 'transparent' : canStart ? 'var(--accent)' : 'var(--bg-secondary)',
              color: isRunning ? 'var(--accent)' : canStart ? '#fff' : 'var(--text-tertiary)',
              border: isRunning ? '1px solid var(--accent)' : '1px solid transparent',
              opacity: !canStart ? 0.4 : 1,
              cursor: !canStart ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                일시정지
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                시작
              </>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="px-2 py-1.5 rounded-md text-xs transition-all"
            style={{
              background: 'transparent',
              color: 'var(--text-tertiary)',
            }}
            title="리셋"
          >
            리셋
          </button>

          {/* Quick Focus (no active task) */}
          {!activeTask && !isQuickFocus && onQuickFocus && (
            <button
              onClick={onQuickFocus}
              className="p-1.5 rounded-md transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--blue))',
                color: '#fff',
              }}
              title="빠른 집중"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </button>
          )}

          {/* Settings gear */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="p-1.5 rounded-md transition-all"
            style={{
              background: showSettings ? 'var(--accent-soft)' : 'transparent',
              color: showSettings ? 'var(--accent-hover)' : 'var(--text-tertiary)',
            }}
            title="시간 설정"
          >
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div
          ref={settingsRef}
          className="absolute right-4 top-full mt-1 z-50 rounded-xl p-4 space-y-3"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '240px',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              시간 설정
            </span>
            {isRunning && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--yellow-soft)', color: 'var(--yellow)' }}
              >
                정지 후 변경 가능
              </span>
            )}
          </div>
          {([
            { key: 'work' as const, label: '집중', min: 1, max: 60, color: 'var(--accent)' },
            { key: 'break' as const, label: '휴식', min: 1, max: 30, color: 'var(--green)' },
            { key: 'longBreak' as const, label: '긴 휴식', min: 1, max: 60, color: 'var(--blue)' },
          ] as const).map(({ key, label, min, max, color }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={durations[key]}
                  onChange={e => {
                    const v = Math.max(min, Math.min(max, Number(e.target.value) || min));
                    handleDurationChange(key, v);
                  }}
                  disabled={isRunning}
                  className="w-14 px-2 py-1 rounded-lg text-xs text-center outline-none tabular-nums"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    opacity: isRunning ? 0.5 : 1,
                  }}
                />
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>분</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
