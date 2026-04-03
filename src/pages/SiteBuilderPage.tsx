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
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SubtleBadge from '@/components/shared/SubtleBadge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { listWebsites } from '@/lib/websites/service';
import type { WebsiteRecord } from '@/lib/websites/types';

export default function SiteBuilderPage() {
  const navigate = useNavigate();
  const { workspace, canEdit } = useWorkspace();
  const [sites, setSites] = useState<WebsiteRecord[]>([]);
  const [pageCountBySite, setPageCountBySite] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!workspace?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await listWebsites(workspace.id);
        setSites(result.websites);
        setPageCountBySite(result.pageCountBySite);
      } catch (error) {
        console.error(error);
        toast.error('Nao foi possivel carregar a biblioteca de sites.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [workspace?.id]);

  const totalPages = useMemo(
    () => Object.values(pageCountBySite).reduce((sum, count) => sum + count, 0),
    [pageCountBySite],
  );

  const publishedSites = useMemo(
    () => sites.filter((site) => site.status === 'published').length,
    [sites],
  );

  const draftSites = sites.length - publishedSites;

  return (
    <div className="page-layout">
      <div className="page-content">
        <div className="page-inner flex max-w-none flex-col gap-6 py-6">
          <PageHeader
            eyebrow="Website Builder"
            title="Biblioteca de sites conectada ao editor visual e ao chat"
            description="O builder agora opera com paginas e secoes canonicamente estruturadas, mantendo compatibilidade com o legado e abrindo o fluxo spec-driven quando o projeto precisa de execucao multi-arquivo."
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
                  className="rounded-xl shadow-none"
                  onClick={() => navigate('new')}
                  disabled={!canEdit}
                >
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
                {loading ? '-' : sites.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Instancias visuais conectadas ao runtime publico do workspace.
              </p>
            </SectionCard>

            <SectionCard className="shadow-none">
              <AppSectionLabel>Paginas</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? '-' : totalPages}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Paginas ativas sob a camada de builder com retrocompatibilidade de schema.
              </p>
            </SectionCard>

            <SectionCard className="shadow-none">
              <AppSectionLabel>Pipeline</AppSectionLabel>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {loading ? '-' : `${publishedSites}/${draftSites}`}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Sites publicados versus rascunhos em operacao dentro deste workspace.
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
                description="Crie o primeiro site visual ou inicie pelo chat spec-driven para produzir a primeira estrutura completa vinculada ao workspace."
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
                      className="rounded-xl shadow-none"
                      onClick={() => navigate('new')}
                      disabled={!canEdit}
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
                  const pageCount = pageCountBySite[site.id] || 0;
                  const isPublished = site.status === 'published';

                  return (
                    <div
                      key={site.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                            {site.name}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                            {site.domain || 'Sem dominio vinculado'}
                          </p>
                        </div>
                        <SubtleBadge variant={isPublished ? 'brand' : 'outline'}>
                          {site.status}
                        </SubtleBadge>
                      </div>

                      <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        <span>{pageCount} pagina(s)</span>
                        <span>•</span>
                        <span>{isPublished ? 'publicado' : 'rascunho'}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl shadow-none"
                          onClick={() => navigate(site.id)}
                        >
                          <LayoutTemplate size={14} />
                          Editor visual
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl shadow-none"
                          onClick={() =>
                            navigate('../vibe-coder', {
                              state: { websiteId: site.id, websiteName: site.name },
                            })
                          }
                        >
                          <Bot size={14} />
                          Abrir no chat
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
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Runtime publico</p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    O site visual segue pronto para publicacao e leitura publica por slug.
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
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Secoes canonicas</p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Novos sites persistem em `website_sections` e continuam espelhados para o legado.
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
                    O mesmo site pode abrir o squad de criacao no chat sem perder o contexto do builder.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard className="shadow-none">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Editor visual</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Selecione o site, organize paginas, reordene secoes e edite o conteudo diretamente no preview.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Chat conectado</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Quando o escopo exigir aplicacao multi-arquivo, o chat recebe `websiteId` e segue o fluxo aprovado.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Migracao gradual</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Sites legados continuam abrindo enquanto o editor novo converte a estrutura para o modelo canonico.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="shadow-none">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <MousePointer2 size={18} className="text-[var(--text-secondary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Aprovacao e controle</p>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  O builder visual continua livre para edicao direta; o chat segue com gate de spec antes de executar builds mais amplos.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
