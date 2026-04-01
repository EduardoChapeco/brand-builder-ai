import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Newspaper,
  RefreshCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import ActionBar from '@/components/shared/ActionBar';
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import EmptyState from '@/components/shared/EmptyState';
import MetricCard from '@/components/shared/MetricCard';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SubtleBadge from '@/components/shared/SubtleBadge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type NewsItem = Tables<'news_items'>;

const NewsPortalPage = () => {
  const navigate = useNavigate();
  const { workspace, briefing } = useWorkspace();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!workspace?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('news_items')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('relevance_score', { ascending: false })
      .order('fetched_at', { ascending: false })
      .limit(60);

    if (error) {
      toast.error('Nao foi possivel carregar o News Portal');
    } else {
      setItems((data || []) as NewsItem[]);
    }
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const refreshNews = async () => {
    if (!workspace?.id) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('news-fetch', {
        body: { workspace_id: workspace.id },
      });
      if (error) throw error;
      toast.success(`${data?.inserted || 0} noticias adicionadas`);
      await loadItems();
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel sincronizar as noticias');
    } finally {
      setSyncing(false);
    }
  };

  const extractContent = async (item: NewsItem) => {
    if (!workspace?.id) return;

    setBusyId(item.id);
    try {
      const { error } = await supabase.functions.invoke('news-extract-content', {
        body: { workspace_id: workspace.id, news_item_id: item.id },
      });
      if (error) throw error;
      toast.success('Conteudo extraido');
      await loadItems();
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel extrair o artigo');
    } finally {
      setBusyId(null);
    }
  };

  const generateBlog = async (item: NewsItem) => {
    if (!workspace?.id) return;

    setBusyId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generate', {
        body: { workspace_id: workspace.id, news_item_id: item.id },
      });
      if (error) throw error;
      toast.success('Rascunho criado no Blog Manager');
      navigate('../blog-manager', { state: { articleId: data?.blog_article_id } });
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel gerar o blog');
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(
    () => ({
      mapped: items.length,
      high: items.filter((item) => (item.relevance_score || 0) >= 70).length,
      extracted: items.filter((item) => item.content_extracted).length,
    }),
    [items],
  );

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="News Portal"
            title="Cockpit editorial do workspace"
            description={
              `Monitore noticias relevantes para ${briefing?.company_name || workspace?.name || 'o workspace'}, extraia contexto e abra blog, post ou carrossel sem mudar de modulo.`
            }
            action={
              <Button onClick={refreshNews} disabled={syncing} className="h-11 rounded-xl px-5">
                {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                {syncing ? 'Atualizando...' : 'Atualizar feed'}
              </Button>
            }
          />

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Noticias mapeadas" value={stats.mapped} icon={Newspaper} />
            <MetricCard label="Alta relevancia" value={stats.high} icon={Sparkles} />
            <MetricCard label="Artigos extraidos" value={stats.extracted} icon={FileText} />
          </section>

          <ActionBar>
            <div>
              <AppSectionLabel>Curadoria automatizada</AppSectionLabel>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                O portal prioriza frescor, relevancia ao briefing e potencial de derivacao editorial.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SubtleBadge>Briefing: {briefing?.segment || 'Nao definido'}</SubtleBadge>
              <SubtleBadge variant="outline">1 clique para blog/post/carrossel</SubtleBadge>
            </div>
          </ActionBar>

          <SectionCard className="space-y-4">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-[var(--text-secondary)]">
                Carregando noticias...
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title="Nenhuma noticia no workspace"
                description="Rode a sincronizacao inicial para popular o portal com oportunidades de conteudo."
                icon={Newspaper}
                action={
                  <Button onClick={refreshNews} disabled={syncing} className="rounded-xl">
                    Atualizar feed
                  </Button>
                }
              />
            ) : (
              items.map((item) => {
                const isBusy = busyId === item.id;
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SubtleBadge variant="brand">Score {item.relevance_score || 0}</SubtleBadge>
                      {item.status ? <SubtleBadge>{item.status}</SubtleBadge> : null}
                      {item.categories?.slice(0, 2).map((category) => (
                        <SubtleBadge key={`${item.id}-${category}`} variant="outline">
                          {category}
                        </SubtleBadge>
                      ))}
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                      {item.title}
                    </h2>
                    <p className="mt-3 max-w-[860px] text-sm leading-7 text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                    {item.relevance_reason ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{item.relevance_reason}</p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button onClick={() => generateBlog(item)} disabled={isBusy} className="rounded-xl">
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        Gerar blog
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() =>
                          navigate('../generator', {
                            state: {
                              topic: item.title,
                              recommendedTemplate: 'editorial-magazine',
                              sourceUrl: item.source_url,
                            },
                          })
                        }
                      >
                        <Wand2 size={14} />
                        Gerar post
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() =>
                          navigate('../carousel-builder', {
                            state: {
                              topic: item.title,
                              recommendedTemplate: 'data-insight',
                              arcType: 'educational_thread',
                            },
                          })
                        }
                      >
                        <Layers size={14} />
                        Gerar carrossel
                      </Button>
                      <Button variant="ghost" className="rounded-xl" onClick={() => extractContent(item)}>
                        <Sparkles size={14} />
                        Extrair conteudo
                      </Button>
                      <Button variant="ghost" className="rounded-xl" onClick={() => window.open(item.source_url, '_blank')}>
                        <ExternalLink size={14} />
                        Fonte
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default NewsPortalPage;
