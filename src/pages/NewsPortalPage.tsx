import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, Layers, Loader2, Newspaper, RefreshCcw, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
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

  const stats = useMemo(() => ({
    high: items.filter((item) => (item.relevance_score || 0) >= 70).length,
    extracted: items.filter((item) => item.content_extracted).length,
  }), [items]);

  return (
    <div className="page-layout">
      <div className="page-hero gradient-mesh">
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div>
            <p className="page-hero-eyebrow">RSS Squad Autonomo</p>
            <h1 className="page-hero-title">News Portal</h1>
            <p className="page-hero-description">
              Cockpit de oportunidades editoriais para {briefing?.company_name || workspace?.name || 'o workspace'}.
              O feed cruza frescor com aderencia ao briefing e abre blog, post ou carrossel em um clique.
            </p>
          </div>
          <Button onClick={refreshNews} disabled={syncing} className="gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            {syncing ? 'Atualizando...' : 'Atualizar Feed'}
          </Button>
        </div>
      </div>

      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Noticias mapeadas', value: items.length, icon: Newspaper },
              { label: 'Alta relevancia', value: stats.high, icon: Sparkles },
              { label: 'Artigos extraidos', value: stats.extracted, icon: FileText },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="glass-card rounded-3xl p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
                    <Icon size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  <p className="mt-4 text-4xl font-display font-bold" style={{ color: 'var(--text-1)' }}>{stat.value}</p>
                </div>
              );
            })}
          </section>

          <section className="glass-card rounded-3xl p-6 space-y-4">
            {loading ? (
              <div className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando noticias...</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl p-6 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                Nenhuma noticia no workspace. Rode a sincronizacao inicial para popular o portal.
              </div>
            ) : (
              items.map((item) => (
                <article key={item.id} className="rounded-3xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-primary">Score {item.relevance_score || 0}</span>
                    {item.status && <span className="badge">{item.status}</span>}
                    {item.categories?.slice(0, 2).map((category) => (
                      <span key={`${item.id}-${category}`} className="badge">{category}</span>
                    ))}
                  </div>

                  <h2 className="mt-4 text-xl font-display font-bold" style={{ color: 'var(--text-1)' }}>{item.title}</h2>
                  <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{item.description}</p>
                  {item.relevance_reason && (
                    <p className="mt-3 text-xs leading-5" style={{ color: 'var(--text-3)' }}>{item.relevance_reason}</p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => generateBlog(item)}
                      disabled={busyId === item.id}
                      className="gap-2"
                      style={{ background: 'var(--primary)', color: '#fff' }}
                    >
                      {busyId === item.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                      Gerar Blog
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate('../generator', {
                        state: {
                          topic: item.title,
                          recommendedTemplate: 'editorial-magazine',
                          sourceUrl: item.source_url,
                        },
                      })}
                    >
                      <Wand2 size={14} />
                      Gerar Post
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate('../carousel-builder', {
                        state: {
                          topic: item.title,
                          recommendedTemplate: 'data-insight',
                          arcType: 'educational_thread',
                        },
                      })}
                    >
                      <Layers size={14} />
                      Gerar Carrossel
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => extractContent(item)}>
                      <Sparkles size={14} />
                      Extrair Conteudo
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => window.open(item.source_url, '_blank')}>
                      <ExternalLink size={14} />
                      Fonte
                    </Button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default NewsPortalPage;
