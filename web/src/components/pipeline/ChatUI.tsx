'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAgentStream } from '@/hooks/use-agent-stream';
import { AgentMessage } from './AgentMessage';
import { AgentStatusBar } from './AgentStatusBar';
import { UserInput } from './UserInput';
import { TeamSelector } from './TeamSelector';
import { startArc, approvePlan } from '@/lib/arc-api';

interface ChatUIProps {
  initialDomainId?: string | null;
}

export function ChatUI({ initialDomainId }: ChatUIProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [domainId, setDomainId] = useState<string | null>(initialDomainId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [lastInput, setLastInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, connected, completed, paused, pipelineError, reset } =
    useAgentStream(sessionId);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop loading when pipeline finishes
  useEffect(() => {
    if (completed || pipelineError) setLoading(false);
  }, [completed, pipelineError]);

  const handleSend = async (input: string) => {
    // If paused (plan approval gate), approve with comment
    if (paused && sessionId) {
      setApproving(true);
      try {
        await approvePlan(sessionId, input);
      } catch {
        // ignore
      } finally {
        setApproving(false);
      }
      return;
    }

    setError(null);
    setLoading(true);
    reset();
    setLastInput(input);

    try {
      const { sessionId: sid } = await startArc({
        input,
        sessionId: sessionId ?? undefined,
        domainId: domainId ?? undefined,
      });
      setSessionId(sid);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!sessionId) return;
    setApproving(true);
    try {
      await approvePlan(sessionId);
    } catch {
      // ignore
    } finally {
      setApproving(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setLoading(false);
    reset();
    setError(null);
    setLastInput('');
  };

  const handleDomainChange = useCallback((id: string) => {
    setDomainId(id);
  }, []);

  // Extract research and plan_proposal for approval gate
  const researchMsg = messages.findLast(
    (m) => m.type === 'research' && m.to === 'user'
  );
  const planProposalMsg = messages.findLast(
    (m) => m.type === 'plan_proposal' && m.to === 'user'
  );

  const examplePrompts = [
    '시나리오 작성 요청',
    '코드 리뷰 요청',
    '기획안 초안 작성',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div
        className="glass sticky top-0 z-10 px-6 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'var(--gradient-accent)', color: 'var(--text-primary)' }}
            >
              A
            </div>
            <div>
              <h1 className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                파이프라인 채팅
              </h1>
              <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                Planner &rarr; Actor &rarr; Reviewer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TeamSelector value={domainId} onChange={handleDomainChange} />
            {sessionId && (
              <span
                className="text-[10px] font-mono px-2 py-1 rounded-md"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {sessionId.slice(0, 8)}
              </span>
            )}
            <button
              onClick={handleNewSession}
              className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              새 세션
            </button>
          </div>
        </div>
      </div>

      {/* Status bar — always visible, sticky below header */}
      <div
        className="sticky z-[9] px-6 py-2"
        style={{
          top: '52px',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <AgentStatusBar
            messages={messages}
            completed={completed}
            paused={paused}
            connected={connected}
            pipelineError={pipelineError}
          />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-3">
          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center space-y-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                  style={{
                    background: 'var(--accent-soft)',
                    border: '1px solid rgba(139, 92, 246, 0.1)',
                  }}
                >
                  <svg
                    className="w-7 h-7"
                    style={{ color: 'var(--accent)', opacity: 0.6 }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    에이전트 팀에 지시하기
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    플래너 &rarr; 액터 &rarr; 리뷰어
                  </p>
                </div>

                {/* Example prompt chips */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {examplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-[11px] px-3.5 py-1.5 rounded-full transition-all"
                      style={{
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.color = 'var(--accent)';
                        e.currentTarget.style.background = 'var(--accent-soft)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading state — pipeline starting */}
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  {/* Planner icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold animate-pulse"
                    style={{
                      background: 'var(--agent-planner-soft)',
                      color: 'var(--agent-planner)',
                      animationDelay: '0ms',
                    }}
                  >
                    P
                  </div>
                  <svg
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--text-tertiary)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {/* Actor icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold animate-pulse"
                    style={{
                      background: 'var(--agent-actor-soft)',
                      color: 'var(--agent-actor)',
                      animationDelay: '300ms',
                    }}
                  >
                    A
                  </div>
                  <svg
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--text-tertiary)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {/* Reviewer icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold animate-pulse"
                    style={{
                      background: 'var(--agent-reviewer-soft)',
                      color: 'var(--agent-reviewer)',
                      animationDelay: '600ms',
                    }}
                  >
                    R
                  </div>
                </div>
                <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  파이프라인 시작 중...
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  에이전트들이 준비되고 있습니다
                </p>
              </div>
            </div>
          )}

          {/* Messages (filter out research & plan_proposal from normal flow) */}
          {messages
            .filter((m) => m.type !== 'research' && m.type !== 'plan_proposal')
            .map((msg) => (
              <AgentMessage key={msg.id} message={msg} />
            ))}

          {/* Plan Approval Gate */}
          {paused && planProposalMsg && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--agent-actor-bg)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}
            >
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{
                  background: 'var(--agent-actor-soft)',
                  borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: 'var(--agent-actor)' }}
                  />
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: 'var(--agent-actor)' }}
                  >
                    계획 승인 대기
                  </span>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-4 py-1.5 text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--green)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {approving ? '승인 중...' : '계획 승인'}
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
                {researchMsg && (
                  <div>
                    <h4
                      className="text-[10px] font-medium uppercase tracking-wider mb-2"
                      style={{ color: 'var(--agent-planner)' }}
                    >
                      리서치 결과
                    </h4>
                    <div
                      className="text-[12px] whitespace-pre-wrap rounded-lg p-3"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {researchMsg.content}
                    </div>
                  </div>
                )}
                <div>
                  <h4
                    className="text-[10px] font-medium uppercase tracking-wider mb-2"
                    style={{ color: 'var(--agent-actor)' }}
                  >
                    제안된 계획
                  </h4>
                  <div
                    className="text-[12px] whitespace-pre-wrap rounded-lg p-3"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {planProposalMsg.content}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completion banner */}
          {completed && !pipelineError && (
            <div
              className="glass rounded-xl p-4"
              style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--green)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  파이프라인 완료
                </div>
                <button
                  onClick={handleNewSession}
                  className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  새 세션
                </button>
              </div>
            </div>
          )}

          {/* Pipeline error banner */}
          {pipelineError && (
            <div
              className="glass rounded-xl p-4"
              style={{ border: '1px solid rgba(244, 63, 94, 0.2)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--red)' }}>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>파이프라인 오류: {pipelineError}</span>
                </div>
                {lastInput && (
                  <button
                    onClick={() => handleSend(lastInput)}
                    className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      color: 'var(--red)',
                    }}
                  >
                    재시도
                  </button>
                )}
              </div>
            </div>
          )}

          {/* General error */}
          {error && !pipelineError && (
            <div
              className="glass rounded-xl p-4"
              style={{ border: '1px solid rgba(244, 63, 94, 0.2)' }}
            >
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--red)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <UserInput
        onSend={handleSend}
        disabled={loading && !completed && !paused}
        placeholder={
          paused
            ? '코멘트를 입력하고 보내면 계획이 승인됩니다...'
            : undefined
        }
      />
    </div>
  );
}
