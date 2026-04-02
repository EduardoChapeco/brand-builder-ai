import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Monitor, Plus, Settings, Smartphone } from "lucide-react";
import { toast } from "sonner";
import MotionSectionRenderer from "@/components/video/MotionSectionRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiquidGlassCard } from "@/components/ui/LiquidGlassCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client"
import { fromTable } from "@/integrations/supabase/db-custom";
import type { Json } from "@/integrations/supabase/types";
import { resolveScrollSectionMotionContract, type ScrollSection } from "@/lib/video-studio";

type SiteBlockType = "hero_3d" | "glass_features" | "glow_footer" | "scroll_section_ref";
type SiteBlockEffect = "none" | "parallax" | "reveal_3d" | "fade_up";

interface SiteBlock {
  id: string;
  type: SiteBlockType;
  effect?: SiteBlockEffect;
  content: Record<string, unknown>;
}

type MotionAssetRow = {
  id: string;
  public_url: string | null;
};

const Scroll3DWrapper = ({
  children,
  effect = "none",
}: {
  children: ReactNode;
  effect?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const yParallax = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [45, 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 1], [0.8, 1, 1]);
  const opacity3D = useTransform(scrollYProgress, [0, 0.3, 1], [0, 1, 1]);
  const yFade = useTransform(scrollYProgress, [0, 0.2, 1], [60, 0, 0]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.2, 1], [0, 1, 1]);

  if (effect === "parallax") {
    return <motion.div ref={ref} style={{ y: yParallax }}>{children}</motion.div>;
  }
  if (effect === "reveal_3d") {
    return (
      <div style={{ perspective: "1200px" }}>
        <motion.div ref={ref} style={{ rotateX, scale, opacity: opacity3D, transformOrigin: "top center" }}>
          {children}
        </motion.div>
      </div>
    );
  }
  if (effect === "fade_up") {
    return <motion.div ref={ref} style={{ y: yFade, opacity: opacityFade }}>{children}</motion.div>;
  }

  return <div ref={ref}>{children}</div>;
};

const getBlockLabel = (block: SiteBlock) => {
  if (block.type === "hero_3d") return "3D Hero";
  if (block.type === "glass_features") return "Features Grid";
  if (block.type === "glow_footer") return "Footer";
  return `Motion: ${String(block.content.section_name || "Section")}`;
};

const getMotionSectionRefId = (block: SiteBlock) =>
  block.type === "scroll_section_ref" && typeof block.content.scroll_section_id === "string"
    ? block.content.scroll_section_id.trim()
    : "";

const dedupeMotionSectionRefs = (inputBlocks: SiteBlock[]) => {
  const seen = new Set<string>();

  return inputBlocks.filter((block) => {
    if (block.type !== "scroll_section_ref") return true;

    const sectionId = getMotionSectionRefId(block);
    if (!sectionId) return true;
    if (seen.has(sectionId)) return false;

    seen.add(sectionId);
    return true;
  });
};

