'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/lib/api';

function formatTime(ts: string | number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function MediaContent({ message }: { message: ChatMessage }) {
  if (!message.mediaUrl) return null;

  if (message.mediaType === 'photo' || message.mediaType === 'sticker') {
    const isSticker = message.mediaType === 'sticker';
    return (
      <img
        src={message.mediaUrl}
        alt=""
        className={`rounded-xl ${isSticker ? 'w-32 h-32 object-contain' : 'max-w-full max-h-80 object-cover'}`}
        style={isSticker ? { background: 'transparent' } : undefined}
        loading="lazy"
      />
    );
  }

  if (message.mediaType === 'document') {
    return (
      <a
        href={message.mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
        style={{ background: 'var(--bg-hover)', color: 'var(--accent-hover)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        파일 다운로드
      </a>
    );
  }

  return null;
}

export default function ChatBubble({ message, compact }: { message: ChatMessage; compact?: boolean }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${compact ? 'mb-2' : 'mb-4'} animate-fade-in group`}>
      {!isUser && (
        <div
          className={`${compact ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]'} rounded-full flex items-center justify-center font-bold mr-2 mt-1 shrink-0`}
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}
        >
          {message.role.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={compact ? 'max-w-[85%]' : 'max-w-[72%]'}>
        {!isUser && !compact && (
          <p className="text-[11px] font-medium mb-1 ml-1" style={{ color: 'var(--text-tertiary)' }}>
            {message.role}
          </p>
        )}
        <div
          className={`${compact ? 'rounded-xl px-3 py-2' : 'rounded-2xl px-4 py-3'} relative cursor-pointer`}
          style={{
            background: isUser ? 'var(--gradient-accent)' : 'var(--bg-card)',
            border: isUser ? 'none' : '1px solid var(--border)',
            borderTopRightRadius: isUser ? '6px' : undefined,
            borderTopLeftRadius: !isUser ? '6px' : undefined,
          }}
          onClick={handleCopy}
          title="클릭하여 복사"
        >
          {/* 복사 완료 토스트 */}
          {copied && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-medium animate-fade-in"
              style={{ background: 'var(--green)', color: 'white' }}>
              복사됨
            </div>
          )}
          {/* 복사 아이콘 (호버 시) */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </div>
          {message.mediaUrl && (
            <div className={message.content ? 'mb-2' : ''}>
              <MediaContent message={message} />
            </div>
          )}
          {message.content && (
            isUser ? (
              <p className={`${compact ? 'text-[11px]' : 'text-[13px]'} leading-relaxed whitespace-pre-wrap break-words`}>
                {message.content}
              </p>
            ) : (
              <div className={`markdown-body ${compact ? 'text-[11px]' : 'text-[13px]'} leading-relaxed break-words`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )
          )}
        </div>
        <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`} style={{ color: 'var(--text-tertiary)' }}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
