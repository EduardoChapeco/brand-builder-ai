import { supabase } from '../supabase';
import type { Lead, LeadStatus } from '@/types/app.types';

export const CRM_SERVICE = {
  /**
   * Lista todos os leads de um workspace
   */
  async listLeads(workspaceId: string) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Lead[];
  },

  /**
   * Atualiza o status de um lead
   */
  async updateLeadStatus(id: string, status: LeadStatus) {
    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Remove um lead (exclusão lógica ou física dependendo da política, aqui física por padrão)
   */
  async deleteLead(id: string) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Adiciona um novo lead manualmente
   */
  async createLead(lead: Partial<Lead>) {
    if (!lead.workspace_id || !lead.email) throw new Error('Workspace ID e Email são obrigatórios.');

    const { data, error } = await supabase
      .from('leads')
      .insert({
        workspace_id: lead.workspace_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status || 'new',
        tags: lead.tags || [],
        notes: lead.notes,
        metadata: lead.metadata || {},
        utm: lead.utm || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  }
};
