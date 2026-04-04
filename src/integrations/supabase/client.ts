/**
 * src/integrations/supabase/client.ts
 * SDD-1.0 — SHIM de compatibilidade
 *
 * Re-exporta o cliente canônico de src/lib/supabase.ts.
 * NUNCA criar um segundo createClient() aqui.
 * Todos os arquivos que importam daqui continuam funcionando sem precisar ser editados.
 */
export { supabase } from "@/lib/supabase";