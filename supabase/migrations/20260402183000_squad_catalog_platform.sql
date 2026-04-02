-- ============================================================
-- Squad Catalog & Platform Onboarding
-- Real, workspace-backed agent and squad configuration layer
-- ============================================================

ALTER TABLE public.agent_registry
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS ui_group TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS seniority TEXT,
  ADD COLUMN IF NOT EXISTS career_summary TEXT,
  ADD COLUMN IF NOT EXISTS curriculum JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_refs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'llm',
  ADD COLUMN IF NOT EXISTS module_metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.squad_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  module_type TEXT NOT NULL,
  runtime_status TEXT NOT NULL DEFAULT 'ready',
  onboarding_questions JSONB DEFAULT '[]'::jsonb,
  default_config JSONB DEFAULT '{}'::jsonb,
  source_refs JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.squad_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.squad_template_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_template_id UUID NOT NULL REFERENCES public.squad_templates(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES public.agent_registry(id) ON DELETE RESTRICT,
  task_order INTEGER NOT NULL DEFAULT 0,
  role_label TEXT,
  step_kind TEXT NOT NULL DEFAULT 'task',
  depends_on_agent_id TEXT REFERENCES public.agent_registry(id) ON DELETE SET NULL,
  is_required BOOLEAN DEFAULT TRUE,
  input_contract JSONB DEFAULT '{}'::jsonb,
  output_contract JSONB DEFAULT '{}'::jsonb,
  checkpoint_policy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (squad_template_id, task_order),
  UNIQUE (squad_template_id, agent_id)
);

