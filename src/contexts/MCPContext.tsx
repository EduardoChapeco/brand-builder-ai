import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { CerebroMCPServer } from '@/lib/mcp/server';
import { getOrCreateWorkspaceMCP } from '@/lib/mcp/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type MCPContextValue = {
  mcp: CerebroMCPServer | null;
};

const MCPContext = createContext<MCPContextValue>({ mcp: null });

export const useMCP = () => useContext(MCPContext);

export const MCPProvider = ({ children }: { children: ReactNode }) => {
  const { workspaceId } = useWorkspace();

  const value = useMemo<MCPContextValue>(() => ({
    mcp: workspaceId ? getOrCreateWorkspaceMCP(workspaceId) : null,
  }), [workspaceId]);

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
};
