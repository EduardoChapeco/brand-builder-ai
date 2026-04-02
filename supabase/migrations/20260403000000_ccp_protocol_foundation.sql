-- ============================================================
-- CCP (Cerebro Context Protocol) — Schema Foundation
-- Migration: 20260403000000_ccp_protocol_foundation.sql
-- ============================================================
-- Cria a tabela de prompt templates externos (iteráveis sem redeploy)
-- e adiciona o campo ccp_context JSONB em todos os outputs de usuário.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Tabela: ccp_prompt_templates
-- Armazena prompt templates versionados para todos os agentes.
-- Benefícios: hot-swap sem redeploy, A/B testing, auditoria.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ccp_prompt_templates (
  id              TEXT PRIMARY KEY,       -- ex: 'agent.trend_researcher.v2'
  agent_id        TEXT NOT NULL,          -- ex: 'trend_researcher'
  version         INT NOT NULL DEFAULT 1,
  system_xml      TEXT NOT NULL,          -- template com slots {{ccp_brand_xml}}, {{signals}}
  user_xml        TEXT NOT NULL,
  output_schema   JSONB NOT NULL DEFAULT '{}',  -- JSON Schema do output esperado
  token_budget    INT DEFAULT 2000,       -- limite máximo aceitável (monitorável)
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ccp_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Service role tem acesso total
CREATE POLICY "service_full_access_ccp_prompt_templates"
  ON ccp_prompt_templates FOR ALL
  USING (auth.role() = 'service_role');

-- Usuários autenticados podem ler (para debug/studio)
CREATE POLICY "authenticated_read_ccp_prompt_templates"
  ON ccp_prompt_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 2. Índice: busca por agent_id ativo (hot path de todos os pipelines)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ccp_prompt_templates_agent_active
  ON ccp_prompt_templates (agent_id, version DESC)
  WHERE is_active = true;

-- ──────────────────────────────────────────────────────────────
-- 3. ADD COLUMN ccp_context — outputs de usuário
-- Cada output publicável expõe contexto estruturado para agentes.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE bio_links
  ADD COLUMN IF NOT EXISTS ccp_context JSONB DEFAULT '{}';

ALTER TABLE blog_articles
  ADD COLUMN IF NOT EXISTS ccp_context JSONB DEFAULT '{}';

ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS ccp_context JSONB DEFAULT '{}';

ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS ccp_context JSONB DEFAULT '{}';

ALTER TABLE scroll_sections
  ADD COLUMN IF NOT EXISTS ccp_context JSONB DEFAULT '{}';

ALTER TABLE video_projects
  ADD COLUMN IF NOT EXISTS ccp_context JSONB DEFAULT '{}';

-- ──────────────────────────────────────────────────────────────
-- 4. Índices GIN para busca dentro de ccp_context
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bio_links_ccp_context
  ON bio_links USING GIN (ccp_context);

CREATE INDEX IF NOT EXISTS idx_blog_articles_ccp_context
  ON blog_articles USING GIN (ccp_context);

CREATE INDEX IF NOT EXISTS idx_scroll_sections_ccp_context
  ON scroll_sections USING GIN (ccp_context);

-- ──────────────────────────────────────────────────────────────
-- 5. Seed: Prompt Templates dos 6 agentes do pipeline de posts
-- Versão inicial — iterável sem redeploy futuro
-- ──────────────────────────────────────────────────────────────
INSERT INTO ccp_prompt_templates (id, agent_id, version, system_xml, user_xml, output_schema, token_budget, notes)
VALUES

-- TREND RESEARCHER
('agent.trend_researcher.v1', 'trend_researcher', 1,
'<agent id="pulse" role="trend_researcher" v="1"/>
<rules>
- Respond in pt-BR
- Select ONLY from provided signals — never invent external facts
- Recommend actionable angle for immediate social content
</rules>
<output_schema>agent.trend_researcher.v1</output_schema>',
'<ctx>{{ccp_brand_xml}}</ctx>
<signals>{{signals_compact_json}}</signals>
<task>Select best signal. Return JSON matching schema.</task>',
'{
  "type": "object",
  "required": ["angle", "chosen_signal", "supporting_points", "references", "recommended_window"],
  "properties": {
    "angle": {"type": "string"},
    "recommended_window": {"type": "string"},
    "chosen_signal": {
      "type": "object",
      "required": ["source_type", "title", "reason"],
      "properties": {
        "source_type": {"type": "string", "enum": ["news_item","viral_pattern","benchmark"]},
        "title": {"type": "string"},
        "url": {"type": ["string","null"]},
        "reason": {"type": "string"}
      }
    },
    "supporting_points": {"type": "array", "items": {"type": "string"}},
    "references": {"type": "array", "items": {"type": "string"}}
  }
}',
400,
'Trend researcher agent. Input: brand XML + signals compact JSON.'),

-- CONTENT STRATEGIST
('agent.content_strategist.v1', 'content_strategist', 1,
'<agent id="axis" role="content_strategist" v="1"/>
<rules>
- Respond in pt-BR
- Choose format based on trend complexity (carousel 4–8 slides, single for punchy hooks)
- Slide structure must match slides_count exactly
</rules>
<output_schema>agent.content_strategist.v1</output_schema>',
'<ctx>{{ccp_brand_xml}}</ctx>
<trend>{{trend_json}}</trend>
<task>Define content structure: format, template, slides arc, CTA. Return JSON matching schema.</task>',
'{
  "type": "object",
  "required": ["format","slides_count","template","theme","slide_structure","cta","title"],
  "properties": {
    "format": {"type": "string", "enum": ["single","carousel"]},
    "slides_count": {"type": "integer", "minimum": 1, "maximum": 8},
    "template": {"type": "string"},
    "theme": {"type": "string"},
    "cta": {"type": "string"},
    "title": {"type": "string"},
    "slide_structure": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["index","type","key_message"],
        "properties": {
          "index": {"type": "integer"},
          "type": {"type": "string"},
          "key_message": {"type": "string"}
        }
      }
    }
  }
}',
500,
'Content strategist — depends on trend_researcher output.'),

