// src/hooks/usePublicationBlocks.ts
// SDD-1.0 — Hook canônico para blocos do BioLink

import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";
import type { PublicationBlock, BlockType } from "../types/app.types";

function getDefaultContentForBlock(blockType: BlockType): Record<string, unknown> {
  const defaults: Record<BlockType, Record<string, unknown>> = {
    link: { title: "Meu Link", url: "https://", description: "" },
    highlight: { title: "Destaque", subtitle: "", image_url: null },
    newsletter: { title: "Inscreva-se", placeholder: "seu@email.com", button_text: "Inscrever" },
    product: { name: "Produto", price: 0, currency: "BRL", url: "#" },
    video: { url: "", platform: "youtube", title: "" },
    music: { url: "", platform: "spotify", title: "" },
    countdown: { end_date: null, title: "Em breve" },
    separator: { style: "line", color: null },
    text: { content: "" },
    social: { platform: "instagram", url: "", handle: "" },
    booking: { url: "#", provider: "calendly", label: "Agendar" },
    map: { address: "", lat: null, lng: null },
  };
  return defaults[blockType] ?? {};
}

export function usePublicationBlocks(publicationId: string | null, workspaceId: string) {
  const [blocks, setBlocks] = useState<PublicationBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!publicationId || !workspaceId) return;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: err } = await supabase
        .from("publication_blocks")
        .select("id, block_type, position, content, is_active, created_at, updated_at")
        .eq("publication_id", publicationId)
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true });

      if (err) {
        const code = "ERR_BIOLINK_BLOCK_LOAD_001";
        setErrorCode(code);
        setError(err.message);
        await logError({
          code,
          module: "biolink",
          message: "Não foi possível carregar os blocos do Bio Link",
          detail: { error: err.message, publicationId, workspaceId },
          workspaceId,
        });
        return;
      }

      setBlocks(data as unknown as PublicationBlock[]);
    } finally {
      setIsLoading(false);
    }
  }, [publicationId, workspaceId]);

  const addBlock = useCallback(async (blockType: BlockType): Promise<PublicationBlock | null> => {
    if (!publicationId) return null;
    const position = blocks.length;

    try {
      const { data, error: err } = await supabase
        .from("publication_blocks")
        .insert({
          publication_id: publicationId,
          workspace_id: workspaceId,
          block_type: blockType,
          position,
          content: getDefaultContentForBlock(blockType),
          is_active: true,
        })
        .select("id, block_type, position, content, is_active, created_at, updated_at")
        .single();

      if (err) throw err;
      const newBlock = { ...data, publication_id: publicationId, workspace_id: workspaceId } as PublicationBlock;
      setBlocks((prev) => [...prev, newBlock]);
      return newBlock;
    } catch (err) {
      await logError({
        code: "ERR_BIOLINK_BLOCK_ADD_001",
        module: "biolink",
        message: "Não foi possível adicionar bloco",
        detail: { error: (err as Error).message, blockType, publicationId, workspaceId },
        workspaceId,
      });
      return null;
    }
  }, [blocks.length, publicationId, workspaceId]);

  const updateBlock = useCallback(async (
    blockId: string,
    content: Record<string, unknown>,
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from("publication_blocks")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", blockId)
        .eq("workspace_id", workspaceId);

      if (err) throw err;
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, content } : b)),
      );
      return true;
    } catch (err) {
      await logError({
        code: "ERR_BIOLINK_BLOCK_UPDATE_001",
        module: "biolink",
        message: "Não foi possível atualizar bloco",
        detail: { error: (err as Error).message, blockId, workspaceId },
        workspaceId,
      });
      return false;
    }
  }, [workspaceId]);

  const reorderBlocks = useCallback(async (
    reordered: Array<{ id: string; position: number }>,
  ): Promise<void> => {
    setBlocks((prev) =>
      [...prev].sort((a, b) => {
        const posA = reordered.find((r) => r.id === a.id)?.position ?? a.position;
        const posB = reordered.find((r) => r.id === b.id)?.position ?? b.position;
        return posA - posB;
      }),
    );
    try {
      await Promise.all(
        reordered.map((b) =>
          supabase
            .from("publication_blocks")
            .update({ position: b.position })
            .eq("id", b.id)
            .eq("workspace_id", workspaceId),
        ),
      );
    } catch (err) {
      await logError({
        code: "ERR_BIOLINK_REORDER_001",
        module: "biolink",
        message: "Não foi possível reordenar blocos",
        detail: { error: (err as Error).message, workspaceId },
        workspaceId,
      });
    }
  }, [workspaceId]);

  const removeBlock = useCallback(async (blockId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from("publication_blocks")
        .delete()
        .eq("id", blockId)
        .eq("workspace_id", workspaceId);

      if (err) throw err;
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      return true;
    } catch (err) {
      await logError({
        code: "ERR_BIOLINK_BLOCK_DELETE_001",
        module: "biolink",
        message: "Não foi possível remover bloco",
        detail: { error: (err as Error).message, blockId, workspaceId },
        workspaceId,
      });
      return false;
    }
  }, [workspaceId]);

  return { blocks, isLoading, error, errorCode, fetch, addBlock, updateBlock, reorderBlocks, removeBlock };
}
