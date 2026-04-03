import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Bot,
  Eye,
  GripVertical,
  Layers,
  Loader2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SubtleBadge from '@/components/shared/SubtleBadge';
import WebsiteSectionInspector from '@/components/website/WebsiteSectionInspector';
import WebsiteSectionRenderer from '@/components/website/WebsiteSectionRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWebsiteBuilder } from '@/hooks/useWebsiteBuilder';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WEBSITE_SECTION_LIBRARY } from '@/lib/websites/defaults';
import type {
  WebsitePageRecord,
  WebsiteSectionRecord,
  WebsiteSectionType,
  WebsiteStatus,
} from '@/lib/websites/types';
import { cn } from '@/lib/utils';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const SECTION_LABELS: Record<WebsiteSectionType, string> = {
  hero: 'Hero',
  features: 'Features',
  benefits: 'Benefits',
  pricing: 'Pricing',
  faq: 'FAQ',
  testimonials: 'Testimonials',
  cta: 'CTA',
  contact_form: 'Contact Form',
  gallery: 'Gallery',
  video_embed: 'Video Embed',
  stats: 'Stats',
  team: 'Team',
  blog_feed: 'Blog Feed',
  newsletter: 'Newsletter',
  social_proof: 'Social Proof',
  comparison_table: 'Comparison Table',
  timeline: 'Timeline',
  custom_html: 'Custom HTML',
  legacy_block: 'Legacy Block',
};

const SECTION_GROUP_ORDER = ['Topo', 'Conteudo', 'Conversao', 'Custom'] as const;

const toPathSlug = (value: string) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  if (!normalized || normalized === 'home') {
    return '/';
  }

  return `/${normalized.replace(/^\/+/, '')}`;
};

function SortableSectionRow({
  section,
  selected,
  onSelect,
  onRemove,
}: {
  section: WebsiteSectionRecord;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'rounded-2xl border p-3',
        selected
          ? 'border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-2)]',
        isDragging && 'opacity-80',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-muted)]"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <button type="button" onClick={onSelect} className="flex-1 text-left">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {SECTION_LABELS[section.section_type]}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Ordem {section.sort_order + 1}
          </p>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl shadow-none hover:bg-[var(--surface-card)]"
          onClick={onRemove}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}

