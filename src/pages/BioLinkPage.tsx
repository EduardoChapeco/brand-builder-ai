import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, LayoutTemplate, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BioLinkRenderer } from "@/components/biolink/BioLinkRenderer";
import { useBioLinkWorkspace } from "@/hooks/useBioLinkWorkspace";
import {
  BIO_LINK_BLOCK_DEFINITIONS,
  BIO_LINK_LAYOUT_TEMPLATES,
  BIO_LINK_THEMES,
  type BioLinkBlock,
  type BioLinkBlockType,
  type BioLinkInsert,
  buildBioLinkSnapshot,
  createBioLinkBlock,
  getBioLinkBlockDefinition,
  slugifyBioLink,
} from "@/lib/biolink/registry";
import { publishBioLink, saveWorkspaceBioLink } from "@/lib/biolink/service";

const BlockOrderItem = ({
  block,
  active,
  onSelect,
  onDelete,
}: {
  block: BioLinkBlock;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-2xl border px-3 py-3"
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-xl border"
        style={{ borderColor: "var(--border)" }}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{String(block.config.title || getBioLinkBlockDefinition(block.type).label)}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{block.type}</p>
      </div>
      <div className="flex items-center gap-2">
        {active ? <span className="rounded-full bg-[var(--workspace-brand-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-brand)]">Ativo</span> : null}
        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-rose-500" onClick={(event) => { event.stopPropagation(); onDelete(); }}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="space-y-1">
    <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
    {description ? <p className="text-xs text-[var(--text-muted)]">{description}</p> : null}
  </div>
);

const toInsertPayload = (row: ReturnType<typeof useBioLinkWorkspace>["bioLink"]): BioLinkInsert => ({
  workspace_id: row?.workspace_id || "",
  slug: row?.slug || "",
  status: row?.status || "draft",
  display_name: row?.display_name || null,
  username: row?.username || null,
  bio_text: row?.bio_text || null,
  avatar_url: row?.avatar_url || null,
  header_config: row?.header_config || {},
  background_config: row?.background_config || {},
  theme_key: row?.theme_key || "brand-auto",
  theme_tokens: row?.theme_tokens || {},
  layout_template_key: row?.layout_template_key || "creator-standard",
  social_links: row?.social_links || [],
  cta_enabled: row?.cta_enabled || false,
  cta_text: row?.cta_text || null,
  cta_url: row?.cta_url || null,
  seo_title: row?.seo_title || null,
  seo_description: row?.seo_description || null,
  seo_image_url: row?.seo_image_url || null,
  meta_pixel_id: row?.meta_pixel_id || null,
  ga4_measurement_id: row?.ga4_measurement_id || null,
  tiktok_pixel_id: row?.tiktok_pixel_id || null,
  gtm_id: row?.gtm_id || null,
  profile: row?.profile || {},
  theme_id: row?.theme_id || row?.theme_key || "brand-auto",
  theme_config: row?.theme_config || row?.theme_tokens || {},
  links: row?.links || [],
  blocks: row?.blocks || [],
  seo_config: row?.seo_config || {},
  is_published: row?.is_published || false,
});

const BioLinkPage = () => {
  const { workspace, brandKit, bioLink, setBioLink, blocks, setBlocks, loading, refresh } = useBioLinkWorkspace();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  useEffect(() => {
    if (blocks.length > 0 && !selectedBlockId) {
      setSelectedBlockId(blocks[0].id);
    }
  }, [blocks, selectedBlockId]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || null,
    [blocks, selectedBlockId],
  );

  const snapshot = useMemo(
    () => (bioLink ? buildBioLinkSnapshot(bioLink, blocks) : null),
    [bioLink, blocks],
  );

  const updateBioLink = <K extends keyof NonNullable<typeof bioLink>>(field: K, value: NonNullable<typeof bioLink>[K]) => {
    setBioLink((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateBlock = (blockId: string, patch: Partial<BioLinkBlock>) => {
    setBlocks((current) =>
      current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)).map((block, index) => ({ ...block, position: index })),
    );
  };

  const saveDraft = async () => {
    if (!workspace || !bioLink) return;
    setSaving(true);
    try {
      const result = await saveWorkspaceBioLink({
        bioLinkId: bioLink.id,
        workspaceId: workspace.id,
        bioLink: toInsertPayload({
          ...bioLink,
          slug: slugifyBioLink(bioLink.slug),
        }),
        blocks,
      });
      setBioLink(result.bioLink);
      setBlocks(result.blocks);
      toast.success("Draft salvo.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o draft.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workspace || !bioLink) return;
    setPublishing(true);
    try {
      await saveDraft();
      const result = await publishBioLink(workspace.id, bioLink.id);
      toast.success(`Publicado em ${result.public_url}`);
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível publicar.");
    } finally {
      setPublishing(false);
    }
  };

  const addBlock = (type: BioLinkBlockType) => {
    const block = createBioLinkBlock(type, blocks.length);
    setBlocks((current) => [...current, block]);
    setSelectedBlockId(block.id);
  };

  const applyTemplate = (key: string) => {
    const template = BIO_LINK_LAYOUT_TEMPLATES.find((item) => item.key === key);
    if (!template) return;
    setBlocks(template.blocks.map((type, index) => createBioLinkBlock(type, index)));
    updateBioLink("layout_template_key", key);
    setSelectedBlockId(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex).map((item, index) => ({ ...item, position: index }));
    });
  };

  if (loading || !bioLink || !snapshot) {
    return <div className="page-inner">Carregando Bio Link…</div>;
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Bio Link</p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Estrutura</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${bioLink.slug}`)}>
            <Copy size={14} />
            Copiar URL
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <Tabs defaultValue="blocks" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="blocks">Blocos</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="themes">Temas</TabsTrigger>
              <TabsTrigger value="settings">Global</TabsTrigger>
            </TabsList>

            <TabsContent value="blocks" className="space-y-3">
              {BIO_LINK_BLOCK_DEFINITIONS.map((definition) => (
                <button
                  key={definition.type}
                  type="button"
                  onClick={() => addBlock(definition.type)}
                  className="w-full rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-[var(--surface-1)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{definition.label}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{definition.description}</p>
                </button>
              ))}
            </TabsContent>

            <TabsContent value="templates" className="space-y-3">
              {BIO_LINK_LAYOUT_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template.key)}
                  className="w-full rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-[var(--surface-1)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{template.label}</p>
                    <LayoutTemplate size={16} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{template.blocks.join(" • ")}</p>
                </button>
              ))}
            </TabsContent>

            <TabsContent value="themes" className="space-y-3">
              {BIO_LINK_THEMES.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => {
                    updateBioLink("theme_key", theme.key);
                    updateBioLink("background_config", theme.background);
                  }}
                  className="w-full rounded-2xl border p-3 text-left"
                  style={{
                    borderColor: bioLink.theme_key === theme.key ? "var(--workspace-brand)" : "var(--border)",
                  }}
                >
                  <div className="mb-3 h-20 rounded-2xl" style={{ background: theme.preview }} />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{theme.label}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{theme.description}</p>
                </button>
              ))}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <SectionTitle title="Perfil" />
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={bioLink.slug} onChange={(event) => updateBioLink("slug", slugifyBioLink(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={bioLink.display_name || ""} onChange={(event) => updateBioLink("display_name", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={bioLink.username || ""} onChange={(event) => updateBioLink("username", slugifyBioLink(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={bioLink.bio_text || ""} onChange={(event) => updateBioLink("bio_text", event.target.value)} className="min-h-[90px]" />
              </div>
              <div className="space-y-2">
                <Label>Avatar URL</Label>
                <Input value={bioLink.avatar_url || brandKit?.logo_url || ""} onChange={(event) => updateBioLink("avatar_url", event.target.value)} />
              </div>
              <SectionTitle title="SEO" />
              <div className="space-y-2">
                <Label>SEO title</Label>
                <Input value={bioLink.seo_title || ""} onChange={(event) => updateBioLink("seo_title", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SEO description</Label>
                <Textarea value={bioLink.seo_description || ""} onChange={(event) => updateBioLink("seo_description", event.target.value)} className="min-h-[90px]" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] p-5">
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            <Save size={16} />
            Salvar
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            <Send size={16} />
            Publicar
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 items-start justify-center overflow-y-auto bg-[var(--surface-1)] px-6 py-6">
        <div className="w-full max-w-[520px] overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-card)]">
          <BioLinkRenderer snapshot={snapshot} mode="preview" activeBlockId={selectedBlockId} onSelectBlock={setSelectedBlockId} />
        </div>
      </main>

      <aside className="flex w-[360px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-2)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Inspector</p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedBlock ? getBioLinkBlockDefinition(selectedBlock.type).label : "Configurações globais"}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {selectedBlock ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={selectedBlock.size} onValueChange={(value) => updateBlock(selectedBlock.id, { size: value as BioLinkBlock["size"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getBioLinkBlockDefinition(selectedBlock.type).sizes.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {"title" in selectedBlock.config ? (
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={String(selectedBlock.config.title || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, title: event.target.value } })} />
                </div>
              ) : null}
              {"subtitle" in selectedBlock.config ? (
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Textarea value={String(selectedBlock.config.subtitle || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, subtitle: event.target.value } })} className="min-h-[90px]" />
                </div>
              ) : null}
              {"url" in selectedBlock.config ? (
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={String(selectedBlock.config.url || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, url: event.target.value } })} />
                </div>
              ) : null}
              {"imageUrl" in selectedBlock.config ? (
                <div className="space-y-2">
                  <Label>Imagem</Label>
                  <Input value={String(selectedBlock.config.imageUrl || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, imageUrl: event.target.value } })} />
                </div>
              ) : null}
              {selectedBlock.type === "rich_text" ? (
                <div className="space-y-2">
                  <Label>HTML</Label>
                  <Textarea value={String(selectedBlock.config.bodyHtml || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, bodyHtml: event.target.value } })} className="min-h-[180px] font-mono text-xs" />
                </div>
              ) : null}
              {selectedBlock.type === "newsletter" ? (
                <>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={String(selectedBlock.config.description || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, description: event.target.value } })} className="min-h-[90px]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Botão</Label>
                    <Input value={String(selectedBlock.config.buttonText || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, buttonText: event.target.value } })} />
                  </div>
                </>
              ) : null}
              {selectedBlock.type === "contact_form" ? (
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={String(selectedBlock.config.description || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, description: event.target.value } })} className="min-h-[90px]" />
                </div>
              ) : null}
              {selectedBlock.type === "whatsapp" ? (
                <>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={String(selectedBlock.config.phone || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, phone: event.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea value={String(selectedBlock.config.message || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, message: event.target.value } })} className="min-h-[90px]" />
                  </div>
                </>
              ) : null}
              {selectedBlock.type === "map" ? (
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Textarea value={String(selectedBlock.config.address || "")} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, address: event.target.value } })} className="min-h-[90px]" />
                </div>
              ) : null}
              {selectedBlock.type === "countdown" ? (
                <div className="space-y-2">
                  <Label>Data alvo</Label>
                  <Input type="datetime-local" value={String(selectedBlock.config.targetDate || "").slice(0, 16)} onChange={(event) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, targetDate: new Date(event.target.value).toISOString() } })} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <SectionTitle title="Selecione um bloco" description="Clique no preview ou na lista abaixo para editar." />
            </div>
          )}

          <div className="mt-8 space-y-3">
            <SectionTitle title="Ordem dos blocos" />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <BlockOrderItem
                      key={block.id}
                      block={block}
                      active={block.id === selectedBlockId}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onDelete={() => {
                        setBlocks((current) => current.filter((item) => item.id !== block.id).map((item, index) => ({ ...item, position: index })));
                        if (selectedBlockId === block.id) setSelectedBlockId(null);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default BioLinkPage;
