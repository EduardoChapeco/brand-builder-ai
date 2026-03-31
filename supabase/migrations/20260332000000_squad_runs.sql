-- Migration for DNA Squad Async Runs

CREATE TABLE IF NOT EXISTS public.squad_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_url            TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'scraping',
  captured_screenshots  JSONB DEFAULT '[]'::jsonb,
  final_template_id     UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  error_message         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.squad_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for squad_runs" ON public.squad_runs FOR ALL USING (true) WITH CHECK (true);
