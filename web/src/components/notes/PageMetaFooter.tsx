import { useMemo } from 'react';

interface PageMetaFooterProps {
  content: string;
  updatedAt: string;
}

export default function PageMetaFooter({ content, updatedAt }: PageMetaFooterProps) {
  const stats = useMemo(() => {
    const text = content.trim();
    const chars = text.replace(/\s/g, '').length;
    const readingTime = Math.max(1, Math.ceil(chars / 500));
    return { chars, readingTime };
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
    <div className="flex items-center gap-3 px-8 py-2 text-[11px] text-muted-foreground/60 shrink-0 border-t">
      <span>{stats.chars.toLocaleString()}자</span>
      <span className="opacity-30">·</span>
      <span>약 {stats.readingTime}분 읽기</span>
      {lastModified && (
        <>
          <span className="opacity-30">·</span>
          <span>수정 {lastModified}</span>
        </>
      )}
    </div>
  );
}
