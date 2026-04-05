import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowRight, LayoutGrid, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fromTable } from '@/integrations/supabase/db-custom';
import { supabase } from '@/integrations/supabase/client';

interface SwWorkspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  brand_color?: string;
}

const BRAND_COLORS = [
  '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#EC4899',
];

const WorkspacesPage = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<SwWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth/login', { replace: true });
          return;
        }

        // 1. Buscar memberships do usuário
        const { data: memberships, error: mErr } = await fromTable('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id);

        if (mErr) throw mErr;
        if (!memberships || memberships.length === 0) {
          setWorkspaces([]);
          return;
        }

        const wsIds = memberships.map((m: { workspace_id: string }) => m.workspace_id);

        // 2. Buscar workspaces + brand kits em paralelo
        const [wsRes, bkRes] = await Promise.all([
          fromTable('workspaces')
            .select('id,name,slug,logo_url,created_at')
            .in('id', wsIds)
            .order('created_at', { ascending: false }),
          fromTable('brand_kits')
            .select('workspace_id,colors')
            .in('workspace_id', wsIds),
        ]);

        if (wsRes.error) throw wsRes.error;

        // Mapeia brand color por workspace
        const colorMap: Record<string, string> = {};
        if (bkRes.data) {
          for (const bk of bkRes.data as Array<{ workspace_id: string; colors: { primary?: string } }>) {
            colorMap[bk.workspace_id] = bk.colors?.primary ?? BRAND_COLORS[0];
          }
        }

        const enriched: SwWorkspace[] = (wsRes.data ?? []).map((ws: SwWorkspace) => ({
          ...ws,
          brand_color: colorMap[ws.id] ?? BRAND_COLORS[0],
        }));

        setWorkspaces(enriched);
      } catch (e: any) {
        console.error(e);
        toast.error('Erro ao carregar workspaces Simwork');
        const errMessage = e?.message || e?.details || JSON.stringify(e);
        await fromTable('system_logs').insert({
          level: 'error',
          code: e?.code || 'ERR_WORKSPACES_PAGE',
          module: 'workspace',
          message: 'Falha ao carregar lista de workspaces',
          detail: { error: errMessage }
        });
      } finally {
        setIsLoading(false);
      }
    };
    void fetchWorkspaces();
  }, [navigate]);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="min-h-screen flex flex-col overflow-y-auto"
      style={{ background: '#07070F', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#7C3AED]">
            <span className="text-white font-black text-sm tracking-tight">S</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-display tracking-tight">Simwork</h1>
            <p className="text-[11px] text-white/40">Plataforma de Criação</p>
          </div>
        </div>
        {workspaces.length > 0 && (
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-all duration-150"
          >
            <Plus size={16} />
            Novo Workspace
          </button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-8 pb-8 pt-12">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-white/40">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Carregando workspaces...</p>
          </div>
        ) : workspaces.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 max-w-sm text-center"
          >
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white/5 border border-white/10">
              <LayoutGrid size={40} className="text-white/30" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display mb-2 text-white">
                Para quem você cria conteúdo?
              </h2>
              <p className="text-sm leading-relaxed text-white/50">
                Cada workspace é isolado com suas próprias configurações de marca, briefing e histórico de conteúdo.
              </p>
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(124,58,237,0.35)]"
            >
              <Plus size={18} />
              Criar Meu Primeiro Workspace
            </button>
          </motion.div>
        ) : (
          /* Workspace grid */
          <div className="w-full max-w-5xl">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl font-bold font-display text-white">Seus Workspaces</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#7C3AED]/20 text-[#a78bfa]">
                {workspaces.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((ws, idx) => {
                const color = ws.brand_color ?? BRAND_COLORS[idx % BRAND_COLORS.length];
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 bg-white/[0.03] border border-white/[0.07]"
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 12px 40px ${color}30`)}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Color top bar */}
                    <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }} />

                    <div className="p-5">
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white mb-4"
                        style={{ background: color }}
                      >
                        {ws.logo_url ? (
                          <img src={ws.logo_url} alt={ws.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : getInitials(ws.name)}
                      </div>

                      {/* Info */}
                      <h3 className="font-semibold text-base mb-1 truncate text-white font-display">
                        {ws.name}
                      </h3>
                      <p className="text-xs mb-4 text-white/40 font-mono">
                        /{ws.slug}
                      </p>

                      {/* CTA */}
                      <button
                        onClick={() => navigate(`/workspace/${ws.id}/painel`)}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-all duration-150"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
                        onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.color = color; }}
                      >
                        Entrar <ArrowRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspacesPage;
