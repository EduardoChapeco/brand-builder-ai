import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SIMLAB_SERVICE } from '@/lib/simlab/service';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useSimLab() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const runsQuery = useQuery({
    queryKey: ['simlab-runs', workspace?.id],
    enabled: !!workspace?.id,
    queryFn: () => SIMLAB_SERVICE.listRuns(workspace!.id),
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ runId, verdict, notes }: { runId: string, verdict: 'approved' | 'revise' | 'blocked', notes?: string }) => 
      SIMLAB_SERVICE.submitFeedback(runId, verdict, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['simlab-runs'] });
      queryClient.invalidateQueries({ queryKey: ['simlab-run-detail', variables.runId] });
    }
  });

  return {
    runs: runsQuery.data || [],
    isLoading: runsQuery.isLoading,
    feedbackMutation
  };
}

export function useSimLabRun(runId: string | null) {
  return useQuery({
    queryKey: ['simlab-run-detail', runId],
    enabled: !!runId,
    queryFn: () => SIMLAB_SERVICE.getRunDetails(runId!),
  });
}

