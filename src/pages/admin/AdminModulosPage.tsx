/**
 * src/pages/admin/AdminModulosPage.tsx
 * SDD-1.0 — Fase 10: Status dos módulos da plataforma e saúde operacional
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SwCard, SwBadge } from '@/components/shared/SwComponents';
import {
  Cpu, Globe, Link2, FileText, Inbox, Video, Bot,
  BarChart3, CreditCard, HeadphonesIcon, ShieldAlert, Activity
} from 'lucide-react';

interface ModuleStatus {
  name: string;
  route: string;
  icon: React.ElementType;
  tableCount: string;
  description: string;
}

const MODULES: ModuleStatus[] = [
  { name: 'Bio Links', route: 'biolinks', icon: Link2, tableCount: 'publications (biolink)', description: 'Páginas de links publicáveis com analytics' },
  { name: 'Sites', route: 'sites', icon: Globe, tableCount: 'publications (site)', description: 'Sites institucionais e landing pages' },
  { name: 'Blog', route: 'blog', icon: FileText, tableCount: 'blog_articles', description: 'Artigos e gestão editorial' },
  { name: 'News Portal', route: 'noticias', icon: Inbox, tableCount: 'rss_sources + rss_items', description: 'Curadoria RSS e feeds de notícias' },
  { name: 'Posts / Carrosséis', route: 'posts', icon: Cpu, tableCount: 'content_items (post)', description: 'Geração de posts sociais com IA' },
  { name: 'Vídeo Studio', route: 'video', icon: Video, tableCount: 'content_items (video)', description: 'Vídeos com Remotion e renderização em cloud' },
  { name: 'Agents & SimLab', route: 'agents', icon: Bot, tableCount: 'agents', description: 'Personas sintéticas para validação SimLab' },
  { name: 'CRM / Leads', route: 'crm', icon: BarChart3, tableCount: 'leads', description: 'Gestão de leads captados por publicações' },
  { name: 'Analytics', route: 'analytics', icon: Activity, tableCount: 'system_logs', description: 'Métricas e eventos de plataforma' },
  { name: 'Cobrança', route: 'cobranca', icon: CreditCard, tableCount: 'subscriptions + invoices', description: 'Assinaturas e histórico de pagamentos' },
  { name: 'Suporte', route: 'suporte', icon: HeadphonesIcon, tableCount: 'support_tickets', description: 'Tickets de suporte com SLA' },
  { name: 'Admin', route: 'admin', icon: ShieldAlert, tableCount: 'admin_api_keys + feature_flags', description: 'Gestão central da plataforma SaaS' },
];

export default function AdminModulosPage() {
  // Contar registros reais das principais tabelas para health-check
  const { data: counts } = useQuery({
    queryKey: ['admin_modules_health'],
    queryFn: async () => {
      const queries = [
        supabase.from('publications').select('id', { count: 'exact', head: true }),
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('admin_api_keys').select('id', { count: 'exact', head: true }),
        supabase.from('feature_flags').select('id', { count: 'exact', head: true }),
        supabase.from('content_templates').select('id', { count: 'exact', head: true }),
        supabase.from('system_logs').select('id', { count: 'exact', head: true }),
      ];
      const results = await Promise.all(queries);
      return {
        publications: results[0].count ?? 0,
        agents: results[1].count ?? 0,
        leads: results[2].count ?? 0,
        tickets: results[3].count ?? 0,
        subscriptions: results[4].count ?? 0,
        admin_keys: results[5].count ?? 0,
        flags: results[6].count ?? 0,
        templates: results[7].count ?? 0,
        logs: results[8].count ?? 0,
      };
    },
    staleTime: 1000 * 30,
  });

  const healthItems = [
    { label: 'Publicações', value: counts?.publications ?? '…' },
    { label: 'Agentes', value: counts?.agents ?? '…' },
    { label: 'Leads', value: counts?.leads ?? '…' },
    { label: 'Tickets', value: counts?.tickets ?? '…' },
    { label: 'Assinaturas', value: counts?.subscriptions ?? '…' },
    { label: 'Chaves IA', value: counts?.admin_keys ?? '…' },
    { label: 'Feature Flags', value: counts?.flags ?? '…' },
    { label: 'Templates', value: counts?.templates ?? '…' },
    { label: 'Logs Sistema', value: counts?.logs ?? '…' },
  ];

  return (
    <div className="p-8 space-y-10 animate-in fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Cpu className="text-[#a855f7]" size={28} /> Status dos Módulos
        </h1>
        <p className="text-stone-400">Visão operacional de todos os módulos da plataforma Simwork.</p>
      </div>

      {/* Health Dashboard */}
      <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3">
        {healthItems.map((item) => (
          <SwCard key={item.label} glass className="p-4 text-center">
            <p className="text-2xl font-black text-white">{item.value}</p>
            <p className="text-[9px] text-stone-500 uppercase tracking-widest font-bold mt-1">{item.label}</p>
          </SwCard>
        ))}
      </div>

      {/* Grid de módulos */}
      <div>
        <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Módulos SDD-1.0</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MODULES.map((mod) => (
            <SwCard key={mod.name} glass className="p-5 space-y-3 hover:border-[#a855f7]/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#a855f7]/10 rounded-xl text-[#a855f7]">
                    <mod.icon size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{mod.name}</p>
                    <p className="text-[10px] text-stone-500 font-mono">{mod.tableCount}</p>
                  </div>
                </div>
                <SwBadge variant="ghost" className="text-[9px] shrink-0">Online</SwBadge>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">{mod.description}</p>
              <div className="pt-1">
                <div className="h-1 rounded-full bg-emerald-500/20 overflow-hidden">
                  <div className="h-full w-full bg-emerald-500 rounded-full" />
                </div>
              </div>
            </SwCard>
          ))}
        </div>
      </div>

      {/* Schema canônico quick-ref */}
      <SwCard glass className="p-6 space-y-3">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Activity size={18} className="text-[#a855f7]" /> Referência Canônica
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          {[
            'workspaces', 'workspace_members', 'brand_kits', 'briefings',
            'publications', 'publication_blocks', 'blog_articles', 'content_items',
            'content_templates', 'agents', 'leads', 'system_logs',
            'admin_api_keys', 'workspace_api_keys', 'subscriptions', 'invoices',
            'support_tickets', 'ticket_messages', 'feature_flags', 'squad_nodes',
          ].map((t) => (
            <div key={t} className="bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-stone-400">
              {t}
            </div>
          ))}
        </div>
      </SwCard>
    </div>
  );
}
