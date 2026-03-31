import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Activity, CameraIcon, ChevronRight, ExternalLink, Layers,
  MonitorSmartphone, Sparkles, TrendingUp, Wand2, Zap
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type ViralAnalysis = Tables<'viral_analyses'>;
type Post = Tables<'posts_v2'>;

const quickActions = [
  {
    id: 'generator',
    label: 'Post Rápido',
    description: 'Hook viral + template recomendado pela IA',
    icon: Wand2,
    path: '../generator',
    color: '#9353FF',
    state: { funnel: 'Awareness' },
  },
  {
    id: 'carousel',
    label: 'Carrossel Educativo',
    description: 'Storyboard para máxima retenção e compartilhamento',
    icon: Layers,
    path: '../carousel-builder',
    color: '#0EA5E9',
    state: { funnel: 'Educativo' },
  },
  {
    id: 'product',
    label: 'Foto de Produto',
    description: 'Prompt + geração visual com IA para e-commerce',
    icon: CameraIcon,
    path: '../product-shots',
    color: '#F59E0B',
  },
  {
    id: 'feed',
    label: 'Feed Preview',
    description: 'Visualize seus posts como no Instagram real',
    icon: MonitorSmartphone,
    path: '../feed-preview',
    color: '#10B981',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { workspace, briefing, brandKit } = useWorkspace();
  const [analyses, setAnalyses] = useState<ViralAnalysis[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const primaryColor = brandKit?.color_primary || '#9353FF';

  useEffect(() => {
    if (!workspace?.id) return;
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const [{ data: analysisRows }, { data: postRows }] = await Promise.all([
        supabase.from('viral_analyses').select('*').eq('workspace_id', workspace.id).order('analyzed_at', { ascending: false }).limit(6),
        supabase.from('posts_v2').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(6),
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
      title: `${pattern.content_type || 'Strategic insight'} para ${briefing?.segment || 'sua marca'}`,
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="page-layout">
      {/* Hero */}
      <div className="page-hero gradient-mesh">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="page-hero-eyebrow">Dashboard</p>
            <h1 className="page-hero-title">
              {greeting()}, {briefing?.company_name || workspace?.name || 'Studio'} 👋
            </h1>
            <p className="page-hero-description">
              {briefing?.segment
                ? `Workspace de ${briefing.segment} — ${analyses.length} padrões virais capturados, ${recentPosts.length} posts criados.`
                : 'Configure o briefing para desbloquear sugestões personalizadas de conteúdo.'
              }
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => navigate('../generator')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ background: primaryColor, color: '#fff', boxShadow: `0 8px 24px ${primaryColor}40` }}
            >
              <Zap size={16} />
              Criar agora
            </button>
          </div>
        </div>
      </div>

      <div className="page-content no-scrollbar">
        <motion.div
          className="page-inner space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Quick Actions */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                Ações Rápidas
              </h2>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => navigate(action.path, { state: action.state })}
                    className="glass-card glass-card-hover rounded-3xl p-6 text-left group"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                      style={{ background: `${action.color}18`, border: `1px solid ${action.color}30` }}
                    >
                      <Icon size={22} style={{ color: action.color }} />
                    </div>
                    <h3 className="font-display font-bold text-base mb-2" style={{ color: 'var(--text-1)' }}>
                      {action.label}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
                      {action.description}
                    </p>
                    <div className="mt-4 flex items-center gap-1" style={{ color: action.color }}>
                      <span className="text-xs font-semibold">Abrir</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* 2-col layout */}
          <motion.section variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
            {/* AI Suggestions */}
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-muted)' }}>
                  <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
                    Sugestões Inteligentes
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Baseado no briefing e nos padrões virais do workspace
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="badge badge-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    IA ativa
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={`${suggestion.title}-${index}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className="rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 group cursor-pointer transition-all"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={() => navigate(suggestion.route, { state: suggestion.state })}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-primary text-[10px]">{suggestion.format}</span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-4)' }}>
                          {suggestion.template}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>
                        {suggestion.title}
                      </h4>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>
                        {suggestion.hook}
                      </p>
                    </div>
                    <button
                      className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                      style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid rgba(147,83,255,0.2)' }}
                    >
                      Criar <ChevronRight size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Workspace Pulse */}
            <div className="flex flex-col gap-4">
              <div className="glass-card rounded-3xl p-6 flex-1">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                    <Activity size={18} style={{ color: '#10B981' }} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
                      Pulso do Workspace
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Métricas em tempo real</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Padrões Virais', value: loading ? '—' : String(analyses.length), color: '#9353FF', icon: TrendingUp },
                    { label: 'Posts Criados', value: loading ? '—' : String(recentPosts.length), color: '#0EA5E9', icon: Layers },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="metric-card"
                        style={{ border: `1px solid ${stat.color}20` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="metric-label">{stat.label}</p>
                          <Icon size={14} style={{ color: stat.color }} />
                        </div>
                        <p className="metric-value" style={{ color: stat.color, fontSize: '2rem' }}>
                          {stat.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--text-3)' }}>
                    Brand DNA
                  </p>
                  {briefing ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Segmento</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          {briefing.segment || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Tom de Voz</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          {briefing.tone_of_voice || '—'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                        Configure o briefing para desbloquear sugestões personalizadas
                      </p>
                      <button
                        onClick={() => navigate('../briefing')}
                        className="mt-3 flex items-center gap-2 text-xs font-semibold"
                        style={{ color: 'var(--primary)' }}
                      >
                        Configurar briefing <ExternalLink size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent posts */}
              {recentPosts.length > 0 && (
                <div className="glass-card rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                      Posts Recentes
                    </h4>
                    <button
                      onClick={() => navigate('../library')}
                      className="text-xs font-semibold flex items-center gap-1"
                      style={{ color: 'var(--primary)' }}
                    >
                      Ver todos <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {recentPosts.slice(0, 4).map(post => {
                      const imageUrls = Array.isArray(post.image_urls) ? post.image_urls as string[] : [];
                      return (
                        <div
                          key={post.id}
                          className="shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105"
                          style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                          onClick={() => navigate('../library')}
                        >
                          {imageUrls[0] ? (
                            <img src={imageUrls[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Sparkles size={16} style={{ color: 'var(--text-4)' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
