/**
 * useBioLinkWorkspace.ts
 * Full-featured hook for the BioLink editor.
 * Exposes all CRUD mutations needed by BioLinkPage's 3-column glassmorphism UI.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { BioLinkRow, BioLinkBlock, BioLinkVersionRow } from "@/lib/biolink/service";
import { loadWorkspaceBioLink, saveWorkspaceBioLink } from "@/lib/biolink/service";
import { createBioLinkBlock } from "@/lib/biolink/registry";
import type { BioLinkBlockType } from "@/lib/biolink/registry";

// ─── Public API ──────────────────────────────────────────────────────────────

type BioLinkWorkspaceValue = {
  workspace: ReturnType<typeof useWorkspace>["workspace"];
  brandKit: ReturnType<typeof useWorkspace>["brandKit"];
  briefing: ReturnType<typeof useWorkspace>["briefing"];

  bioLink: BioLinkRow | null;
  blocks: BioLinkBlock[];
  versions: BioLinkVersionRow[];

  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;

  // Mutations
  updateBioLink: (patch: Partial<BioLinkRow>) => void;
  updateTheme: (themeId: string) => void;
  addBlock: (type: BioLinkBlockType) => void;
  updateBlock: (blockId: string, patch: Partial<BioLinkBlock["config"]>) => void;
  removeBlock: (blockId: string) => void;
  reorderBlocks: (orderedIds: string[]) => void;
  toggleBlockVisibility: (blockId: string) => void;
  save: () => Promise<string | null>;
  refresh: () => Promise<void>;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const BioLinkWorkspaceContext = createContext<BioLinkWorkspaceValue | null>(null);

// ─── Controller (internal) ───────────────────────────────────────────────────

const useBioLinkWorkspaceController = (): BioLinkWorkspaceValue => {
  const { workspace, brandKit, briefing } = useWorkspace();

  const [bioLink, setBioLink] = useState<BioLinkRow | null>(null);
  const [blocks, setBlocks] = useState<BioLinkBlock[]>([]);
  const [versions, setVersions] = useState<BioLinkVersionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Track saved state to compute isDirty without extra renders
  const savedRef = useRef<{ bioLink: BioLinkRow | null; blocks: BioLinkBlock[] }>({
    bioLink: null,
    blocks: [],
  });

  // ── Loader ────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!workspace) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await loadWorkspaceBioLink(workspace, brandKit, briefing);
      setBioLink(result.bioLink);
      setBlocks(result.blocks);
      setVersions(result.versions);
      savedRef.current = { bioLink: result.bioLink, blocks: result.blocks };
      setIsDirty(false);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar o Bio Link.");
    } finally {
      setIsLoading(false);
    }
  }, [brandKit, briefing, workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Generic dirty setter ──────────────────────────────────────────────────
  const markDirty = () => setIsDirty(true);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateBioLink = useCallback((patch: Partial<BioLinkRow>) => {
    setBioLink((prev) => (prev ? { ...prev, ...patch } : prev));
    markDirty();
  }, []);

  const updateTheme = useCallback((themeId: string) => {
    setBioLink((prev) => (prev ? { ...prev, theme_id: themeId, theme_key: themeId } : prev));
    markDirty();
  }, []);

  const addBlock = useCallback((type: BioLinkBlockType) => {
    const lean = createBioLinkBlock(type);
    const full: BioLinkBlock = {
      id: lean.id,
      publication_id: "", // will be assigned on save
      workspace_id: workspace?.id ?? "",
      type: lean.type,
      config: lean.config ?? {},
      position: blocks.length,
      isVisible: lean.isVisible,
    };
    setBlocks((prev) => [...prev, full]);
    markDirty();
  }, [blocks.length, workspace?.id]);

  const updateBlock = useCallback((blockId: string, patch: Partial<BioLinkBlock["config"]>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, config: { ...b.config, ...patch } } : b))
    );
    markDirty();
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    markDirty();
  }, []);

  const reorderBlocks = useCallback((orderedIds: string[]) => {
    setBlocks((prev) => {
      const map = new Map(prev.map((b) => [b.id, b]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, position: i })).filter(Boolean);
    });
    markDirty();
  }, []);

  const toggleBlockVisibility = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, isVisible: !b.isVisible } : b))
    );
    markDirty();
  }, []);

  // ── Save (upsert) ─────────────────────────────────────────────────────────
  const save = useCallback(async (): Promise<string | null> => {
    if (!workspace || !bioLink) return null;
    setIsSaving(true);
    try {
      const result = await saveWorkspaceBioLink({
        bioLinkId: bioLink.id ?? null,
        workspaceId: workspace.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bioLink: bioLink as any,
        blocks,
      });
      setBioLink(result.bioLink);
      setBlocks(result.blocks);
      savedRef.current = { bioLink: result.bioLink, blocks: result.blocks };
      setIsDirty(false);
      toast.success("Bio Link salvo com sucesso!");
      return result.bioLink.id;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar Bio Link.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [bioLink, blocks, workspace]);

  return useMemo(
    () => ({
      workspace,
      brandKit,
      briefing,
      bioLink,
      blocks,
      versions,
      isLoading,
      isSaving,
      isDirty,
      updateBioLink,
      updateTheme,
      addBlock,
      updateBlock,
      removeBlock,
      reorderBlocks,
      toggleBlockVisibility,
      save,
      refresh,
    }),
    [
      addBlock, bioLink, blocks, brandKit, briefing, isDirty, isLoading, isSaving,
      refresh, removeBlock, reorderBlocks, save, toggleBlockVisibility, updateBioLink, updateBlock, updateTheme, versions, workspace,
    ]
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────

export const BioLinkWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const value = useBioLinkWorkspaceController();
  return createElement(BioLinkWorkspaceContext.Provider, { value }, children);
};

// ─── Consumer ────────────────────────────────────────────────────────────────

export const useBioLinkWorkspace = (_workspaceId?: string) => {
  const context = useContext(BioLinkWorkspaceContext);
  if (!context) {
    throw new Error("useBioLinkWorkspace deve ser usado dentro de BioLinkWorkspaceProvider");
  }
  return context;
};
