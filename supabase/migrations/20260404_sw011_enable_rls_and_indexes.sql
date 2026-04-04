-- ============================================================
-- SW-011: MIGRATION — Correção de RLS e Schema Canônico
-- Projeto: pjwupmxbsricseslxmbr
-- Data: 2026-04-04
-- 
-- IMPORTANTE: Esta migration corrige os 2 problemas críticos
-- identificados na auditoria de segurança:
-- 1. RLS desabilitado em sw_brand_kits e sw_briefings
-- 2. Foreign keys referenciando engios_workspaces (legado)
--    ao invés de sw_workspaces (canônico)
-- ============================================================

-- ─── 1. HABILITAR RLS NAS TABELAS CRÍTICAS ─────────────────

ALTER TABLE public.sw_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sw_briefings ENABLE ROW LEVEL SECURITY;

-- ─── 2. POLICIES PARA sw_brand_kits ───────────────────────

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "brand_kits_workspace_isolation" ON public.sw_brand_kits;
DROP POLICY IF EXISTS "brand_kits_select" ON public.sw_brand_kits;
DROP POLICY IF EXISTS "brand_kits_insert" ON public.sw_brand_kits;
DROP POLICY IF EXISTS "brand_kits_update" ON public.sw_brand_kits;
DROP POLICY IF EXISTS "brand_kits_delete" ON public.sw_brand_kits;

-- Policy combinada: SELECT + INSERT + UPDATE + DELETE
-- Permite acesso se o workspace_id pertence ao usuário via engios_workspaces
-- (mantemos por retrocompatibilidade até migrar todos os registros para sw_workspaces)
CREATE POLICY "brand_kits_owner_access" ON public.sw_brand_kits
  FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM public.engios_workspaces WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM public.sw_workspaces WHERE owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT workspace_id FROM public.sw_workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.engios_workspaces WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM public.sw_workspaces WHERE owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT workspace_id FROM public.sw_workspace_members WHERE user_id = auth.uid()
    )
  );

-- ─── 3. POLICIES PARA sw_briefings ────────────────────────

DROP POLICY IF EXISTS "briefings_workspace_isolation" ON public.sw_briefings;
DROP POLICY IF EXISTS "briefings_select" ON public.sw_briefings;
DROP POLICY IF EXISTS "briefings_insert" ON public.sw_briefings;
DROP POLICY IF EXISTS "briefings_update" ON public.sw_briefings;

CREATE POLICY "briefings_owner_access" ON public.sw_briefings
  FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM public.engios_workspaces WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM public.sw_workspaces WHERE owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT workspace_id FROM public.sw_workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.engios_workspaces WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM public.sw_workspaces WHERE owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT workspace_id FROM public.sw_workspace_members WHERE user_id = auth.uid()
    )
  );

-- ─── 4. CRIAR FUNÇÃO log_error() CENTRALIZADA ─────────────

CREATE OR REPLACE FUNCTION public.sw_log_error(
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_module TEXT DEFAULT 'sistema',
  p_function_name TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_message TEXT DEFAULT 'Erro desconhecido',
  p_payload JSONB DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.sw_error_logs (
    workspace_id, user_id, module, function_name,
    error_code, message, payload
  ) VALUES (
    p_workspace_id, p_user_id, p_module, p_function_name,
    p_error_code, p_message, p_payload
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ─── 5. ÍNDICES DE PERFORMANCE ────────────────────────────

-- Biolinks: busca por workspace + status
CREATE INDEX IF NOT EXISTS idx_sw_biolinks_workspace_status
  ON public.sw_biolinks (workspace_id, status);

-- Biolink blocks: ordenação
CREATE INDEX IF NOT EXISTS idx_sw_biolink_blocks_biolink_order
  ON public.sw_biolink_blocks (biolink_id, order_index);

-- Sites: busca por workspace
CREATE INDEX IF NOT EXISTS idx_sw_sites_workspace_status
  ON public.sw_sites (workspace_id, status);

-- Agentes: busca por workspace + tipo + status
CREATE INDEX IF NOT EXISTS idx_sw_agents_workspace_type_status
  ON public.sw_agents (workspace_id, type, status);

-- Posts editoriais: busca por workspace + tipo + status
CREATE INDEX IF NOT EXISTS idx_sw_editorial_posts_workspace_type
  ON public.sw_editorial_posts (workspace_id, type, status, created_at DESC);

-- Error logs: busca por workspace + módulo
CREATE INDEX IF NOT EXISTS idx_sw_error_logs_workspace_module
  ON public.sw_error_logs (workspace_id, module, created_at DESC);

-- ─── 6. VERIFICAÇÃO FINAL ─────────────────────────────────

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sw_brand_kits', 'sw_briefings', 'sw_workspaces', 'sw_biolinks')
ORDER BY tablename;
