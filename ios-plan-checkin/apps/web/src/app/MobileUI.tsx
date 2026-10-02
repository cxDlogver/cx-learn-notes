import type { ReactNode } from "react";

// Pen uses Lucide outlines. Keep the same 24-unit geometry at every viewport.
const iconPaths: Record<string, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  "calendar-check": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18m-13 5 3 3 5-5" />
    </>
  ),
  "list-checks": (
    <>
      <path d="m3 6 2 2 4-4m-6 12 2 2 4-4M13 6h8M13 16h8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  next: <path d="m9 18 6-6-6-6" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z" />
    </>
  ),
  folder: (
    <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={`ui-icon ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name] ?? iconPaths.user}
    </svg>
  );
}

export function PageHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="mobile-page-header">
      {onBack ? (
        <button
          type="button"
          className="icon-button"
          aria-label="返回"
          onClick={onBack}
        >
          <Icon name="back" />
        </button>
      ) : (
        <span className="header-spacer" />
      )}
      <h1>{title}</h1>
      <div className="header-action">{action}</div>
    </header>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {[...name][0] ?? <Icon name="user" />}
    </span>
  );
}
