import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CameraIcon, Layers, Sparkles, Wand2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type ViralAnalysis = Tables<'viral_analyses'>;
type Post = Tables<'posts_v2'>;

const quickActions = [
  { id: 'generator', label: 'Post Viral', description: 'Quick Post com awareness e template recomendado.', icon: Wand2, path: '../generator', state: { funnel: 'Awareness' } },
  { id: 'carousel', label: 'Carrossel Educativo', description: 'Storyboard avançado para retenção.', icon: Layers, path: '../carousel-builder', state: { funnel: 'Educativo' } },
  { id: 'product', label: 'Foto de Produto', description: 'Prompt + geração visual para e-commerce.', icon: CameraIcon, path: '../product-shots' },
  { id: 'prompt', label: 'Prompt de Imagem', description: 'Monte prompts reutilizáveis com a marca.', icon: Sparkles, path: '../image-prompts' },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { workspace, briefing } = useWorkspace();
  const [analyses, setAnalyses] = useState<ViralAnalysis[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const [{ data: analysisRows }, { data: postRows }] = await Promise.all([
        supabase.from('viral_analyses').select('*').eq('workspace_id', workspace.id).order('analyzed_at', { ascending: false }).limit(6),
        supabase.from('posts_v2').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(5),
      ]);

      if (!isMounted) return;
      setAnalyses((analysisRows || []) as ViralAnalysis[]);
      setRecentPosts((postRows || []) as Post[]);
      setLoading(false);
    };

    load();
    return () => { isMounted = false; };
  }, [workspace?.id]);

  const suggestions = useMemo(() => {
    const cachedPatterns = Array.isArray((briefing?.viral_patterns_cache as { recent_patterns?: Array<{ hook_formula?: string; content_type?: string; visual_style?: string }> } | null)?.recent_patterns)
      ? (briefing?.viral_patterns_cache as { recent_patterns: Array<{ hook_formula?: string; content_type?: string; visual_style?: string }> }).recent_patterns
      : [];

    const source = cachedPatterns.length > 0
      ? cachedPatterns
      : analyses.map(item => ({
          hook_formula: item.hook_formula || undefined,
          content_type: item.content_type || undefined,
          visual_style: item.visual_style || undefined,
        }));

    const base = source.slice(0, 3).map((pattern, index) => ({
      title: `${pattern.content_type || 'social insight'} para ${briefing?.segment || 'sua marca'}`,
      hook: pattern.hook_formula || `O erro silencioso que trava ${briefing?.segment || 'o seu nicho'}`,
      format: index === 0 ? 'Quick Post' : 'Carrossel',
      template: index === 0 ? 'viral-hook' : 'data-insight',
      route: index === 0 ? '../generator' : '../carousel-builder',
      state: {
        topic: pattern.hook_formula || `Estratégia para ${briefing?.segment || 'crescer com conteúdo'}`,
        recommendedTemplate: index === 0 ? 'viral-hook' : 'data-insight',
      },
    }));

    if (base.length === 0) {
      return [
        {
          title: `Gancho de curiosidade para ${briefing?.segment || 'o seu nicho'}`,
          hook: `O que ninguém te conta sobre ${briefing?.segment || 'conteúdo de marca'}`,
          format: 'Quick Post',
          template: 'editorial-magazine',
          route: '../generator',
          state: { topic: `O que ninguém te conta sobre ${briefing?.segment || 'conteúdo de marca'}`, recommendedTemplate: 'editorial-magazine' },
        },
        {
          title: 'Checklist educativo',
          hook: `3 sinais de que sua comunicação está desalinhada`,
          format: 'Carrossel',
          template: 'data-insight',
          route: '../carousel-builder',
          state: { topic: '3 sinais de que sua comunicação está desalinhada', recommendedTemplate: 'data-insight' },
        },
        {
          title: 'Prova + transformação',
          hook: `Antes parecia certo. Depois ficou óbvio.`,
          format: 'Quick Post',
          template: 'clean-white',
          route: '../generator',
          state: { topic: 'Antes parecia certo. Depois ficou óbvio.', recommendedTemplate: 'clean-white' },
        },
      ];
    }

    return base;
  }, [analyses, briefing?.segment, briefing?.viral_patterns_cache]);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-app)' }}>
      <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
          Workspace Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
          O que criar hoje?
        </h1>
        <p className="mt-2 text-sm max-w-3xl" style={{ color: 'var(--text-2)' }}>
          Use o gerador rápido para capturar oportunidades, o builder para narrativas completas e os módulos inteligentes
          para ampliar repertório visual e editorial sem duplicar fluxo.
        </p>
      </div>

      <div className="p-8 space-y-8">
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-4 md:grid-cols-2 gap-4">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path, { state: action.state })}
                  className="rounded-3xl p-5 text-left transition-all hover:-translate-y-1"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 18px 40px rgba(0,0,0,0.14)' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                    <Icon size={22} />
                  </div>
                  <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-1)' }}>{action.label}</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{action.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
          <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-5">
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 className="font-display font-semibold text-xl" style={{ color: 'var(--text-1)' }}>Sugestões Inteligentes</h3>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Baseado no briefing e nos padrões virais mais recentes do workspace.</p>
              </div>
            </div>

            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.title}-${index}`}
                  className="rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{suggestion.format}</p>
                    <h4 className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{suggestion.title}</h4>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>{suggestion.hook}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                      {suggestion.template}
                    </span>
                    <button
                      onClick={() => navigate(suggestion.route, { state: suggestion.state })}
                      className="px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--primary)', color: '#fff' }}
                    >
                      Criar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 className="font-display font-semibold text-xl" style={{ color: 'var(--text-1)' }}>Pulso do Workspace</h3>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Sinais recentes do que já foi analisado e publicado.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Padrões virais</p>
                <p className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>{loading ? '...' : analyses.length}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Posts recentes</p>
                <p className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>{loading ? '...' : recentPosts.length}</p>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Segmento</p>
              <p className="mt-2 text-sm font-medium" style={{ color: 'var(--text-1)' }}>{briefing?.segment || 'Ainda não definido'}</p>
              <p className="mt-4 text-xs uppercase" style={{ color: 'var(--text-3)' }}>Tom do briefing</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{briefing?.tone_of_voice || 'Configure o briefing para melhorar as sugestões.'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
