export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mr-2 mt-1 shrink-0"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}
      >
        A
      </div>
      <div>
        <p className="text-[11px] font-medium mb-1 ml-1" style={{ color: 'var(--text-tertiary)' }}>
          입력 중
        </p>
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-1.5"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderTopLeftRadius: '6px',
          }}
        >
          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot" style={{ animationDelay: '150ms' }} />
          <span className="typing-dot" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
