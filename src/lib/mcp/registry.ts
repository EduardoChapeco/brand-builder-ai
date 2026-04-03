import type { MCPTool } from './types';
import { ccpTools } from './tools/ccp.tools';
import { workspaceTools } from './tools/workspace.tools';

export const defaultMCPTools: MCPTool[] = [...ccpTools, ...workspaceTools];

export function getMCPToolsForModules(modules?: string[]): MCPTool[] {
  if (!modules || modules.length === 0) return defaultMCPTools;

  const allowed = new Set(modules);
  return defaultMCPTools.filter((tool) => allowed.has(tool.module));
}
