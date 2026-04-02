import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutPanelTop, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import MotionSectionRenderer from "@/components/video/MotionSectionRenderer";
import VideoStudioShell from "@/components/video/VideoStudioShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { createScrollSection, type ScrollSection, type VideoAsset } from "@/lib/video-studio";

const EFFECTS = ["parallax", "sticky", "reveal", "horizontal", "video_scrub", "text_reveal", "scale_fade", "tilt_3d"];

type SiteRecord = {
  id: string;
  name: string;
};

type SitePageRecord = {
  id: string;
  title: string;
  website_id: string;
};

export default function VideoStudioMotionPage() {
  const { workspace } = useWorkspace();
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [pages, setPages] = useState<SitePageRecord[]>([]);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [sections, setSections] = useState<ScrollSection[]>([]);
  const [objective, setObjective] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [supportingText, setSupportingText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Saiba mais");
  const [effectType, setEffectType] = useState("parallax");
  const [siteId, setSiteId] = useState<string>("none");
  const [pageId, setPageId] = useState<string>("none");
  const [attachToPage, setAttachToPage] = useState(false);
  const [backgroundVideoAssetId, setBackgroundVideoAssetId] = useState<string>("none");
  const [backgroundImageAssetId, setBackgroundImageAssetId] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ScrollSection | null>(null);

  const load = useCallback(async () => {
    if (!workspace?.id) return;
    const [sitesResult, pagesResult, assetsResult, sectionsResult] = await Promise.all([
      supabase.from("websites").select("id,name").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
      supabase.from("website_pages").select("id,title,website_id").order("created_at", { ascending: false }),
      supabase
        .from("video_assets")
        .select("*")
        .eq("workspace_id", workspace.id)
        .in("asset_type", ["generated_video", "generated_image", "video", "image"])
        .order("created_at", { ascending: false })
        .limit(16),
      supabase.from("scroll_sections").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(12),
    ]);

    setSites((sitesResult.data || []) as SiteRecord[]);
    setPages((pagesResult.data || []) as SitePageRecord[]);
    setAssets((assetsResult.data || []) as VideoAsset[]);
    const sectionRows = (sectionsResult.data || []) as ScrollSection[];
    setSections(sectionRows);
    if (!selectedSection && sectionRows[0]) {
      setSelectedSection(sectionRows[0]);
    }
  }, [selectedSection, workspace?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPages = useMemo(
    () => pages.filter((page) => siteId === "none" || page.website_id === siteId),
    [pages, siteId],
  );

  const backgroundVideo = useMemo(
    () => assets.find((asset) => asset.id === backgroundVideoAssetId) || null,
    [assets, backgroundVideoAssetId],
  );

  const backgroundImage = useMemo(
    () => assets.find((asset) => asset.id === backgroundImageAssetId) || null,
    [assets, backgroundImageAssetId],
  );

  const draftSection = useMemo<ScrollSection>(() => ({
    id: "draft-motion-preview",
    workspace_id: workspace?.id || "",
    name: sectionName || objective.split(".")[0] || "Nova motion section",
    scroll_effect_type: effectType,
    status: "draft",
    content: {
      headline: sectionName || objective.split(".")[0] || "Headline motion",
      body: supportingText || objective || "Descreva a secao para montar o preview.",
      cta: ctaLabel,
      objective,
    },
    renderer_config: {
      theme: {
        primary: "#18181B",
        secondary: "#09090B",
        accent: "#F59E0B",
      },
    },
    preview_data: {},
    background_video_asset_id: backgroundVideo?.id || null,
    background_image_asset_id: backgroundImage?.id || null,
  }), [backgroundImage?.id, backgroundVideo?.id, ctaLabel, effectType, objective, sectionName, supportingText, workspace?.id]);

  const handleCreate = async () => {
    if (!workspace?.id || !objective.trim()) {
      toast.error("Descreva o objetivo da section antes de criar.");
      return;
    }

    setSaving(true);
    try {
      const result = await createScrollSection({
        workspace_id: workspace.id,
        site_id: siteId === "none" ? null : siteId,
        website_page_id: pageId === "none" ? null : pageId,
        objective: objective.trim(),
        section_name: sectionName.trim() || null,
        scroll_effect_type: effectType,
        supporting_text: supportingText.trim() || null,
        cta_label: ctaLabel.trim() || null,
        background_video_asset_id: backgroundVideoAssetId === "none" ? null : backgroundVideoAssetId,
        background_image_asset_id: backgroundImageAssetId === "none" ? null : backgroundImageAssetId,
        attach_to_page: attachToPage,
      });

      setSelectedSection(result.section);
      toast.success(result.attached ? "Motion section criada e anexada ao site." : "Motion section criada.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <VideoStudioShell
      title="Motion Sites"
      description="Crie scroll sections reutilizáveis, valide o preview e anexe no Site Builder sem duplicar blocos."
      action={
        <Button className="rounded-xl" onClick={handleCreate} disabled={saving}>
          {saving ? <RefreshCcw size={14} className="animate-spin" /> : <LayoutPanelTop size={14} />}
          Create motion section
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <SectionCard className="space-y-5">
            <div>
              <AppSectionLabel>Motion Builder</AppSectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                Structure the scroll experience
              </h2>
            </div>

            <div className="space-y-3">
              <Label>Objective</Label>
              <Textarea
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Ex: apresentar o diferencial da marca com um reveal cinematográfico e CTA para contato"
                className="min-h-[110px] rounded-2xl"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Section name</Label>
                <Input value={sectionName} onChange={(event) => setSectionName(event.target.value)} placeholder="Nome interno da section" />
              </div>
              <div className="space-y-3">
                <Label>CTA</Label>
                <Input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Saiba mais" />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Supporting text</Label>
              <Textarea
                value={supportingText}
                onChange={(event) => setSupportingText(event.target.value)}
                placeholder="Texto auxiliar que aparece no preview e vai para o conteúdo da section."
                className="min-h-[84px] rounded-2xl"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Effect</Label>
                <Select value={effectType} onValueChange={setEffectType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EFFECTS.map((effect) => (
                      <SelectItem key={effect} value={effect}>
                        {effect}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Site</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem site</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Page</Label>
                <Select value={pageId} onValueChange={setPageId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem página</SelectItem>
                    {filteredPages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Background video</Label>
                <Select value={backgroundVideoAssetId} onValueChange={setBackgroundVideoAssetId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vídeo</SelectItem>
                    {assets
                      .filter((asset) => asset.asset_type === "generated_video" || asset.asset_type === "video")
                      .map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.file_name || asset.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label>Background image</Label>
                <Select value={backgroundImageAssetId} onValueChange={setBackgroundImageAssetId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem imagem</SelectItem>
                    {assets
                      .filter((asset) => asset.asset_type === "generated_image" || asset.asset_type === "image")
                      .map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.file_name || asset.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Attach to page after create</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Insere um bloco `scroll_section_ref` na página selecionada.
                </p>
              </div>
              <Switch checked={attachToPage} onCheckedChange={setAttachToPage} />
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <AppSectionLabel>Saved sections</AppSectionLabel>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Motion inventory
                </h2>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => selectedSection && window.scrollTo({ top: 0, behavior: "smooth" })}>
                Use selected
              </Button>
            </div>

            <div className="space-y-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSection(section)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-[var(--workspace-brand-border)] hover:bg-[var(--workspace-brand-soft)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{section.name}</p>
                    <span className="rounded-full bg-[var(--workspace-brand-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--text-primary)]">
                      {section.scroll_effect_type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {String(section.content?.headline || section.content?.objective || "Sem headline")}
                  </p>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <AppSectionLabel>Preview</AppSectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Structured renderer
                </h2>
              </div>
              {selectedSection?.site_id ? (
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link to={`/workspace/${workspace?.id}/site-builder/${selectedSection.site_id}`}>
                    Open site
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              ) : null}
            </div>

            <MotionSectionRenderer
              section={selectedSection || draftSection}
              backgroundVideoUrl={backgroundVideo?.public_url || null}
              backgroundImageUrl={backgroundImage?.public_url || null}
            />
          </SectionCard>
        </div>
      </div>
    </VideoStudioShell>
  );
}
