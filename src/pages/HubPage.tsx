import { 
  Globe, 
  Link2, 
  FileText, 
  Video, 
  Bot, 
  Sparkles, 
  ArrowUpRight, 
  Settings2, 
  Palette, 
  Zap,
  LayoutGrid,
  Newspaper,
  Layout,
  Instagram,
  HelpCircle
} from 'lucide-react';
import { SwCard, SwButton, SwBadge } from '@/components/shared/SwComponents';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useEffect, useState } from 'react';
import { WorkspaceService, type WorkspaceStats } from '@/services/WorkspaceService';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import { LoggerService } from '@/services/LoggerService';
import { isWorkspaceModuleEnabled } from '@/lib/workspaceNavigation';

export default function HubPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { workspace } = useWorkspace();
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const HELP_SECTIONS = [
    { title: 'O que é o Hub?', description: 'A central de comando onde você vê todos os seus canais ativos (Sites, BioLinks, Posts).', icon: LayoutGrid },
    { title: 'Conectividade IA', description: 'Todos os módulos do Hub leem o seu Brand Kit e Briefing automaticamente.', icon: Bot },
    { title: 'Próximos Passos', description: 'Crie seu primeiro BioLink ou Site e acompanhe as métricas de conversão aqui.', icon: Sparkles }
  ];

  useEffect(() => {
    if (workspaceId) {
      LoggerService.log({
        workspaceId,
        module: 'hub',
        action: 'access',
        message: 'O usuário acessou o Command Center (Hub)',
        metadata: { workspace_name: workspace?.name }
      });
      
      WorkspaceService.getSummary(workspaceId).then(data => {
        setStats(data);
        setLoading(false);
      });
    }
  }, [workspaceId]);

  const MODULES = [
    {
      id: 'sites',
      label: 'Sites & Landing Pages',
      description: 'Editor visual para páginas institucionais de alta conversão.',
      icon: Globe,
      color: 'text-blue-400',
      tag: `Publicados: ${stats?.sites_count ?? 0}`,
      path: 'sites'
    },
    {
      id: 'biolinks',
      label: 'Bio Links & Mobile',
      description: 'Cartão de visitas digital e links rastreáveis para redes sociais.',
      icon: Link2,
      color: 'text-emerald-400',
      tag: `Ativos: ${stats?.biolinks_count ?? 0}`,
      path: 'biolinks'
    },
    {
      id: 'posts',
      label: 'Posts & Social Hub',
      description: 'Gerador de carrosséis e posts estáticos com IA Estrategista.',
      icon: Instagram,
      color: 'text-orange-400',
      tag: 'Fila: 0',
      path: 'posts'
    },
    {
      id: 'video',
      label: 'Video Studio V2',
      description: 'Editor de vídeo vertical, motion e dublagem por IA.',
      icon: Video,
      color: 'text-purple-400',
      tag: 'Projetos: 0',
      path: 'video'
    },
    {
      id: 'blog',
      label: 'Editorial & Blog',
      description: 'Gerenciamento de pautas, artigos longos e SEO do workspace.',
      icon: FileText,
      color: 'text-amber-400',
      tag: 'Artigos: 0',
      path: 'blog'
    },
    {
      id: 'agents',
      label: 'Agents & SimLab',
      description: 'Configure seus assistentes de vendas e atendimento treinados.',
      icon: Bot,
      color: 'text-sky-400',
      tag: 'Agents: 0',
      path: 'agents'
    }
  ].filter((mod) => isWorkspaceModuleEnabled(mod.path));

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Centralizada para Impacto Visual */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
           <Sparkles size={14} className="text-amber-400" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Creative Hub Simwork</span>
        </div>
        <h1 className="text-5xl font-bold text-white font-display tracking-tight leading-tight">
          O que vamos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] via-[#3b82f6] to-[#a855f7]">construir</span> hoje?
        </h1>
        <p className="text-stone-400 text-lg">
          Centralize sua operação digital. Da estratégia visual à execução multicanal em um único lugar.
        </p>
      </div>

      {/* Widgets Super-Inteligentes de Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <SwCard glass className="p-6 border-emerald-500/10 group cursor-pointer hover:border-emerald-500/30 transition-all" onClick={() => navigate(`/workspace/${workspaceId}/brand-kit`)}>
           <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                 <Palette size={24} />
              </div>
              <SwBadge variant="outline" className={stats?.brandkit_ready ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-stone-500/30 text-stone-500 bg-stone-500/5"}>
                 {stats?.brandkit_ready ? 'Estratégia Pronta' : 'Configurar Visual'}
              </SwBadge>
           </div>
           <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Visual Branding (Kit)</h3>
           <p className="text-sm text-stone-500 mb-4">Cores, fontes e padrões visuais sincronizados.</p>
           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full bg-emerald-500 transition-all duration-1000 ${stats?.brandkit_ready ? 'w-full' : 'w-0'}`} />
           </div>
        </SwCard>

        <SwCard glass className="p-6 border-blue-500/10 group cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => navigate(`/workspace/${workspaceId}/briefing`)}>
           <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                 <Zap size={24} />
              </div>
              <SwBadge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/5">
                 DNA: {stats?.briefing_completeness ?? 0}%
              </SwBadge>
           </div>
           <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">DNA Estratégico (Briefing)</h3>
           <p className="text-sm text-stone-500 mb-4">A voz e a inteligência textual da sua marca.</p>
           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stats?.briefing_completeness ?? 0}%` }} />
           </div>
        </SwCard>
      </div>

      {/* Grid de módulos Operacionais */}
      <div className="space-y-6 max-w-6xl mx-auto pt-8">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <LayoutGrid size={20} className="text-stone-500" /> Canais Operacionais
           </h2>
           <div className="flex gap-4">
             <SwButton variant="ghost" className="text-stone-500 hover:text-white" onClick={() => setIsHelpOpen(true)}>
                <HelpCircle size={16} /> Guia do Hub
             </SwButton>
             <SwButton variant="ghost" className="text-stone-500 hover:text-white" onClick={() => navigate(`/workspace/${workspaceId}/config`)}>
                <Settings2 size={16} /> Configurar Hub
             </SwButton>
           </div>
        </div>

        <SwHelpSheet 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
          moduleName="HUB SIMWORK" 
          sections={HELP_SECTIONS} 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {MODULES.map((mod) => (
             <SwCard 
               key={mod.id} 
               glass 
               className="p-8 group cursor-pointer hover:border-white/20 transition-all hover:translate-y-[-4px] active:translate-y-0"
               onClick={() => navigate(`/workspace/${workspaceId}/${mod.path}`)}
             >
                <div className="flex items-center gap-4 mb-6">
                   <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-white/20 transition-all ${mod.color}`}>
                      <mod.icon size={26} />
                   </div>
                   <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-[#3b82f6] transition-colors">{mod.label}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#777]">{mod.tag}</p>
                   </div>
                   <ArrowUpRight size={18} className="text-stone-600 group-hover:text-white group-hover:translate-x-1 group-hover:translate-y-[-1px] transition-all" />
                </div>
                <p className="text-sm text-stone-500 leading-relaxed group-hover:text-stone-400 transition-colors">
                   {mod.description}
                </p>
             </SwCard>
           ))}
        </div>
      </div>

      {/* Footer de Suporte Rápido */}
      <div className="max-w-6xl mx-auto pt-16 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 text-stone-500 text-xs hover:text-white transition-colors cursor-pointer" onClick={() => navigate(`/workspace/${workspaceId}/ajuda`)}>
              <FileText size={14} /> Knowledge Base
           </div>
           {isWorkspaceModuleEnabled('noticias') ? (
             <div className="flex items-center gap-2 text-stone-500 text-xs hover:text-white transition-colors cursor-pointer" onClick={() => navigate(`/workspace/${workspaceId}/noticias`)}>
                <Newspaper size={14} /> Feed de Atualizações
             </div>
           ) : null}
        </div>
        <p className="text-[10px] font-mono text-stone-600 uppercase tracking-widest">
           Simwork Engine v1.0 · Workspace: {workspace?.name || 'Local'}
        </p>
      </div>

    </div>
  );
}
