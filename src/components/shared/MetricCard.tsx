import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const MetricCard = ({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-none",
      className,
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      {Icon ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--workspace-brand)]">
          <Icon size={16} />
        </div>
      ) : null}
    </div>
    <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
      {value}
    </p>
  </div>
);

export default MetricCard;
