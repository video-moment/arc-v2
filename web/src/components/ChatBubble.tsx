import type { ChatMessage } from '@/lib/api';

function formatTime(ts: string | number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
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
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        <p className={`text-[10px] mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`} style={{ color: 'var(--text-tertiary)' }}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
