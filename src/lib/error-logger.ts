/**
 * src/lib/error-logger.ts
 * SDD-1.0 — FASE 3: Sistema de Logs — Zero Silêncio
 *
 * REGRA ABSOLUTA: NUNCA silencie um erro.
 * Todo erro = registro em system_logs + exibição na UI.
 *
 * Tabela: system_logs
 * Colunas: workspace_id, user_id, level, code, module, message, detail
 */
import { supabase } from "@/lib/supabase";
import type { LogLevel } from "@/types/app.types";

export interface LogErrorParams {
  code: string;           // Ex: ERR_BIOLINK_LOAD_001
  module: string;         // Ex: biolink | site | blog | agents | billing | auth
  message: string;        // Mensagem legível
  detail?: Record<string, unknown>; // stacktrace, payload, contexto
  workspaceId?: string | null;
  level?: LogLevel;       // default: 'error'
}

/**
 * logError — registra erro no banco e retorna silenciosamente.
 * Nunca lança exceção (é chamada no catch de outros erros).
 */
export async function logError(params: LogErrorParams): Promise<void> {
  const {
    code,
    module,
    message,
    detail = {},
    workspaceId = null,
    level = "error",
  } = params;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("system_logs").insert({
      workspace_id: workspaceId,
      user_id: user?.id ?? null,
      level,
      code,
      module,
      message,
      detail,
    });
  } catch (loggingError) {
    // Se falhar ao logar (sem conexão), pelo menos imprime no console
    console.error("[SIMWORK:error-logger] Falha ao registrar log:", {
      original: params,
      loggingError,
    });
  }
}

/**
 * logInfo — para eventos operacionais normais (publicação, criação de workspace, etc.)
 */
export async function logInfo(params: Omit<LogErrorParams, "level">): Promise<void> {
  return logError({ ...params, level: "info" });
}

/**
 * logWarning — para situações inesperadas mas não fatais
 */
export async function logWarning(params: Omit<LogErrorParams, "level">): Promise<void> {
  return logError({ ...params, level: "warning" });
}

/**
 * logCritical — para falhas que requerem ação imediata (pagamento, dados corrompidos)
 */
export async function logCritical(params: Omit<LogErrorParams, "level">): Promise<void> {
  return logError({ ...params, level: "critical" });
}
