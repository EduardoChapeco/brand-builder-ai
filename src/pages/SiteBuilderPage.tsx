import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Globe,
  LayoutTemplate,
  Layers,
  Loader2,
  MousePointer2,
  Plus,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { SITE_SERVICE } from '@/lib/sites/service';
import type { Publication } from '@/types/app.types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

// Shared Components
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SubtleBadge from '@/components/shared/SubtleBadge';
import { Button } from '@/components/ui/button';

export default function SiteBuilderPage() {
  const navigate = useNavigate();
  const { workspace, canEdit } = useWorkspace();
  const [sites, setSites] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!workspace?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await SITE_SERVICE.listSites(workspace.id);
        setSites(result);
      } catch (error) {
        console.error(error);
        toast.error('Não foi possível carregar a biblioteca de sites.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [workspace?.id]);

  const publishedSites = useMemo(
    () => sites.filter((site) => site.status === 'published').length,
    [sites],
  );

  const draftSites = sites.length - publishedSites;

  const handleCreateSite = async () => {
    if (!workspace?.id) return;
    setIsCreating(true);
    try {
      const site = await SITE_SERVICE.createSitePublication(workspace.id, 'Novo Site Canônico');
      toast.success('Site iniciado com sucesso!');
      navigate(site.id);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao iniciar novo site.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-layout">
      <div className="page-content">
        <div className="page-inner flex max-w-none flex-col gap-6 py-6">
          <PageHeader
            eyebrow="Website Builder"
            title="Biblioteca de sites conectada ao editor visual e ao chat"
            description="O builder agora opera com páginas e seções canonicamente estruturadas, mantendo compatibilidade com o legado e abrindo o fluxo spec-driven."
            className="shadow-none"
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl shadow-none"
                  onClick={() => navigate('../vibe-coder')}
                >
                  <Bot size={14} />
                  Abrir chat spec-driven
                </Button>
                <Button
                  className="rounded-xl shadow-none bg-[#a855f7] hover:bg-[#a855f7]/90 text-white"
                  onClick={handleCreateSite}
                  disabled={!canEdit || isCreating}
                >
                  {isCreating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Novo site visual
                </Button>
              </div>
            }
          />

          <div className="grid gap-6 md:grid-cols-3">
            <SectionCard className="shadow-none">
              <AppSectionLabel>Sites</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? '-' : sites.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Instâncias visuais conectadas ao runtime público do workspace.
              </p>
            </SectionCard>

            <SectionCard className="shadow-none">
              <AppSectionLabel>Seções</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? '-' : sites.length * 5}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Estimativa de blocos de conteúdo já processados no builder.
              </p>
            </SectionCard>

            <SectionCard className="shadow-none">
              <AppSectionLabel>Pipeline</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? '-' : `${publishedSites}/${draftSites}`}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Sites publicados versus rascunhos em operação dentro deste workspace.
              </p>
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
              <div className="flex min-h-[280px] items-center justify-center">
                <Loader2 className="animate-spin text-[var(--text-muted)]" size={28} />
              </div>
            ) : sites.length === 0 ? (
              <EmptyState
                title="Nenhum site encontrado"
                description="Crie o primeiro site visual para produzir a primeira estrutura completa vinculada ao workspace."
                icon={LayoutTemplate}
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      variant="outline"
                      className="rounded-xl shadow-none"
                      onClick={() => navigate('../vibe-coder')}
                    >
                      <Bot size={14} />
                      Chat spec-driven
                    </Button>
                    <Button
                      className="rounded-xl shadow-none bg-[#a855f7] text-white"
                      onClick={handleCreateSite}
                      disabled={!canEdit || isCreating}
                    >
                      <Plus size={14} />
                      Novo site visual
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sites.map((site) => {
                  const isPublished = site.status === 'published';

                  return (
                    <div
                      key={site.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 hover:border-[#a855f7]/40 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold tracking-[-0.03em] text-white">
                            {site.name}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-stone-500 font-mono">
                            /{site.slug || '—'}
                          </p>
                        </div>
                        <SubtleBadge variant={isPublished ? 'brand' : 'outline'} className={cn(isPublished ? "bg-green-500/10 text-green-500 border-green-500/20" : "")}>
                          {isPublished ? 'Publicado' : 'Rascunho'}
                        </SubtleBadge>
                      </div>

                      <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-stone-500">
                         <span>BUILDER SDD-1.0</span>
                         <span>•</span>
                         <span>CANONICAL</span>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl shadow-none border-white/5 bg-white/5 hover:bg-white/10 hover:text-white"
                          onClick={() => navigate(site.id)}
                        >
                          <LayoutTemplate size={14} />
                          Editor Visual
                        </Button>
                      </div>
                    </div>
                  );
                })}
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
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Runtime público</p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    O site visual segue pronto para publicação e leitura pública por slug.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="shadow-none">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <Layers size={18} className="text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Seções canônicas</p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Novos sites persistem em `publication_sections` com garantia de integridade.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="shadow-none">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <Sparkles size={18} className="text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Spec-driven bridge</p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    O mesmo site pode abrir o squad de criação no chat com contexto total.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
