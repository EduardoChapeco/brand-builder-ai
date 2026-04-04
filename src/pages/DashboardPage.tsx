import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bot, Globe, Link2, Sparkles, Video } from 'lucide-react';
import MetricCard from '@/components/shared/MetricCard';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SwStatusBadge from '@/components/shared/SwStatusBadge';
import { SwCard } from '@/components/shared/SwComponents';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fromTable } from '@/integrations/supabase/db-custom';

type DashboardCounts = {
  sites: number;
  biolinks: number;
  posts: number;
  videos: number;
  agents: number;
};

const INITIAL_COUNTS: DashboardCounts = {
  sites: 0,
  biolinks: 0,
  posts: 0,
  videos: 0,
  agents: 0,
};

const countTable = async (table: string, workspaceId: string, filterColumn?: string, filterValue?: string) => {
  let query = fromTable(table)
    .select('id', { head: true, count: 'exact' })
    .eq('workspace_id', workspaceId);
  if (filterColumn && filterValue) {
    query = query.eq(filterColumn, filterValue);
  }
  const response = await query;

  if (response.error?.code === '42P01') return 0;
  if (response.error) throw response.error;
  return response.count ?? 0;
};

export default function DashboardPage() {
  const { workspace, brandKit, briefing, role } = useWorkspace();
  const [counts, setCounts] = useState<DashboardCounts>(INITIAL_COUNTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workspace?.id) return;

    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [sites, biolinks, posts, videos, agents] = await Promise.all([
          countTable('publications', workspace.id, 'type', 'site'),
          countTable('publications', workspace.id, 'type', 'biolink'),
          countTable('content_items', workspace.id, 'type', 'post'),
          countTable('content_items', workspace.id, 'type', 'video'),
          countTable('agents', workspace.id),
        ]);

        if (!active) return;
        setCounts({ sites, biolinks, posts, videos, agents });
      } catch (error) {
        console.error(error);
        if (!active) return;
        setCounts(INITIAL_COUNTS);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [workspace?.id]);

  const completenessScore = useMemo(() => {
    let score = 0;
    if (brandKit?.brand_name || briefing?.content?.company_name) score += 20;
    if (brandKit?.colors?.primary) score += 20;
    if (brandKit?.fonts?.heading) score += 15;
    if (briefing?.content?.segment) score += 15;
    if (briefing?.content?.target_audience) score += 15;
    if (briefing?.content?.brand_dna) score += 15;
    return score;
  }, [brandKit, briefing]);

  const priorities = [
    counts.sites === 0 ? 'Criar o primeiro site do workspace em publicações.' : null,
    counts.biolinks === 0 ? 'Publicar um Bio Link com blocos rastreáveis e tema do workspace.' : null,
    completenessScore < 70 ? 'Completar Brand Kit e Briefing para destravar geração contextual real.' : null,
    counts.posts === 0 ? 'Ativar o módulo de Posts.' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Painel"
            title={workspace?.name || 'Simwork'}
            description="Visão operacional do workspace, com progresso de configuração e status da camada Simwork."
            action={<SwStatusBadge variant="brand">{role ? `Perfil ${role}` : 'Sem perfil'}</SwStatusBadge>}
          />

          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Sites" value={isLoading ? '...' : counts.sites} icon={Globe} />
            <MetricCard label="Bio Links" value={isLoading ? '...' : counts.biolinks} icon={Link2} />
            <MetricCard label="Posts" value={isLoading ? '...' : counts.posts} icon={Sparkles} />
            <MetricCard label="Vídeos" value={isLoading ? '...' : counts.videos} icon={Video} />
            <MetricCard label="Agents" value={isLoading ? '...' : counts.agents} icon={Bot} />
            <MetricCard label="Contexto" value={`${completenessScore}%`} icon={BarChart3} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <SectionCard className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Estado do workspace</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Base Simwork do workspace</h2>
              </div>

              <div className="space-y-3">
                <SwCard elevated className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Brand Kit</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {brandKit
                      ? 'Configurado em brand_kits e pronto para ser consumido por Sites, Bio Links e Posts.'
                      : 'Ainda não há Brand Kit migrado para o schema Simwork neste ambiente.'}
                  </p>
                </SwCard>
                <SwCard elevated className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Briefing</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {briefing
                      ? `Status atual: ${(briefing as any).status || 'ativo'}. Score de completude: ${(briefing as any).completeness_score || 0}%.`
                      : 'O briefing principal ainda não foi encontrado em briefings.'}
                  </p>
                </SwCard>
                <SwCard elevated className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Workspace</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Fuso: {(workspace as any)?.timezone || 'America/Sao_Paulo'} · Idioma: {(workspace as any)?.locale || 'pt-BR'}
                  </p>
                </SwCard>
              </div>
            </SectionCard>

            <SectionCard className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Próximas ações</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Prioridades desta tranche</h2>
              </div>
              <div className="space-y-3">
                {priorities.length > 0 ? (
                  priorities.map((priority) => (
                    <SwCard
                      key={priority}
                      elevated
                      className="px-4 py-3 text-sm text-[var(--text-secondary)]"
                    >
                      {priority}
                    </SwCard>
                  ))
                ) : (
                  <SwCard elevated className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    O workspace já tem os blocos mínimos configurados. O próximo foco é aprofundar os fluxos de criação e publicação.
                  </SwCard>
                )}
              </div>
            </SectionCard>
          </section>
        </div>
      </div>
    </div>
  );
}
