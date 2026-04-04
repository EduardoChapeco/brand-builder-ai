import { supabase } from "@/integrations/supabase/client";

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export const LoggerService = {
  /**
   * Registra um evento no banco de dados sw_system_logs
   */
  async log(params: {
    workspaceId?: string;
    module: string;
    action: string;
    message: string;
    level?: LogLevel;
    metadata?: any;
  }) {
    try {
      const { error } = await supabase
        .from('sw_system_logs')
        .insert([{
          workspace_id: params.workspaceId,
          module: params.module,
          action: params.action,
          message: params.message,
          level: params.level || 'info',
          metadata: params.metadata || {}
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Falha ao gravar log no Simwork:', err);
    }
  }
};
