import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import MetricCard from '@/components/shared/MetricCard';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SwStatusBadge from '@/components/shared/SwStatusBadge';

type Metric = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
};

export const OperationalModulePlaceholder = ({
  eyebrow,
  title,
  description,
  badge,
  metrics,
  checklist,
  nextActions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  metrics: Metric[];
  checklist: string[];
  nextActions: string[];
}) => (
  <div className="page-layout">
    <div className="page-content no-scrollbar">
      <div className="page-inner space-y-6 py-6">
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={badge ? <SwStatusBadge variant="brand">{badge}</SwStatusBadge> : null}
        />

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} label={metric.label} value={metric.value} icon={metric.icon} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <SectionCard className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Checklist operacional</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">O que este módulo precisa cumprir</h2>
            </div>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Próximas conexões</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Próximos passos desta tranche</h2>
            </div>
            <div className="space-y-3">
              {nextActions.map((action) => (
                <div
                  key={action}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]"
                >
                  <ArrowRight size={16} className="mt-0.5 shrink-0 text-[var(--workspace-brand)]" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      </div>
    </div>
  </div>
);

export default OperationalModulePlaceholder;
