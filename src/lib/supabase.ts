// src/lib/supabase.ts
// SDD-1.0 — REGRA: Este é o ÚNICO lugar onde o cliente Supabase é criado.
// Nunca criar createClient() em outros arquivos.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Erro fatal — não pode silenciar
  throw new Error(
    "[SIMWORK] VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não configurados. " +
      "Verifique o arquivo .env",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper: obter user autenticado
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Helper: obter workspace do usuário
export async function getUserWorkspaces(userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name, slug, logo_url, plan, status)")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}
