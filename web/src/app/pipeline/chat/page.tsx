'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutMain } from '@/components/LayoutMain';
import { ChatUI } from '@/components/pipeline/ChatUI';

function ChatContent() {
  const searchParams = useSearchParams();
  const domainId = searchParams.get('domain');
  return <ChatUI initialDomainId={domainId} />;
}

export default function PipelineChatPage() {
  return (
    <LayoutMain>
      <div style={{ height: 'calc(100vh - 64px)' }}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                로딩 중...
              </div>
            </div>
          }
        >
          <ChatContent />
        </Suspense>
      </div>
    </LayoutMain>
  );
}
