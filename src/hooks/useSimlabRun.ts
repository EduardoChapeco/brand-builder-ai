import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchSimlabStatus,
  fetchWorkspaceModulePolicies,
  fetchWorkspacePersonas,
  fetchWorkspaceSimlabRuns,
  type SimlabInsight,
  type SimlabModulePolicy,
  type SimlabPersona,
  type SimlabRun,
  type SimlabVariant,
} from "@/lib/simlab";

const ACTIVE_STATUSES = new Set<SimlabRun["status"]>(["queued", "running"]);

type UseSimlabRunState = {
  runs: SimlabRun[];
  personas: SimlabPersona[];
  policies: SimlabModulePolicy[];
  selectedRunId: string | null;
  selectedRun: SimlabRun | null;
  selectedInsight: SimlabInsight | null;
  selectedVariants: SimlabVariant[];
  isLoading: boolean;
  isRefreshing: boolean;
  isPolling: boolean;
  error: string | null;
  setSelectedRunId: (runId: string | null) => void;
  setIsPolling: (value: boolean) => void;
  refreshAll: () => Promise<void>;
  refreshSelectedRun: () => Promise<void>;
};

const mergeRun = (runs: SimlabRun[], next: SimlabRun) => {
  const existing = new Map(runs.map((run) => [run.id, run]));
  existing.set(next.id, next);
  return Array.from(existing.values()).sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || left.created_at || "") || 0;
    const rightTime = Date.parse(right.updated_at || right.created_at || "") || 0;
    return rightTime - leftTime;
  });
};

export const useSimlabRun = (workspaceId?: string | null): UseSimlabRunState => {
  const [runs, setRuns] = useState<SimlabRun[]>([]);
  const [personas, setPersonas] = useState<SimlabPersona[]>([]);
  const [policies, setPolicies] = useState<SimlabModulePolicy[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<SimlabInsight | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<SimlabVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) || null,
    [runs, selectedRunId],
  );

  const refreshSelectedRun = useCallback(async () => {
    if (!selectedRunId) {
      setSelectedInsight(null);
      setSelectedVariants([]);
      return;
    }

    try {
      const status = await fetchSimlabStatus(selectedRunId);
      setRuns((current) => mergeRun(current, status.run));
      setSelectedInsight(status.insight);
      setSelectedVariants(status.variants);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [selectedRunId]);

  const refreshAll = useCallback(async () => {
    if (!workspaceId) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const [nextRuns, nextPersonas, nextPolicies] = await Promise.all([
        fetchWorkspaceSimlabRuns(workspaceId, 30),
        fetchWorkspacePersonas(workspaceId),
        fetchWorkspaceModulePolicies(workspaceId),
      ]);

      setRuns(nextRuns);
      setPersonas(nextPersonas);
      setPolicies(nextPolicies);

      const nextSelected = selectedRunId && nextRuns.some((run) => run.id === selectedRunId)
        ? selectedRunId
        : nextRuns[0]?.id || null;
      setSelectedRunId(nextSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [selectedRunId, workspaceId]);

  useEffect(() => {
    setRuns([]);
    setPersonas([]);
    setPolicies([]);
    setSelectedRunId(null);
    setSelectedInsight(null);
    setSelectedVariants([]);
    setError(null);

    if (!workspaceId) return;
    setIsLoading(true);
    void refreshAll();
  }, [refreshAll, workspaceId]);

  useEffect(() => {
    void refreshSelectedRun();
  }, [refreshSelectedRun]);

  useEffect(() => {
    if (!workspaceId || !isPolling || !selectedRun || !ACTIVE_STATUSES.has(selectedRun.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshSelectedRun();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isPolling, refreshSelectedRun, selectedRun, workspaceId]);

  return {
    runs,
    personas,
    policies,
    selectedRunId,
    selectedRun,
    selectedInsight,
    selectedVariants,
    isLoading,
    isRefreshing,
    isPolling,
    error,
    setSelectedRunId,
    setIsPolling,
    refreshAll,
    refreshSelectedRun,
  };
};

export default useSimlabRun;
