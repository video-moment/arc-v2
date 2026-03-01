'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PomoTask } from '@/lib/api';
import { TargetIcon, TomatoIcon, SettingsIcon, ZapIcon } from './Icons';

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

export default function PomodoroTimer({ activeTask, onSessionComplete, durations, onDurationsChange, onQuickFocus, isQuickFocus }: Props) {
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

  const totalSeconds = durationsInSeconds[phase];
  const progress = 1 - secondsLeft / totalSeconds;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const notify = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
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
  }, [durations.work, durations.break, durations.longBreak]);

  const handleReset = () => {
    setIsRunning(false);
    setPhase('work');
    setSecondsLeft(durationsInSeconds.work);
    setCompletedSets(0);
  };

  const handleDurationChange = (key: keyof PomodoroDurations, value: number) => {
    onDurationsChange({ ...durations, [key]: value });
  };

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const phaseColor = phase === 'work' ? 'var(--accent)' : phase === 'break' ? 'var(--green)' : 'var(--blue)';
  const phaseGlow = phase === 'work'
    ? 'rgba(139, 92, 246, 0.15)'
    : phase === 'break'
      ? 'rgba(16, 185, 129, 0.15)'
      : 'rgba(59, 130, 246, 0.15)';

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Active task */}
      {activeTask ? (
        <div
          className="px-4 py-2 rounded-xl text-sm flex items-center gap-2"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <TargetIcon size={14} />
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{activeTask.title}</span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <TomatoIcon size={11} /> {activeTask.completedPomodoros}/{activeTask.estimatedPomodoros}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div
            className="px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
          >
            <TargetIcon size={14} />
            아래에서 할 일을 클릭하여 타이머에 연결하세요
          </div>
          {onQuickFocus && (
            <button
              onClick={onQuickFocus}
              className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--blue))',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ZapIcon size={14} />
              빠른 집중
            </button>
          )}
        </div>
      )}

      {/* Timer circle */}
      <div className="relative">
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${phaseGlow} 0%, transparent 70%)`,
            transform: 'scale(1.2)',
            transition: 'background 0.5s ease',
          }}
        />
        <svg width="280" height="280" viewBox="0 0 280 280" className="relative">
          <circle
            cx="140" cy="140" r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="8"
            opacity="0.5"
          />
          <circle
            cx="140" cy="140" r={radius}
            fill="none"
            stroke={phaseColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 140 140)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Phase badge */}
          <span
            className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full"
            style={{
              color: phaseColor,
              background: phaseGlow,
            }}
          >
            {PHASE_LABELS[phase]}
          </span>
          <span className="text-6xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
            세트 {Math.floor(completedSets % 4) + (phase === 'work' && isRunning ? 1 : 0)} / 4
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-8 py-3 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: isRunning ? 'var(--red-soft)' : 'var(--accent)',
            color: isRunning ? 'var(--red)' : '#fff',
            boxShadow: isRunning ? 'none' : '0 4px 14px rgba(139, 92, 246, 0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          disabled={phase === 'work' && !activeTask && !isQuickFocus}
        >
          {isRunning ? '일시정지' : '시작'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          리셋
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-xl transition-all duration-200"
          style={{
            background: showSettings ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            color: showSettings ? 'var(--accent-hover)' : 'var(--text-secondary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          title="시간 설정"
        >
          <SettingsIcon size={18} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="w-full max-w-sm rounded-xl p-5 space-y-4"
          style={{
            background: 'var(--bg-card, var(--bg-elevated))',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              시간 설정
            </h4>
            {isRunning && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--yellow-soft)', color: 'var(--yellow)' }}>
                타이머 정지 후 변경 가능
              </span>
            )}
          </div>
          {[
            { key: 'work' as const, label: '집중 시간', min: 1, max: 60, color: 'var(--accent)' },
            { key: 'break' as const, label: '휴식 시간', min: 1, max: 30, color: 'var(--green)' },
            { key: 'longBreak' as const, label: '긴 휴식', min: 1, max: 60, color: 'var(--blue)' },
          ].map(({ key, label, min, max, color }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
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
                  className="w-16 px-2 py-1.5 rounded-lg text-xs text-center outline-none tabular-nums"
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
