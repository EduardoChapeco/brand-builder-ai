/**
 * src/pages/AnalyticsPage.tsx
 * SDD-1.0 – SW-090 – Analytics Central com dados reais do banco
 */
import { useEffect, useState } from 'react';
import { BarChart3, Globe, MousePointerClick, TrendingUp, Link2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-logger';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SwCard, SwBadge, SwSpinner } from '@/components/shared/SwComponents';
import { ErrorBadge } from '@/components/shared/ErrorBadge';
import PageHeader from '@/components/shared/PageHeader';

interface AnalyticsSummary {
  totalEvents: number;
  pageViews: number;
  linkClicks: number;
  leadsCapturados: number;
  topBiolink: string | null;
  topSite: string | null;
}

export default function AnalyticsPage() {
  const { workspace } = useWorkspace();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!workspace?.id) return;
    setIsLoading(true);
    setErrorCode(null);
    setErrorMsg(null);

    try {
      // Carrega leads para contagem de leads capturados
      const { count: leadsCount, error: leadsErr } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id);

      if (leadsErr) throw leadsErr;

      // Carrega publicações para identificar top biolink e site
      const { data: pubs } = await supabase
        .from('publications')
        .select('id, name, type, status')
        .eq('workspace_id', workspace.id)
        .eq('status', 'published');

      const topBiolink = pubs?.find(p => p.type === 'biolink')?.name ?? null;
      const topSite = pubs?.find(p => p.type === 'site')?.name ?? null;

      setSummary({
        totalEvents: 0,
        pageViews: 0,
        linkClicks: 0,
        leadsCapturados: leadsCount ?? 0,
        topBiolink,
        topSite,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setErrorCode('ERR_ANALYTICS_LOAD_001');
      setErrorMsg(msg);
      await logError({
        code: 'ERR_ANALYTICS_LOAD_001',
        module: 'analytics',
        message: 'Falha ao carregar dados de analytics',
        detail: { error: msg },
        workspaceId: workspace?.id,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [workspace?.id]);

  const metrics = summary
    ? [
        { label: 'Eventos Rastreados', value: summary.totalEvents, icon: MousePointerClick, note: 'beacon em implantação' },
        { label: 'Page Views', value: summary.pageViews, icon: Eye, note: 'beacon em implantação' },
        { label: 'Link Clicks', value: summary.linkClicks, icon: Link2, note: 'em implantação' },
        { label: 'Leads Capturados', value: summary.leadsCapturados, icon: TrendingUp, note: 'via CRM' },
      ]
    : [];

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Analytics"
            title="Eventos, tendências e conversão"
            description="Visão consolidada por módulo com eventos rastreados por workspace e agregações diárias."
            action={<SwBadge variant="draft">Base pronta</SwBadge>}
          />

          {errorCode && (
            <ErrorBadge
              code={errorCode}
              message={errorMsg ?? 'Erro ao carregar analytics'}
              onRetry={loadAnalytics}
            />
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <SwSpinner className="w-8 h-8 text-violet-500" />
            </div>
          ) : (
            <>
              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.map((m) => (
                  <SwCard key={m.label} glass className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <m.icon size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{m.label}</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{m.value}</p>
                    <p className="text-[10px] text-zinc-600 italic">{m.note}</p>
                  </SwCard>
                ))}
              </div>

              {/* Publicações ativas */}
              {summary && (
                <SwCard glass className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 size={14} className="text-violet-400" />
                    Publicações com maior potencial de rastreamento
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Bio Link ativo</p>
                      <p className="text-sm text-white font-medium">{summary.topBiolink ?? 'Nenhum publicado'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Site publicado</p>
                      <p className="text-sm text-white font-medium">{summary.topSite ?? 'Nenhum publicado'}</p>
                    </div>
                  </div>
                </SwCard>
              )}

              {/* Status da infra */}
              <SwCard glass className="p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Globe size={14} className="text-violet-400" />
                  Infraestrutura de Analytics
                </h3>
                <div className="space-y-3 text-sm">
                  {[
                    { item: 'Tabela system_logs', status: '✅ Ativa', ok: true },
                    { item: 'RLS em todas as tabelas', status: '✅ Habilitado', ok: true },
                    { item: 'Analytics Beacon (Edge Function)', status: '🔧 Em implantação', ok: false },
                    { item: 'Agregações diárias', status: '🔧 Em implantação', ok: false },
                    { item: 'Painel por módulo', status: '🔧 Próxima fase', ok: false },
                  ].map(({ item, status, ok }) => (
                    <div key={item} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-zinc-400">{item}</span>
                      <span className={ok ? 'text-emerald-400 text-xs font-bold' : 'text-amber-400 text-xs'}>{status}</span>
                    </div>
                  ))}
                </div>
              </SwCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
