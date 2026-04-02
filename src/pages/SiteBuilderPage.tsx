import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Globe, LayoutTemplate, Layers, Loader2, MousePointer2, Plus } from "lucide-react";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import SubtleBadge from "@/components/shared/SubtleBadge";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { fromTable } from "@/integrations/supabase/db-custom";

type SiteRow = {
  id: string;
  name: string;
  domain?: string | null;
  status?: string | null;
};

type SitePageRow = {
  website_id: string;
};

export default function SiteBuilderPage() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [sitePages, setSitePages] = useState<SitePageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;

    const load = async () => {
      setLoading(true);
      const [{ data: siteRows, error: siteError }, { data: pageRows, error: pageError }] = await Promise.all([
        fromTable("websites")
          .select("id,name,domain,status")
          .eq("workspace_id", workspace.id)
          .order("updated_at", { ascending: false }),
        fromTable("website_pages")
          .select("website_id")
          .in(
            "website_id",
            (
              await fromTable("websites")
                .select("id")
                .eq("workspace_id", workspace.id)
            ).data?.map((site: { id: string }) => site.id) || ["00000000-0000-0000-0000-000000000000"],
          ),
      ]);

      if (!siteError) setSites((siteRows || []) as SiteRow[]);
      if (!pageError) setSitePages((pageRows || []) as SitePageRow[]);
      setLoading(false);
    };

    void load();
  }, [workspace?.id]);

  const pagesBuilt = useMemo(() => sitePages.length, [sitePages.length]);

  return (
    <div className="page-layout">
      <div className="page-content">
        <div className="page-inner flex max-w-none flex-col gap-6 py-6">
          <PageHeader
            eyebrow="Site Builder"
            title="Builder visual conectado ao squad de site"
            description="O builder visual continua disponivel, mas agora pode disparar o fluxo spec-driven no chat para gerar projetos multi-arquivo vinculados ao site."
            className="shadow-none"
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl shadow-none" onClick={() => navigate("../vibe-coder")}>
                  <Bot size={14} />
                  Abrir chat spec-driven
                </Button>
                <Button className="rounded-xl shadow-none" onClick={() => navigate("new")}>
                  <Plus size={14} />
                  Novo site visual
                </Button>
              </div>
            }
          />

          <div className="grid gap-6 md:grid-cols-3">
            <SectionCard className="shadow-none">
              <AppSectionLabel>Sites</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? "-" : sites.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Sites publicados ou em rascunho ligados ao workspace.</p>
            </SectionCard>

            <SectionCard className="shadow-none">
              <AppSectionLabel>Paginas</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? "-" : pagesBuilt}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Paginas estruturadas dentro do builder visual.</p>
            </SectionCard>

            <SectionCard className="shadow-none">
              <AppSectionLabel>Execucao</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? "-" : sites.length > 0 ? "Ativa" : "Inicial"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Use o chat spec-driven para gerar a camada multi-arquivo vinculada a um site visual.</p>
            </SectionCard>
          </div>

          <SectionCard className="shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <AppSectionLabel>Biblioteca</AppSectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Sites do workspace
                </h2>
              </div>
              <SubtleBadge variant="outline">{sites.length} site(s)</SubtleBadge>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <Loader2 className="animate-spin text-[var(--text-muted)]" size={28} />
              </div>
            ) : sites.length === 0 ? (
              <EmptyState
                title="Nenhum site encontrado"
                description="Crie o primeiro site visual ou inicie pelo chat spec-driven para gerar um projeto vinculado."
                icon={LayoutTemplate}
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant="outline" className="rounded-xl shadow-none" onClick={() => navigate("../vibe-coder")}>
                      <Bot size={14} />
                      Chat spec-driven
                    </Button>
                    <Button className="rounded-xl shadow-none" onClick={() => navigate("new")}>
                      <Plus size={14} />
                      Novo site visual
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{site.name}</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {site.domain || "Sem dominio vinculado"}
                        </p>
                      </div>
                      <SubtleBadge variant={site.status === "published" ? "brand" : "outline"}>
                        {site.status || "draft"}
                      </SubtleBadge>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl shadow-none" onClick={() => navigate(site.id)}>
                        <LayoutTemplate size={14} />
                        Editor visual
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl shadow-none"
                        onClick={() => navigate("../vibe-coder", { state: { websiteId: site.id, websiteName: site.name } })}
                      >
                        <Bot size={14} />
                        Abrir no chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="grid gap-6 md:grid-cols-3">
            <SectionCard className="shadow-none">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <Globe size={18} className="text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Site visual</p>
                  <p className="text-sm text-[var(--text-secondary)]">Builder estruturado com paginas e blocos.</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="shadow-none">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <Layers size={18} className="text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Projeto multi-arquivo</p>
                  <p className="text-sm text-[var(--text-secondary)]">Executado no target `project_vfs` com preview ao vivo.</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="shadow-none">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <MousePointer2 size={18} className="text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Aprovacao obrigatoria</p>
                  <p className="text-sm text-[var(--text-secondary)]">Nenhum build sai sem spec validada e aprovada.</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
