import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CameraIcon,
  ExternalLink,
  Layers,
  MonitorSmartphone,
  Sparkles,
  TrendingUp,
  Wand2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import EmptyState from '@/components/shared/EmptyState';
import MetricCard from '@/components/shared/MetricCard';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SubtleBadge from '@/components/shared/SubtleBadge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type ViralAnalysis = Tables<'viral_analyses'>;
type Post = Tables<'posts_v2'>;

const quickActions = [
  {
    id: 'generator',
    label: 'Post rapido',
    description: 'Hook viral com template recomendado pela IA.',
    icon: Wand2,
    path: '../generator',
    state: { funnel: 'Awareness' },
    accent: '#2563EB',
  },
  {
    id: 'carousel',
    label: 'Carrossel educativo',
    description: 'Storyboard para reter, explicar e converter melhor.',
    icon: Layers,
    path: '../carousel-builder',
    state: { funnel: 'Educativo' },
    accent: '#0F766E',
  },
  {
    id: 'product',
    label: 'Foto de produto',
    description: 'Prompt e composicao visual para e-commerce e ads.',
    icon: CameraIcon,
    path: '../product-shots',
    accent: '#B45309',
  },
  {
    id: 'feed',
    label: 'Feed preview',
    description: 'Visualize os posts como uma grade social real.',
    icon: MonitorSmartphone,
    path: '../feed-preview',
    accent: '#7C3AED',
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { workspace, briefing, brandKit } = useWorkspace();
  const [analyses, setAnalyses] = useState<ViralAnalysis[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const primaryColor = brandKit?.color_primary || '#18181B';

  useEffect(() => {
    if (!workspace?.id) return;

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const [{ data: analysisRows }, { data: postRows }] = await Promise.all([
        supabase
          .from('viral_analyses')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('analyzed_at', { ascending: false })
          .limit(6),
        supabase
          .from('posts_v2')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      if (!isMounted) return;
      setAnalyses((analysisRows || []) as ViralAnalysis[]);
      setRecentPosts((postRows || []) as Post[]);
      setLoading(false);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [workspace?.id]);

  const suggestions = useMemo(() => {
    const cachedPatterns = Array.isArray(
      (briefing?.viral_patterns_cache as { recent_patterns?: Array<{ hook_formula?: string; content_type?: string; visual_style?: string }> } | null)
        ?.recent_patterns,
    )
      ? (briefing?.viral_patterns_cache as { recent_patterns: Array<{ hook_formula?: string; content_type?: string; visual_style?: string }> }).recent_patterns
      : [];

    const source = cachedPatterns.length > 0
      ? cachedPatterns
      : analyses.map((item) => ({
          hook_formula: item.hook_formula || undefined,
          content_type: item.content_type || undefined,
          visual_style: item.visual_style || undefined,
        }));

    const base = source.slice(0, 3).map((pattern, index) => ({
      title: `${pattern.content_type || 'Insight estrategico'} para ${briefing?.segment || 'sua marca'}`,
      hook: pattern.hook_formula || `O erro silencioso que trava ${briefing?.segment || 'o seu nicho'}`,
      format: index === 0 ? 'Post rapido' : 'Carrossel',
      template: index === 0 ? 'viral-hook' : 'data-insight',
      route: index === 0 ? '../generator' : '../carousel-builder',
      state: {
        topic: pattern.hook_formula || `Estrategia para ${briefing?.segment || 'crescer com conteudo'}`,
        recommendedTemplate: index === 0 ? 'viral-hook' : 'data-insight',
      },
    }));

    if (base.length === 0) {
      return [
        {
          title: `Gancho de curiosidade para ${briefing?.segment || 'o seu nicho'}`,
          hook: `O que ninguem te conta sobre ${briefing?.segment || 'conteudo de marca'}`,
          format: 'Post rapido',
          template: 'editorial-magazine',
          route: '../generator',
          state: {
            topic: `O que ninguem te conta sobre ${briefing?.segment || 'conteudo de marca'}`,
            recommendedTemplate: 'editorial-magazine',
          },
        },
        {
          title: 'Checklist educativo',
          hook: '3 sinais de que sua comunicacao esta desalinhada',
          format: 'Carrossel',
          template: 'data-insight',
          route: '../carousel-builder',
          state: {
            topic: '3 sinais de que sua comunicacao esta desalinhada',
            recommendedTemplate: 'data-insight',
          },
        },
        {
          title: 'Prova + transformacao',
          hook: 'Antes parecia certo. Depois ficou obvio.',
          format: 'Post rapido',
          template: 'clean-white',
          route: '../generator',
          state: {
            topic: 'Antes parecia certo. Depois ficou obvio.',
            recommendedTemplate: 'clean-white',
          },
        },
      ];
    }

    return base;
  }, [analyses, briefing?.segment, briefing?.viral_patterns_cache]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Dashboard"
            title={`${greeting()}, ${briefing?.company_name || workspace?.name || 'Studio'}`}
            description={
              briefing?.segment
                ? `Workspace de ${briefing.segment} com ${analyses.length} padroes virais mapeados e ${recentPosts.length} posts recentes prontos para reaproveitar.`
                : 'Estruture briefing, identidade e fontes para destravar recomendacoes de conteudo orientadas pelo workspace.'
            }
            action={
              <Button
                onClick={() => navigate('../generator')}
                className="h-11 rounded-xl px-5 text-sm font-medium text-white shadow-[var(--shadow-card)]"
                style={{ background: primaryColor }}
              >
                <Zap size={16} />
                Criar agora
              </Button>
            }
          />

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Padroes virais" value={loading ? '...' : analyses.length} icon={TrendingUp} />
            <MetricCard label="Posts recentes" value={loading ? '...' : recentPosts.length} icon={Layers} />
            <MetricCard
              label="DNA carregado"
              value={briefing?.segment ? 'OK' : 'Pendente'}
              icon={Activity}
              className={briefing?.segment ? '' : 'border-dashed'}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <SectionCard className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <AppSectionLabel>Acoes rapidas</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Fluxos mais usados
                  </h2>
                </div>
                <SubtleBadge variant="brand">Workspace ativo</SubtleBadge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => navigate(action.path, { state: action.state })}
                      className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-card)]"
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl border"
                        style={{
                          background: `${action.accent}12`,
                          borderColor: `${action.accent}24`,
                          color: action.accent,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                        {action.label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{action.description}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                        Abrir
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard className="space-y-4">
              <div>
                <AppSectionLabel>Resumo do workspace</AppSectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Pulso editorial
                </h2>
              </div>

              {briefing ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Segmento
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{briefing.segment || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Tom de voz
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                      {briefing.tone_of_voice || '-'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Proximo movimento
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Use os padroes virais do workspace para abrir um novo post ou carrossel com mais contexto de marca.
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Briefing ainda nao configurado"
                  description="Defina segmento, publico e tom de voz para o dashboard ficar realmente personalizado."
                  icon={Sparkles}
                  action={
                    <Button variant="outline" onClick={() => navigate('../briefing')} className="rounded-xl">
                      Configurar briefing
                    </Button>
                  }
                />
              )}
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <SectionCard className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <AppSectionLabel>Sugestoes inteligentes</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    O que criar agora
                  </h2>
                </div>
                <SubtleBadge variant="outline">IA orientada pelo workspace</SubtleBadge>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.title}-${index}`}
                    onClick={() => navigate(suggestion.route, { state: suggestion.state })}
                    className="flex w-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-card)] md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SubtleBadge variant="brand">{suggestion.format}</SubtleBadge>
                        <span className="text-xs font-mono text-[var(--text-muted)]">{suggestion.template}</span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                        {suggestion.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{suggestion.hook}</p>
                    </div>
                    <div className="shrink-0">
                      <Button variant="outline" className="rounded-xl">
                        Criar
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <AppSectionLabel>Biblioteca recente</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Ultimos assets
                  </h2>
                </div>
                <Button variant="ghost" className="rounded-xl" onClick={() => navigate('../library')}>
                  Ver tudo
                  <ExternalLink size={14} />
                </Button>
              </div>

              {recentPosts.length === 0 ? (
                <EmptyState
                  title="Biblioteca vazia"
                  description="Os posts criados aparecem aqui para voce reabrir, baixar ou reaproveitar."
                  icon={Layers}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {recentPosts.slice(0, 4).map((post) => {
                    const imageUrls = Array.isArray(post.image_urls) ? (post.image_urls as string[]) : [];
                    return (
                      <button
                        key={post.id}
                        onClick={() => navigate('../library')}
                        className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-left transition-colors hover:border-[var(--border-strong)]"
                      >
                        <div className="aspect-square bg-[var(--surface-3)]">
                          {imageUrls[0] ? (
                            <img src={imageUrls[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                              <Sparkles size={18} />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {post.title || 'Post sem titulo'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
