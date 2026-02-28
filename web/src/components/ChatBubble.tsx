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

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mr-2 mt-1 shrink-0"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}
        >
          {message.role.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="max-w-[72%]">
        {!isUser && (
          <p className="text-[11px] font-medium mb-1 ml-1" style={{ color: 'var(--text-tertiary)' }}>
            {message.role}
          </p>
        )}
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            background: isUser ? 'var(--gradient-accent)' : 'var(--bg-card)',
            border: isUser ? 'none' : '1px solid var(--border)',
            borderTopRightRadius: isUser ? '6px' : undefined,
            borderTopLeftRadius: !isUser ? '6px' : undefined,
          }}
        >
          {message.mediaUrl && (
            <div className={message.content ? 'mb-2' : ''}>
              <MediaContent message={message} />
            </div>
          )}
          {message.content && (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>
        <p className={`text-[10px] mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`} style={{ color: 'var(--text-tertiary)' }}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
