import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SwStatusBadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const VARIANT_CLASSNAMES: Record<SwStatusBadgeVariant, string> = {
  neutral: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]',
  brand: 'border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)]',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
};

export const SwStatusBadge = ({
  children,
  variant = 'neutral',
  className,
}: {
  children: ReactNode;
  variant?: SwStatusBadgeVariant;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
      VARIANT_CLASSNAMES[variant],
      className,
    )}
  >
    {children}
  </span>
);

export default SwStatusBadge;
