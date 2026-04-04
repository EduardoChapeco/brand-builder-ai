# MAPA DE TABELAS — SW-000
**Projeto:** pjwupmxbsricseslxmbr | **Data:** 2026-04-04

## Tabelas do Schema `public` — Grupo Simwork (`sw_`)

| Tabela | RLS | Linhas | Status |
|--------|-----|--------|--------|
| sw_workspaces | ✅ ON | 1 | **ATIVO — Tabela canônica de workspaces** |
| sw_workspace_members | ✅ ON | 1 | **ATIVO — Multi-tenant** |
| sw_plans | ✅ ON | 4 | **ATIVO — Planos pré-seedados** |
| sw_subscriptions | ✅ ON | 0 | ATIVO |
| sw_biolinks | ✅ ON | 0 | **ATIVO — Bio Link principal** |
| sw_biolink_blocks | ✅ ON | 0 | ATIVO |
| sw_biolink_clicks | ✅ ON | 0 | ATIVO |
| sw_sites | ✅ ON | 0 | ATIVO |
| sw_site_pages | ✅ ON | 0 | ATIVO |
| sw_site_sections | ✅ ON | 0 | ATIVO |
| sw_site_versions | ✅ ON | 0 | ATIVO |
| sw_editorial_posts | ✅ ON | 0 | ATIVO — Blog + News |
| sw_editorial_sources | ✅ ON | 0 | ATIVO — RSS Sources |
| sw_editorial_queue | ✅ ON | 0 | ATIVO — RSS Items |
| sw_editorial_tags | ✅ ON | 0 | ATIVO |
| sw_post_tags | ✅ ON | 0 | ATIVO |
| sw_agents | ✅ ON | 0 | ATIVO |
| sw_agent_sessions | ✅ ON | 0 | ATIVO |
| sw_agent_tools | ✅ ON | 6 | ATIVO — 6 ferramentas seedadas |
| sw_simlab_profiles | ✅ ON | 0 | ATIVO |
| sw_brand_kits | ❌ **OFF** | 0 | **⚠️ CRÍTICO: RLS DESABILITADO** |
| sw_briefings | ❌ **OFF** | 0 | **⚠️ CRÍTICO: RLS DESABILITADO** |
| sw_leads | ✅ ON | 0 | ATIVO |
| sw_lead_events | ✅ ON | 0 | ATIVO |
| sw_lead_forms | ✅ ON | 0 | ATIVO |
| sw_form_submissions | ✅ ON | 0 | ATIVO |
| sw_contacts | ✅ ON | 0 | ATIVO |
| sw_contact_activities | ✅ ON | 0 | ATIVO |
| sw_crm_pipelines | ✅ ON | 0 | ATIVO |
| sw_crm_deals | ✅ ON | 0 | ATIVO |
| sw_social_posts | ✅ ON | 0 | ATIVO — PostGen |
| sw_video_projects | ✅ ON | 0 | ATIVO |
| sw_video_tracks | ✅ ON | 0 | ATIVO |
| sw_video_assets | ✅ ON | 0 | ATIVO |
| sw_video_voices | ✅ ON | 0 | ATIVO |
| sw_video_jobs | ✅ ON | 0 | ATIVO |
| sw_analytics_events | ✅ ON | 0 | ATIVO |
| sw_analytics_daily | ✅ ON | 0 | ATIVO |
| sw_analytics_daily_stats | ✅ ON | 0 | ATIVO |
| sw_invoices | ✅ ON | 0 | ATIVO |
| sw_payment_attempts | ✅ ON | 0 | ATIVO |
| sw_credit_ledger | ✅ ON | 0 | ATIVO |
| sw_gateway_configs | ✅ ON | 0 | ATIVO |
| sw_provider_keys | ✅ ON | 0 | ATIVO — Key Orchestrator |
| sw_tickets | ✅ ON | 0 | ATIVO — Suporte |
| sw_ticket_messages | ✅ ON | 0 | ATIVO |
| sw_ticket_ratings | ✅ ON | 0 | ATIVO |
| sw_incidents | ✅ ON | 0 | ATIVO |
| sw_platform_status | ✅ ON | 5 | ATIVO — 5 services seedados |
| sw_feature_flags | ✅ ON | 5 | ATIVO |
| sw_module_configs | ✅ ON | 0 | ATIVO |
| sw_audit_logs | ✅ ON | 0 | ATIVO |
| sw_error_logs | ✅ ON | 0 | **ATIVO — Error logging sw_** |
| sw_system_logs | ✅ ON | 0 | ATIVO |
| sw_assets | ✅ ON | 0 | ATIVO |
| sw_dashboard_widgets | ✅ ON | 0 | ATIVO |
| sw_onboarding_steps | ✅ ON | 0 | ATIVO |
| sw_help_categories | ✅ ON | 8 | ATIVO |
| sw_help_articles | ✅ ON | 0 | ATIVO |
| sw_help_views | ✅ ON | 0 | ATIVO |
| sw_admin_sessions | ✅ ON | 0 | ATIVO |

## Tabelas Legadas (`engios_`)

| Tabela | RLS | Linhas | Status |
|--------|-----|--------|--------|
| engios_workspaces | ✅ ON | 1 | **LEGADO — sw_briefings e sw_brand_kits referem esta tabela** |
| engios_brand_kits | ✅ ON | 0 | LEGADO |
| engios_workspaces | ✅ ON | 1 | LEGADO |
| engios_squad_executions + outros | vários | 0 | LEGADO EngiosAI |

## Tabelas de Sistema

| Tabela | RLS | Linhas | Status |
|--------|-----|--------|--------|
| system_logs | ✅ ON | 0 | Schema DIFERENTE do PRD (sem code, module, workspace_id) |
| system_gaps | ✅ ON | 0 | |
| system_audit_trail | ✅ ON | 1 | |

## ⚠️ PROBLEMAS CRÍTICOS ENCONTRADOS

1. **sw_brand_kits e sw_briefings com RLS DESABILITADO** — qualquer usuário pode ler/escrever dados de outra conta
2. **sw_brand_kits e sw_briefings referenciam engios_workspaces (LEGADO)** ao invés de sw_workspaces — foreign key quebrado para usuários novos
3. **Tabela `publications` do PRD não existe** — o sistema usa estrutura separada: sw_biolinks + sw_sites + sw_editorial_posts
4. **Tabela `agents` do PRD não existe exatamente** — sistema usa sw_agents com tipos diferentes (brand|creator|persona|consumer|operational vs persona|influencer|mascote|squad)
