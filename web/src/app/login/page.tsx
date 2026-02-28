'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });

      if (res.ok) {
        // 쿠키 설정 후 약간 대기 → 전체 페이지 이동
        document.cookie = 'arc-auth=' + password + '; path=/; max-age=' + (60*60*24*30);
        window.location.href = '/';
        return;
      } else {
        setError('비밀번호가 틀렸습니다');
        setLoading(false);
      }
    } catch {
      setError('연결 오류가 발생했습니다');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 animate-fade-in"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-elevated)' }}
      >
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'var(--gradient-accent)' }}
          >
            A
          </div>
          <h1 className="text-lg font-bold">ARC V2</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            에이전트 대시보드에 접속하려면 비밀번호를 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 cursor-pointer hover:brightness-110"
            style={{ background: 'var(--gradient-accent)', color: 'white', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
