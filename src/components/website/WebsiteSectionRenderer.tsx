import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { WebsiteSectionRecord } from '@/lib/websites/types';
import { cn } from '@/lib/utils';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

type EditableTextProps = {
  as?: 'div' | 'h1' | 'h2' | 'h3' | 'p' | 'span';
  value: string;
  editable?: boolean;
  className?: string;
  onCommit?: (value: string) => void;
};

const EditableText = ({
  as = 'div',
  value,
  editable,
  className,
  onCommit,
}: EditableTextProps) => {
  const Tag = as;

  if (!editable) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      className={cn(
        className,
        'rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-brand-border)]',
      )}
      contentEditable
      suppressContentEditableWarning
      onBlur={(event) => onCommit?.(event.currentTarget.textContent?.trim() || '')}
    >
      {value}
    </Tag>
  );
};

const SectionShell = ({
  children,
  section,
  selected,
  onSelect,
}: {
  children: ReactNode;
  section: WebsiteSectionRecord;
  selected: boolean;
  onSelect?: () => void;
}) => (
  <section
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.();
      }
    }}
    className={cn(
      'relative border-b border-[var(--border)] px-6 py-14 transition-colors md:px-10',
      selected && 'bg-[var(--workspace-brand-soft)]/50',
    )}
    style={{
      background:
        section.bg_type === 'gradient'
          ? section.bg_value || 'linear-gradient(180deg,var(--workspace-brand-soft),transparent 75%)'
          : section.bg_type === 'image' && section.bg_value
            ? `url(${section.bg_value}) center / cover`
            : section.bg_type === 'pattern' && section.bg_value
              ? section.bg_value
              : undefined,
    }}
  >
    {selected ? (
      <div className="absolute left-4 top-4 rounded-full border border-[var(--workspace-brand-border)] bg-[var(--surface-card)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--workspace-brand)]">
        Selecionada
      </div>
    ) : null}
    {children}
  </section>
);

