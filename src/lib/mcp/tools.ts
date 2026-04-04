import type { MCPTool } from './types';

export const WORKSPACE_TOOLS: MCPTool[] = [
  {
    name: 'get_workspace_context',
    module: 'context',
    description: 'Recupera o contexto estratégico do workspace (Briefing e Brand Kit).',
    inputSchema: {},
    handler: async ({ _workspaceId, _supabase }) => {
      const { data: briefing } = await _supabase
        .from('briefings')
        .select('*')
        .eq('workspace_id', _workspaceId)
        .maybeSingle();

      const { data: brandKit } = await _supabase
        .from('brand_kits')
        .select('*')
        .eq('workspace_id', _workspaceId)
        .maybeSingle();

      return { briefing, brandKit };
    }
  },
  {
    name: 'list_agents',
    module: 'simlab',
    description: 'Lista todos os agentes de IA ativos no workspace.',
    inputSchema: {},
    handler: async ({ _workspaceId, _supabase }) => {
      const { data } = await _supabase
        .from('agents')
        .select('*')
        .eq('workspace_id', _workspaceId);
      return data || [];
    }
  },
  {
    name: 'emit_log',
    module: 'system',
    description: 'Registra um log de operação ou erro vindo de um agente externo.',
    inputSchema: {
      level: { type: 'string', description: 'Nível do log (info, error, warn)', required: true },
      message: { type: 'string', description: 'Mensagem descritiva', required: true },
      module: { type: 'string', description: 'Módulo de origem', required: true }
    },
    handler: async ({ _workspaceId, _supabase, level, message, module }) => {
      const { error } = await _supabase.functions.invoke('sw-log', {
        body: { level, message, module, workspace_id: _workspaceId }
      });
      if (error) throw error;
      return { success: true };
    }
  }
];
