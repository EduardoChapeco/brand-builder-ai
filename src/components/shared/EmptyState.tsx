import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const EmptyState = ({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-6 py-10 text-center",
      className,
    )}
  >
    {Icon ? (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-muted)]">
        <Icon size={22} />
      </div>
    ) : null}
    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
    <p className="mt-2 max-w-[560px] text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export default EmptyState;

