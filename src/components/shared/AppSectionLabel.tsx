import { cn } from "@/lib/utils";

export const AppSectionLabel = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => (
  <p
    className={cn(
      "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]",
      className,
    )}
  >
    {children}
  </p>
);

export default AppSectionLabel;