export default function SiteEditorPage() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { workspace, briefing } = useWorkspace();
  const [siteName, setSiteName] = useState("Novo Site");
  const [domain, setDomain] = useState("");
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [motionSections, setMotionSections] = useState<ScrollSection[]>([]);
  const [motionAssetUrls, setMotionAssetUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const fetchSite = async () => {
      if (!workspace?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (!siteId || siteId === "new") {
          setSiteName("Novo Site");
          setDomain("");
          setBlocks([]);
        } else {
          const { data: websiteRow, error: websiteError } = await fromTable('websites')
            .select("name, domain")
            .eq("id", siteId)
            .single();

          if (!websiteError && websiteRow) {
            setSiteName(websiteRow.name);
            setDomain(websiteRow.domain || "");
          }

          const { data: pageRow } = await fromTable('website_pages')
            .select("content_blocks")
            .eq("website_id", siteId)
            .eq("is_home", true)
            .single();

          if (pageRow?.content_blocks) {
            const parsed = typeof pageRow.content_blocks === "string"
              ? JSON.parse(pageRow.content_blocks)
              : pageRow.content_blocks;
            setBlocks(Array.isArray(parsed) ? dedupeMotionSectionRefs(parsed) : []);
          } else {
            setBlocks([]);
          }
        }

        // Slim select — exclui content e preview_data (campos grandes, não usados na lista)
        const { data: sectionRows } = await fromTable('scroll_sections')
          .select("id,name,scroll_effect_type,status,renderer_config,background_video_asset_id,background_image_asset_id")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false });

        const nextSections = (sectionRows || []) as ScrollSection[];
        setMotionSections(nextSections);

        const assetIds = Array.from(
          new Set(
            nextSections.flatMap((section) =>
              [section.background_video_asset_id, section.background_image_asset_id].filter(
                (value): value is string => Boolean(value),
              ),
            ),
          ),
        );

        if (assetIds.length > 0) {
          const { data: assetRows } = await fromTable('video_assets')
            .select("id, public_url")
            .in("id", assetIds);

          const urlMap = ((assetRows || []) as MotionAssetRow[]).reduce<Record<string, string>>((acc, asset) => {
            if (asset.public_url) acc[asset.id] = asset.public_url;
            return acc;
          }, {});

          setMotionAssetUrls(urlMap);
        } else {
          setMotionAssetUrls({});
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchSite();
  }, [siteId, workspace?.id]);

  const addBlock = (type: Exclude<SiteBlockType, "scroll_section_ref">) => {
    const id = crypto.randomUUID();
    let defaultContent: Record<string, unknown> = {};
    let defaultEffect: SiteBlockEffect = "none";

    if (type === "hero_3d") {
      defaultContent = { title: "Experiencia Imersiva", subtitle: "A nova dimensao da sua marca." };
      defaultEffect = "parallax";
    }
    if (type === "glass_features") {
      defaultContent = { items: [{ title: "Recurso 1" }, { title: "Recurso 2" }, { title: "Recurso 3" }] };
      defaultEffect = "reveal_3d";
    }
    if (type === "glow_footer") {
      defaultContent = { copyright: "© 2026 Brand Builder AI" };
      defaultEffect = "fade_up";
    }

    setBlocks((current) => [...current, { id, type, effect: defaultEffect, content: defaultContent }]);
  };

  const addMotionSectionReference = (section: ScrollSection) => {
    setBlocks((current) => {
      if (current.some((block) => getMotionSectionRefId(block) === section.id)) {
        toast.info("Essa motion section já está referenciada nesta página.");
        return current;
      }

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          type: "scroll_section_ref",
          effect: "none",
          content: {
            scroll_section_id: section.id,
            section_name: section.name,
          },
        },
      ];
    });
  };

  const updateBlockEffect = (id: string, effect: SiteBlockEffect) => {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, effect } : block)));
  };

  const removeBlock = (id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id));
  };

  // Lookup O(1): seção por id — evita .find() em render de cada bloco
  const motionSectionMap = useMemo(
    () => Object.fromEntries(motionSections.map((s) => [s.id, s])),
    [motionSections],
  );

  // Contratos pré-computados: evita chamar resolveScrollSectionMotionContract() em render
  const motionContracts = useMemo(
    () =>
      Object.fromEntries(
        motionSections.map((s) => [
          s.id,
          resolveScrollSectionMotionContract(s, {
            backgroundVideoUrl: s.background_video_asset_id ? motionAssetUrls[s.background_video_asset_id] ?? null : null,
            backgroundImageUrl: s.background_image_asset_id ? motionAssetUrls[s.background_image_asset_id] ?? null : null,
          }),
        ]),
      ),
    [motionSections, motionAssetUrls],
  );

  const getMotionSectionForBlock = (block: SiteBlock) => {
    const sectionId = typeof block.content.scroll_section_id === "string" ? block.content.scroll_section_id : "";
    return motionSectionMap[sectionId] ?? null;
  };

  const saveSite = async () => {
    if (!workspace?.id) return;

    setIsSaving(true);
    try {
      let activeSiteId = siteId;
      const nextBlocks = dedupeMotionSectionRefs(blocks);

      if (nextBlocks.length !== blocks.length) {
        setBlocks(nextBlocks);
      }

      if (!activeSiteId || activeSiteId === "new") {
        const { data, error } = await fromTable('websites')
          .insert({
            workspace_id: workspace.id,
            name: siteName,
            domain: domain || null,
          })
          .select("id")
          .single();

        if (error) throw error;
        activeSiteId = data.id;

        const motionIds = blocks
          .filter((b) => b.type === "scroll_section_ref" && typeof b.content.scroll_section_id === "string")
          .map((b) => b.content.scroll_section_id as string);

        const siteCCPCtx = {
          type: "cerebro/site/v1",
          workspace_id: workspace.id,
          brand: { name: briefing?.company_name || workspace.name || "", segment: briefing?.segment || "" },
          structure: {
            block_count: nextBlocks.length,
            block_types: nextBlocks.map((b) => b.type),
            has_motion_sections: motionIds.length > 0,
            motion_section_ids: motionIds,
          },
          seo: { title: siteName, description: null },
          generated_at: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (fromTable('websites') as any)
          .update({ ccp_context: siteCCPCtx })
          .eq("id", activeSiteId);

        await fromTable('website_pages').insert({
          website_id: activeSiteId,
          title: "Home",
          slug: "/",
          is_home: true,
          content_blocks: nextBlocks as unknown as Json,
        });

        toast.success("Site criado com sucesso!");
        navigate(`../site-builder/${activeSiteId}`, { replace: true });
      } else {
        await fromTable('websites')
          .update({
            name: siteName,
            domain: domain || null,
          })
          .eq("id", activeSiteId);

        await fromTable('website_pages')
          .update({ content_blocks: nextBlocks as unknown as Json })
          .eq("website_id", activeSiteId)
          .eq("is_home", true);

        // Atualiza ccp_context do site com estado atual
        const motionIds = nextBlocks
          .filter((b) => b.type === "scroll_section_ref" && typeof b.content.scroll_section_id === "string")
          .map((b) => b.content.scroll_section_id as string);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (fromTable('websites') as any)
          .update({
            ccp_context: {
              type: "cerebro/site/v1",
              workspace_id: workspace.id,
              brand: { name: briefing?.company_name || workspace.name || "", segment: briefing?.segment || "" },
              structure: {
                block_count: nextBlocks.length,
                block_types: nextBlocks.map((b) => b.type),
                has_motion_sections: motionIds.length > 0,
                motion_section_ids: motionIds,
              },
              seo: { title: siteName, description: null },
              generated_at: new Date().toISOString(),
            },
          })
          .eq("id", activeSiteId);

        toast.success("Alterações salvas!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar site.");
    } finally {
      setIsSaving(false);
    }
  };

  const motionBlockCount = useMemo(
    () => new Set(blocks.map(getMotionSectionRefId).filter((value): value is string => Boolean(value))).size,
    [blocks],
  );

  const attachedMotionSectionIds = useMemo(
    () => new Set(blocks.map(getMotionSectionRefId).filter((value): value is string => Boolean(value))),
    [blocks],
  );

  if (loading) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#030303] text-white">
      <div className="z-20 flex w-80 flex-col border-r border-white/5 bg-[#080808] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 p-6">
          <div>
            <h2 className="font-semibold tracking-tight text-lg">Editor de Blocos</h2>
            <p className="mt-1 text-xs text-zinc-500">{motionBlockCount} motion refs ativas</p>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-white/5">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Identidade</label>
              <Input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                className="border-white/10 bg-black/50"
                placeholder="Nome do Site"
              />
              <Input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                className="border-white/10 bg-black/50"
                placeholder="seudominio.com"
              />
            </div>

            <div className="space-y-4 border-t border-white/5 pt-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Adicionar Bloco</label>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => addBlock("hero_3d")} variant="outline" className="h-20 flex-col gap-2 border-white/5 bg-white/5 hover:border-indigo-500/50 hover:bg-white/10">
                  Hero 3D
                </Button>
                <Button onClick={() => addBlock("glass_features")} variant="outline" className="h-20 flex-col gap-2 border-white/5 bg-white/5 hover:border-blue-500/50 hover:bg-white/10">
                  Glass Grid
                </Button>
                <Button onClick={() => addBlock("glow_footer")} variant="outline" className="h-20 flex-col gap-2 border-white/5 bg-white/5 hover:border-purple-500/50 hover:bg-white/10">
                  Footer Glow
                </Button>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/5 pt-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Motion Sections</label>
              {motionSections.length === 0 ? (
                <p className="text-sm italic text-zinc-500">
                  Nenhuma section criada ainda. Gere no Video Studio para reutilizar aqui.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {motionSections.slice(0, 8).map((section) => (
                    <LiquidGlassCard key={section.id} className="flex flex-col gap-3 bg-black/40 p-3 text-sm">
                      {(() => {
                        const contract = resolveScrollSectionMotionContract(section);
                        const isAttached = attachedMotionSectionIds.has(section.id);

                        return (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-zinc-200">{section.name}</p>
                                <p className="mt-1 text-xs text-zinc-500">{section.scroll_effect_type}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-white/10 bg-white/5 hover:bg-white/10"
                                disabled={isAttached}
                                onClick={() => addMotionSectionReference(section)}
                              >
                                {isAttached ? "Já usada" : "Inserir"}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                                {contract.backgroundKind}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                                {contract.composition.transition.media_mode}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                                {contract.transitionLabel}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </LiquidGlassCard>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-white/5 pt-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Estrutura da Página</label>
              {blocks.length === 0 ? (
                <p className="text-sm italic text-zinc-500">Nenhum bloco ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {blocks.map((block) => (
                    <LiquidGlassCard key={block.id} className="flex flex-col gap-3 bg-black/40 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-300">{getBlockLabel(block)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => removeBlock(block.id)}
                        >
                          Remover
                        </Button>
                      </div>

                      {block.type === "scroll_section_ref" ? (
                        <p className="text-xs text-zinc-500">
                          Referência canônica: {String(block.content.scroll_section_id || "sem id")}
                        </p>
                      ) : (
                        <div className="flex rounded-lg border border-white/5 bg-black/50 p-2">
                          <select
                            className="w-full cursor-pointer border-none bg-transparent text-xs text-zinc-400 outline-none"
                            value={block.effect || "none"}
                            onChange={(event) => updateBlockEffect(block.id, event.target.value as SiteBlockEffect)}
                          >
                            <option value="none" className="bg-zinc-900">Flutuabilidade (Desligado)</option>
                            <option value="parallax" className="bg-zinc-900">Efeito 3D Parallax</option>
                            <option value="reveal_3d" className="bg-zinc-900">Aparicao Tilt (Reveal 3D)</option>
                            <option value="fade_up" className="bg-zinc-900">Cascata Suave (Fade Up)</option>
                          </select>
                        </div>
                      )}
                    </LiquidGlassCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-3 border-t border-white/5 p-6">
          <Button onClick={saveSite} disabled={isSaving} className="w-full bg-indigo-600 shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">
            {isSaving ? "Salvando..." : "Salvar Site"}
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#010101]">
        <div className="absolute left-1/2 top-6 z-30 flex -translate-x-1/2 items-center rounded-full border border-white/10 bg-white/10 p-1 backdrop-blur-md">
          <Button onClick={() => setPreviewMode("desktop")} variant="ghost" className={`h-8 rounded-full px-4 ${previewMode === "desktop" ? "bg-white/20" : ""}`}>
            <Monitor className="mr-2 h-4 w-4" /> Desktop
          </Button>
          <Button onClick={() => setPreviewMode("mobile")} variant="ghost" className={`h-8 rounded-full px-4 ${previewMode === "mobile" ? "bg-white/20" : ""}`}>
            <Smartphone className="mr-2 h-4 w-4" /> Mobile
          </Button>
        </div>

        <ScrollArea className="relative flex-1 w-full">
          <div className={`mx-auto min-h-screen border-x border-white/5 bg-[#030303] pb-32 pt-24 shadow-2xl transition-all duration-500 ${previewMode === "desktop" ? "w-full max-w-[1440px]" : "my-12 w-[430px] overflow-hidden rounded-[3rem] border-y shadow-black"}`}>
            {blocks.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-zinc-500">
                <Plus className="mb-4 h-12 w-12 opacity-20" />
                <p>Arraste blocos ou adicione pelo menu lateral para compor a página</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {blocks.map((block) => {
                  const motionSection = block.type === "scroll_section_ref" ? getMotionSectionForBlock(block) : null;
                  // Usa contrato pré-computado — evita recalcular a cada render
                  const motionContract = motionSection ? motionContracts[motionSection.id] ?? null : null;
                  const backgroundVideoUrl = motionContract?.backgroundVideoUrl ?? null;
                  const backgroundImageUrl = motionContract?.backgroundImageUrl ?? null;


                  return (
                    <div key={block.id} className="group relative w-full">
                      <Scroll3DWrapper effect={block.type === "scroll_section_ref" ? "none" : block.effect || "none"}>
                        {block.type === "hero_3d" ? (
                          <div className="relative flex min-h-[600px] items-center justify-center overflow-hidden border-b border-white/5">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
                            <div className="z-10 max-w-4xl px-6 text-center">
                              <h1 className="mb-6 bg-gradient-to-b from-white to-white/50 bg-clip-text text-5xl font-bold tracking-tighter text-transparent md:text-7xl">
                                {String(block.content.title || "")}
                              </h1>
                              <p className="text-xl font-light text-zinc-400 md:text-2xl">{String(block.content.subtitle || "")}</p>
                              <Button className="mt-8 h-14 rounded-full bg-white px-8 text-lg font-medium text-black hover:bg-zinc-200">
                                Começar Agora
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {block.type === "glass_features" ? (
                          <div className="relative z-10 border-b border-white/5 bg-black/50 px-6 py-24 md:px-12">
                            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3">
                              {[1, 2, 3].map((item) => (
                                <LiquidGlassCard key={item} delay={item * 0.1} className="flex aspect-square flex-col justify-end p-8">
                                  <div className="mb-6 h-12 w-12 rounded-full bg-white/10" />
                                  <h3 className="mb-2 text-2xl font-semibold">Pilar Premium {item}</h3>
                                  <p className="text-zinc-400">Integração baseada em inteligência artificial e geração procedimental de texturas fluidas.</p>
                                </LiquidGlassCard>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {block.type === "glow_footer" ? (
                          <div className="relative flex flex-col items-center overflow-hidden px-6 pb-12 pt-32 text-center">
                            <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-full max-w-2xl -translate-x-1/2 rounded-full bg-blue-500/20 blur-[100px]" />
                            <h2 className="z-10 mb-8 text-4xl font-light">Pronto para elevar sua marca?</h2>
                            <Button variant="outline" className="z-10 h-12 rounded-full border-white/20 bg-black/50 px-8 backdrop-blur-md hover:bg-white/10">
                              Falar com Consultor
                            </Button>
                            <p className="z-10 mt-24 text-sm text-zinc-600">{String(block.content.copyright || "")}</p>
                          </div>
                        ) : null}

                        {block.type === "scroll_section_ref" ? (
                          motionSection ? (
                            <div className="border-b border-white/5 px-6 py-8">
                              <MotionSectionRenderer
                                section={motionSection}
                                backgroundVideoUrl={motionContract?.backgroundVideoUrl || backgroundVideoUrl}
                                backgroundImageUrl={motionContract?.backgroundImageUrl || backgroundImageUrl}
                                compact={previewMode === "mobile"}
                              />
                            </div>
                          ) : (
                            <div className="border-b border-white/5 px-6 py-16 text-center text-zinc-500">
                              Motion section não encontrada. Atualize a referência no Video Studio.
                            </div>
                          )
                        ) : null}
                      </Scroll3DWrapper>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
