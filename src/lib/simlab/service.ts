import { supabase } from '../supabase';
import { toRun, toVariant, toInsight } from '@/lib/simlab';
import type { SimlabRun, SimlabStatusPayload } from '@/lib/simlab';

export const SIMLAB_SERVICE = {
  /**
   * Lista todas as execuções de SimLab do workspace
   */
  async listRuns(workspaceId: string, limit = 50) {
    const { data, error } = await supabase.functions.invoke('simlab-status', {
      body: { workspace_id: workspaceId, limit }
    });
    
    if (error) throw error;
    const payload = (data || {}) as { runs?: unknown[] };
    return (payload.runs || []).map(toRun);
  },

  /**
   * Obtém detalhes completos de uma execução (Run + Variants + Insight)
   */
  async getRunDetails(runId: string) {
    const { data, error } = await supabase.functions.invoke('simlab-status', {
      body: { run_id: runId }
    });
    
    if (error) throw error;
    const payload = (data || {}) as { run?: unknown; variants?: unknown[]; insight?: unknown };
    
    return {
      run: toRun(payload.run),
      variants: (payload.variants || []).map(toVariant),
      insight: toInsight(payload.insight)
    } as SimlabStatusPayload;
  },


  /**
   * Salva um feedback manual sobre o veredito do SimLab
   */
  async submitFeedback(runId: string, verdict: 'approved' | 'revise' | 'blocked', notes?: string) {
    const { data, error } = await supabase.functions.invoke('simlab-feedback', {
      body: { run_id: runId, verdict, notes }
    });
    
    if (error) throw error;
    return data;
  }
};
