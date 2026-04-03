import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SectionCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-6 shadow-none",
      className,
    )}
  >
    {children}
  </section>
);

export default SectionCard;
