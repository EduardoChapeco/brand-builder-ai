/**
 * SW-050: useSites — Hook canônico para Sites
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import type { SwSite } from '@/types/database';

interface UseSitesReturn {
  sites: SwSite[];
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  reload: () => void;
  createSite: (name: string, slug: string) => Promise<SwSite | null>;
}

export function useSites(workspaceId: string | null): UseSitesReturn {
  const [sites, setSites] = useState<SwSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: dbErr } = await supabase
        .from('sw_sites')
        .select('id, workspace_id, name, slug, status, domain, favicon_url, seo, settings, published_at, created_by, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;
      setSites(data as SwSite[] ?? []);
    } catch (err) {
      const code = 'ERR_SITE_LOAD_001';
      const message = err instanceof Error ? err.message : String(err);
      setError('Não foi possível carregar os sites');
      setErrorCode(code);
      await logError({
        code,
        module: 'site',
        message: 'Falha ao carregar sites',
        detail: { error: message, workspaceId },
        workspaceId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const createSite = useCallback(async (name: string, slug: string): Promise<SwSite | null> => {
    if (!workspaceId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: dbErr } = await supabase
        .from('sw_sites')
        .insert({
          workspace_id: workspaceId,
          name,
          slug,
          status: 'draft',
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      await fetchSites();
      return data as SwSite;
    } catch (err) {
      await logError({
        code: 'ERR_SITE_CREATE_001',
        module: 'site',
        message: 'Falha ao criar site',
        detail: { error: String(err), name, slug },
        workspaceId,
      });
      return null;
    }
  }, [workspaceId, fetchSites]);

  return { sites, isLoading, error, errorCode, reload: fetchSites, createSite };
}
