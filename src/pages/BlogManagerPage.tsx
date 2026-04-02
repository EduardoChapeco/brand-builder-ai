import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import SimlabReviewPanel from '@/components/simlab/SimlabReviewPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { BLOG_LAYOUTS } from '@/lib/postgenPhase3';
import { awaitSimlabCompletion, type SimlabInsight, type SimlabRun, type SimlabVariant } from '@/lib/simlab';

type BlogArticle = Tables<'blog_articles'>;

const markdownToHtml = (markdown: string) => markdown
  .split(/\n{2,}/)
  .map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
    if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
    if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
    return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
  })
  .join('\n');

const BlogManagerPage = () => {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [simlabRun, setSimlabRun] = useState<SimlabRun | null>(null);
  const [simlabInsight, setSimlabInsight] = useState<SimlabInsight | null>(null);
  const [simlabVariants, setSimlabVariants] = useState<SimlabVariant[]>([]);
  const [simlabLoading, setSimlabLoading] = useState(false);
  const [simlabError, setSimlabError] = useState<string | null>(null);

  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedId) || null,
    [articles, selectedId],
  );

  const loadArticles = useCallback(async () => {
    if (!workspace?.id) return;
    const { data, error } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      const isPending = error.message?.includes('does not exist') || error.code === '42P01';
      if (isPending) {
        toast.info('Blog Manager em configuração. As migrações estão sendo aplicadas. Aguarde e recarregue.', { duration: 6000 });
      } else {
        toast.error('Não foi possível carregar os artigos');
      }
      return;
    }

    const rows = (data || []) as BlogArticle[];
    setArticles(rows);

    const requestedId = (location.state as { articleId?: string } | null)?.articleId;
    if (requestedId && rows.some((row) => row.id === requestedId)) {
      setSelectedId(requestedId);
    } else if (!selectedId && rows[0]) {
      setSelectedId(rows[0].id);
    }
  }, [location.state, selectedId, workspace?.id]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (!selectedArticle?.latest_simlab_run_id) {
      setSimlabRun(null);
      setSimlabInsight(null);
      setSimlabVariants([]);
      setSimlabError(null);
      return;
    }

    let active = true;
    setSimlabLoading(true);
    void awaitSimlabCompletion(selectedArticle.latest_simlab_run_id, 15000)
      .then((status) => {
        if (!active) return;
        setSimlabRun(status.run);
        setSimlabInsight(status.insight);
        setSimlabVariants(status.variants);
        setSimlabError(status.run.verdict === 'approved' ? null : status.insight?.executive_summary || status.run.failure_reason || null);
      })
      .catch((error) => {
        if (!active) return;
        setSimlabError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setSimlabLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedArticle?.latest_simlab_run_id]);

  const createDraft = async () => {
    if (!workspace?.id || !topic.trim()) {
      toast.error('Informe um tema para o artigo');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generate', {
        body: {
          workspace_id: workspace.id,
          topic: topic.trim(),
        },
      });
      if (error) throw error;
      toast.success('Draft criado');
      setTopic('');
      await loadArticles();
      if (data?.blog_article_id) setSelectedId(data.blog_article_id);
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel criar o draft');
    } finally {
      setCreating(false);
    }
  };

  const patchSelected = (patch: Partial<BlogArticle>) => {
    if (!selectedArticle) return;
    setArticles((current) => current.map((article) => (
      article.id === selectedArticle.id ? { ...article, ...patch } : article
    )));
  };

  const saveArticle = async () => {
    if (!selectedArticle) return;
    if (selectedArticle.status === 'published' && simlabRun?.verdict !== 'approved') {
      toast.error('O artigo so pode ser publicado depois de aprovacao do SimLab.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: selectedArticle.title,
        slug: selectedArticle.slug,
        meta_description: selectedArticle.meta_description,
        content_markdown: selectedArticle.content_markdown,
        content_html: markdownToHtml(selectedArticle.content_markdown || ''),
        layout_template: selectedArticle.layout_template,
        status: selectedArticle.status,
      };
      const { error } = await supabase
        .from('blog_articles')
        .update(payload)
        .eq('id', selectedArticle.id);
      if (error) throw error;
      toast.success('Artigo salvo');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel salvar o artigo');
    } finally {
      setSaving(false);
    }
  };

  const refreshSimlabRun = async () => {
    if (!selectedArticle?.latest_simlab_run_id) return;
    setSimlabLoading(true);
    try {
      const status = await awaitSimlabCompletion(selectedArticle.latest_simlab_run_id, 15000);
      setSimlabRun(status.run);
      setSimlabInsight(status.insight);
      setSimlabVariants(status.variants);
      setSimlabError(status.run.verdict === 'approved' ? null : status.insight?.executive_summary || status.run.failure_reason || null);
    } catch (error) {
      setSimlabError(error instanceof Error ? error.message : String(error));
    } finally {
      setSimlabLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <aside className="w-[340px] shrink-0 border-r overflow-y-auto no-scrollbar" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Blog Manager</p>
          <h1 className="mt-2 text-2xl font-display font-bold" style={{ color: 'var(--text-1)' }}>Artigos da Marca</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-3)' }}>
            Crie, edite e valide artigos SEO alinhados com o Briefing e aprovados pelo SimLab antes de publicar.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Novo tema</Label>
            <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ex: como usar IA no atendimento" />
          </div>
          <Button onClick={createDraft} disabled={creating} className="w-full gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {creating ? 'Gerando...' : 'Criar draft'}
          </Button>

          <div className="space-y-2 pt-2">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedId(article.id)}
                className="w-full rounded-2xl p-4 text-left transition-all"
                style={{
                  background: selectedId === article.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                  border: `1px solid ${selectedId === article.id ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{article.status || 'draft'}</p>
                <p className="mt-1 font-semibold" style={{ color: 'var(--text-1)' }}>{article.title}</p>
                {article.meta_description && (
                  <p className="mt-2 text-xs leading-5 line-clamp-2" style={{ color: 'var(--text-3)' }}>{article.meta_description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {selectedArticle ? (
          <div className="max-w-5xl mx-auto p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Editor de artigo</p>
                <h2 className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>{selectedArticle.title}</h2>
              </div>
              <Button onClick={saveArticle} disabled={saving} className="gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input value={selectedArticle.title} onChange={(event) => patchSelected({ title: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={selectedArticle.slug || ''} onChange={(event) => patchSelected({ slug: event.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_180px] gap-4">
              <div className="space-y-2">
                <Label>Meta description</Label>
                <Textarea
                  value={selectedArticle.meta_description || ''}
                  onChange={(event) => patchSelected({ meta_description: event.target.value })}
                  className="min-h-[100px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={selectedArticle.layout_template || 'medium_clean'} onValueChange={(value) => patchSelected({ layout_template: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOG_LAYOUTS.map((layout) => (
                      <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedArticle.status || 'draft'} onValueChange={(value) => patchSelected({ status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['draft', 'review', 'published'].map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SimlabReviewPanel
              title="SimLab Review"
              run={simlabRun}
              insight={simlabInsight}
              variants={simlabVariants}
              loading={simlabLoading}
              error={simlabError}
              onRefresh={simlabRun?.id ? refreshSimlabRun : null}
            />

            <div className="space-y-2">
              <Label>Markdown</Label>
              <Textarea
                value={selectedArticle.content_markdown || ''}
                onChange={(event) => patchSelected({ content_markdown: event.target.value })}
                className="min-h-[420px] resize-y font-mono text-sm"
              />
            </div>

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} style={{ color: 'var(--primary)' }} />
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Preview HTML</p>
              </div>
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedArticle.content_markdown || '') }}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-[320px] space-y-3">
              <p className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Selecione um artigo</p>
              <p className="text-sm leading-6" style={{ color: 'var(--text-3)' }}>
                Crie um draft pelo painel lateral para começar. A IA gera o esboço com base no tema que você informar — conectado ao Briefing e Tom de Voz da sua marca.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogManagerPage;
