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
        .from('publications')
        .select('id, workspace_id, name, slug, status, config, seo, settings, published_at, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .eq('type', 'site')
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;
      setSites(data?.map(d => ({
        id: d.id,
        workspace_id: d.workspace_id,
        name: d.name,
        slug: d.slug ?? '',
        status: d.status,
        domain: (d.config as any)?.domain ?? null,
        favicon_url: (d.config as any)?.favicon_url ?? null,
        seo: d.seo ?? {},
        settings: d.settings ?? {},
        published_at: d.published_at,
        created_at: d.created_at,
        updated_at: d.updated_at
      })) as any[] ?? []);
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
        .from('publications')
        .insert({
          workspace_id: workspaceId,
          type: 'site',
          name,
          slug,
          status: 'draft',
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
