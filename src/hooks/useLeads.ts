import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CRM_SERVICE } from '@/lib/crm/service';
import type { Lead, LeadStatus } from '@/types/app.types';
import { toast } from 'sonner';

export function useLeads(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  // Query: Listar Leads
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['crm_leads', workspaceId],
    queryFn: () => CRM_SERVICE.listLeads(workspaceId!),
    enabled: !!workspaceId,
  });

  // Mutation: Atualizar Status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => 
      CRM_SERVICE.updateLeadStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm_leads', workspaceId] });
      toast.success('Status do lead atualizado.');
    },
    onError: (err) => {
      console.error('[CRM] Error updating status:', err);
      toast.error('Não foi possível atualizar o status.');
    }
  });

  // Mutation: Deletar Lead
  const deleteMutation = useMutation({
    mutationFn: (id: string) => CRM_SERVICE.deleteLead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm_leads', workspaceId] });
      toast.success('Lead removido da base.');
    },
    onError: (err) => {
      console.error('[CRM] Error deleting lead:', err);
      toast.error('Não foi possível remover o lead.');
    }
  });

  return {
    leads,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    deleteLead: deleteMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
