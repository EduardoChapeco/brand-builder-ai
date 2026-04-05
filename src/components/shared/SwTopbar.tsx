import { CircleHelp, Eye, RefreshCw } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import SwStatusBadge from '@/components/shared/SwStatusBadge';

export const SwTopbar = ({
  title,
  description,
  status,
  workspaceName,
  onOpenHelp,
}: {
  title: string;
  description?: string;
  status?: string;
  workspaceName?: string | null;
  onOpenHelp: () => void;
}) => (
  <header className="border-b border-[var(--border)] bg-[var(--surface-app)] px-4 py-3">
    <div className="flex flex-wrap items-center gap-3">
      <SidebarTrigger className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h1>
          {status ? <SwStatusBadge variant="brand">{status}</SwStatusBadge> : null}
          {workspaceName ? <SwStatusBadge>{workspaceName}</SwStatusBadge> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenHelp}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <CircleHelp size={14} />
          Ajuda
        </button>
      </div>
    </div>
  </header>
);

export default SwTopbar;
