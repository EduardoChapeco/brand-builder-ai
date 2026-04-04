/**
 * SW-013: lib/errorLogger.ts — Sistema de Log Centralizado (Zero Silêncio)
 * Todo erro deve ser registrado aqui. Nenhum catch vazio permitido.
 */

import { supabase, getCurrentUserId, getCurrentWorkspaceId } from './supabase';
import type { LogErrorParams } from '@/types/database';

/**
 * Registra um erro na tabela sw_error_logs e exibe no console (dev)
 * Nunca silencia erros — se o log falhar, ao menos o console captura
 */
export async function logError(params: LogErrorParams): Promise<void> {
  const { code, module, message, detail, workspaceId, userId } = params;

  // Sempre exibe no console de dev — nunca silencioso
  if (import.meta.env.DEV) {
    console.error(`[${code}] [${module}] ${message}`, detail ?? '');
  }

  try {
    const effectiveUserId = userId ?? (await getCurrentUserId()) ?? undefined;
    const effectiveWorkspaceId = workspaceId ?? (await getCurrentWorkspaceId()) ?? undefined;

    await supabase.from('sw_error_logs').insert({
      workspace_id: effectiveWorkspaceId ?? null,
      user_id: effectiveUserId ?? null,
      module,
      function_name: null,
      error_code: code,
      message,
      payload: detail ?? {},
    });
  } catch (logErr) {
    // Fallback: se o log falhar, ao menos o console captura
    console.error('[ERR_LOGGER_FAIL] Falha ao gravar log de erro:', logErr);
    console.error('[ORIGINAL_ERROR]', { code, module, message, detail });
  }
}

/**
 * Wrapper para usar em catch blocks
 * Ex: catch(err) { await captureError(err, 'ERR_BIOLINK_LOAD_001', 'biolink', 'data loading') }
 */
export async function captureError(
  err: unknown,
  code: string,
  module: string,
  context?: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  await logError({
    code,
    module,
    message: context ? `${context}: ${message}` : message,
    detail: {
      stack,
      ...extra,
    },
  });
}
