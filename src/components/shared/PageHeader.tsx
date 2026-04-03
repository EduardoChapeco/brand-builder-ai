import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PageHeader = ({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <header
    className={cn(
      "rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-card)_0%,var(--surface-2)_100%)] px-6 py-6 shadow-none",
      className,
    )}
  >
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[clamp(28px,3.6vw,48px)] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </div>
  </header>
);

export default PageHeader;
