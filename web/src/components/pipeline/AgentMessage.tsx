'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentMessage as AgentMessageType } from '@/lib/arc-types';

interface AgentMessageProps {
  message: AgentMessageType;
}

const AGENT_LABELS: Record<string, string> = {
  planner: '플래너',
  actor: '액터',
  reviewer: '리뷰어',
  user: '사용자',
  system: '시스템',
};

const AGENT_COLORS: Record<string, string> = {
  planner: 'var(--agent-planner)',
  actor: 'var(--agent-actor)',
  reviewer: 'var(--agent-reviewer)',
  user: 'var(--accent)',
  system: 'var(--text-tertiary)',
};

const AGENT_BG: Record<string, string> = {
  planner: 'var(--agent-planner-bg)',
  actor: 'var(--agent-actor-bg)',
  reviewer: 'var(--agent-reviewer-bg)',
  user: 'var(--accent-soft)',
  system: 'rgba(113, 113, 122, 0.08)',
};

const TYPE_LABELS: Record<string, string> = {
  plan: '계획',
  plan_proposal: '계획 제안',
  plan_approved: '계획 승인',
  research: '리서치',
  action_request: '실행 요청',
  action_result: '실행 결과',
  review: '검수',
  revision_request: '수정 요청',
  complete: '완료',
  user_input: '입력',
  error: '오류',
  safety_violation: '안전 위반',
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function ReviewIndicator({ content }: { content: string }) {
  const lower = content.toLowerCase();
  const approved =
    lower.includes('승인') ||
    lower.includes('approve') ||
    lower.includes('pass') ||
    lower.includes('통과');

  return (
    <div
      className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md w-fit mb-2"
      style={{
        background: approved ? 'var(--green-soft)' : 'var(--red-soft)',
        color: approved ? 'var(--green)' : 'var(--red)',
      }}
    >
      {approved ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {approved ? '승인' : '수정 필요'}
    </div>
  );
}

function PlanProposalContent({ content }: { content: string }) {
  const [researchExpanded, setResearchExpanded] = useState(false);

  // Try to split research section from plan
  const researchMatch = content.match(
    /(?:##?\s*(?:리서치|research|조사)[^\n]*\n)([\s\S]*?)(?=\n##?\s|$)/i
  );
  const research = researchMatch?.[1]?.trim();
  const planContent = research
    ? content.replace(researchMatch![0], '').trim()
    : content;

  return (
    <div className="space-y-3">
      {research && (
        <div>
          <button
            onClick={() => setResearchExpanded(!researchExpanded)}
            className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider mb-1.5 transition-colors"
            style={{ color: 'var(--agent-planner)' }}
          >
            <svg
              className={`w-3 h-3 transition-transform ${researchExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            리서치 결과
          </button>
          {researchExpanded && (
            <div
              className="text-[12px] rounded-lg p-3"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{research}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{planContent}</ReactMarkdown>
      </div>
    </div>
  );
}

export function AgentMessage({ message }: AgentMessageProps) {
  const agentColor = AGENT_COLORS[message.from] || 'var(--text-tertiary)';
  const agentBg = AGENT_BG[message.from] || 'rgba(113, 113, 122, 0.08)';
  const agentLabel = AGENT_LABELS[message.from] || message.from;
  const typeLabel = TYPE_LABELS[message.type] || message.type;

  // User messages: right-aligned
  if (message.from === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div
          className="max-w-[80%] rounded-xl rounded-br-sm px-4 py-3"
          style={{ background: 'var(--accent-soft)' }}
        >
          <div className="text-[12px] markdown-body" style={{ color: 'var(--text-primary)' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: agentBg }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: agentColor }}
            />
            <span
              className="text-[11px] font-semibold"
              style={{ color: agentColor }}
            >
              {agentLabel}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-tertiary)',
              }}
            >
              {typeLabel}
            </span>
          </div>
          <span
            className="text-[9px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          {/* Review indicator */}
          {message.type === 'review' && <ReviewIndicator content={message.content} />}

          {/* Plan proposal with collapsible research */}
          {message.type === 'plan_proposal' ? (
            <div className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
              <PlanProposalContent content={message.content} />
            </div>
          ) : (
            <div className="text-[12px] markdown-body" style={{ color: 'var(--text-primary)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