ALTER TABLE public.squad_template_agents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.workspace_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  squad_template_id UUID NOT NULL REFERENCES public.squad_templates(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'configured',
  goal TEXT,
  primary_outcome TEXT,
  channel TEXT,
  cadence TEXT,
  approval_mode TEXT,
  benchmark_urls JSONB DEFAULT '[]'::jsonb,
  onboarding_answers JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

ALTER TABLE public.workspace_squads ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_squads_default_idx
  ON public.workspace_squads(workspace_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS squad_templates_module_status_idx
  ON public.squad_templates(module_type, runtime_status, created_at DESC);

CREATE INDEX IF NOT EXISTS squad_template_agents_template_order_idx
  ON public.squad_template_agents(squad_template_id, task_order);

CREATE INDEX IF NOT EXISTS workspace_squads_workspace_status_idx
  ON public.workspace_squads(workspace_id, status, created_at DESC);

ALTER TABLE public.agent_prds
  ADD COLUMN IF NOT EXISTS squad_template_id UUID REFERENCES public.squad_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_squad_id UUID REFERENCES public.workspace_squads(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'squad_templates' AND policyname = 'Allow all for squad_templates'
  ) THEN
    CREATE POLICY "Allow all for squad_templates"
      ON public.squad_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'squad_template_agents' AND policyname = 'Allow all for squad_template_agents'
  ) THEN
    CREATE POLICY "Allow all for squad_template_agents"
      ON public.squad_template_agents FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workspace_squads' AND policyname = 'Allow all for workspace_squads'
  ) THEN
    CREATE POLICY "Allow all for workspace_squads"
      ON public.workspace_squads FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_squad_templates_updated_at') THEN
      CREATE TRIGGER update_squad_templates_updated_at
        BEFORE UPDATE ON public.squad_templates
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspace_squads_updated_at') THEN
      CREATE TRIGGER update_workspace_squads_updated_at
        BEFORE UPDATE ON public.workspace_squads
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
    'content_strategist',
    'Content Strategist',
    'strategy',
    ARRAY['content_post'],
    '["content.strategy","social.hooks","content.structure"]'::jsonb,
    2,
    'Strategic, editorial and conversion-aware.',
    'Defines the structure, hook logic and CTA for social-first outputs.',
    '{"type":"object","required":["format","slides_count","template","theme","slide_structure","cta","title"]}'::jsonb,
    '{"mode":"heuristic","result":"strategy_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'strategy',
    'content-engine',
    'principal',
    'Perfil senior de estrategia editorial com foco em posicionamento, escaneabilidade e conversao de conteudo social.',
    '{"experience_years":12,"focus_areas":["social strategy","content arcs","editorial systems","funnel mapping"],"training":["brand strategy","growth experimentation","content planning"]}'::jsonb,
    '[{"label":"OpenSquad README","url":"https://github.com/renatoasse/opensquad"},{"label":"marketing-skills","url":"https://github.com/kostja94/marketing-skills"}]'::jsonb,
    '["post brief","slide arc","cta strategy","template direction"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"ready"}'::jsonb
  ),
  (
    'content_writer',
    'Content Writer',
    'copy',
    ARRAY['content_post'],
    '["content.copy","captions","hashtags"]'::jsonb,
    2,
    'Sharp, concise and channel-aware.',
    'Writes post copy, captions and hook-driven microcopy.',
    '{"type":"object","required":["slides","caption","hashtags"]}'::jsonb,
    '{"mode":"heuristic","result":"writer_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'copy',
    'content-engine',
    'senior',
    'Perfil de copy social-first especializado em headlines, narrativa curta e CTA de baixa friccao.',
    '{"experience_years":10,"focus_areas":["social copy","captions","hook writing","conversion copy"],"training":["behavioral messaging","brand voice systems","short-form writing"]}'::jsonb,
    '[{"label":"OpenSquad README","url":"https://github.com/renatoasse/opensquad"},{"label":"insta-cog","url":"https://github.com/openclaw/skills/blob/main/skills/nitishgargiitd/insta-cog/SKILL.md"}]'::jsonb,
    '["slide copy","caption","hashtags","channel adaptation"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"ready"}'::jsonb
  ),
  (
    'content_designer',
    'Content Designer',
    'design',
    ARRAY['content_post'],
    '["html5.social.design","layout","brand.visuals"]'::jsonb,
    2,
    'Visual, production-oriented and brand-governed.',
    'Transforms approved strategy and copy into HTML social slides.',
    '{"type":"object","required":["slides_html","template"]}'::jsonb,
    '{"mode":"template_fallback","result":"designer_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'design',
    'content-engine',
    'senior',
    'Perfil de direcao de arte aplicado a conteudo social, com foco em hierarquia, contraste e consistencia de brand kit.',
    '{"experience_years":10,"focus_areas":["visual systems","social layout","brand identity","design QA"],"training":["typography","layout systems","brand design"]}'::jsonb,
    '[{"label":"OpenSquad README","url":"https://github.com/renatoasse/opensquad"},{"label":"marketing-skills","url":"https://github.com/kostja94/marketing-skills"}]'::jsonb,
    '["html slides","template system","visual hierarchy","brand alignment"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"ready"}'::jsonb
  ),
  (
    'content_qa',
    'Content QA',
    'qa',
    ARRAY['content_post'],
    '["quality.review","brand.consistency","assembly"]'::jsonb,
    2,
    'Strict, skeptical and production-focused.',
    'Audits the final chain and assembles production payloads.',
    '{"type":"object","required":["approved","summary","final_post"]}'::jsonb,
    '{"mode":"assembly_fallback","result":"qa_fallback"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'qa',
    'content-engine',
    'lead',
    'Perfil de quality gate editorial para garantir coerencia de ponta a ponta, sem sucesso falso.',
    '{"experience_years":11,"focus_areas":["content QA","brand consistency","delivery review","artifact assembly"],"training":["editorial review","quality systems","content governance"]}'::jsonb,
    '[{"label":"OpenSquad README","url":"https://github.com/renatoasse/opensquad"},{"label":"awesome-agent-skills","url":"https://github.com/heilcheng/awesome-agent-skills"}]'::jsonb,
    '["quality summary","issue list","final payload","approval signal"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"ready"}'::jsonb
  ),
  (
    'trend_researcher',
    'Trend Researcher',
    'strategy',
    ARRAY['content_post','content_calendar'],
    '["trend.discovery","news.curating","topic.prioritization"]'::jsonb,
    1,
    'Observational, signal-driven and concise.',
    'Maps trend signals, reference URLs and urgency for reactive content squads.',
    '{"type":"object","required":["signals","angle","recommended_window"]}'::jsonb,
    '{"mode":"manual_context","result":"workspace_trends"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'research',
    'growth-intelligence',
    'senior',
    'Perfil especializado em radar de tendencias, sinais de oportunidade e traducao de contexto externo para agenda editorial.',
    '{"experience_years":8,"focus_areas":["trend monitoring","news curation","social listening","editorial timing"],"training":["content intelligence","trend spotting","market synthesis"]}'::jsonb,
    '[{"label":"OpenSquad radar","url":"https://github.com/renatoasse/opensquad"},{"label":"OpenSquad README","url":"https://github.com/renatoasse/opensquad"}]'::jsonb,
    '["trend brief","reference set","priority angle","timing recommendation"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"blueprint"}'::jsonb
  ),
  (
    'audience_researcher',
    'Audience Researcher',
    'strategy',
    ARRAY['content_post','content_calendar'],
    '["audience.mapping","persona.synthesis","message.fit"]'::jsonb,
    1,
    'Customer-aware, evidence-driven and practical.',
    'Translates workspace briefing and competitor data into audience-ready guidance.',
    '{"type":"object","required":["audience_summary","pain_points","angles"]}'::jsonb,
    '{"mode":"workspace_context","result":"briefing_projection"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'research',
    'growth-intelligence',
    'senior',
    'Perfil de pesquisa aplicada a audiencia, dores e linguagem para evitar conteudo genericamente bonito e operacionalmente fraco.',
    '{"experience_years":9,"focus_areas":["persona research","message-market fit","voice calibration"],"training":["qualitative synthesis","ICP design","market positioning"]}'::jsonb,
    '[{"label":"claude-skills","url":"https://github.com/alirezarezvani/claude-skills"},{"label":"marketing-skills","url":"https://github.com/kostja94/marketing-skills"}]'::jsonb,
    '["audience synthesis","pain-point map","angle recommendations"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"blueprint"}'::jsonb
  ),
  (
    'content_calendar_strategist',
    'Content Calendar Strategist',
    'strategy',
    ARRAY['content_calendar'],
    '["calendar.planning","campaign.mapping","channel.mix"]'::jsonb,
    1,
    'Systematic, channel-aware and cadence-first.',
    'Designs a practical multi-week content calendar with channel and asset balance.',
    '{"type":"object","required":["calendar","themes","channel_mix"]}'::jsonb,
    '{"mode":"planning","result":"calendar_blueprint"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'planning',
    'growth-intelligence',
    'principal',
    'Perfil de planejamento editorial orientado por cadencia, canais e reaproveitamento de ativos.',
    '{"experience_years":12,"focus_areas":["editorial calendars","campaign sequencing","content repurposing"],"training":["content ops","campaign planning","editorial management"]}'::jsonb,
    '[{"label":"content calendar template","url":"https://github.com/alirezarezvani/claude-skills/blob/main/marketing-skill/content-creator/assets/content_calendar_template.md?plain=1"},{"label":"marketing-skills","url":"https://github.com/kostja94/marketing-skills"}]'::jsonb,
    '["calendar blueprint","channel plan","asset dependencies","campaign sequencing"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"blueprint"}'::jsonb
  ),
  (
    'social_media_analyst',
    'Social Media Analyst',
    'qa',
    ARRAY['content_calendar','performance_review'],
    '["social.analytics","benchmarking","roi.readout"]'::jsonb,
    1,
    'Analytical, benchmark-aware and action-oriented.',
    'Reads performance exports and converts them into optimization guidance.',
    '{"type":"object","required":["performance_summary","drivers","recommendations"]}'::jsonb,
    '{"mode":"input_dependent","result":"manual_export_required"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'analytics',
    'growth-intelligence',
    'lead',
    'Perfil analitico focado em leitura de performance social, benchmarking e recomendacoes acionaveis.',
    '{"experience_years":9,"focus_areas":["campaign analysis","engagement diagnostics","ROI heuristics"],"training":["marketing analytics","social reporting","performance optimization"]}'::jsonb,
    '[{"label":"social-media-analyzer","url":"https://github.com/alirezarezvani/claude-code-skill-factory/blob/dev/generated-skills/social-media-analyzer/SKILL.md"},{"label":"claude-code-skill-factory","url":"https://github.com/alirezarezvani/claude-code-skill-factory"}]'::jsonb,
    '["performance dashboard","trend diagnosis","optimization recommendations"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"blueprint"}'::jsonb
  ),
  (
    'campaign_architect',
    'Campaign Architect',
    'strategy',
    ARRAY['content_calendar','campaign_launch'],
    '["campaign.structure","asset.mapping","launch.sequence"]'::jsonb,
    1,
    'Cross-channel, structured and launch-oriented.',
    'Defines campaign asset trees, sequencing and deliverable dependencies.',
    '{"type":"object","required":["campaign_frames","deliverables","handoffs"]}'::jsonb,
    '{"mode":"planning","result":"campaign_blueprint"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'planning',
    'campaign-systems',
    'principal',
    'Perfil de arquitetura de campanhas e lancamentos, com foco em dependencias, handoffs e fluxo multiativo.',
    '{"experience_years":13,"focus_areas":["campaign planning","launch orchestration","asset ops"],"training":["go-to-market","campaign systems","multi-channel operations"]}'::jsonb,
    '[{"label":"OpenSquad README","url":"https://github.com/renatoasse/opensquad"},{"label":"marketing-skills","url":"https://github.com/kostja94/marketing-skills"}]'::jsonb,
    '["campaign map","asset tree","handoff plan","launch sequence"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"blueprint"}'::jsonb
  ),
  (
    'brand_voice_guardian',
    'Brand Voice Guardian',
    'qa',
    ARRAY['content_post','content_calendar'],
    '["brand.voice","consistency.audit","message.governance"]'::jsonb,
    1,
    'Consistent, opinionated and governance-driven.',
    'Prevents drift between brand promise, channel language and output format.',
    '{"type":"object","required":["voice_risks","approved_guidelines","edits"]}'::jsonb,
    '{"mode":"review","result":"voice_guardrail"}'::jsonb,
    ARRAY['llm'],
    TRUE,
    'governance',
    'content-engine',
    'lead',
    'Perfil responsavel por proteger identidade verbal, padroes de tom e regras nao-negociaveis da marca.',
    '{"experience_years":10,"focus_areas":["brand voice","messaging systems","content review"],"training":["editorial governance","brand messaging","style systems"]}'::jsonb,
    '[{"label":"claude-skills","url":"https://github.com/alirezarezvani/claude-skills"},{"label":"awesome-agent-skills","url":"https://github.com/heilcheng/awesome-agent-skills"}]'::jsonb,
    '["voice audit","non-negotiable rules","message refinements"]'::jsonb,
    'llm',
    '{"surface":"platform","runtime_status":"blueprint"}'::jsonb
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
    'brand-builder-growth-squad',
    'Brand Builder Growth Squad',
    'Squad operacional para transformar contexto da marca em posts sociais com aprovacao estruturada e especializacao por papel.',
    'always_on_content',
    'content_post',
    'ready',
    '[
      {"id":"core_goal","step":"goal","label":"Objetivo principal","type":"textarea","required":true,"placeholder":"Ex: crescer autoridade e gerar leads qualificados com conteudo semanal."},
      {"id":"primary_channel","step":"operations","label":"Canal principal","type":"select","required":true,"options":["Instagram","LinkedIn","Multi-channel"]},
      {"id":"cadence","step":"operations","label":"Cadencia editorial","type":"select","required":true,"options":["Diaria","3x por semana","Semanal"]},
      {"id":"approval_mode","step":"operations","label":"Modo de aprovacao","type":"select","required":true,"options":["Checkpoint em cada etapa","Aprovacao final somente","Execucao assistida"]},
      {"id":"primary_outcome","step":"operations","label":"Resultado principal","type":"select","required":true,"options":["Autoridade","Leads","Engajamento","Reaproveitamento"]},
      {"id":"benchmark_urls","step":"references","label":"Benchmarks ou referencias","type":"url_list","required":false,"placeholder":"Uma URL por linha"},
      {"id":"non_negotiables","step":"references","label":"Nao-negociaveis da marca","type":"textarea","required":false,"placeholder":"Elementos que nunca podem sair do tom ou do visual"}
    ]'::jsonb,
    '{"primary_channel":"Instagram","cadence":"3x por semana","approval_mode":"Checkpoint em cada etapa","primary_outcome":"Autoridade"}'::jsonb,
    '[{"label":"OpenSquad","url":"https://github.com/renatoasse/opensquad"},{"label":"marketing-skills","url":"https://github.com/kostja94/marketing-skills"}]'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'news-to-carousel-squad',
    'News to Carousel Squad',
    'Fluxo reativo para transformar sinais quentes, noticias e referencias em carrosseis com narrativa, copy e direcao visual.',
    'reactive_content',
    'content_post',
    'ready',
    '[
      {"id":"core_goal","step":"goal","label":"Movimento que voce quer gerar","type":"textarea","required":true,"placeholder":"Ex: reagir mais rapido a tendencias e virar referencia no nicho."},
      {"id":"primary_channel","step":"operations","label":"Canal principal","type":"select","required":true,"options":["Instagram","LinkedIn"]},
      {"id":"cadence","step":"operations","label":"Ritmo de publicacao","type":"select","required":true,"options":["Sob demanda","2x por semana","Semanal"]},
      {"id":"approval_mode","step":"operations","label":"Modo de aprovacao","type":"select","required":true,"options":["Checkpoint em cada etapa","Aprovacao final somente"]},
      {"id":"primary_outcome","step":"operations","label":"Objetivo editorial","type":"select","required":true,"options":["Top of mind","Engajamento","Lead magnet"]},
      {"id":"benchmark_urls","step":"references","label":"Fontes ou perfis de referencia","type":"url_list","required":false,"placeholder":"URLs de noticias, perfis ou concorrentes"},
      {"id":"signal_guardrails","step":"references","label":"Filtros de relevancia","type":"textarea","required":false,"placeholder":"Ex: so reagir a IA aplicada a marketing e SaaS B2B"}
    ]'::jsonb,
    '{"primary_channel":"Instagram","cadence":"Sob demanda","approval_mode":"Checkpoint em cada etapa","primary_outcome":"Top of mind"}'::jsonb,
    '[{"label":"OpenSquad trend radar","url":"https://github.com/renatoasse/opensquad"},{"label":"insta-cog","url":"https://github.com/openclaw/skills/blob/main/skills/nitishgargiitd/insta-cog/SKILL.md"}]'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'authority-calendar-squad',
    'Authority Calendar Squad',
    'Blueprint multiagente para desenhar cadencia, temas, analise e mix de canais antes da execucao editorial.',
    'planning',
    'content_calendar',
    'blueprint',
    '[
      {"id":"core_goal","step":"goal","label":"Objetivo do calendario","type":"textarea","required":true,"placeholder":"Ex: estruturar 30 dias de conteudo para autoridade em marketing B2B."},
      {"id":"primary_channel","step":"operations","label":"Canal lider","type":"select","required":true,"options":["LinkedIn","Instagram","Blog + Social","Multi-channel"]},
      {"id":"cadence","step":"operations","label":"Cadencia desejada","type":"select","required":true,"options":["Diaria","3x por semana","Semanal"]},
      {"id":"approval_mode","step":"operations","label":"Modo de validacao","type":"select","required":true,"options":["Revisao semanal","Aprovacao final somente","Execucao assistida"]},
      {"id":"primary_outcome","step":"operations","label":"Meta dominante","type":"select","required":true,"options":["Autoridade","Pipeline","Nutricao","SEO"]},
      {"id":"benchmark_urls","step":"references","label":"Benchmarks editoriais","type":"url_list","required":false,"placeholder":"Uma URL por linha"},
      {"id":"campaign_windows","step":"references","label":"Janelas de campanha","type":"textarea","required":false,"placeholder":"Lancamentos, eventos, datas comerciais e momentos de pico"}
    ]'::jsonb,
    '{"primary_channel":"LinkedIn","cadence":"3x por semana","approval_mode":"Revisao semanal","primary_outcome":"Autoridade"}'::jsonb,
    '[{"label":"content calendar template","url":"https://github.com/alirezarezvani/claude-skills/blob/main/marketing-skill/content-creator/assets/content_calendar_template.md?plain=1"},{"label":"social-media-analyzer","url":"https://github.com/alirezarezvani/claude-code-skill-factory/blob/dev/generated-skills/social-media-analyzer/SKILL.md"}]'::jsonb,
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

