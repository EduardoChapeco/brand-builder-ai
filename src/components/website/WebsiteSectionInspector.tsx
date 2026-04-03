import { useMemo, useState, type ReactNode } from 'react';
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import SubtleBadge from '@/components/shared/SubtleBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  WebsitePageRecord,
  WebsiteRecord,
  WebsiteSectionRecord,
  WebsiteStatus,
} from '@/lib/websites/types';
import { cn } from '@/lib/utils';

type InspectorTab = 'content' | 'style' | 'animation';

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const linesFromPairs = (
  items: Array<Record<string, unknown>>,
  leftKey: string,
  rightKey: string,
) => items.map((item) => `${String(item[leftKey] || '')} | ${String(item[rightKey] || '')}`).join('\n');

const pairsFromLines = (value: string, leftKey: string, rightKey: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left = '', right = ''] = line.split('|').map((part) => part.trim());
      return { [leftKey]: left, [rightKey]: right };
    });

const listFromLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function SectionContentPanel({
  section,
  canEdit,
  updateSectionContent,
}: {
  section: WebsiteSectionRecord;
  canEdit: boolean;
  updateSectionContent: (sectionId: string, contentPatch: Record<string, unknown>) => void;
}) {
  const content = section.content;
  const ctaPrimary = (content.cta_primary as Record<string, unknown> | undefined) || {};
  const ctaSecondary = (content.cta_secondary as Record<string, unknown> | undefined) || {};

  if (section.section_type === 'hero') {
    return (
      <div className="grid gap-4">
        <Field label="Eyebrow">
          <Input
            value={String(content.eyebrow || '')}
            onChange={(event) => updateSectionContent(section.id, { eyebrow: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>
        <Field label="Headline">
          <Textarea
            value={String(content.headline || '')}
            onChange={(event) => updateSectionContent(section.id, { headline: event.target.value })}
            disabled={!canEdit}
            className="min-h-[96px] shadow-none"
          />
        </Field>
        <Field label="Subheadline">
          <Textarea
            value={String(content.subheadline || '')}
            onChange={(event) => updateSectionContent(section.id, { subheadline: event.target.value })}
            disabled={!canEdit}
            className="min-h-[96px] shadow-none"
          />
        </Field>
        <Field label="Body">
          <Textarea
            value={String(content.body || '')}
            onChange={(event) => updateSectionContent(section.id, { body: event.target.value })}
            disabled={!canEdit}
            className="min-h-[120px] shadow-none"
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="CTA primario">
            <Input
              value={String(ctaPrimary.text || '')}
              onChange={(event) =>
                updateSectionContent(section.id, {
                  cta_primary: { ...ctaPrimary, text: event.target.value },
                })
              }
              disabled={!canEdit}
              className="shadow-none"
            />
          </Field>
          <Field label="URL CTA primario">
            <Input
              value={String(ctaPrimary.url || '')}
              onChange={(event) =>
                updateSectionContent(section.id, {
                  cta_primary: { ...ctaPrimary, url: event.target.value },
                })
              }
              disabled={!canEdit}
              className="shadow-none"
            />
          </Field>
          <Field label="CTA secundario">
            <Input
              value={String(ctaSecondary.text || '')}
              onChange={(event) =>
                updateSectionContent(section.id, {
                  cta_secondary: { ...ctaSecondary, text: event.target.value },
                })
              }
              disabled={!canEdit}
              className="shadow-none"
            />
          </Field>
          <Field label="URL CTA secundario">
            <Input
              value={String(ctaSecondary.url || '')}
              onChange={(event) =>
                updateSectionContent(section.id, {
                  cta_secondary: { ...ctaSecondary, url: event.target.value },
                })
              }
              disabled={!canEdit}
              className="shadow-none"
            />
          </Field>
        </div>
      </div>
    );
  }

  if (section.section_type === 'features') {
    const items = Array.isArray(content.items) ? content.items as Array<Record<string, unknown>> : [];
    return (
      <div className="grid gap-4">
        <Field label="Headline">
          <Input
            value={String(content.headline || '')}
            onChange={(event) => updateSectionContent(section.id, { headline: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>
        <Field label="Subheadline">
          <Textarea
            value={String(content.subheadline || '')}
            onChange={(event) => updateSectionContent(section.id, { subheadline: event.target.value })}
            disabled={!canEdit}
            className="min-h-[96px] shadow-none"
          />
        </Field>
        <Field label="Itens (titulo | descricao)">
          <Textarea
            value={linesFromPairs(items, 'title', 'description')}
            onChange={(event) =>
              updateSectionContent(section.id, {
                items: pairsFromLines(event.target.value, 'title', 'description'),
              })
            }
            disabled={!canEdit}
            className="min-h-[180px] shadow-none"
          />
        </Field>
      </div>
    );
  }

  if (section.section_type === 'pricing') {
    const plans = Array.isArray(content.plans) ? content.plans as Array<Record<string, unknown>> : [];
    return (
      <div className="grid gap-4">
        <Field label="Headline">
          <Input
            value={String(content.headline || '')}
            onChange={(event) => updateSectionContent(section.id, { headline: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>
        <Field label="Planos (nome | preco)">
          <Textarea
            value={linesFromPairs(plans, 'name', 'price')}
            onChange={(event) =>
              updateSectionContent(section.id, {
                plans: pairsFromLines(event.target.value, 'name', 'price').map((plan) => ({
                  ...plan,
                  period: '/mes',
                  description: '',
                  features: [],
                  cta_text: 'Escolher',
                  is_highlighted: false,
                })),
              })
            }
            disabled={!canEdit}
            className="min-h-[180px] shadow-none"
          />
        </Field>
      </div>
    );
  }

  if (section.section_type === 'faq' || section.section_type === 'testimonials') {
    const keyA = section.section_type === 'faq' ? 'question' : 'author_name';
    const keyB = section.section_type === 'faq' ? 'answer' : 'text';
    const label = section.section_type === 'faq' ? 'FAQ (pergunta | resposta)' : 'Depoimentos (autor | texto)';
    const items = Array.isArray(content.items) ? content.items as Array<Record<string, unknown>> : [];

    return (
      <div className="grid gap-4">
        <Field label="Headline">
          <Input
            value={String(content.headline || '')}
            onChange={(event) => updateSectionContent(section.id, { headline: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>
        <Field label={label}>
          <Textarea
            value={linesFromPairs(items, keyA, keyB)}
            onChange={(event) =>
              updateSectionContent(section.id, {
                items: pairsFromLines(event.target.value, keyA, keyB),
              })
            }
            disabled={!canEdit}
            className="min-h-[180px] shadow-none"
          />
        </Field>
      </div>
    );
  }

  if (section.section_type === 'stats') {
    const items = Array.isArray(content.items) ? content.items as Array<Record<string, unknown>> : [];
    return (
      <div className="grid gap-4">
        <Field label="Headline">
          <Input
            value={String(content.headline || '')}
            onChange={(event) => updateSectionContent(section.id, { headline: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>
        <Field label="Indicadores (numero | label)">
          <Textarea
            value={linesFromPairs(items, 'number', 'label')}
            onChange={(event) =>
              updateSectionContent(section.id, {
                items: pairsFromLines(event.target.value, 'number', 'label'),
              })
            }
            disabled={!canEdit}
            className="min-h-[180px] shadow-none"
          />
        </Field>
      </div>
    );
  }

  if (section.section_type === 'contact_form') {
    return (
      <div className="grid gap-4">
        <Field label="Headline">
          <Input
            value={String(content.headline || '')}
            onChange={(event) => updateSectionContent(section.id, { headline: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>
        <Field label="Campos (um por linha)">
          <Textarea
            value={Array.isArray(content.fields) ? content.fields.map(String).join('\n') : ''}
            onChange={(event) => updateSectionContent(section.id, { fields: listFromLines(event.target.value) })}
            disabled={!canEdit}
            className="min-h-[120px] shadow-none"
          />
        </Field>
        <Field label="Texto do botao">
          <Input
            value={String(content.submit_text || '')}
            onChange={(event) => updateSectionContent(section.id, { submit_text: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>
      </div>
    );
  }

  if (section.section_type === 'cta') {
    return (
      <div className="grid gap-4">
        <Field label="Headline">
          <Textarea
            value={String(content.headline || '')}
            onChange={(event) => updateSectionContent(section.id, { headline: event.target.value })}
            disabled={!canEdit}
            className="min-h-[96px] shadow-none"
          />
        </Field>
        <Field label="Subheadline">
          <Textarea
            value={String(content.subheadline || '')}
            onChange={(event) => updateSectionContent(section.id, { subheadline: event.target.value })}
            disabled={!canEdit}
            className="min-h-[96px] shadow-none"
          />
        </Field>
        <Field label="Body">
          <Textarea
            value={String(content.body || '')}
            onChange={(event) => updateSectionContent(section.id, { body: event.target.value })}
            disabled={!canEdit}
            className="min-h-[120px] shadow-none"
          />
        </Field>
      </div>
    );
  }

  if (section.section_type === 'custom_html') {
    return (
      <Field label="HTML controlado">
        <Textarea
          value={String(content.html || '')}
          onChange={(event) => updateSectionContent(section.id, { html: event.target.value })}
          disabled={!canEdit}
          className="min-h-[240px] font-mono text-xs shadow-none"
        />
      </Field>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Bloco legado preservado</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Esta secao veio de uma estrutura anterior. O preview continua funcionando enquanto a migracao manual e feita.
      </p>
    </div>
  );
}

export default function WebsiteSectionInspector({
  website,
  activePage,
  selectedSection,
  canEdit,
  updateWebsite,
  updatePage,
  updateSection,
  updateSectionContent,
  onChangeStatus,
}: {
  website: WebsiteRecord;
  activePage: WebsitePageRecord | null;
  selectedSection: WebsiteSectionRecord | null;
  canEdit: boolean;
  updateWebsite: (patch: Partial<WebsiteRecord>) => void;
  updatePage: (pageId: string, patch: Partial<WebsitePageRecord>) => void;
  updateSection: (sectionId: string, patch: Partial<WebsiteSectionRecord>) => void;
  updateSectionContent: (sectionId: string, contentPatch: Record<string, unknown>) => void;
  onChangeStatus: (status: WebsiteStatus) => void;
}) {
  const [tab, setTab] = useState<InspectorTab>('content');

  const hasSelection = Boolean(selectedSection);
  const sectionTitle = useMemo(
    () => (selectedSection ? selectedSection.section_type.replace(/_/g, ' ') : 'site'),
    [selectedSection],
  );

  if (!hasSelection) {
    return (
      <div className="grid gap-6">
        <div>
          <AppSectionLabel>Configuracoes gerais</AppSectionLabel>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Site
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Ajuste a identidade base enquanto nenhuma secao esta selecionada.
          </p>
        </div>

        <Field label="Nome do site">
          <Input
            value={website.name}
            onChange={(event) => updateWebsite({ name: event.target.value })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>

        <Field label="Dominio">
          <Input
            value={website.domain || ''}
            onChange={(event) => updateWebsite({ domain: event.target.value || null })}
            disabled={!canEdit}
            className="shadow-none"
          />
        </Field>

        <Field label="Status">
          <select
            value={website.status}
            onChange={(event) => onChangeStatus(event.target.value as WebsiteStatus)}
            disabled={!canEdit}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>

        {activePage ? (
          <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Pagina ativa</p>
              {activePage.is_home ? <SubtleBadge variant="brand">home</SubtleBadge> : null}
            </div>
            <Field label="Titulo da pagina">
              <Input
                value={activePage.title}
                onChange={(event) => updatePage(activePage.id, { title: event.target.value })}
                disabled={!canEdit}
                className="shadow-none"
              />
            </Field>
            <Field label="Slug">
              <Input
                value={activePage.slug}
                onChange={(event) => updatePage(activePage.id, { slug: event.target.value })}
                disabled={!canEdit}
                className="shadow-none"
              />
            </Field>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <AppSectionLabel>Inspector</AppSectionLabel>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          {sectionTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Ajuste conteudo, estilo e animacao da secao selecionada.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
        {(['content', 'style', 'animation'] as InspectorTab[]).map((entry) => (
          <Button
            key={entry}
            type="button"
            variant="ghost"
            className={cn('rounded-xl shadow-none', tab === entry && 'bg-[var(--surface-card)]')}
            onClick={() => setTab(entry)}
          >
            {entry === 'content' ? 'Conteudo' : entry === 'style' ? 'Estilo' : 'Animacao'}
          </Button>
        ))}
      </div>

      {tab === 'content' ? (
        <SectionContentPanel
          section={selectedSection}
          canEdit={canEdit}
          updateSectionContent={updateSectionContent}
        />
      ) : null}

      {tab === 'style' ? (
        <div className="grid gap-4">
          <Field label="Visibilidade">
            <select
              value={String(selectedSection.is_visible)}
              onChange={(event) =>
                updateSection(selectedSection.id, { is_visible: event.target.value === 'true' })
              }
              disabled={!canEdit}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="true">Visivel</option>
              <option value="false">Oculta</option>
            </select>
          </Field>
          <Field label="Background">
            <select
              value={selectedSection.bg_type}
              onChange={(event) =>
                updateSection(selectedSection.id, {
                  bg_type: event.target.value as WebsiteSectionRecord['bg_type'],
                })
              }
              disabled={!canEdit}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="color">Color</option>
              <option value="gradient">Gradient</option>
              <option value="image">Image</option>
              <option value="pattern">Pattern</option>
            </select>
          </Field>
          <Field label="Background value">
            <Input
              value={selectedSection.bg_value || ''}
              onChange={(event) => updateSection(selectedSection.id, { bg_value: event.target.value || null })}
              disabled={!canEdit}
              className="shadow-none"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Padding top">
              <select
                value={selectedSection.padding_top}
                onChange={(event) => updateSection(selectedSection.id, { padding_top: event.target.value })}
                disabled={!canEdit}
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="xs">XS</option>
                <option value="sm">SM</option>
                <option value="md">MD</option>
                <option value="lg">LG</option>
                <option value="xl">XL</option>
              </select>
            </Field>
            <Field label="Padding bottom">
              <select
                value={selectedSection.padding_bottom}
                onChange={(event) => updateSection(selectedSection.id, { padding_bottom: event.target.value })}
                disabled={!canEdit}
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="xs">XS</option>
                <option value="sm">SM</option>
                <option value="md">MD</option>
                <option value="lg">LG</option>
                <option value="xl">XL</option>
              </select>
            </Field>
          </div>
        </div>
      ) : null}

      {tab === 'animation' ? (
        <div className="grid gap-4">
          <Field label="Animacao de scroll">
            <select
              value={selectedSection.scroll_animation}
              onChange={(event) =>
                updateSection(selectedSection.id, {
                  scroll_animation: event.target.value as WebsiteSectionRecord['scroll_animation'],
                })
              }
              disabled={!canEdit}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="none">None</option>
              <option value="fade_up">Fade Up</option>
              <option value="fade_in">Fade In</option>
              <option value="slide_left">Slide Left</option>
              <option value="slide_right">Slide Right</option>
              <option value="zoom_in">Zoom In</option>
            </select>
          </Field>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Estado da secao</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Versao atual: {selectedSection.version}. O historico incremental permanece em `snapshot_history`.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