-- CONTENT WRITER
('agent.content_writer.v1', 'content_writer', 1,
'<agent id="quill" role="content_writer" v="1"/>
<rules>
- Respond in pt-BR
- Copy must match brand tone exactly
- slides array MUST match slides_count from strategy
- Hashtags: 8–12, mix of niche + broad
</rules>
<output_schema>agent.content_writer.v1</output_schema>',
'<ctx>{{ccp_brand_minimal_xml}}</ctx>
<strategy>{{strategy_json}}</strategy>
<task>Write slide copy, caption and hashtags. Return JSON matching schema.</task>',
'{
  "type": "object",
  "required": ["slides","caption","hashtags"],
  "properties": {
    "slides": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["index","headline","body"],
        "properties": {
          "index": {"type": "integer"},
          "headline": {"type": "string"},
          "body": {"type": "string"},
          "cta": {"type": ["string","null"]}
        }
      }
    },
    "caption": {"type": "string"},
    "hashtags": {"type": "string"}
  }
}',
550,
'Content writer — depends on content_strategist. Uses minimal brand XML (tone only).'),

-- CONTENT DESIGNER
('agent.content_designer.v1', 'content_designer', 1,
'<agent id="canvas" role="content_designer" v="1"/>
<rules>
- Output self-contained HTML per slide (no external CSS imports)
- Fixed canvas: 1080x1920px (9:16 Reels/Stories) or 1080x1080px (Feed)
- Use only: colors from palette, fonts from brand
- slides_html array MUST match slides_count
</rules>
<output_schema>agent.content_designer.v1</output_schema>',
'<palette p="{{color_primary}}" s="{{color_secondary}}" a="{{color_accent}}"/>
<fonts h="{{font_headline}}" b="{{font_body}}"/>
<strategy>{{strategy_json}}</strategy>
<copy>{{writer_json}}</copy>
<template_guide>{{template_guide}}</template_guide>
<task>Generate slides_html array. Each item: complete self-contained HTML. Return JSON matching schema.</task>',
'{
  "type": "object",
  "required": ["slides_html","template"],
  "properties": {
    "slides_html": {"type": "array", "items": {"type": "string"}},
    "template": {"type": "string"}
  }
}',
800,
'Content designer — depends on writer. Receives only visual tokens from brand (not full context).'),

-- CONTENT QA
('agent.content_qa.v1', 'content_qa', 1,
'<agent id="gate" role="content_qa" v="1"/>
<rules>
- Review brand consistency, copy quality, HTML correctness
- Assemble final_post from approved materials
- If issues found, document them but still assemble best version
</rules>
<output_schema>agent.content_qa.v1</output_schema>',
'<strategy>{{strategy_json}}</strategy>
<writer>{{writer_json}}</writer>
<designer>{{designer_json}}</designer>
<task>Review and assemble final post payload. Return JSON matching schema.</task>',
'{
  "type": "object",
  "required": ["approved","summary","issues","final_post"],
  "properties": {
    "approved": {"type": "boolean"},
    "summary": {"type": "string"},
    "issues": {"type": "array", "items": {"type": "string"}},
    "final_post": {
      "type": "object",
      "required": ["title","format","slides_html","caption","hashtags","template","slides_count"],
      "properties": {
        "title": {"type": "string"},
        "format": {"type": "string", "enum": ["single","carousel"]},
        "slides_html": {"type": "array", "items": {"type": "string"}},
        "caption": {"type": "string"},
        "hashtags": {"type": "string"},
        "template": {"type": "string"},
        "slides_count": {"type": "integer"}
      }
    }
  }
}',
600,
'QA agent — receives outputs from all previous agents. Does NOT re-receive full brand context.'),

-- SCROLL SECTION GENERATOR (Video Studio)
('agent.scroll_section.v1', 'scroll_section_generator', 1,
'<agent id="motion" role="scroll_section_generator" v="1"/>
<rules>
- Respond in pt-BR
- Generate content for immersive web section with scroll effects
- effect_type: parallax|sticky|video_scrub|fade_reveal|horizontal_drag|morph_scale
- Choose content that highlights brand differentials visually
</rules>
<output_schema>agent.scroll_section.v1</output_schema>',
'<ctx>{{ccp_brand_xml}}</ctx>
<objective>{{objective}}</objective>
<effect_type>{{scroll_effect_type}}</effect_type>
<task>Generate section content, headline, body and CTA. Return JSON matching schema.</task>',
'{
  "type": "object",
  "required": ["name","headline","body","cta_label","renderer_config"],
  "properties": {
    "name": {"type": "string"},
    "headline": {"type": "string"},
    "body": {"type": "string"},
    "cta_label": {"type": ["string","null"]},
    "renderer_config": {"type": "object"}
  }
}',
350,
'Scroll section generator — aligns motion sections with brand context.')

ON CONFLICT (id) DO UPDATE
  SET system_xml = EXCLUDED.system_xml,
      user_xml = EXCLUDED.user_xml,
      output_schema = EXCLUDED.output_schema,
      token_budget = EXCLUDED.token_budget,
      updated_at = now();
