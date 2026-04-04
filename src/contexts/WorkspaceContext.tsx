/**
 * SW-013: WorkspaceContext — Contexto global de workspace
 * Fonte única de verdade para workspace_id em toda a aplicação
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import type { SwWorkspace } from '@/types/database';

interface WorkspaceContextValue {
  workspace: SwWorkspace | null;
  workspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  workspaceId: null,
  isLoading: true,
  error: null,
  reload: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<SwWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWorkspace(null);
        return;
      }

      // Tenta buscar workspace como owner primeiro
      const { data: owned, error: ownErr } = await supabase
        .from('sw_workspaces')
        .select('id, owner_id, name, slug, plan_id, avatar_url, sector, website, settings, created_at, updated_at')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (ownErr) throw ownErr;

      if (owned) {
        sessionStorage.setItem('sw_workspace_id', owned.id);
        setWorkspace(owned as SwWorkspace);
        return;
      }

      // Fallback: como membro
      const { data: memberRow, error: memErr } = await supabase
        .from('sw_workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memErr) throw memErr;

      if (memberRow) {
        const { data: ws, error: wsErr } = await supabase
          .from('sw_workspaces')
          .select('id, owner_id, name, slug, plan_id, avatar_url, sector, website, settings, created_at, updated_at')
          .eq('id', memberRow.workspace_id)
          .single();

        if (wsErr) throw wsErr;
        if (ws) {
          sessionStorage.setItem('sw_workspace_id', ws.id);
          setWorkspace(ws as SwWorkspace);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      await logError({
        code: 'ERR_WORKSPACE_LOAD_001',
        module: 'workspace',
        message: 'Falha ao carregar workspace do usuário',
        detail: { error: message },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();

    // Recarregar quando autenticação mudar
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      sessionStorage.removeItem('sw_workspace_id');
      loadWorkspace();
    });

    return () => subscription.unsubscribe();
  }, [loadWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaceId: workspace?.id ?? null,
        isLoading,
        error,
        reload: loadWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
