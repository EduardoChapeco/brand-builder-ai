/**
 * SW-060: useBrandKit — Hook canônico para Brand Kit
 * Lê de sw_brand_kits, com autosave debounced
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import type { SwBrandKit } from '@/types/database';

interface UseBrandKitReturn {
  brandKit: SwBrandKit | null;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  save: (updates: Partial<SwBrandKit>) => void;
  reload: () => void;
}

export function useBrandKit(workspaceId: string | null): UseBrandKitReturn {
  const [brandKit, setBrandKit] = useState<SwBrandKit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBrandKit = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: dbErr } = await supabase
        .from('sw_brand_kits')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (dbErr) throw dbErr;
      setBrandKit(data as SwBrandKit ?? null);
    } catch (err) {
      const code = 'ERR_BRANDKIT_LOAD_001';
      const message = err instanceof Error ? err.message : String(err);
      setError('Não foi possível carregar o Brand Kit');
      setErrorCode(code);
      await logError({
        code,
        module: 'marca',
        message: 'Falha ao carregar brand kit',
        detail: { error: message, workspaceId },
        workspaceId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchBrandKit();
  }, [fetchBrandKit]);

  // Autosave debounced (1.5s)
  const save = useCallback((updates: Partial<SwBrandKit>) => {
    if (!workspaceId) return;

    // Atualiza otimisticamente
    setBrandKit(prev => prev ? { ...prev, ...updates } : null);

    // Debounce
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error: dbErr } = await supabase
          .from('sw_brand_kits')
          .upsert(
            { workspace_id: workspaceId, ...updates, updated_at: new Date().toISOString() },
            { onConflict: 'workspace_id' }
          );

        if (dbErr) throw dbErr;
      } catch (err) {
        const code = 'ERR_BRANDKIT_SAVE_001';
        await logError({
          code,
          module: 'marca',
          message: 'Não foi possível salvar o Brand Kit',
          detail: { error: String(err) },
          workspaceId,
        });
        // Reload para reverter otimismo
        await fetchBrandKit();
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [workspaceId, fetchBrandKit]);

  // Cleanup do timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    brandKit,
    isSaving,
    isLoading,
    error,
    errorCode,
    save,
    reload: fetchBrandKit,
  };
}
