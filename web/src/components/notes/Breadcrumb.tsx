import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  groupEmoji: string;
  groupName: string;
  pageEmoji: string;
  pageTitle: string;
  onClickGroup?: () => void;
}

export default function Breadcrumb({ groupEmoji, groupName, pageEmoji, pageTitle, onClickGroup }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <span
        className={cn(
          'flex items-center gap-1',
          onClickGroup && 'cursor-pointer hover:text-foreground transition-colors'
        )}
        onClick={onClickGroup}
      >
        {groupEmoji} {groupName}
      </span>
      <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
      <span>{pageEmoji}</span>
      <span className="truncate max-w-[200px]">{pageTitle}</span>
    </div>
  );
}
