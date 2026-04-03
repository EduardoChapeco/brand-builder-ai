import type { MCPTool } from '../types';

export const workspaceTools: MCPTool[] = [
  {
    name: 'workspace_get_current',
    module: 'workspace',
    description: 'Retorna metadados do workspace atual injetado no contexto MCP.',
    inputSchema: {},
    handler: async ({ _workspaceId, _supabase }) => {
      const { data, error } = await _supabase
        .from('workspaces')
        .select('id,name,slug,plan,timezone,locale,logo_url,created_at,updated_at')
        .eq('id', _workspaceId)
        .single();

      if (error) throw error;
      return data;
    },
  },
  {
    name: 'workspace_list_workspaces',
    module: 'workspace',
    description: 'Lista workspaces acessiveis pelo usuario atual. O filtro de acesso depende do RLS.',
    inputSchema: {},
    handler: async ({ _supabase }) => {
      const { data, error } = await _supabase
        .from('workspaces')
        .select('id,name,slug,plan,timezone,locale,logo_url,created_at,updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  },
];
