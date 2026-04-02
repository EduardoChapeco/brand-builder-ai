-- ============================================================
-- SimLab v2 - catalog seeds
-- ============================================================

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
VALUES (
  'simlab_validator',
  'SimLab Validator',
  'synthesis',
  ARRAY['content_post', 'slide_deck', 'blog_article', 'bio_link', 'brand_character', 'trend_signal', 'squad_validation'],
  '["validate.content","validate.journey","validate.character","validate.trend","score.variants","synthesize.insights"]'::jsonb,
  1,
  'Scientific, adversarial, fail-closed',
  $$
You are the canonical SimLab Validator for the SaaS platform.
You evaluate content, journeys, characters and trends against Brazilian personas and must fail closed on ambiguity.
Return strict, structured judgments, not generic advice.
  $$,
  '{"type":"object","required":["verdict","summary","segment_scores","blockers","improvements"]}'::jsonb,
  '{"mode":"fail_closed","on_error":"failed"}'::jsonb,
  ARRAY['llm', 'database'],
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

INSERT INTO public.simlab_module_policies (
  id,
  module_type,
  policy_key,
  policy_json,
  is_default,
  is_active
)
VALUES
  (
    'd1111111-1111-4111-8111-111111111111',
    'content_post',
    'default',
    '{
      "persona_sample_size_min": 2,
      "persona_sample_size_max": 4,
      "agents_per_persona": 5,
      "perturbation_rate": 0.2,
      "fail_closed": true,
      "requires_variant_selection": true
    }'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'd2222222-2222-4222-8222-222222222222',
    'slide_deck',
    'default',
    '{
      "persona_sample_size_min": 2,
      "persona_sample_size_max": 4,
      "agents_per_persona": 5,
      "perturbation_rate": 0.2,
      "fail_closed": true,
      "review_by_slide": true
    }'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'd3333333-3333-4333-8333-333333333333',
    'blog_article',
    'default',
    '{
      "persona_sample_size_min": 2,
      "persona_sample_size_max": 3,
      "agents_per_persona": 5,
      "perturbation_rate": 0.2,
      "fail_closed": true,
      "review_for_clarity": true
    }'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'd4444444-4444-4444-8444-444444444444',
    'bio_link',
    'default',
    '{
      "persona_sample_size_min": 2,
      "persona_sample_size_max": 4,
      "agents_per_persona": 5,
      "perturbation_rate": 0.2,
      "fail_closed": true,
      "review_for_journey": true
    }'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'd5555555-5555-4555-8555-555555555555',
    'brand_character',
    'default',
    '{
      "persona_sample_size_min": 3,
      "persona_sample_size_max": 4,
      "agents_per_persona": 5,
      "perturbation_rate": 0.2,
      "fail_closed": true,
      "review_for_alignment": true
    }'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'd6666666-6666-4666-8666-666666666666',
    'trend_signal',
    'default',
    '{
      "persona_sample_size_min": 2,
      "persona_sample_size_max": 3,
      "agents_per_persona": 3,
      "perturbation_rate": 0.2,
      "fail_closed": true,
      "review_for_actionability": true
    }'::jsonb,
    TRUE,
    TRUE
  ),
  (
    'd7777777-7777-4777-8777-777777777777',
    'squad_validation',
    'default',
    '{
      "persona_sample_size_min": 2,
      "persona_sample_size_max": 4,
      "agents_per_persona": 5,
      "perturbation_rate": 0.2,
      "fail_closed": true,
      "review_for_operability": true
    }'::jsonb,
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  module_type = EXCLUDED.module_type,
  policy_key = EXCLUDED.policy_key,
  policy_json = EXCLUDED.policy_json,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  updated_at = now();

