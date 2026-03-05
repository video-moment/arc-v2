interface BreadcrumbProps {
  groupEmoji: string;
  groupName: string;
  pageEmoji: string;
  pageTitle: string;
  onClickGroup?: () => void;
}

export default function Breadcrumb({ groupEmoji, groupName, pageEmoji, pageTitle, onClickGroup }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
      <span
        className={onClickGroup ? 'cursor-pointer hover:underline' : ''}
        onClick={onClickGroup}
        style={onClickGroup ? { display: 'inline-flex', alignItems: 'center', gap: 4 } : undefined}
      >
        {groupEmoji} {groupName}
      </span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span>{pageEmoji}</span>
      <span className="truncate" style={{ maxWidth: 200 }}>{pageTitle}</span>
    </div>
  );
}
