import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { BioLinkBlock, BioLinkRow, BioLinkVersionRow } from "@/lib/biolink/registry";
import { loadWorkspaceBioLink } from "@/lib/biolink/service";

type BioLinkWorkspaceValue = {
  workspace: ReturnType<typeof useWorkspace>["workspace"];
  brandKit: ReturnType<typeof useWorkspace>["brandKit"];
  briefing: ReturnType<typeof useWorkspace>["briefing"];
  bioLink: BioLinkRow | null;
  setBioLink: React.Dispatch<React.SetStateAction<BioLinkRow | null>>;
  blocks: BioLinkBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<BioLinkBlock[]>>;
  versions: BioLinkVersionRow[];
  setVersions: React.Dispatch<React.SetStateAction<BioLinkVersionRow[]>>;
  loading: boolean;
  refresh: () => Promise<void>;
};

const BioLinkWorkspaceContext = createContext<BioLinkWorkspaceValue | null>(null);

const useBioLinkWorkspaceController = (): BioLinkWorkspaceValue => {
  const { workspace, brandKit, briefing } = useWorkspace();
  const [bioLink, setBioLink] = useState<BioLinkRow | null>(null);
  const [blocks, setBlocks] = useState<BioLinkBlock[]>([]);
  const [versions, setVersions] = useState<BioLinkVersionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspace) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await loadWorkspaceBioLink(workspace, brandKit, briefing);
      setBioLink(result.bioLink);
      setBlocks(result.blocks);
      setVersions(result.versions);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar o Bio Link.");
    } finally {
      setLoading(false);
    }
  }, [brandKit, briefing, workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      workspace,
      brandKit,
      briefing,
      bioLink,
      setBioLink,
      blocks,
      setBlocks,
      versions,
      setVersions,
      loading,
      refresh,
    }),
    [bioLink, blocks, brandKit, briefing, loading, refresh, versions, workspace],
  );
};

export const BioLinkWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const value = useBioLinkWorkspaceController();
  return createElement(BioLinkWorkspaceContext.Provider, { value }, children);
};

export const useBioLinkWorkspace = () => {
  const context = useContext(BioLinkWorkspaceContext);
  if (!context) {
    throw new Error("useBioLinkWorkspace deve ser usado dentro de BioLinkWorkspaceProvider");
  }
  return context;
};
