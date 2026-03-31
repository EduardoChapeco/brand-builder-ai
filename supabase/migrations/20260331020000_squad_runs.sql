-- ============================================================
-- Squad Runs — Execuções assíncronas do DNA Cloner
-- Idempotente: usa IF NOT EXISTS em tudo
-- ============================================================

CREATE TABLE IF NOT EXISTS public.squad_runs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_url           TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'scraping',
  captured_screenshots JSONB DEFAULT '[]',
  final_template_id    UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  error_message        TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.squad_runs ENABLE ROW LEVEL SECURITY;

-- Policy idempotente
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'squad_runs' AND policyname = 'Allow all for squad_runs'
  ) THEN
    CREATE POLICY "Allow all for squad_runs"
      ON public.squad_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Trigger de updated_at idempotente
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_squad_runs_updated_at'
  ) THEN
    CREATE TRIGGER update_squad_runs_updated_at
      BEFORE UPDATE ON public.squad_runs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
  END IF;
END $$;
