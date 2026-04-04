// src/hooks/useBrandKit.ts
// SDD-1.0 — Hook canônico para Brand Kit com auto-save (debounce 1.5s)

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";
import type { BrandKit } from "../types/app.types";

export function useBrandKit(workspaceId: string) {
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetch = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: err } = await supabase
        .from("brand_kits")
        .select("id, workspace_id, colors, fonts, logos, voice, updated_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (err) {
        setErrorCode("ERR_BRANDKIT_LOAD_001");
        setError(err.message);
        await logError({
          code: "ERR_BRANDKIT_LOAD_001",
          module: "brand_kit",
          message: "Não foi possível carregar o Brand Kit",
          detail: { error: err.message, workspaceId },
          workspaceId,
        });
        return;
      }

      setBrandKit(data as BrandKit | null);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  const save = useCallback(async (updates: Partial<BrandKit>) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { data, error: err } = await supabase
          .from("brand_kits")
          .upsert(
            {
              workspace_id: workspaceId,
              ...updates,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id" },
          )
          .select("id, workspace_id, colors, fonts, logos, voice, updated_at")
          .single();

        if (err) throw err;
        setBrandKit(data as BrandKit);
      } catch (err) {
        await logError({
          code: "ERR_BRANDKIT_SAVE_001",
          module: "brand_kit",
          message: "Não foi possível salvar o Brand Kit",
          detail: { error: (err as Error).message, workspaceId },
          workspaceId,
        });
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [workspaceId]);

  // Cleanup: cancelar debounce ao desmontar
  useEffect(() => {
    return () => clearTimeout(saveTimeout.current);
  }, []);

  return { brandKit, isLoading, isSaving, error, errorCode, fetch, save };
}
