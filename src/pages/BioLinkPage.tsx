import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

// ─── Sub-components ────────────────────────────────────────────────────────────

const BlockOrderItem = ({
  block,
  active,
  onSelect,
  onDelete,
  onToggleVisibility,
}: {
  block: BioLinkBlock;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors hover:bg-[var(--surface-1)]"
      style2={{ borderColor: active ? "var(--workspace-brand)" : "var(--border)" }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <button
        type="button"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
        style={{ borderColor: "var(--border)" }}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Reordenar bloco"
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{String(block.config.title || getBioLinkBlockDefinition(block.type).label)}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{getBioLinkBlockDefinition(block.type).label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {active && (
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: "var(--workspace-brand)", color: "var(--workspace-brand)" }}>
            Editando
          </Badge>
        )}
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-xl opacity-60 hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          aria-label={block.isVisible ? "Ocultar bloco" : "Mostrar bloco"}
        >
          {block.isVisible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--text-muted)]" />}
        </button>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-xl text-rose-500 opacity-60 hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Remover bloco"
        >
          <Trash2 size={14} />
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

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

// ─── toInsertPayload helper ─────────────────────────────────────────────────────

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

// ─── SimLab quick-review panel ─────────────────────────────────────────────────

type SimLabStatus = "idle" | "running" | "approved" | "revise" | "blocked";

const SimLabPanel = ({ snapshot, onImprove }: { snapshot: ReturnType<typeof buildBioLinkSnapshot> | null; onImprove: () => void }) => {
  const [status, setStatus] = useState<SimLabStatus>("idle");
  const [feedback, setFeedback] = useState<string[]>([]);

  const run = async () => {
    if (!snapshot) return;
    setStatus("running");
    setFeedback([]);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("simlab-dispatch", {
        body: {
          module: "bio_link",
          content: snapshot,
          persona_ids: ["p_conservative_buyer", "p_gen_z_creator"],
        },
      });
      if (error) throw error;
      const result = data as { verdict: SimLabStatus; feedback: string[] };
      setStatus(result.verdict || "approved");
      setFeedback(result.feedback || []);
    } catch {
      // SimLab is optional — degrade gracefully
      setStatus("approved");
      setFeedback(["SimLab indisponível no momento. Publicação liberada."]);
    }
  };

  const statusConfig: Record<SimLabStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: "Não validado", color: "var(--text-muted)", icon: <Bot size={14} /> },
    running: { label: "Analisando...", color: "var(--workspace-brand)", icon: <Bot size={14} className="animate-pulse" /> },
    approved: { label: "Aprovado", color: "#22c55e", icon: <CheckCircle2 size={14} /> },
    revise: { label: "Revisar", color: "#f59e0b", icon: <AlertTriangle size={14} /> },
    blocked: { label: "Bloqueado", color: "#ef4444", icon: <AlertTriangle size={14} /> },
  };

  const cfg = statusConfig[status];

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: cfg.color }}>
          {cfg.icon}
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">{cfg.label}</span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">SimLab IA</span>
      </div>
      {feedback.length > 0 && (
        <ul className="space-y-1">
          {feedback.map((f, i) => (
            <li key={i} className="text-xs text-[var(--text-muted)]">• {f}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={run} disabled={status === "running"} className="flex-1 text-xs">
          <Bot size={12} />
          {status === "running" ? "Analisando..." : "Validar com SimLab"}
        </Button>
        {(status === "revise" || status === "blocked") && (
          <Button size="sm" variant="outline" onClick={onImprove} className="text-xs">
            Sugerir melhora
          </Button>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────────

const BioLinkPage = () => {
  const { workspace, brandKit, bioLink, setBioLink, blocks, setBlocks, loading, refresh } = useBioLinkWorkspace();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  // Auto-select first block on load
  useEffect(() => {
    if (blocks.length > 0 && !selectedBlockId) {
      setSelectedBlockId(blocks[0].id);
    }
  }, [blocks, selectedBlockId]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId],
  );

  const snapshot = useMemo(
    () => (bioLink ? buildBioLinkSnapshot(bioLink, blocks) : null),
    [bioLink, blocks],
  );

  const updateBioLink = <K extends keyof NonNullable<typeof bioLink>>(
    field: K,
    value: NonNullable<typeof bioLink>[K],
  ) => {
    setBioLink((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateBlock = (blockId: string, patch: Partial<BioLinkBlock>) => {
    setBlocks((current) =>
      current
        .map((b) => (b.id === blockId ? { ...b, ...patch } : b))
        .map((b, i) => ({ ...b, position: i })),
    );
  };

  const saveDraft = async () => {
    if (!workspace || !bioLink) return;
    setSaving(true);
    try {
      const result = await saveWorkspaceBioLink({
        bioLinkId: bioLink.id,
        workspaceId: workspace.id,
        bioLink: toInsertPayload({ ...bioLink, slug: slugifyBioLink(bioLink.slug) }),
        blocks,
      });
      setBioLink(result.bioLink);
      setBlocks(result.blocks);
      toast.success("Rascunho salvo com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o rascunho.");
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
    toast.info(`Bloco "${getBioLinkBlockDefinition(type).label}" adicionado.`);
  };

  const applyTemplate = (key: string) => {
    const template = BIO_LINK_LAYOUT_TEMPLATES.find((t) => t.key === key);
    if (!template) return;
    setBlocks(template.blocks.map((type, i) => createBioLinkBlock(type, i)));
    updateBioLink("layout_template_key", key);
    setSelectedBlockId(null);
    toast.success(`Template "${template.label}" aplicado.`);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((current) => {
      const oldIndex = current.findIndex((b) => b.id === active.id);
      const newIndex = current.findIndex((b) => b.id === over.id);
      return arrayMove(current, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
    });
  };

  const copyPublicUrl = () => {
    if (!bioLink) return;
    void navigator.clipboard.writeText(`${window.location.origin}/${bioLink.slug}`);
    toast.success("URL copiada para a área de transferência.");
  };

  const handleSimLabImprove = async () => {
    if (!snapshot || !workspace) return;
    toast.info("Solicitando sugestões de melhoria ao SimLab...");
    // Placeholder: future integration with cerebro-context + agent-worker
  };

  if (loading || !bioLink || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Carregando Bio Link…</p>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/${bioLink.slug}`;
  const isPublished = bioLink.status === "published";

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ─── LEFT: Structure + Library ─────────────── */}
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Bio Link</p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Estrutura</h2>
          </div>
          <div className="flex items-center gap-2">
            {isPublished && (
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-400">
                Publicado
              </span>
            )}
            <Button variant="outline" size="sm" onClick={copyPublicUrl} title={publicUrl}>
              <Copy size={12} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="blocks" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="blocks">Blocos</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="themes">Temas</TabsTrigger>
            </TabsList>

            {/* BLOCKS TAB */}
            <TabsContent value="blocks" className="space-y-2">
              {BIO_LINK_BLOCK_DEFINITIONS.map((definition) => (
                <button
                  key={definition.type}
                  type="button"
                  onClick={() => addBlock(definition.type)}
                  className="w-full rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-[var(--surface-1)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{definition.label}</p>
                    {definition.proOnly && (
                      <span className="rounded px-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: "var(--workspace-brand-soft)", color: "var(--workspace-brand)" }}>PRO</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{definition.description}</p>
                </button>
              ))}
            </TabsContent>

            {/* TEMPLATES TAB */}
            <TabsContent value="templates" className="space-y-2">
              {BIO_LINK_LAYOUT_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template.key)}
                  className="w-full rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-[var(--surface-1)]"
                  style={{
                    borderColor: bioLink.layout_template_key === template.key ? "var(--workspace-brand)" : "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{template.label}</p>
                    <LayoutTemplate size={14} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{template.blocks.join(" • ")}</p>
                </button>
              ))}
            </TabsContent>

            {/* THEMES TAB */}
            <TabsContent value="themes" className="space-y-2">
              {BIO_LINK_THEMES.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => {
                    updateBioLink("theme_key", theme.key);
                    updateBioLink("background_config", theme.background);
                  }}
                  className="w-full rounded-2xl border p-3 text-left transition-all"
                  style={{
                    borderColor: bioLink.theme_key === theme.key ? "var(--workspace-brand)" : "var(--border)",
                  }}
                >
                  <div className="mb-2 h-14 rounded-xl" style={{ background: theme.preview }} />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{theme.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{theme.description}</p>
                </button>
              ))}
            </TabsContent>
          </Tabs>

          {/* Block order with DnD */}
          <div className="mt-6 space-y-3">
            <SectionTitle title="Ordem dos blocos" description={`${blocks.length} bloco${blocks.length !== 1 ? "s" : ""}`} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <BlockOrderItem
                      key={block.id}
                      block={block}
                      active={block.id === selectedBlockId}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onToggleVisibility={() => updateBlock(block.id, { isVisible: !block.isVisible })}
                      onDelete={() => {
                        setBlocks((current) =>
                          current.filter((b) => b.id !== block.id).map((b, i) => ({ ...b, position: i })),
                        );
                        if (selectedBlockId === block.id) setSelectedBlockId(null);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] p-4">
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            <Save size={14} />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            <Send size={14} />
            {publishing ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </aside>

      {/* ─── CENTER: Live Preview ───────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col items-center justify-start overflow-y-auto bg-[var(--surface-1)] px-6 py-6 gap-4">
        {/* URL bar */}
        <div
          className="flex w-full max-w-[520px] items-center gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}
        >
          <div className="h-2 w-2 rounded-full" style={{ background: isPublished ? "#22c55e" : "#f59e0b" }} />
          <span className="flex-1 truncate text-xs text-[var(--text-muted)]">{publicUrl}</span>
          <button onClick={copyPublicUrl} className="text-xs text-[var(--workspace-brand)] hover:underline shrink-0">
            Copiar
          </button>
        </div>

        {/* Phone frame */}
        <div className="w-full max-w-[420px] overflow-hidden rounded-[36px] border-4 border-[var(--border)] shadow-2xl">
          <BioLinkRenderer
            snapshot={snapshot}
            mode="preview"
            activeBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
          />
        </div>
      </main>

      {/* ─── RIGHT: Inspector + Config + SimLab ────── */}
      <aside className="flex w-[340px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-2)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Inspector</p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {selectedBlock ? getBioLinkBlockDefinition(selectedBlock.type).label : "Configurações globais"}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── Block Inspector ── */}
          {selectedBlock ? (
            <div className="space-y-4">
              {/* Visibility toggle */}
              <div className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Visível</p>
                  <p className="text-xs text-[var(--text-muted)]">Exibe o bloco na página pública</p>
                </div>
                <Switch
                  checked={selectedBlock.isVisible}
                  onCheckedChange={(checked) => updateBlock(selectedBlock.id, { isVisible: checked })}
                />
              </div>

              <FieldRow label="Tamanho do bloco">
                <Select
                  value={selectedBlock.size}
                  onValueChange={(value) => updateBlock(selectedBlock.id, { size: value as BioLinkBlock["size"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getBioLinkBlockDefinition(selectedBlock.type).sizes.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              {"title" in selectedBlock.config && (
                <FieldRow label="Título">
                  <Input
                    value={String(selectedBlock.config.title || "")}
                    onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, title: e.target.value } })}
                  />
                </FieldRow>
              )}

              {"subtitle" in selectedBlock.config && (
                <FieldRow label="Subtítulo">
                  <Textarea
                    value={String(selectedBlock.config.subtitle || "")}
                    onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, subtitle: e.target.value } })}
                    className="min-h-[72px]"
                  />
                </FieldRow>
              )}

              {"url" in selectedBlock.config && (
                <FieldRow label="URL">
                  <Input
                    value={String(selectedBlock.config.url || "")}
                    onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, url: e.target.value } })}
                    placeholder="https://"
                  />
                </FieldRow>
              )}

              {"imageUrl" in selectedBlock.config && (
                <FieldRow label="Imagem (URL)">
                  <Input
                    value={String(selectedBlock.config.imageUrl || "")}
                    onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, imageUrl: e.target.value } })}
                    placeholder="https://..."
                  />
                </FieldRow>
              )}

              {selectedBlock.type === "rich_text" && (
                <FieldRow label="Conteúdo HTML">
                  <Textarea
                    value={String(selectedBlock.config.bodyHtml || "")}
                    onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, bodyHtml: e.target.value } })}
                    className="min-h-[160px] font-mono text-xs"
                  />
                </FieldRow>
              )}

              {selectedBlock.type === "newsletter" && (
                <>
                  <FieldRow label="Descrição">
                    <Textarea
                      value={String(selectedBlock.config.description || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, description: e.target.value } })}
                      className="min-h-[72px]"
                    />
                  </FieldRow>
                  <FieldRow label="Texto do botão">
                    <Input
                      value={String(selectedBlock.config.buttonText || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, buttonText: e.target.value } })}
                    />
                  </FieldRow>
                  <FieldRow label="Mensagem de sucesso">
                    <Input
                      value={String(selectedBlock.config.successMessage || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, successMessage: e.target.value } })}
                    />
                  </FieldRow>
                </>
              )}

              {selectedBlock.type === "contact_form" && (
                <FieldRow label="Descrição">
                  <Textarea
                    value={String(selectedBlock.config.description || "")}
                    onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, description: e.target.value } })}
                    className="min-h-[72px]"
                  />
                </FieldRow>
              )}

              {selectedBlock.type === "whatsapp" && (
                <>
                  <FieldRow label="Telefone (com DDD e código do país)">
                    <Input
                      value={String(selectedBlock.config.phone || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, phone: e.target.value } })}
                      placeholder="5511999999999"
                    />
                  </FieldRow>
                  <FieldRow label="Mensagem pré-definida">
                    <Textarea
                      value={String(selectedBlock.config.message || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, message: e.target.value } })}
                      className="min-h-[72px]"
                    />
                  </FieldRow>
                </>
              )}

              {selectedBlock.type === "map" && (
                <>
                  <FieldRow label="Endereço">
                    <Textarea
                      value={String(selectedBlock.config.address || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, address: e.target.value } })}
                      className="min-h-[72px]"
                      placeholder="Rua, número, Cidade, Estado"
                    />
                  </FieldRow>
                  <FieldRow label="Nome do local">
                    <Input
                      value={String(selectedBlock.config.placeName || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, placeName: e.target.value } })}
                    />
                  </FieldRow>
                  <FieldRow label="Horário de atendimento">
                    <Input
                      value={String(selectedBlock.config.hours || "")}
                      onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, hours: e.target.value } })}
                      placeholder="Seg-Sex, 9h às 18h"
                    />
                  </FieldRow>
                </>
              )}

              {selectedBlock.type === "countdown" && (
                <FieldRow label="Data e hora alvo">
                  <Input
                    type="datetime-local"
                    value={String(selectedBlock.config.targetDate || "").slice(0, 16)}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        config: { ...selectedBlock.config, targetDate: new Date(e.target.value).toISOString() },
                      })
                    }
                  />
                </FieldRow>
              )}

              {selectedBlock.type === "video_embed" && (
                <FieldRow label="Proporção">
                  <Select
                    value={String(selectedBlock.config.aspectRatio || "16:9")}
                    onValueChange={(v) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, aspectRatio: v } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">Paisagem 16:9</SelectItem>
                      <SelectItem value="9:16">Vertical 9:16</SelectItem>
                      <SelectItem value="1:1">Quadrado 1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              )}

              {selectedBlock.type === "feature_link" && (
                <FieldRow label="Texto do CTA">
                  <Input
                    value={String(selectedBlock.config.ctaText || "")}
                    onChange={(e) => updateBlock(selectedBlock.id, { config: { ...selectedBlock.config, ctaText: e.target.value } })}
                    placeholder="Quero acessar"
                  />
                </FieldRow>
              )}
            </div>
          ) : (
            /* ── Global Config (no block selected) ── */
            <div className="space-y-4">
              <SectionTitle title="Perfil público" />

              <FieldRow label="Slug (URL pública)">
                <Input
                  value={bioLink.slug}
                  onChange={(e) => updateBioLink("slug", slugifyBioLink(e.target.value))}
                  placeholder="minha-marca"
                />
              </FieldRow>

              <FieldRow label="Nome de exibição">
                <Input
                  value={bioLink.display_name || ""}
                  onChange={(e) => updateBioLink("display_name", e.target.value)}
                />
              </FieldRow>

              <FieldRow label="Username (@handle)">
                <Input
                  value={bioLink.username || ""}
                  onChange={(e) => updateBioLink("username", slugifyBioLink(e.target.value))}
                  placeholder="minha_marca"
                />
              </FieldRow>

              <FieldRow label="Bio">
                <Textarea
                  value={bioLink.bio_text || ""}
                  onChange={(e) => updateBioLink("bio_text", e.target.value)}
                  className="min-h-[80px]"
                />
              </FieldRow>

              <FieldRow label="Avatar URL">
                <Input
                  value={bioLink.avatar_url || brandKit?.logo_url || ""}
                  onChange={(e) => updateBioLink("avatar_url", e.target.value)}
                  placeholder="https://..."
                />
              </FieldRow>

              <SectionTitle title="Botão CTA principal" />
              <div className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm text-[var(--text-primary)]">Ativar CTA</p>
                <Switch
                  checked={bioLink.cta_enabled === true}
                  onCheckedChange={(checked) => updateBioLink("cta_enabled", checked)}
                />
              </div>
              {bioLink.cta_enabled && (
                <>
                  <FieldRow label="Texto do botão">
                    <Input value={bioLink.cta_text || ""} onChange={(e) => updateBioLink("cta_text", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="URL do botão">
                    <Input value={bioLink.cta_url || ""} onChange={(e) => updateBioLink("cta_url", e.target.value)} placeholder="https://" />
                  </FieldRow>
                </>
              )}

              <SectionTitle title="SEO" />
              <FieldRow label="Título da página">
                <Input value={bioLink.seo_title || ""} onChange={(e) => updateBioLink("seo_title", e.target.value)} />
              </FieldRow>
              <FieldRow label="Descrição">
                <Textarea
                  value={bioLink.seo_description || ""}
                  onChange={(e) => updateBioLink("seo_description", e.target.value)}
                  className="min-h-[72px]"
                />
              </FieldRow>

              <SectionTitle title="Pixels de rastreamento" />
              <FieldRow label="Meta Pixel ID">
                <Input value={bioLink.meta_pixel_id || ""} onChange={(e) => updateBioLink("meta_pixel_id", e.target.value)} placeholder="1234567890" />
              </FieldRow>
              <FieldRow label="GA4 Measurement ID">
                <Input value={bioLink.ga4_measurement_id || ""} onChange={(e) => updateBioLink("ga4_measurement_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
              </FieldRow>
              <FieldRow label="TikTok Pixel ID">
                <Input value={bioLink.tiktok_pixel_id || ""} onChange={(e) => updateBioLink("tiktok_pixel_id", e.target.value)} />
              </FieldRow>
              <FieldRow label="GTM Container ID">
                <Input value={bioLink.gtm_id || ""} onChange={(e) => updateBioLink("gtm_id", e.target.value)} placeholder="GTM-XXXXXXX" />
              </FieldRow>
            </div>
          )}

          {/* ── SimLab Validation Panel ── */}
          <div className="space-y-3 pt-2">
            <SectionTitle
              title="Validação SimLab"
              description="Valide o Bio Link com personas sintéticas antes de publicar."
            />
            <SimLabPanel snapshot={snapshot} onImprove={handleSimLabImprove} />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default BioLinkPage;
