import { supabase } from '@/integrations/supabase/client';
import { getMCPServer, initMCPServer } from './server';
import { getMCPToolsForModules } from './registry';

export function getOrCreateWorkspaceMCP(workspaceId: string, modules?: string[]) {
  return getMCPServer(workspaceId)
    || initMCPServer({
      workspaceId,
      supabaseClient: supabase,
      tools: getMCPToolsForModules(modules),
    });
}
