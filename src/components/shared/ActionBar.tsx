import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ActionBar = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4 md:flex-row md:items-center md:justify-between",
      className,
    )}
  >
    {children}
  </div>
);

export default ActionBar;

