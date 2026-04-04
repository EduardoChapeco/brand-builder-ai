/**
 * SW-013: lib/supabase.ts — Cliente Supabase canônico + funções helpers
 * Fonte única de verdade para todas as operações de banco
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('[ERR_ENV_001] VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórios');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ─── HELPERS DE AUTENTICAÇÃO ─────────────────────────────────

/** Retorna o usuário atual ou null */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Retorna o ID do usuário atual ou null */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

// ─── HELPER DE WORKSPACE ──────────────────────────────────────

/**
 * Retorna o workspace do usuário atual (o primeiro onde ele é owner ou member)
 * Armazena em cache no sessionStorage para evitar múltiplas queries
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const cached = sessionStorage.getItem('sw_workspace_id');
  if (cached) return cached;

  const user = await getCurrentUser();
  if (!user) return null;

  // Tenta sw_workspaces primeiro (schema canônico)
  const { data: owned } = await supabase
    .from('sw_workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (owned) {
    sessionStorage.setItem('sw_workspace_id', owned.id);
    return owned.id;
  }

  // Fallback: member
  const { data: member } = await supabase
    .from('sw_workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (member) {
    sessionStorage.setItem('sw_workspace_id', member.workspace_id);
    return member.workspace_id;
  }

  return null;
}

/** Invalida o cache do workspace */
export function clearWorkspaceCache() {
  sessionStorage.removeItem('sw_workspace_id');
}
