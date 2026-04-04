// src/contexts/WorkspaceContext.tsx
// SDD-1.0 — ÚNICO provider de workspace no app
// Todo componente que precisa do workspace usa useWorkspace()

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";
import type { Workspace, MemberRole } from "../types/app.types";

interface WorkspaceContextValue {
  workspace: Workspace | null;
  role: MemberRole | null;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  workspaceId,
}: {
  children: React.ReactNode;
  workspaceId: string;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error: wsError } = await supabase
        .from("workspaces")
        .select(
          `id, name, slug, logo_url, plan, status,
          trial_ends_at, settings, created_at, updated_at,
          workspace_members!inner(role)`,
        )
        .eq("id", workspaceId)
        .eq("workspace_members.user_id", user.id)
        .single();

      if (wsError) throw wsError;
      if (!data) throw new Error("Workspace não encontrado ou acesso negado");

      setWorkspace(data as unknown as Workspace);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRole((data as any).workspace_members?.[0]?.role ?? null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro desconhecido";
      const code = "ERR_WORKSPACE_LOAD_001";

      setError(message);
      setErrorCode(code);

      await logError({
        code,
        module: "workspace",
        message: `Não foi possível carregar o workspace ${workspaceId}`,
        detail: { error: message, workspaceId },
        workspaceId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) fetchWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{ workspace, role, isLoading, error, errorCode, refetch: fetchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace() deve ser usado dentro de WorkspaceProvider");
  }
  return ctx;
}
