// src/contexts/WorkspaceContext.tsx
// SDD-1.0 — ÚNICO provider de workspace no app
// Todo componente que precisa do workspace usa useWorkspace()
// Inclui: workspace, role, brandKit, briefing, canEdit

import React, { createContext, useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";
import type { Workspace, MemberRole, BrandKit, Briefing } from "../types/app.types";
import { WorkspaceThemeInjector } from "../components/workspace/WorkspaceThemeInjector";

// Re-export types that other modules use from this context file
export type { BrandKit, Briefing, Workspace, MemberRole };

interface WorkspaceContextValue {
  workspace: Workspace | null;
  role: MemberRole | null;
  brandKit: BrandKit | null;
  briefing: Briefing | null;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  canEdit: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    if (!workspaceId) {
      setIsLoading(false);
      navigate('/workspaces');
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Load workspace (RLS allows if owner or member)
      const { data: wsData, error: wsError } = await supabase
        .from("workspaces")
        .select(`
          id, name, slug, logo_url, plan, status,
          trial_ends_at, settings, created_at, updated_at
        `)
        .eq("id", workspaceId)
        .single();

      if (wsError) throw wsError;
      if (!wsData) throw new Error("Workspace não encontrado ou acesso negado");

      setWorkspace(wsData as unknown as Workspace);

      // Load member role separately (non-fatal if missing, fallback to 'viewer' if owner)
      const { data: memberData } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      setRole(memberData?.role ?? null);

      // Load brand kit and briefing in parallel (non-fatal if missing)
      const [bkResult, brResult] = await Promise.all([
        supabase
          .from("brand_kits")
          .select("*")
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
        supabase
          .from("briefings")
          .select("*")
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
      ]);

      setBrandKit(bkResult.data as unknown as BrandKit | null);
      setBriefing(brResult.data as unknown as Briefing | null);
    } catch (err: any) {
      const message = err?.message || (err instanceof Error ? err.message : "Erro desconhecido");
      const details = err?.details || err?.hint || JSON.stringify(err);
      const code = err?.code || "ERR_WORKSPACE_LOAD_001";

      setError(message);
      setErrorCode(code);

      if (message.includes("não encontrado ou acesso negado") || message.includes("JSON object requested")) {
        navigate('/workspaces');
      } else {
        await logError({
          code,
          module: "workspace",
          message: `Não foi possível carregar o workspace ${workspaceId}`,
          detail: { error: message, details, workspaceId },
          workspaceId,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const canEdit = role === "owner" || role === "admin" || role === "editor";

  return (
    <WorkspaceContext.Provider
      value={{ workspace, role, brandKit, briefing, isLoading, error, errorCode, canEdit, refetch: fetchWorkspace }}
    >
      <WorkspaceThemeInjector />
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
