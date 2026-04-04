/**
 * src/lib/key-orchestrator.ts
 * SDD-1.0 — FASE 13: Orquestrador de Chaves de IA
 *
 * Regras:
 * 1. Workspace com chave própria (Business+): usa a chave do workspace
 * 2. Workspace sem chave: usa chave global do admin (admin_api_keys)
 * 3. Rotação automática por priority_order e monthly_limit
 * 4. Registro de uso em last_used_at e current_usage
 * 5. NUNCA expor a chave no frontend — a chave é recuperada e usada apenas em Edge Functions
 *
 * ATENÇÃO: No frontend, esta função retorna apenas o ID da chave.
 * A chave real é recuperada e injetada SOMENTE nas Edge Functions do Supabase.
 */
import { supabase } from "@/lib/supabase";
import { logError } from "@/lib/error-logger";

export type ResolvedKey = {
  keyId: string;
  service: string;
  source: "workspace" | "admin";
};

/**
 * resolveAIKey — Retorna o ID da chave ativa para o serviço solicitado.
 * Prioridade: workspace própria > admin global.
 * Nunca retorna o token real — apenas o ID para uso em Edge Functions.
 */
export async function resolveAIKey(
  workspaceId: string,
  service: string,
): Promise<ResolvedKey | null> {
  // 1. Verificar se workspace tem chave própria para este serviço
  const { data: workspaceKey } = await supabase
    .from("workspace_api_keys")
    .select("id, service")
    .eq("workspace_id", workspaceId)
    .eq("service", service)
    .eq("is_active", true)
    .maybeSingle();

  if (workspaceKey) {
    return { keyId: workspaceKey.id, service: workspaceKey.service, source: "workspace" };
  }

  // 2. Fallback: chave global do admin (menor priority_order = mais prioritária)
  const { data: adminKey, error } = await supabase
    .from("admin_api_keys")
    .select("id, service, current_usage, monthly_limit")
    .eq("service", service)
    .eq("is_active", true)
    .order("priority_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    await logError({
      code: "ERR_KEY_ORCHESTRATOR_001",
      module: "key-orchestrator",
      message: `Falha ao buscar chave global para serviço ${service}`,
      detail: { error: error.message, workspaceId, service },
      workspaceId,
    });
    return null;
  }

  if (!adminKey) {
    await logError({
      code: "ERR_KEY_ORCHESTRATOR_002",
      module: "key-orchestrator",
      message: `Nenhuma chave ativa encontrada para o serviço ${service}`,
      detail: { workspaceId, service },
      workspaceId,
      level: "warning",
    });
    return null;
  }

  // Verificar limite mensal
  if (adminKey.monthly_limit !== null && adminKey.current_usage >= adminKey.monthly_limit) {
    await logError({
      code: "ERR_KEY_ORCHESTRATOR_003",
      module: "key-orchestrator",
      message: `Chave ${adminKey.id} atingiu limite mensal de ${adminKey.monthly_limit} requisições`,
      detail: { keyId: adminKey.id, service },
      workspaceId,
      level: "warning",
    });
    return null;
  }

  // Atualizar last_used_at (não bloqueia a execução)
  supabase
    .from("admin_api_keys")
    .update({ last_used_at: new Date().toISOString(), current_usage: (adminKey.current_usage || 0) + 1 })
    .eq("id", adminKey.id)
    .then(({ error: updateError }) => {
      if (updateError) console.warn("[key-orchestrator] Falha ao atualizar last_used_at:", updateError);
    });

  return { keyId: adminKey.id, service: adminKey.service, source: "admin" };
}

/**
 * listServiceKeys — Lista as chaves disponíveis para um workspace (sem expor tokens).
 * Usado pelo componente de configurações de IA.
 */
export async function listServiceKeys(workspaceId: string) {
  const [{ data: workspaceKeys }, { data: adminKeys }] = await Promise.all([
    supabase
      .from("workspace_api_keys")
      .select("id, service, label, is_active, created_at")
      .eq("workspace_id", workspaceId),
    supabase
      .from("admin_api_keys")
      .select("id, service, label, is_active, current_usage, monthly_limit, priority_order")
      .eq("is_active", true)
      .order("priority_order", { ascending: true }),
  ]);

  return {
    workspaceKeys: workspaceKeys || [],
    adminKeys: adminKeys || [],
  };
}