export default function WebsiteSectionRenderer({
  section,
  previewMode,
  selected,
  onSelect,
  onUpdateContent,
}: {
  section: WebsiteSectionRecord;
  previewMode: PreviewMode;
  selected: boolean;
  onSelect?: () => void;
  onUpdateContent?: (contentPatch: Record<string, unknown>) => void;
}) {
  const content = section.content;
  const compact = previewMode === 'mobile';

  if (!section.is_visible) {
    return null;
  }

  if (section.section_type === 'hero') {
    const ctaPrimary = (content.cta_primary as { text?: string } | undefined) || {};
    const ctaSecondary = (content.cta_secondary as { text?: string } | undefined) || {};

    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className={cn('mx-auto flex max-w-6xl flex-col gap-6', !compact && 'py-10')}>
          <EditableText
            as="span"
            value={String(content.eyebrow || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ eyebrow: value })}
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-brand)]"
          />
          <EditableText
            as="h1"
            value={String(content.headline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ headline: value })}
            className={cn(
              'max-w-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]',
              compact ? 'text-4xl' : 'text-[clamp(42px,7vw,82px)]',
            )}
          />
          <EditableText
            as="p"
            value={String(content.subheadline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ subheadline: value })}
            className="max-w-3xl text-lg leading-8 text-[var(--text-secondary)]"
          />
          <EditableText
            as="p"
            value={String(content.body || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ body: value })}
            className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]"
          />
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl shadow-none">{String(ctaPrimary.text || 'CTA principal')}</Button>
            <Button
              variant="outline"
              className="rounded-xl border-[var(--border)] bg-[var(--surface-card)] shadow-none hover:bg-[var(--surface-2)]"
            >
              {String(ctaSecondary.text || 'CTA secundaria')}
            </Button>
          </div>
        </div>
      </SectionShell>
    );
  }

  if (section.section_type === 'features') {
    const items = Array.isArray(content.items) ? content.items : [];
    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className="mx-auto max-w-6xl space-y-8">
          <EditableText
            as="h2"
            value={String(content.headline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ headline: value })}
            className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
          />
          <EditableText
            as="p"
            value={String(content.subheadline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ subheadline: value })}
            className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]"
          />
          <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-3')}>
            {items.map((item, index) => {
              const row = item as Record<string, unknown>;
              const nextItems = items.map((entry, entryIndex) =>
                entryIndex === index ? { ...(entry as Record<string, unknown>) } : entry,
              );

              return (
                <div key={`${section.id}-feature-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
                  <EditableText
                    as="h3"
                    value={String(row.title || '')}
                    editable={selected}
                    onCommit={(value) => {
                      (nextItems[index] as Record<string, unknown>).title = value;
                      onUpdateContent?.({ items: nextItems });
                    }}
                    className="text-lg font-semibold text-[var(--text-primary)]"
                  />
                  <EditableText
                    as="p"
                    value={String(row.description || '')}
                    editable={selected}
                    onCommit={(value) => {
                      (nextItems[index] as Record<string, unknown>).description = value;
                      onUpdateContent?.({ items: nextItems });
                    }}
                    className="mt-3 text-sm leading-7 text-[var(--text-secondary)]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>
    );
  }

  if (section.section_type === 'pricing') {
    const plans = Array.isArray(content.plans) ? content.plans : [];
    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className="mx-auto max-w-6xl space-y-8">
          <EditableText
            as="h2"
            value={String(content.headline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ headline: value })}
            className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
          />
          <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-3')}>
            {plans.map((plan, index) => {
              const row = plan as Record<string, unknown>;
              const features = Array.isArray(row.features) ? row.features : [];

              return (
                <div
                  key={`${section.id}-plan-${index}`}
                  className={cn(
                    'rounded-2xl border p-5',
                    row.is_highlighted
                      ? 'border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)]'
                      : 'border-[var(--border)] bg-[var(--surface-card)]',
                  )}
                >
                  <EditableText
                    as="h3"
                    value={String(row.name || '')}
                    editable={selected}
                    onCommit={(value) => {
                      const nextPlans = plans.map((entry, entryIndex) =>
                        entryIndex === index ? { ...(entry as Record<string, unknown>), name: value } : entry,
                      );
                      onUpdateContent?.({ plans: nextPlans });
                    }}
                    className="text-lg font-semibold text-[var(--text-primary)]"
                  />
                  <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                    {String(row.price || '')}
                    <span className="ml-1 text-sm font-normal text-[var(--text-secondary)]">
                      {String(row.period || '')}
                    </span>
                  </p>
                  <EditableText
                    as="p"
                    value={String(row.description || '')}
                    editable={selected}
                    onCommit={(value) => {
                      const nextPlans = plans.map((entry, entryIndex) =>
                        entryIndex === index ? { ...(entry as Record<string, unknown>), description: value } : entry,
                      );
                      onUpdateContent?.({ plans: nextPlans });
                    }}
                    className="mt-3 text-sm leading-7 text-[var(--text-secondary)]"
                  />
                  <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                    {features.map((feature, featureIndex) => (
                      <li key={`${section.id}-plan-${index}-feature-${featureIndex}`}>- {String(feature)}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>
    );
  }

  if (section.section_type === 'faq' || section.section_type === 'testimonials') {
    const items = Array.isArray(content.items) ? content.items : [];
    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className="mx-auto max-w-6xl space-y-8">
          <EditableText
            as="h2"
            value={String(content.headline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ headline: value })}
            className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
          />
          <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-2')}>
            {items.map((item, index) => {
              const row = item as Record<string, unknown>;
              const nextItems = items.map((entry, entryIndex) =>
                entryIndex === index ? { ...(entry as Record<string, unknown>) } : entry,
              );

              return (
                <div key={`${section.id}-item-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
                  <EditableText
                    as={section.section_type === 'faq' ? 'h3' : 'p'}
                    value={String(section.section_type === 'faq' ? row.question : row.text || '')}
                    editable={selected}
                    onCommit={(value) => {
                      if (section.section_type === 'faq') {
                        (nextItems[index] as Record<string, unknown>).question = value;
                      } else {
                        (nextItems[index] as Record<string, unknown>).text = value;
                      }
                      onUpdateContent?.({ items: nextItems });
                    }}
                    className={section.section_type === 'faq' ? 'text-base font-semibold text-[var(--text-primary)]' : 'text-sm leading-7 text-[var(--text-secondary)]'}
                  />
                  {section.section_type === 'faq' ? (
                    <EditableText
                      as="p"
                      value={String(row.answer || '')}
                      editable={selected}
                      onCommit={(value) => {
                        (nextItems[index] as Record<string, unknown>).answer = value;
                        onUpdateContent?.({ items: nextItems });
                      }}
                      className="mt-3 text-sm leading-7 text-[var(--text-secondary)]"
                    />
                  ) : (
                    <div className="mt-4">
                      <EditableText
                        as="h3"
                        value={String(row.author_name || '')}
                        editable={selected}
                        onCommit={(value) => {
                          (nextItems[index] as Record<string, unknown>).author_name = value;
                          onUpdateContent?.({ items: nextItems });
                        }}
                        className="text-sm font-semibold text-[var(--text-primary)]"
                      />
                      <EditableText
                        as="p"
                        value={String(row.author_role || '')}
                        editable={selected}
                        onCommit={(value) => {
                          (nextItems[index] as Record<string, unknown>).author_role = value;
                          onUpdateContent?.({ items: nextItems });
                        }}
                        className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>
    );
  }

  if (section.section_type === 'stats') {
    const items = Array.isArray(content.items) ? content.items : [];
    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className="mx-auto max-w-6xl space-y-8">
          <EditableText
            as="h2"
            value={String(content.headline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ headline: value })}
            className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
          />
          <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-3')}>
            {items.map((item, index) => {
              const row = item as Record<string, unknown>;
              return (
                <div key={`${section.id}-stat-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
                  <EditableText
                    as="div"
                    value={String(row.number || '')}
                    editable={selected}
                    onCommit={(value) => {
                      const nextItems = items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...(entry as Record<string, unknown>), number: value } : entry,
                      );
                      onUpdateContent?.({ items: nextItems });
                    }}
                    className="text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]"
                  />
                  <EditableText
                    as="p"
                    value={String(row.label || '')}
                    editable={selected}
                    onCommit={(value) => {
                      const nextItems = items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...(entry as Record<string, unknown>), label: value } : entry,
                      );
                      onUpdateContent?.({ items: nextItems });
                    }}
                    className="mt-2 text-sm leading-7 text-[var(--text-secondary)]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>
    );
  }

  if (section.section_type === 'contact_form') {
    const fields = Array.isArray(content.fields) ? content.fields : [];
    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className={cn('mx-auto grid max-w-6xl gap-8', compact ? 'grid-cols-1' : 'grid-cols-[1.1fr_0.9fr]')}>
          <div>
            <EditableText
              as="h2"
              value={String(content.headline || '')}
              editable={selected}
              onCommit={(value) => onUpdateContent?.({ headline: value })}
              className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
            />
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Captura conectada ao CRM do workspace e pronta para automacao posterior.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
            <div className="grid gap-3">
              {fields.map((field, index) => (
                <div key={`${section.id}-field-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm text-[var(--text-secondary)]">
                  {String(field)}
                </div>
              ))}
              <Button className="mt-2 rounded-xl shadow-none">{String(content.submit_text || 'Enviar')}</Button>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  if (section.section_type === 'cta') {
    const ctaPrimary = (content.cta_primary as { text?: string } | undefined) || {};
    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className="mx-auto max-w-4xl text-center">
          <EditableText
            as="h2"
            value={String(content.headline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ headline: value })}
            className="text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
          />
          <EditableText
            as="p"
            value={String(content.subheadline || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ subheadline: value })}
            className="mt-4 text-lg leading-8 text-[var(--text-secondary)]"
          />
          <EditableText
            as="p"
            value={String(content.body || '')}
            editable={selected}
            onCommit={(value) => onUpdateContent?.({ body: value })}
            className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]"
          />
          <div className="mt-6">
            <Button className="rounded-xl shadow-none">{String(ctaPrimary.text || 'CTA principal')}</Button>
          </div>
        </div>
      </SectionShell>
    );
  }

  if (section.section_type === 'custom_html') {
    return (
      <SectionShell section={section} selected={selected} onSelect={onSelect}>
        <div className="mx-auto max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
          <div
            className="prose max-w-none text-[var(--text-primary)]"
            dangerouslySetInnerHTML={{ __html: String(content.html || '') }}
          />
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell section={section} selected={selected} onSelect={onSelect}>
      <div className="mx-auto max-w-5xl rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-card)] p-5">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Legado preservado: {String(content.legacy_type || section.section_type)}
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          Esta secao foi importada de um modelo anterior. O conteudo bruto continua preservado para migracao gradual.
        </p>
      </div>
    </SectionShell>
  );
}
