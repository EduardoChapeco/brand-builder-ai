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
        .from('publications')
        .select('id, workspace_id, name, slug, status, config, published_at, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .eq('type', 'biolink')
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;
      setBiolinks(data?.map(d => ({
        id: d.id,
        workspace_id: d.workspace_id,
        title: d.name,
        slug: d.slug ?? '',
        status: d.status,
        theme: (d.config as any)?.theme || {},
        settings: d.config,
        published_at: d.published_at,
        created_at: d.created_at,
        updated_at: d.updated_at
      })) as any[] ?? []);
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
        .from('publications')
        .insert({
          workspace_id: workspaceId,
          type: 'biolink',
          name: title,
          slug,
          status: 'draft',
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
        .from('publications')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId ?? '')
        .eq('type', 'biolink');

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
