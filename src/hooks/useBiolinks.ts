/**
 * SW-020: useBiolinks — Hook canônico para Bio Links
 * Lê da tabela sw_biolinks, zero silêncio em erros
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import type { SwBiolink } from '@/types/database';

interface UseBiolinksReturn {
  biolinks: SwBiolink[];
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  reload: () => void;
  createBiolink: (title: string, slug: string) => Promise<SwBiolink | null>;
  deleteBiolink: (id: string) => Promise<boolean>;
}

export function useBiolinks(workspaceId: string | null): UseBiolinksReturn {
  const [biolinks, setBiolinks] = useState<SwBiolink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchBiolinks = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: dbErr } = await supabase
        .from('sw_biolinks')
        .select('id, workspace_id, title, slug, status, theme, settings, published_at, created_by, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;
      setBiolinks(data as SwBiolink[] ?? []);
    } catch (err) {
      const code = 'ERR_BIOLINK_LOAD_001';
      const message = err instanceof Error ? err.message : String(err);
      setError('Não foi possível carregar os Bio Links');
      setErrorCode(code);
      await logError({
        code,
        module: 'biolink',
        message: 'Falha ao carregar bio links',
        detail: { error: message, workspaceId },
        workspaceId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchBiolinks();
  }, [fetchBiolinks]);

  const createBiolink = useCallback(async (title: string, slug: string): Promise<SwBiolink | null> => {
    if (!workspaceId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: dbErr } = await supabase
        .from('sw_biolinks')
        .insert({
          workspace_id: workspaceId,
          title,
          slug,
          status: 'draft',
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      await fetchBiolinks();
      return data as SwBiolink;
    } catch (err) {
      const code = 'ERR_BIOLINK_CREATE_001';
      await logError({
        code,
        module: 'biolink',
        message: 'Falha ao criar bio link',
        detail: { error: String(err), title, slug },
        workspaceId,
      });
      return null;
    }
  }, [workspaceId, fetchBiolinks]);

  const deleteBiolink = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: dbErr } = await supabase
        .from('sw_biolinks')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId ?? '');

      if (dbErr) throw dbErr;
      await fetchBiolinks();
      return true;
    } catch (err) {
      await logError({
        code: 'ERR_BIOLINK_DELETE_001',
        module: 'biolink',
        message: 'Falha ao deletar bio link',
        detail: { error: String(err), id },
        workspaceId: workspaceId ?? undefined,
      });
      return false;
    }
  }, [workspaceId, fetchBiolinks]);

  return {
    biolinks,
    isLoading,
    error,
    errorCode,
    reload: fetchBiolinks,
    createBiolink,
    deleteBiolink,
  };
}
