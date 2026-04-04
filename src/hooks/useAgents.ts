/**
 * SW-040: useAgents — Hook canônico para Agentes
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import type { SwAgent } from '@/types/database';

interface UseAgentsReturn {
  agents: SwAgent[];
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  reload: () => void;
  createAgent: (data: Partial<SwAgent>) => Promise<SwAgent | null>;
  updateAgent: (id: string, data: Partial<SwAgent>) => Promise<boolean>;
}

export function useAgents(workspaceId: string | null): UseAgentsReturn {
  const [agents, setAgents] = useState<SwAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: dbErr } = await supabase
        .from('sw_agents')
        .select('id, workspace_id, name, type, status, avatar_url, identity, voice, memory, behavior, tools, integrations, created_by, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;
      setAgents(data as SwAgent[] ?? []);
    } catch (err) {
      const code = 'ERR_AGENT_LOAD_001';
      const message = err instanceof Error ? err.message : String(err);
      setError('Não foi possível carregar os agentes');
      setErrorCode(code);
      await logError({
        code,
        module: 'agentes',
        message: 'Falha ao carregar agentes',
        detail: { error: message, workspaceId },
        workspaceId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgent = useCallback(async (agentData: Partial<SwAgent>): Promise<SwAgent | null> => {
    if (!workspaceId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: dbErr } = await supabase
        .from('sw_agents')
        .insert({
          workspace_id: workspaceId,
          name: agentData.name ?? 'Novo Agente',
          type: agentData.type ?? 'brand',
          status: 'draft',
          identity: agentData.identity ?? {},
          voice: agentData.voice ?? {},
          memory: agentData.memory ?? {},
          behavior: agentData.behavior ?? {},
          tools: agentData.tools ?? [],
          integrations: agentData.integrations ?? [],
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      await fetchAgents();
      return data as SwAgent;
    } catch (err) {
      await logError({
        code: 'ERR_AGENT_CREATE_001',
        module: 'agentes',
        message: 'Falha ao criar agente',
        detail: { error: String(err) },
        workspaceId,
      });
      return null;
    }
  }, [workspaceId, fetchAgents]);

  const updateAgent = useCallback(async (id: string, agentData: Partial<SwAgent>): Promise<boolean> => {
    try {
      const { error: dbErr } = await supabase
        .from('sw_agents')
        .update({ ...agentData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId ?? '');

      if (dbErr) throw dbErr;
      await fetchAgents();
      return true;
    } catch (err) {
      await logError({
        code: 'ERR_AGENT_UPDATE_001',
        module: 'agentes',
        message: 'Falha ao atualizar agente',
        detail: { error: String(err), id },
        workspaceId: workspaceId ?? undefined,
      });
      return false;
    }
  }, [workspaceId, fetchAgents]);

  return { agents, isLoading, error, errorCode, reload: fetchAgents, createAgent, updateAgent };
}
