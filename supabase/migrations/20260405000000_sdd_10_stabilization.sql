-- =============================================================
-- MIGRATION: 20260405_sdd_10_stabilization.sql
-- Propósito: Estabilização do SaaS, Automação de Membros e JSONB
-- =============================================================

-- 1. ESTRUTURA DE WORKSPACES E MEMBROS
-- Garantir que a tabela workspace_members existe e tem os campos corretos
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'editor'
                  CHECK (role IN ('owner','admin','editor','viewer')),
  invited_by      UUID REFERENCES auth.users(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Habilitar RLS em workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 2. TRIGGER PARA AUTO-MEMBRO (A alma do SaaS)
-- Quando um workspace é criado, o dono deve ser inserido automaticamente
CREATE OR REPLACE FUNCTION public.on_workspace_created_add_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_workspace_created ON public.workspaces;
CREATE TRIGGER tr_on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.on_workspace_created_add_owner();

-- 3. CONVERSÃO DE BRIEFINGS PARA JSONB
ALTER TABLE public.briefings
  ADD COLUMN IF NOT EXISTS company JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audience JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS market JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS channels JSONB NOT NULL DEFAULT '[]';

-- 4. CONVERSÃO DE BRAND KITS PARA JSONB
ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS colors JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fonts JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS logos JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voice JSONB NOT NULL DEFAULT '{}';

-- 5. POLÍTICAS RLS ROBUSTAS
-- Permitir que membros leiam sua própria associação
DROP POLICY IF EXISTS "Workspace members visible to self" ON public.workspace_members;
CREATE POLICY "Workspace members visible to self"
  ON public.workspace_members
  FOR SELECT
  USING (user_id = auth.uid());

-- 6. COMENTÁRIOS E ÍNDICES
COMMENT ON TABLE public.workspaces IS 'Tabela raiz de multi-tenancy';
COMMENT ON TABLE public.workspace_members IS 'Associação de usuários a workspaces';
COMMENT ON COLUMN public.briefings.company IS 'Dados da empresa em JSONB conforme SDD-1.0';
COMMENT ON COLUMN public.brand_kits.colors IS 'Paleta de cores em JSONB conforme SDD-1.0';

CREATE INDEX IF NOT EXISTS idx_briefings_company ON public.briefings USING GIN (company);
CREATE INDEX IF NOT EXISTS idx_brand_kits_colors ON public.brand_kits USING GIN (colors);
