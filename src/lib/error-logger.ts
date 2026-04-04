// src/lib/error-logger.ts
// SDD-1.0 — ZERO SILÊNCIO
// REGRA: Todo erro no sistema DEVE passar por esta função.
// Nunca usar apenas console.error() sem chamar logError().

import { supabase } from "./supabase";
import type { LogLevel } from "../types/app.types";

export interface LogErrorParams {
  code: string;           // ex: 'ERR_BIOLINK_LOAD_001'
  module: string;         // ex: 'biolink'
  message: string;        // mensagem para o usuário (pt-BR)
  detail?: Record<string, unknown>;
  workspaceId?: string;
  userId?: string;
  level?: LogLevel;
}

export async function logError(params: LogErrorParams): Promise<void> {
  const {
    code,
    module,
    message,
    detail = {},
    workspaceId,
    userId,
    level = "error",
  } = params;

  // 1. Console sempre — para debugging durante desenvolvimento
  console.error(`[${code}] ${module}: ${message}`, detail);

  // 2. Banco de dados — para observabilidade em produção
  try {
    await supabase.from("system_logs").insert({
      workspace_id: workspaceId ?? null,
      user_id: userId ?? null,
      level,
      code,
      module,
      message,
      detail,
    });
  } catch (err) {
    // Se o próprio log falhar, apenas mostrar no console
    // NUNCA lançar erro aqui — causaria loop infinito
    console.error("[SIMWORK-LOG-FAILURE] Não foi possível salvar log:", err);
  }
}

// Hook para uso em componentes React
export function useErrorLogger() {
  const log = async (
    params: Omit<LogErrorParams, "userId" | "workspaceId"> & {
      workspaceId?: string;
    },
  ) => {
    await logError(params);
  };

  return { logError: log };
}
