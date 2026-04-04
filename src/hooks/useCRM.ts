import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CRM_SERVICE } from '@/lib/crm/service';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Lead, LeadStatus } from '@/types/app.types';
import { toast } from 'sonner';

export function useCRM() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ['crm-leads', workspace?.id],
    enabled: !!workspace?.id,
    queryFn: () => CRM_SERVICE.listLeads(workspace!.id),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: LeadStatus }) => 
      CRM_SERVICE.updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Status do lead atualizado.');
    },
    onError: () => {
      toast.error('Erro ao atualizar status do lead.');
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => CRM_SERVICE.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead removido com sucesso.');
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: (lead: Partial<Lead>) => CRM_SERVICE.createLead({ ...lead, workspace_id: workspace?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead adicionado manualmente.');
    }
  });

  return {
    leads: leadsQuery.data || [],
    isLoading: leadsQuery.isLoading,
    updateStatus: updateStatusMutation.mutate,
    deleteLead: deleteLeadMutation.mutate,
    createLead: createLeadMutation.mutate,
    isUpdating: updateStatusMutation.isPending || deleteLeadMutation.isPending || createLeadMutation.isPending
  };
}