WITH template_ids AS (
  SELECT id, slug FROM public.squad_templates
),
template_agent_rows AS (
  SELECT
    (SELECT id FROM template_ids WHERE slug = 'brand-builder-growth-squad') AS squad_template_id,
    'content_strategist'::TEXT AS agent_id,
    1 AS task_order,
    'Lead Strategist'::TEXT AS role_label,
    NULL::TEXT AS depends_on_agent_id,
    '{"input":"workspace context + growth goal"}'::jsonb AS input_contract,
    '{"output":"content brief + angle"}'::jsonb AS output_contract,
    '{"mode":"checkpoint","label":"Approve strategic direction"}'::jsonb AS checkpoint_policy
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'brand-builder-growth-squad'),
    'content_writer', 2, 'Lead Copywriter', 'content_strategist',
    '{"input":"approved strategy"}'::jsonb,
    '{"output":"copy deck + caption"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'brand-builder-growth-squad'),
    'content_designer', 3, 'Visual Designer', 'content_writer',
    '{"input":"approved copy + brand kit"}'::jsonb,
    '{"output":"html slides"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'brand-builder-growth-squad'),
    'content_qa', 4, 'Final Reviewer', 'content_designer',
    '{"input":"strategy + copy + design"}'::jsonb,
    '{"output":"approved final payload"}'::jsonb,
    '{"mode":"checkpoint","label":"Approve final output"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'news-to-carousel-squad'),
    'trend_researcher', 1, 'Trend Radar', NULL,
    '{"input":"signals + reference urls"}'::jsonb,
    '{"output":"priority trend angle"}'::jsonb,
    '{"mode":"checkpoint","label":"Approve chosen signal"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'news-to-carousel-squad'),
    'content_strategist', 2, 'Carousel Strategist', 'trend_researcher',
    '{"input":"approved signal + workspace context"}'::jsonb,
    '{"output":"carousel brief"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'news-to-carousel-squad'),
    'content_writer', 3, 'Carousel Copywriter', 'content_strategist',
    '{"input":"carousel brief"}'::jsonb,
    '{"output":"slide copy + caption"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'news-to-carousel-squad'),
    'content_designer', 4, 'Creative Designer', 'content_writer',
    '{"input":"copy + visual tone"}'::jsonb,
    '{"output":"carousel html"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'news-to-carousel-squad'),
    'content_qa', 5, 'Delivery Reviewer', 'content_designer',
    '{"input":"assembled output"}'::jsonb,
    '{"output":"delivery decision"}'::jsonb,
    '{"mode":"checkpoint","label":"Approve publication-ready carousel"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'authority-calendar-squad'),
    'audience_researcher', 1, 'Audience Mapper', NULL,
    '{"input":"briefing + competitors"}'::jsonb,
    '{"output":"audience synthesis"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'authority-calendar-squad'),
    'social_media_analyst', 2, 'Performance Analyst', 'audience_researcher',
    '{"input":"workspace metrics + exported data"}'::jsonb,
    '{"output":"performance diagnosis"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'authority-calendar-squad'),
    'content_calendar_strategist', 3, 'Calendar Planner', 'social_media_analyst',
    '{"input":"audience + analytics + campaign windows"}'::jsonb,
    '{"output":"calendar blueprint"}'::jsonb,
    '{"mode":"checkpoint","label":"Approve calendar direction"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'authority-calendar-squad'),
    'campaign_architect', 4, 'Campaign Architect', 'content_calendar_strategist',
    '{"input":"calendar + business windows"}'::jsonb,
    '{"output":"asset map + sequencing"}'::jsonb,
    '{"mode":"none"}'::jsonb
  UNION ALL SELECT
    (SELECT id FROM template_ids WHERE slug = 'authority-calendar-squad'),
    'brand_voice_guardian', 5, 'Voice Guardian', 'campaign_architect',
    '{"input":"calendar + voice rules"}'::jsonb,
    '{"output":"governance notes"}'::jsonb,
    '{"mode":"checkpoint","label":"Approve editorial guardrails"}'::jsonb
)
INSERT INTO public.squad_template_agents (
  squad_template_id,
  agent_id,
  task_order,
  role_label,
  depends_on_agent_id,
  input_contract,
  output_contract,
  checkpoint_policy
)
SELECT
  squad_template_id,
  agent_id,
  task_order,
  role_label,
  depends_on_agent_id,
  input_contract,
  output_contract,
  checkpoint_policy
FROM template_agent_rows
WHERE squad_template_id IS NOT NULL
ON CONFLICT (squad_template_id, agent_id) DO UPDATE SET
  task_order = EXCLUDED.task_order,
  role_label = EXCLUDED.role_label,
  depends_on_agent_id = EXCLUDED.depends_on_agent_id,
  input_contract = EXCLUDED.input_contract,
  output_contract = EXCLUDED.output_contract,
  checkpoint_policy = EXCLUDED.checkpoint_policy;
