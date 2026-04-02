-- ============================================================
-- Link generated posts to agent runtime
-- ============================================================

ALTER TABLE public.posts_v2
  ADD COLUMN IF NOT EXISTS agent_prd_id UUID REFERENCES public.agent_prds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_squad_id UUID REFERENCES public.workspace_squads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_v2_agent_prd_id_idx
  ON public.posts_v2(agent_prd_id);

CREATE INDEX IF NOT EXISTS posts_v2_workspace_squad_id_idx
  ON public.posts_v2(workspace_squad_id, created_at DESC);