export default function SiteEditorPage() {
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const { workspace, canEdit } = useWorkspace();
  const {
    website,
    pages,
    activePage,
    activePageId,
    activeSections,
    selectedSection,
    selectedSectionId,
    loading,
    saving,
    isDirty,
    sourceMode,
    setActivePageId,
    setSelectedSectionId,
    updateWebsite,
    updatePage,
    addPage,
    addSection,
    updateSection,
    updateSectionContent,
    removeSection,
    reorderSections,
    save,
  } = useWebsiteBuilder(workspace?.id, siteId);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const libraryByGroup = useMemo(
    () =>
      SECTION_GROUP_ORDER.map((group) => ({
        group,
        items: WEBSITE_SECTION_LIBRARY.filter((item) => item.group === group),
      })),
    [],
  );

  const previewWidthClass =
    previewMode === 'desktop'
      ? 'max-w-[1180px]'
      : previewMode === 'tablet'
        ? 'max-w-[820px]'
        : 'max-w-[430px] rounded-[32px]';

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeSections.findIndex((section) => section.id === active.id);
    const newIndex = activeSections.findIndex((section) => section.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextOrderedSections = arrayMove(activeSections, oldIndex, newIndex);
    reorderSections(nextOrderedSections.map((section) => section.id));
  };

  const handleSave = async () => {
    const persistedId = await save();
    if (persistedId && siteId === 'new' && workspace?.id) {
      navigate(`/workspace/${workspace.id}/site-builder/${persistedId}`, { replace: true });
    }
  };

  const handleAddPage = async () => {
    const title = newPageTitle.trim();
    if (!title) {
      toast.error('Informe o titulo da nova pagina.');
      return;
    }

    await addPage(title, newPageSlug.trim() || toPathSlug(title));
    setNewPageTitle('');
    setNewPageSlug('');
  };

  const handleSelectPage = (page: WebsitePageRecord) => {
    setActivePageId(page.id);
    setSelectedSectionId(null);
  };

  if (loading) {
    return (
      <div className="page-layout">
        <div className="page-content">
          <div className="page-inner flex min-h-[70vh] items-center justify-center py-6">
            <Loader2 className="animate-spin text-[var(--text-muted)]" size={32} />
          </div>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="page-layout">
        <div className="page-content">
          <div className="page-inner flex flex-col gap-6 py-6">
            <PageHeader
              eyebrow="Website Builder"
              title="Site nao encontrado"
              description="Nao foi possivel resolver o website solicitado dentro do workspace atual."
              className="shadow-none"
            />
            <EmptyState
              title="Nenhum site carregado"
              description="Volte para a biblioteca e escolha um site valido para continuar a edicao."
              icon={Layers}
              action={
                <Button
                  variant="outline"
                  className="rounded-xl shadow-none"
                  onClick={() => navigate('../site-builder')}
                >
                  Voltar para a biblioteca
                </Button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <div className="page-content">
        <div className="page-inner flex max-w-none flex-col gap-6 py-6">
          <PageHeader
            eyebrow="Website Builder"
            title={website.name}
            description="Editor visual canonico em paginas e secoes, com reordenacao drag-and-drop, preview inline e persistencia compativel com o legado."
            className="shadow-none"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <SubtleBadge variant={sourceMode === 'sections' ? 'brand' : 'outline'}>
                  {sourceMode === 'sections' ? 'schema canonico' : 'modo legado'}
                </SubtleBadge>
                {isDirty ? <SubtleBadge variant="outline">draft sujo</SubtleBadge> : null}
                {!canEdit ? <SubtleBadge variant="outline">somente leitura</SubtleBadge> : null}
                <Button
                  variant="outline"
                  className="rounded-xl shadow-none"
                  onClick={() => navigate('../site-builder')}
                >
                  Voltar
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl shadow-none"
                  onClick={() =>
                    navigate('../vibe-coder', {
                      state: { websiteId: website.id, websiteName: website.name },
                    })
                  }
                >
                  <Bot size={14} />
                  Abrir no chat
                </Button>
                <Button
                  className="rounded-xl shadow-none"
                  onClick={handleSave}
                  disabled={saving || !canEdit}
                >
                  <Save size={14} />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            }
          />

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
            <SectionCard className="shadow-none">
              <ScrollArea className="h-[calc(100vh-260px)] pr-3">
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <AppSectionLabel>Paginas</AppSectionLabel>
                    <div className="grid gap-2">
                      {pages.map((page) => (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => handleSelectPage(page)}
                          className={cn(
                            'rounded-2xl border px-4 py-3 text-left transition-colors',
                            activePageId === page.id
                              ? 'border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)]'
                              : 'border-[var(--border)] bg-[var(--surface-2)]',
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{page.title}</p>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">{page.slug}</p>
                            </div>
                            {page.is_home ? <SubtleBadge variant="brand">home</SubtleBadge> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                      <div className="grid gap-3">
                        <label className="grid gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Nova pagina
                          </span>
                          <Input
                            value={newPageTitle}
                            onChange={(event) => setNewPageTitle(event.target.value)}
                            placeholder="Ex: Sobre"
                            className="shadow-none"
                            disabled={!canEdit}
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Slug
                          </span>
                          <Input
                            value={newPageSlug}
                            onChange={(event) => setNewPageSlug(event.target.value)}
                            placeholder="/sobre"
                            className="shadow-none"
                            disabled={!canEdit}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl shadow-none"
                          onClick={handleAddPage}
                          disabled={!canEdit}
                        >
                          <Plus size={14} />
                          Adicionar pagina
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <AppSectionLabel>Adicionar secao</AppSectionLabel>
                    {libraryByGroup.map(({ group, items }) => (
                      <div key={group} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          {group}
                        </p>
                        <div className="mt-3 grid gap-2">
                          {items.map((item) => (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => addSection(item.type)}
                              disabled={!canEdit || !activePageId}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3">
                    <AppSectionLabel>Estrutura da pagina</AppSectionLabel>
                    {activeSections.length === 0 ? (
                      <EmptyState
                        title="Nenhuma secao"
                        description="Adicione uma secao para iniciar a composicao desta pagina."
                        icon={Layers}
                      />
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={activeSections.map((section) => section.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid gap-2">
                            {activeSections.map((section) => (
                              <SortableSectionRow
                                key={section.id}
                                section={section}
                                selected={selectedSectionId === section.id}
                                onSelect={() => setSelectedSectionId(section.id)}
                                onRemove={() => removeSection(section.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </SectionCard>

            <SectionCard className="shadow-none">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <AppSectionLabel>Preview</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {activePage?.title || 'Pagina'}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Clique no conteudo para selecionar a secao e editar inline no preview.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn('rounded-full px-3 shadow-none', previewMode === 'desktop' && 'bg-[var(--surface-card)]')}
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn('rounded-full px-3 shadow-none', previewMode === 'tablet' && 'bg-[var(--surface-card)]')}
                    onClick={() => setPreviewMode('tablet')}
                  >
                    <Tablet size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn('rounded-full px-3 shadow-none', previewMode === 'mobile' && 'bg-[var(--surface-card)]')}
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone size={14} />
                  </Button>
                </div>
              </div>

              {!canEdit ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  Este workspace esta em modo de leitura para o seu perfil. O preview continua acessivel, mas as alteracoes ficam bloqueadas.
                </div>
              ) : null}

              <ScrollArea className="mt-6 h-[calc(100vh-360px)]">
                {activeSections.length === 0 ? (
                  <EmptyState
                    title="Sem secoes nesta pagina"
                    description="Use a biblioteca lateral para inserir a primeira secao e comecar a compor a pagina."
                    icon={Eye}
                  />
                ) : (
                  <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className={cn('mx-auto overflow-hidden border border-[var(--border)] bg-[var(--surface-card)]', previewWidthClass)}>
                      {activeSections.map((section) => (
                        <WebsiteSectionRenderer
                          key={section.id}
                          section={section}
                          previewMode={previewMode}
                          selected={selectedSectionId === section.id}
                          onSelect={() => setSelectedSectionId(section.id)}
                          onUpdateContent={canEdit ? (contentPatch) => updateSectionContent(section.id, contentPatch) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </SectionCard>

            <SectionCard className="shadow-none">
              <ScrollArea className="h-[calc(100vh-260px)] pr-3">
                <WebsiteSectionInspector
                  website={website}
                  activePage={activePage}
                  selectedSection={selectedSection}
                  canEdit={canEdit}
                  updateWebsite={updateWebsite}
                  updatePage={updatePage}
                  updateSection={updateSection}
                  updateSectionContent={updateSectionContent}
                  onChangeStatus={(status) => updateWebsite({ status: status as WebsiteStatus })}
                />
              </ScrollArea>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
