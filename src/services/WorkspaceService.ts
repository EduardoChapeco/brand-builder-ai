import { fromTable } from '@/integrations/supabase/db-custom';

export interface WorkspaceStats {
  sites_count: number;
  biolinks_count: number;
  posts_count: number;
  leads_count: number;
  briefing_completeness: number;
  brandkit_ready: boolean;
}

export const WorkspaceService = {
  /**
   * Puxa um resumão de todos os módulos para o Hub/Dashboard
   */
  async getSummary(workspaceId: string): Promise<WorkspaceStats> {
    try {
      // 1. Contagem de Sites
      const { count: sc } = await fromTable('sw_sites')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // 2. Contagem de Bio Links
      const { count: blc } = await fromTable('sw_biolinks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // 3. Contagem de Leads
      const { count: lc } = await fromTable('sw_leads')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // 4. Status de Briefing
      const { data: brief } = await fromTable('sw_briefings')
        .select('completeness_score')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      // 5. Status de Brand Kit
      const { data: bk } = await fromTable('sw_brand_kits')
        .select('id')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      return {
        sites_count: sc || 0,
        biolinks_count: blc || 0,
        posts_count: 0, // Implementar quando tivermos social posts real
        leads_count: lc || 0,
        briefing_completeness: brief?.completeness_score || 0,
        brandkit_ready: !!bk
      };
    } catch (error) {
      console.error('Falha ao buscar resumo do workspace:', error);
      return {
        sites_count: 0,
        biolinks_count: 0,
        posts_count: 0,
        leads_count: 0,
        briefing_completeness: 0,
        brandkit_ready: false
      };
    }
  }
};
