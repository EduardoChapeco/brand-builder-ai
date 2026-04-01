import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "brand" | "solid" | "outline";

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border)]",
  brand: "bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)] border-[var(--workspace-brand-border)]",
  solid: "bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)]",
  outline: "bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)]",
};

export const SubtleBadge = ({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) => (
  <span
    className={cn(
      "inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium",
      variantClass[variant],
      className,
    )}
  >
    {children}
  </span>
);

export default SubtleBadge;

