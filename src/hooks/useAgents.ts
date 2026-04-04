// src/hooks/useAgents.ts
// SDD-1.0 — Hook canônico para Agentes (personas, influencers, mascotes, squads)

import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";
import type { Agent, AgentType } from "../types/app.types";

export function useAgents(workspaceId: string, agentType?: AgentType) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      let query = supabase
        .from("agents")
        .select("id, agent_type, name, avatar_url, config, calibration_score, is_active, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (agentType) query = query.eq("agent_type", agentType);

      const { data, error: err } = await query;

      if (err) {
        const code = "ERR_AGENT_LOAD_001";
        setErrorCode(code);
        setError(err.message);
        await logError({
          code,
          module: "agents",
          message: "Não foi possível carregar os agentes",
          detail: { error: err.message, workspaceId, agentType },
          workspaceId,
        });
        return;
      }

      setAgents(data as Agent[]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, agentType]);

  const create = useCallback(async (
    name: string,
    type: AgentType,
    config: Record<string, unknown> = {},
    avatarUrl?: string,
  ): Promise<Agent | null> => {
    try {
      const { data, error: err } = await supabase
        .from("agents")
        .insert({
          workspace_id: workspaceId,
          agent_type: type,
          name,
          avatar_url: avatarUrl ?? null,
          config,
          is_active: true,
        })
        .select("id, agent_type, name, avatar_url, config, calibration_score, is_active, created_at, updated_at")
        .single();

      if (err) throw err;
      setAgents((prev) => [data as Agent, ...prev]);
      return data as Agent;
    } catch (err) {
      await logError({
        code: "ERR_AGENT_SAVE_001",
        module: "agents",
        message: "Não foi possível criar agente",
        detail: { error: (err as Error).message, name, type, workspaceId },
        workspaceId,
      });
      return null;
    }
  }, [workspaceId]);

  const update = useCallback(async (
    agentId: string,
    updates: Partial<Pick<Agent, "name" | "config" | "avatar_url" | "is_active">>,
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from("agents")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", agentId)
        .eq("workspace_id", workspaceId);

      if (err) throw err;
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, ...updates } : a)),
      );
      return true;
    } catch (err) {
      await logError({
        code: "ERR_AGENT_SAVE_001",
        module: "agents",
        message: "Não foi possível atualizar agente",
        detail: { error: (err as Error).message, agentId, workspaceId },
        workspaceId,
      });
      return false;
    }
  }, [workspaceId]);

  const remove = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from("agents")
        .delete()
        .eq("id", agentId)
        .eq("workspace_id", workspaceId);

      if (err) throw err;
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      return true;
    } catch (err) {
      await logError({
        code: "ERR_AGENT_SAVE_001",
        module: "agents",
        message: "Não foi possível remover agente",
        detail: { error: (err as Error).message, agentId, workspaceId },
        workspaceId,
      });
      return false;
    }
  }, [workspaceId]);

  return { agents, isLoading, error, errorCode, fetch, create, update, remove };
}
