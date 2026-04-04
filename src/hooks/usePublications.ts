// src/hooks/usePublications.ts
// SDD-1.0 — Hook canônico para TODAS as publicações (biolink, site, blog, portal, landing)

import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";
import type { Publication, PublicationType, PublicationStatus } from "../types/app.types";

interface UsePublicationsOptions {
  workspaceId: string;
  type?: PublicationType;
}

export function usePublications({ workspaceId, type }: UsePublicationsOptions) {
  const [publications, setPublications] = useState<Publication[]>([]);
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
        .from("publications")
        .select("id, name, slug, type, status, config, seo, simlab_score, published_at, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });

      if (type) query = query.eq("type", type);

      const { data, error: err } = await query;

      if (err) {
        const code = `ERR_${(type ?? "PUBLICATION").toUpperCase()}_LOAD_001`;
        setErrorCode(code);
        setError(err.message);
        await logError({
          code,
          module: type ?? "publications",
          message: `Não foi possível carregar publicações${type ? ` do tipo ${type}` : ""}`,
          detail: { error: err.message, workspaceId, type },
          workspaceId,
        });
        return;
      }

      setPublications(data as Publication[]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, type]);

  const create = useCallback(async (
    name: string,
    pubType: PublicationType,
    slug?: string,
  ): Promise<Publication | null> => {
    try {
      const { data, error: err } = await supabase
        .from("publications")
        .insert({
          workspace_id: workspaceId,
          type: pubType,
          name,
          slug: slug ?? null,
          status: "draft",
        })
        .select("id, name, slug, type, status, config, seo, simlab_score, published_at, created_at, updated_at")
        .single();

      if (err) throw err;
      setPublications((prev) => [data as Publication, ...prev]);
      return data as Publication;
    } catch (err) {
      const code = `ERR_${pubType.toUpperCase()}_CREATE_001`;
      await logError({
        code,
        module: pubType,
        message: `Não foi possível criar publicação do tipo ${pubType}`,
        detail: { error: (err as Error).message, workspaceId },
        workspaceId,
      });
      return null;
    }
  }, [workspaceId]);

  const publish = useCallback(async (publicationId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from("publications")
        .update({
          status: "published" as PublicationStatus,
          published_at: new Date().toISOString(),
        })
        .eq("id", publicationId)
        .eq("workspace_id", workspaceId);

      if (err) throw err;
      setPublications((prev) =>
        prev.map((p) =>
          p.id === publicationId
            ? { ...p, status: "published" as PublicationStatus, published_at: new Date().toISOString() }
            : p,
        ),
      );
      return true;
    } catch (err) {
      await logError({
        code: "ERR_PUBLICATION_PUBLISH_001",
        module: "publications",
        message: "Não foi possível publicar",
        detail: { error: (err as Error).message, publicationId, workspaceId },
        workspaceId,
      });
      return false;
    }
  }, [workspaceId]);

  return { publications, isLoading, error, errorCode, fetch, create, publish };
}
