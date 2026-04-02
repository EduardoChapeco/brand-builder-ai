-- ============================================================
-- Website Spec-Driven Runtime
-- Spec approval, artifacts lineage and website squad catalog
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID NOT NULL REFERENCES public.agent_prds(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  artifact_kind TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  payload JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'generated',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (prd_id, artifact_kind, version_number)
);

ALTER TABLE public.agent_artifacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_artifacts' AND policyname = 'Allow all for agent_artifacts'
  ) THEN
    CREATE POLICY "Allow all for agent_artifacts"
      ON public.agent_artifacts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agent_artifacts_prd_kind_idx
  ON public.agent_artifacts(prd_id, artifact_kind, version_number DESC);

CREATE INDEX IF NOT EXISTS agent_artifacts_workspace_created_idx
  ON public.agent_artifacts(workspace_id, created_at DESC);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES public.websites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS build_target TEXT DEFAULT 'project_vfs';

ALTER TABLE public.platform_conversations
  ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES public.websites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS build_target TEXT DEFAULT 'project_vfs',
  ADD COLUMN IF NOT EXISTS agent_prd_id UUID REFERENCES public.agent_prds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_workspace_website_idx
  ON public.projects(workspace_id, website_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS platform_conversations_workspace_project_idx
  ON public.platform_conversations(workspace_id, project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS platform_conversations_workspace_website_idx
  ON public.platform_conversations(workspace_id, website_id, created_at DESC);

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
  is_active,
  category,
  ui_group,
  seniority,
  career_summary,
  curriculum,
  source_refs,
  deliverables,
  execution_mode,
  module_metadata
)
VALUES
  (
    'site_spec_analyst',
    'Site Spec Analyst',
    'strategy',
    ARRAY['website_spec','website_build'],
    '["website.specification","prompt.refinement","scope.definition"]'::jsonb,
    1,
    'Precise, brownfield-aware and product-oriented.',
    'Transforms a raw website request into an execution-ready site specification.',
    '{"type":"object","required":["site_type","goal","pages","primary_cta"]}'::jsonb,
    '{"mode":"manual_replan","result":"spec_revision"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'strategy',
    'site-runtime',
    'principal',
    'Especialista em refinar pedidos vagos e transformá-los em spec operacional de site.',
    '{"experience_years":12,"focus_areas":["product scoping","solution design","website strategy"]}'::jsonb,
    '[{"label":"GitHub Spec Kit","url":"https://github.com/github/spec-kit"},{"label":"Spillwave SDD","url":"https://github.com/SpillwaveSolutions/sdd-skill"}]'::jsonb,
    '["approved spec","scope map","cta hierarchy"]'::jsonb,
    'llm',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
  ),
  (
    'site_information_architect',
    'Site Information Architect',
    'strategy',
    ARRAY['website_build'],
    '["site.architecture","page.mapping","delivery.planning"]'::jsonb,
    1,
    'Structured, sequential and delivery-minded.',
    'Converts an approved site spec into a practical execution plan.',
    '{"type":"object","required":["summary","phases","priority_pages"]}'::jsonb,
    '{"mode":"manual_replan","result":"plan_revision"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'strategy',
    'site-runtime',
    'lead',
    'Define a ordem de entrega, a estrutura das páginas e a priorização do build.',
    '{"experience_years":10,"focus_areas":["information architecture","delivery planning","site structure"]}'::jsonb,
    '[{"label":"GitHub Spec Kit","url":"https://github.com/github/spec-kit"}]'::jsonb,
    '["plan","phase map","priority pages"]'::jsonb,
    'llm',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
  ),
  (
    'site_design_system_guardian',
    'Site Design System Guardian',
    'design',
    ARRAY['website_build'],
    '["design.constitution","ui.guardrails","visual.qc"]'::jsonb,
    1,
    'Strict, token-first and anti-drift.',
    'Defines the design constitution used during generation and QA.',
    '{"type":"object","required":["version","forbiddenPatterns","guidance"]}'::jsonb,
    '{"mode":"deterministic","result":"constitution"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'design',
    'site-runtime',
    'lead',
    'Mantém o build dentro dos guardrails visuais do sistema.',
    '{"experience_years":10,"focus_areas":["design systems","frontend consistency","ui governance"]}'::jsonb,
    '[{"label":"Anthropic Skills","url":"https://github.com/anthropics/skills"}]'::jsonb,
    '["design constitution","forbidden patterns","visual guardrails"]'::jsonb,
    'workflow',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
  ),
  (
    'site_copy_architect',
    'Site Copy Architect',
    'copy',
    ARRAY['website_build'],
    '["website.copy","conversion.copy","messaging"]'::jsonb,
    1,
    'Concise, persuasive and structure-aware.',
    'Writes hero and section copy from the approved site spec.',
    '{"type":"object","required":["hero","sections","footer_note"]}'::jsonb,
    '{"mode":"manual_replan","result":"copy_revision"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'copy',
    'site-runtime',
    'senior',
    'Especialista em copy estrutural para landing pages, portals e sites institucionais.',
    '{"experience_years":9,"focus_areas":["website messaging","conversion copy","section copy"]}'::jsonb,
    '[{"label":"Wednesday Solutions Agent Skills","url":"https://github.com/wednesday-solutions/ai-agent-skills"}]'::jsonb,
    '["hero copy","section copy","cta text"]'::jsonb,
    'llm',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
  ),
  (
    'site_data_contract_planner',
    'Site Data Contract Planner',
    'strategy',
    ARRAY['website_build'],
    '["forms.contracts","integration.mapping","data.requirements"]'::jsonb,
    1,
    'Operational and schema-aware.',
    'Maps forms, integrations and required data contracts for the site.',
    '{"type":"object","required":["integrations","forms"]}'::jsonb,
    '{"mode":"manual_replan","result":"contract_revision"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'data',
    'site-runtime',
    'senior',
    'Traduz a spec do site em necessidades de dados, forms e integrações.',
    '{"experience_years":8,"focus_areas":["integration planning","form design","data mapping"]}'::jsonb,
    '[{"label":"Spec Driven Dev Skill","url":"https://github.com/kundeng/spec-driven-dev-skill"}]'::jsonb,
    '["integration map","form contracts","data requirements"]'::jsonb,
    'llm',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
  ),
  (
    'site_repo_planner',
    'Site Repo Planner',
    'strategy',
    ARRAY['website_build'],
    '["repo.planning","task.graph","execution.decomposition"]'::jsonb,
    1,
    'Planner-minded and implementation-aware.',
    'Breaks the plan into an execution graph for the multi-file project.',
    '{"type":"object","required":["tasks","critical_path"]}'::jsonb,
    '{"mode":"manual_replan","result":"task_graph_revision"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'repo',
    'site-runtime',
    'lead',
    'Decompõe o build em tarefas claras para execução, revisão e rollback.',
    '{"experience_years":10,"focus_areas":["implementation planning","task orchestration","repo design"]}'::jsonb,
    '[{"label":"Spillwave SDD","url":"https://github.com/SpillwaveSolutions/sdd-skill"}]'::jsonb,
    '["task graph","critical path","repo outputs"]'::jsonb,
    'llm',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
  ),
  (
    'site_builder_executor',
    'Site Builder Executor',
    'design',
    ARRAY['website_build'],
    '["react.multifile","site.generation","project.vfs"]'::jsonb,
    1,
    'Pragmatic, compile-first and artifact-focused.',
    'Generates the multi-file React project that powers the site preview.',
    '{"type":"object","required":["summary","diagnostics","files"]}'::jsonb,
    '{"mode":"manual_replan","result":"project_revision"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'execution',
    'site-runtime',
    'principal',
    'Executa o build do projeto multi-arquivo com foco em compilação, estrutura e UX coerente.',
    '{"experience_years":12,"focus_areas":["frontend execution","React architecture","multifile generation"]}'::jsonb,
    '[{"label":"Anthropic Skills","url":"https://github.com/anthropics/skills"},{"label":"Awesome Agent Skills","url":"https://github.com/heilcheng/awesome-agent-skills"}]'::jsonb,
    '["generated files","build summary","diagnostics"]'::jsonb,
    'llm',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
  ),
  (
    'site_quality_reviewer',
    'Site Quality Reviewer',
    'qa',
    ARRAY['website_build'],
    '["quality.review","design.constitution","build.validation"]'::jsonb,
    1,
    'Skeptical, strict and release-focused.',
    'Validates the generated project against the design constitution and build quality rules.',
    '{"type":"object","required":["approved","summary","issues","handoff_summary"]}'::jsonb,
    '{"mode":"strict_gate","result":"qa_revision"}'::jsonb,
    ARRAY['workflow'],
    TRUE,
    'qa',
    'site-runtime',
    'lead',
    'Gate final para impedir publicação de UI com drift visual ou artefatos frágeis.',
    '{"experience_years":11,"focus_areas":["frontend QA","design review","release gates"]}'::jsonb,
    '[{"label":"Awesome Agent Skills","url":"https://github.com/VoltAgent/awesome-agent-skills"}]'::jsonb,
    '["qa report","findings","handoff summary"]'::jsonb,
    'workflow',
    '{"surface":"vibe-coder","runtime_status":"ready"}'::jsonb
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
  category = EXCLUDED.category,
  ui_group = EXCLUDED.ui_group,
  seniority = EXCLUDED.seniority,
  career_summary = EXCLUDED.career_summary,
  curriculum = EXCLUDED.curriculum,
  source_refs = EXCLUDED.source_refs,
  deliverables = EXCLUDED.deliverables,
  execution_mode = EXCLUDED.execution_mode,
  module_metadata = EXCLUDED.module_metadata,
  updated_at = now();

INSERT INTO public.squad_templates (
  slug,
  name,
  description,
  category,
  module_type,
  runtime_status,
  onboarding_questions,
  default_config,
  source_refs,
  is_system,
  is_active
)
VALUES
  (
    'website-spec-approval-squad',
    'Website Spec Approval Squad',
    'Refina o prompt e gera a spec obrigatoria antes da execucao do site.',
    'website',
    'website_spec',
    'ready',
    '[
      {"id":"core_goal","step":"goal","label":"Objetivo central","type":"textarea","required":true},
      {"id":"primary_outcome","step":"goal","label":"Resultado esperado","type":"text","required":true},
      {"id":"approval_mode","step":"operations","label":"Modo de aprovacao","type":"select","options":["manual","auto"],"required":true}
    ]'::jsonb,
    '{"build_target":"project_vfs","approval_mode":"manual"}'::jsonb,
    '[{"label":"GitHub Spec Kit","url":"https://github.com/github/spec-kit"}]'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'website-build-runtime-squad',
    'Website Build Runtime Squad',
    'Gera plano, task graph, projeto multi-arquivo e QA apos aprovacao da spec.',
    'website',
    'website_build',
    'ready',
    '[
      {"id":"primary_channel","step":"operations","label":"Canal principal","type":"text","required":false},
      {"id":"benchmark_urls","step":"references","label":"Benchmarks","type":"url_list","required":false}
    ]'::jsonb,
    '{"build_target":"project_vfs"}'::jsonb,
    '[{"label":"Spillwave SDD","url":"https://github.com/SpillwaveSolutions/sdd-skill"}]'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'website-refine-blueprint',
    'Website Refine Blueprint',
    'Blueprint para refinamentos incrementais de sites gerados.',
    'website',
    'website_refine',
    'blueprint',
    '[]'::jsonb,
    '{"build_target":"project_vfs"}'::jsonb,
    '[]'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'website-block-build-blueprint',
    'Website Block Build Blueprint',
    'Blueprint para gerar blocos ou seções isoladas a partir de spec.',
    'website',
    'website_block_build',
    'blueprint',
    '[]'::jsonb,
    '{"build_target":"project_vfs"}'::jsonb,
    '[]'::jsonb,
    TRUE,
    TRUE
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  module_type = EXCLUDED.module_type,
  runtime_status = EXCLUDED.runtime_status,
  onboarding_questions = EXCLUDED.onboarding_questions,
  default_config = EXCLUDED.default_config,
  source_refs = EXCLUDED.source_refs,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = now();

WITH templates AS (
  SELECT id, slug
  FROM public.squad_templates
  WHERE slug IN ('website-spec-approval-squad', 'website-build-runtime-squad')
)
INSERT INTO public.squad_template_agents (
  squad_template_id,
  agent_id,
  task_order,
  role_label,
  step_kind,
  depends_on_agent_id,
  is_required,
  input_contract,
  output_contract,
  checkpoint_policy
)
SELECT
  templates.id,
  seeded.agent_id,
  seeded.task_order,
  seeded.role_label,
  'task',
  seeded.depends_on_agent_id,
  TRUE,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
FROM templates
JOIN (
  VALUES
    ('website-spec-approval-squad', 'site_spec_analyst', 1, 'Site Spec Analyst', NULL),
    ('website-build-runtime-squad', 'site_information_architect', 1, 'Information Architect', NULL),
    ('website-build-runtime-squad', 'site_design_system_guardian', 2, 'Design Constitution Guardian', 'site_information_architect'),
    ('website-build-runtime-squad', 'site_copy_architect', 3, 'Copy Architect', 'site_information_architect'),
    ('website-build-runtime-squad', 'site_data_contract_planner', 4, 'Data Contract Planner', 'site_information_architect'),
    ('website-build-runtime-squad', 'site_repo_planner', 5, 'Repo Planner', 'site_copy_architect'),
    ('website-build-runtime-squad', 'site_builder_executor', 6, 'Site Builder Executor', 'site_repo_planner'),
    ('website-build-runtime-squad', 'site_quality_reviewer', 7, 'Quality Reviewer', 'site_builder_executor')
) AS seeded(template_slug, agent_id, task_order, role_label, depends_on_agent_id)
  ON templates.slug = seeded.template_slug
ON CONFLICT (squad_template_id, agent_id) DO UPDATE SET
  task_order = EXCLUDED.task_order,
  role_label = EXCLUDED.role_label,
  depends_on_agent_id = EXCLUDED.depends_on_agent_id;
