interface BreadcrumbProps {
  groupEmoji: string;
  groupName: string;
  pageEmoji: string;
  pageTitle: string;
}

export default function Breadcrumb({ groupEmoji, groupName, pageEmoji, pageTitle }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
      <span>{groupEmoji}</span>
      <span>{groupName}</span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span>{pageEmoji}</span>
      <span className="truncate" style={{ maxWidth: 200 }}>{pageTitle}</span>
    </div>
  );
}
