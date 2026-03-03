import { useMemo } from 'react';

interface PageMetaFooterProps {
  content: string;
  updatedAt: string;
}

export default function PageMetaFooter({ content, updatedAt }: PageMetaFooterProps) {
  const stats = useMemo(() => {
    const text = content.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { chars, words, readingTime };
  }, [content]);

  const lastModified = useMemo(() => {
    if (!updatedAt) return '';
    const d = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }, [updatedAt]);

  return (
    <div
      className="flex items-center gap-3 px-8 py-2 text-[11px] shrink-0"
      style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
    >
      <span>{stats.chars.toLocaleString()}자</span>
      <span style={{ opacity: 0.3 }}>·</span>
      <span>{stats.words.toLocaleString()}단어</span>
      <span style={{ opacity: 0.3 }}>·</span>
      <span>약 {stats.readingTime}분 읽기</span>
      {lastModified && (
        <>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>수정 {lastModified}</span>
        </>
      )}
    </div>
  );
}
