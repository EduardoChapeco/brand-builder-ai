import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, ExternalLink, Layers, Sparkles,
  TrendingUp, Wand2, Zap, Link2, Bot, BarChart2, Globe,
  Video, Palette, PenTool, Rss, ChevronRight, Loader2
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type ViralAnalysis = Tables<'viral_analyses'>;
type Post = Tables<'posts_v2'>;

// ── Quick Action definitions ───────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: 'generator',
    label: 'Post Generator',
    description: 'Hook viral com identidade da marca. IA orienta template.',
    icon: Wand2,
    path: '../generator',
    state: { funnel: 'Awareness' },
    accent: '#3b82f6',
    tag: 'POST',
  },
  {
    id: 'carousel',
    label: 'Carrossel Educativo',
    description: 'Storyboard inteligente para reter e converter.',
    icon: Layers,
    path: '../carousel-builder',
    state: { funnel: 'Educativo' },
    accent: '#10b981',
    tag: 'SLIDES',
  },
  {
    id: 'biolink',
    label: 'BioLink Engine',
    description: 'Hub central da marca com preview ao vivo.',
    icon: Link2,
    path: '../biolink',
    accent: '#a855f7',
    tag: 'LINK',
  },
  {
    id: 'simlab',
    label: 'SimLab IA',
    description: 'Valide conteúdo com personas antes de publicar.',
    icon: Bot,
    path: '../simlab',
    accent: '#f59e0b',
    tag: 'AUDIT',
  },
  {
    id: 'video',
    label: 'Video Studio',
    description: 'Crie Reels e Stories com IA e templates Remotion.',
    icon: Video,
    path: '../video-studio',
    accent: '#ec4899',
    tag: 'VIDEO',
  },
  {
    id: 'brandkit',
    label: 'Brand Kit',
    description: 'Paleta, tipografia e assets visuais centralizados.',
    icon: Palette,
    path: '../brand-kit',
    accent: '#14b8a6',
    tag: 'BRAND',
  },
  {
    id: 'site',
    label: 'Site Builder',
    description: 'Editor de landing pages e sites institucionais.',
    icon: Globe,
    path: '../site-builder',
    accent: '#6366f1',
    tag: 'SITE',
  },
  {
    id: 'news',
    label: 'News Portal',
    description: 'RSS inteligente para conteúdo de nicho automatizado.',
    icon: Rss,
    path: '../news-portal',
    accent: '#ef4444',
    tag: 'RSS',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { workspace, briefing, brandKit } = useWorkspace();
  const [analyses, setAnalyses] = useState<ViralAnalysis[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const primaryColor = brandKit?.color_primary || '#3b82f6';

  useEffect(() => {
    if (!workspace?.id) return;
    let mounted = true;
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
          .limit(8),
      ]);
      if (!mounted) return;
      setAnalyses((analysisRows || []) as ViralAnalysis[]);
      setRecentPosts((postRows || []) as Post[]);
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [workspace?.id]);

  const suggestions = useMemo(() => {
    const patterns = Array.isArray(
      (briefing?.viral_patterns_cache as { recent_patterns?: unknown[] } | null)?.recent_patterns
    )
      ? (briefing!.viral_patterns_cache as { recent_patterns: Array<{ hook_formula?: string; content_type?: string; visual_style?: string }> }).recent_patterns
      : [];

    const source = patterns.length > 0
      ? patterns
      : analyses.map((a) => ({ hook_formula: a.hook_formula || undefined, content_type: a.content_type || undefined, visual_style: a.visual_style || undefined }));

    if (source.length === 0) {
      return [
        { title: `Gancho de curiosidade para ${briefing?.segment || 'o seu nicho'}`, hook: `O que ninguém te conta sobre ${briefing?.segment || 'conteúdo de marca'}`, format: 'Post rápido', route: '../generator', state: { topic: `gancho ${briefing?.segment || ''}`, recommendedTemplate: 'editorial-magazine' } },
        { title: 'Checklist educativo de autoridade', hook: '3 sinais de que sua comunicação está desalinhada', format: 'Carrossel', route: '../carousel-builder', state: { topic: '3 sinais comunicação desalinhada', recommendedTemplate: 'data-insight' } },
        { title: 'Antes vs Depois — Prova Social', hook: 'Antes parecia certo. Depois ficou óbvio.', format: 'Post rápido', route: '../generator', state: { topic: 'antes e depois transformação', recommendedTemplate: 'clean-white' } },
      ];
    }

    return source.slice(0, 3).map((p, i) => ({
      title: `${p.content_type || 'Insight'} para ${briefing?.segment || 'sua marca'}`,
      hook: p.hook_formula || `Estratégia para ${briefing?.segment || 'crescer'}`,
      format: i === 0 ? 'Post rápido' : 'Carrossel',
      route: i === 0 ? '../generator' : '../carousel-builder',
      state: { topic: p.hook_formula || '', recommendedTemplate: i === 0 ? 'viral-hook' : 'data-insight' },
    }));
  }, [analyses, briefing]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const completenessScore = useMemo(() => {
    let score = 0;
    if (briefing?.company_name) score += 20;
    if (briefing?.segment) score += 20;
    if (briefing?.tone_of_voice) score += 20;
    if (briefing?.target_audience) score += 20;
    if (brandKit?.color_primary) score += 20;
    return score;
  }, [briefing, brandKit]);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">

      {/* Hero / Topbar */}
      <div className="relative border-b border-[#1f1f1f] overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: primaryColor, filter: 'blur(100px)' }} />
        <div className="absolute -top-32 right-0 w-64 h-64 rounded-full opacity-5 pointer-events-none" style={{ background: '#a855f7', filter: 'blur(80px)' }} />

        <div className="relative z-10 px-8 py-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-2">
              {greeting()}, {workspace?.name || 'Workspace'} ·&nbsp;
              <span style={{ color: primaryColor }}>Dashboard Central</span>
            </p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-stone-400 bg-clip-text text-transparent">
              {briefing?.company_name || workspace?.name || 'Cerebro Studio'}
            </h1>
            {briefing?.segment && (
              <p className="text-sm text-stone-400 mt-2">{briefing.segment} · {analyses.length} padrões virais · {recentPosts.length} posts na biblioteca</p>
            )}
          </div>

          <button
            onClick={() => navigate('../generator')}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}90)`, boxShadow: `0 8px 32px ${primaryColor}40` }}
          >
            <Zap size={16}/> Criar Agora
          </button>
        </div>

        {/* Brand Score Bar */}
        <div className="relative z-10 px-8 pb-6">
          <div className="flex items-center gap-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 whitespace-nowrap">Completeness Score</p>
            <div className="flex-1 h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden max-w-xs">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completenessScore}%`, background: `linear-gradient(90deg, ${primaryColor}, #a855f7)` }} />
            </div>
            <span className="text-xs font-bold font-mono" style={{ color: primaryColor }}>{completenessScore}%</span>
            {completenessScore < 100 && (
              <button onClick={() => navigate('../briefing')} className="text-[10px] text-stone-500 hover:text-white border border-[#333] px-3 py-1 rounded-full transition-all hover:bg-white/5">
                Completar →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-10 max-w-[1600px] mx-auto w-full">

        {/* KPI Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Padrões Virais', value: loading ? '…' : analyses.length, icon: TrendingUp, color: '#3b82f6', desc: 'Mapeados pelo Viral Analyzer' },
            { label: 'Posts Criados', value: loading ? '…' : recentPosts.length, icon: PenTool, color: '#a855f7', desc: 'Biblioteca de conteúdo ativo' },
            { label: 'Identidade da Marca', value: briefing?.segment ? 'Ativa' : 'Pendente', icon: Activity, color: briefing?.segment ? '#10b981' : '#f59e0b', desc: briefing?.segment ? `Segmento: ${briefing.segment}` : 'Configure o Briefing para ativar' },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6 group hover:border-[#333] transition-all">
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 pointer-events-none" style={{ background: card.color, filter: 'blur(24px)' }} />
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{card.label}</p>
                <div className="p-2 rounded-xl" style={{ background: card.color + '20' }}>
                  <card.icon size={14} style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-3xl font-light font-mono text-white">{card.value}</p>
              <p className="text-[11px] text-stone-500 mt-2">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">Acesso Rápido</p>
              <h2 className="text-xl font-semibold text-white">Módulos da Plataforma</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => navigate(action.path, action.state ? { state: action.state } : undefined)}
                className="group relative overflow-hidden text-left p-5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[24px] hover:border-[#333] hover:bg-[#111] transition-all"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-0 group-hover:opacity-10 transition-opacity" style={{ background: action.accent, filter: 'blur(20px)' }} />
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl" style={{ background: action.accent + '15', border: `1px solid ${action.accent}20` }}>
                    <action.icon size={16} style={{ color: action.accent }} />
                  </div>
                  <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full border" style={{ color: action.accent, borderColor: action.accent + '30', background: action.accent + '10' }}>
                    {action.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{action.label}</h3>
                <p className="text-[11px] text-stone-500 leading-relaxed">{action.description}</p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: action.accent }}>
                  Acessar <ChevronRight size={12}/>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Suggestions + Recent Library */}
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6">

          {/* AI Content Suggestions */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">IA orientada pelo Briefing</p>
                <h2 className="text-lg font-semibold text-white">O Que Criar Agora</h2>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#222] rounded-full text-[10px] font-bold text-[#a855f7]">
                <Sparkles size={10}/> IA Ativa
              </div>
            </div>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => navigate(s.route, { state: s.state })}
                  className="w-full text-left group flex items-start justify-between gap-4 p-4 bg-[#111] border border-[#1f1f1f] hover:border-[#333] hover:bg-[#161616] rounded-[20px] transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20">{s.format.toUpperCase()}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 truncate">{s.title}</h3>
                    <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">{s.hook}</p>
                  </div>
                  <div className="shrink-0 mt-1 p-2 border border-[#333] text-stone-500 group-hover:text-white group-hover:border-[#555] rounded-xl transition-all">
                    <ArrowRight size={14}/>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Library */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">Biblioteca Recente</p>
                <h2 className="text-lg font-semibold text-white">Últimos Assets</h2>
              </div>
              <button onClick={() => navigate('../library')} className="text-xs text-stone-400 hover:text-white flex items-center gap-1 transition-colors">
                Ver tudo <ExternalLink size={12}/>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-stone-600"/></div>
            ) : recentPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full border border-dashed border-[#333] flex items-center justify-center mb-3">
                  <Sparkles size={18} className="text-stone-600"/>
                </div>
                <p className="text-xs text-stone-500">Nenhum post ainda. Use o Gerador para criar o primeiro!</p>
                <button onClick={() => navigate('../generator')} className="mt-4 text-xs font-bold text-[#3b82f6] hover:text-white transition-colors">
                  → Ir ao Gerador
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {recentPosts.slice(0, 6).map((post) => {
                  const imageUrls = Array.isArray(post.image_urls) ? (post.image_urls as string[]) : [];
                  return (
                    <button key={post.id} onClick={() => navigate('../library')} className="group overflow-hidden rounded-[16px] border border-[#1f1f1f] hover:border-[#333] bg-[#111] text-left transition-all">
                      <div className="aspect-square overflow-hidden bg-[#1a1a1a]">
                        {imageUrls[0] ? (
                          <img src={imageUrls[0]} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-stone-700">
                            <BarChart2 size={20}/>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[11px] font-medium text-stone-300">{post.title || 'Post sem título'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
