import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowRight, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  created_at: string;
  post_count?: number;
  brand_color?: string;
}

const BRAND_COLORS = [
  '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#EC4899',
];

const WorkspacesPage = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const { data: wsData, error } = await supabase
          .from('workspaces')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch post counts and brand colors in parallel
        const enriched = await Promise.all((wsData || []).map(async (ws) => {
          const [postRes, bkRes] = await Promise.all([
            supabase.from('posts_v2').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id),
            supabase.from('brand_kits').select('color_primary').eq('workspace_id', ws.id).maybeSingle(),
          ]);
          return {
            ...ws,
            post_count: postRes.count ?? 0,
            brand_color: bkRes.data?.color_primary ?? BRAND_COLORS[0],
          };
        }));

        setWorkspaces(enriched);
      } catch (e) {
        toast.error('Erro ao carregar workspaces');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="min-h-screen flex flex-col gradient-mesh overflow-y-auto"
      style={{ background: 'var(--bg-app)', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-1)' }}>PostGen</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Gerador de Posts HTML5</p>
          </div>
        </div>
        {workspaces.length > 0 && (
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            <Plus size={16} />
            Nova Empresa
          </button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-8 pb-8">
        {isLoading ? (
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 max-w-sm text-center"
          >
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <LayoutGrid size={40} style={{ color: 'var(--text-3)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display mb-2" style={{ color: 'var(--text-1)' }}>
                Para quem você cria conteúdo?
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Cada workspace é isolado com suas próprias configurações de marca, briefing e histórico de posts.
              </p>
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}
            >
              <Plus size={18} />
              Criar Minha Primeira Empresa
            </button>
          </motion.div>
        ) : (
          /* Workspace grid */
          <div className="w-full max-w-5xl">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl font-bold font-display" style={{ color: 'var(--text-1)' }}>Seus Workspaces</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                {workspaces.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {workspaces.map((ws, idx) => {
                const color = ws.brand_color ?? BRAND_COLORS[idx % BRAND_COLORS.length];
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 12px 40px ${color}30`)}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Color top bar */}
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />

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
                      <h3 className="font-semibold text-base mb-1 truncate" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
                        {ws.name}
                      </h3>
                      <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
                        {ws.post_count} posts criados
                      </p>

                      {/* CTA */}
                      <button
                        onClick={() => navigate(`/workspace/${ws.id}/generator`)}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-all duration-150"
                        style={{ background: `${color}18`, color: color, border: `1px solid ${color}40` }}
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
