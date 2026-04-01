-- ============================================================
-- Agent Runtime Core
-- Canonical runtime for real squad execution
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_registry (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  role TEXT NOT NULL,
  module_types TEXT[] DEFAULT '{}'::text[],
  capabilities JSONB DEFAULT '[]'::jsonb,
  prompt_version INTEGER DEFAULT 1,
  persona_style TEXT,
  prompt_template TEXT NOT NULL,
  output_schema JSONB DEFAULT '{}'::jsonb,
  fallback_policy JSONB DEFAULT '{}'::jsonb,
  allowed_tools TEXT[] DEFAULT '{}'::text[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID NOT NULL REFERENCES public.agent_prds(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES public.agent_registry(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'queued',
  task_order INTEGER NOT NULL DEFAULT 0,
  depends_on_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  input_payload JSONB DEFAULT '{}'::jsonb,
  output_payload JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,
  is_fallback BOOLEAN DEFAULT FALSE,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_registry' AND policyname = 'Allow all for agent_registry'
  ) THEN
    CREATE POLICY "Allow all for agent_registry"
      ON public.agent_registry FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_tasks' AND policyname = 'Allow all for agent_tasks'
  ) THEN
    CREATE POLICY "Allow all for agent_tasks"
      ON public.agent_tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agent_tasks_prd_status_idx
  ON public.agent_tasks(prd_id, status, task_order);

CREATE INDEX IF NOT EXISTS agent_tasks_workspace_status_idx
  ON public.agent_tasks(workspace_id, status, created_at DESC);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_agent_registry_updated_at') THEN
      CREATE TRIGGER update_agent_registry_updated_at
        BEFORE UPDATE ON public.agent_registry
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_agent_tasks_updated_at') THEN
      CREATE TRIGGER update_agent_tasks_updated_at
        BEFORE UPDATE ON public.agent_tasks
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
  END IF;
END $$;

INSERT INTO public.agent_registry (
  id,
  label,
  role,
  module_types,
  capabilities,
  prompt_version,
  persona_style,
  prompt_template,
  output_schema,
  fallback_policy,
  allowed_tools,
  is_active
)
VALUES
  (
    'content_strategist',
    'Content Strategist',
    'strategy',
    ARRAY['content_post'],
    '["content.strategy","social.hooks","content.structure"]'::jsonb,
    1,
    'Direct, concise, strategic',
    'Structured content strategist for social posts and carousels.',
    '{"type":"object","required":["format","slides_count","template","theme","slide_structure","cta","title"]}'::jsonb,
    '{"mode":"heuristic","result":"strategy_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE
  ),
  (
    'content_writer',
    'Content Writer',
    'copy',
    ARRAY['content_post'],
    '["content.copy","captions","hashtags"]'::jsonb,
    1,
    'Sharp, social-first, brand-consistent',
    'Writes slide copy, captions and hashtags for the approved strategy.',
    '{"type":"object","required":["slides","caption","hashtags"]}'::jsonb,
    '{"mode":"heuristic","result":"writer_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE
  ),
  (
    'content_designer',
    'Content Designer',
    'design',
    ARRAY['content_post'],
    '["html5.social.design","layout","brand.visuals"]'::jsonb,
    1,
    'Modern, restrained, production-oriented',
    'Generates self-contained HTML slides from strategy and approved copy.',
    '{"type":"object","required":["slides_html","template"]}'::jsonb,
    '{"mode":"template_fallback","result":"designer_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE
  ),
  (
    'content_qa',
    'Content QA',
    'qa',
    ARRAY['content_post'],
    '["quality.review","brand.consistency","assembly"]'::jsonb,
    1,
    'Strict, skeptical, production-focused',
    'Reviews the assembled post, flags issues and returns a final payload.',
    '{"type":"object","required":["approved","summary","final_post"]}'::jsonb,
    '{"mode":"assembly_fallback","result":"qa_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  role = EXCLUDED.role,
  module_types = EXCLUDED.module_types,
  capabilities = EXCLUDED.capabilities,
  prompt_version = EXCLUDED.prompt_version,
  persona_style = EXCLUDED.persona_style,
  prompt_template = EXCLUDED.prompt_template,
  output_schema = EXCLUDED.output_schema,
  fallback_policy = EXCLUDED.fallback_policy,
  allowed_tools = EXCLUDED.allowed_tools,
  is_active = EXCLUDED.is_active,
  updated_at = now();
