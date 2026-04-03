# SIMWORK — RELATÓRIO DE AUDITORIA TÉCNICA
**Fase 1.1 | Data: 2026-04-03 | Status: Concluído**

---

## 1. BANCO DE DADOS (Supabase: maordjzuxvkpqfdllyqu — EngiosAi)

### 1.1 Tabelas existentes: 38 tabelas

#### ✅ MANTER — aproveitáveis com renaming e migração

| Tabela atual | Renomear para | Motivo |
|---|---|---|
| `engios_workspaces` | `sw_workspaces` | base do workspace, estrutura sólida |
| `engios_brand_kits` | `sw_brand_kits` | rico, bem estruturado, tem cores/fontes/tom |
| `engios_crm_leads` | `sw_leads` | estrutura completa de CRM |
| `engios_crm_tickets` | `sw_tickets` | suporte com SLA, assignee, status |
| `system_audit_trail` | `sw_audit_logs` | auditoria com before/after state |
| `system_logs` | `sw_system_logs` | logs técnicos existentes |

#### ⚠️ MIGRAR — parcialmente úteis, precisam de colunas novas

| Tabela atual | Ação | O que falta |
|---|---|---|
| `engios_editorial_calendar` | migrar → `sw_social_posts` | falta modo, plataformas, type enum |
| `engios_campaigns` | migrar → `sw_campaigns` | absorver no módulo de conteúdo social |
| `engios_content_outputs` | migrar → `sw_content_outputs` | generalizar output_kind |
| `engios_slides` | migrar → `sw_presentations` | renaming limpo |
| `engios_api_keys_vault` | migrar → `sw_provider_keys` | unificar com `api_keys_vault` (duplicata!) |
| `engios_company_memory` | migrar → `sw_briefings` | renomear, adicionar status e sections |

#### ❌ REMOVER — legado puro, sem uso no novo produto

| Tabela | Motivo da remoção |
|---|---|
| `api_keys_vault` | **duplicata** de `engios_api_keys_vault` (mesmo schema, FK quebrado) |
| `prompt_fragments` | **duplicata** de `engios_prompt_fragments` (0 dados, schema idêntico) |
| `squad_executions` | **duplicata** de `engios_squad_executions` (shadow table) |
| `squad_agent_runs` | **duplicata** de `engios_squad_agent_runs` |
| `squad_checkpoints` | **duplicata** de `engios_squad_checkpoints` |
| `squad_run_events` | **duplicata** de `engios_squad_executions` |
| `system_gaps` | artefato de debug, sem uso no produto |
| `engios_verification_runs` | específico do sistema de squads/verificação legado |
| `engios_verification_reports` | idem acima |
| `engios_source_registry` | idem acima — contexto de fact-checking, não Simwork |
| `engios_skill_catalog` | skill system do EngiosAi, não existe no Simwork |
| `engios_workspace_skill_installs` | idem acima |
| `engios_squads` | sistema de squads do EngiosAi — não é agente Simwork |
| `engios_agents` | agentes do EngiosAi (verificadores) — diferente de sw_agents |
| `engios_agent_squad_roles` | idem |
| `engios_squad_blueprints` | idem |
| `engios_squad_blueprint_agents` | idem |
| `engios_squad_executions` | idem — substituído por sw_agents |
| `engios_squad_agent_runs` | idem |
| `engios_squad_checkpoints` | idem |
| `engios_verification_runs` | idem |
| `engios_requests` | camada de requisições do EngiosAi |
| `engios_publish_jobs` | sistema de publish do EngiosAi, diferente do Simwork |
| `generated_sites` | **duplicata** de `engios_generated_sites` |
| `engios_generated_sites` | substituída por `sw_sites` + `sw_site_pages` + `sw_site_sections` |
| `engios_prompt_fragments` | não usado no Simwork |
| `engios_user_roles` | roles globais antigos — substituído por `sw_workspace_members` |

#### 🆕 CRIAR — tabelas novas do Simwork (não existem)

```
sw_workspaces          sw_workspace_members   sw_plans
sw_subscriptions       sw_credits             sw_credit_ledger
sw_feature_flags       sw_error_logs          sw_incidents
sw_provider_keys       sw_gateway_configs     sw_module_configs
sw_sites               sw_site_pages          sw_site_sections
sw_site_versions       sw_biolinks            sw_biolink_blocks
sw_biolink_clicks      sw_editorial_posts     sw_editorial_sources
sw_editorial_queue     sw_editorial_tags      sw_post_tags
sw_social_posts        sw_social_templates    sw_video_projects
sw_video_tracks        sw_video_assets        sw_video_jobs
sw_video_voices        sw_agents              sw_agent_sessions
sw_agent_tools         sw_simlab_profiles     sw_leads (renaming)
sw_lead_events         sw_crm_pipelines       sw_crm_deals
sw_lead_forms          sw_form_submissions    sw_assets
sw_analytics_events    sw_analytics_daily     sw_help_articles
sw_help_categories     sw_ticket_messages     sw_ticket_ratings
sw_platform_status     sw_onboarding_steps    sw_help_views
sw_dashboard_widgets   sw_invoices            sw_payment_attempts
sw_admin_sessions      sw_brand_kits (rename) sw_briefings
sw_campaigns
```

---

## 2. FRONTEND — PÁGINAS (41 arquivos em `/src/pages/`)

### 2.1 Diagnóstico por arquivo

| Arquivo | Status | Ação |
|---|---|---|
| `AuthPage.tsx` | ✅ manter | refatorar visual para Dark Glassmorphism |
| `WorkspacesPage.tsx` | ✅ manter | refatorar UI |
| `OnboardingPage.tsx` | ✅ manter | simplificar, integrar com novos schemas |
| `DashboardPage.tsx` | ⚠️ refatorar | trocar dados mockados por dados reais |
| `BrandKitPage.tsx` | ✅ manter | ajustar para `sw_brand_kits` |
| `BriefingPage.tsx` | ✅ manter | ajustar para `sw_briefings` |
| `SettingsPage.tsx` | ⚠️ refatorar | unificar abas, remover inglês |
| `BioLinkPage.tsx` | ⚠️ refatorar | conectar com `sw_biolinks` |
| `BioLinkAnalyticsPage.tsx` | ⚠️ refatorar | conectar com `sw_biolink_clicks` |
| `BioLinkCRMPage.tsx` | ⚠️ refatorar | conectar com `sw_leads` |
| `BioLinkThemesPage.tsx` | ⚠️ refatorar | conectar com `sw_biolinks.theme` |
| `BioLinkSettingsPage.tsx` | ⚠️ refatorar | conectar com `sw_biolinks.settings` |
| `BioLinkVersionsPage.tsx` | ⚠️ refatorar | conectar com histórico real |
| `BlogManagerPage.tsx` | ⚠️ refatorar | conectar com `sw_editorial_posts` |
| `NewsPortalPage.tsx` | ⚠️ refatorar | conectar com `sw_editorial_sources` + `sw_editorial_queue` |
| `SiteBuilderPage.tsx` | ⚠️ refatorar | conectar com `sw_sites` |
| `SiteEditorPage.tsx` | ⚠️ refatorar | conectar com layout 4 colunas do master plan |
| `VideoStudioPage.tsx` | ⚠️ refatorar | hub de modos |
| `VideoStudioEditorPage.tsx` | ⚠️ refatorar | timeline multi-track |
| `VideoStudioGeneratePage.tsx` | ⚠️ refatorar | chat mode |
| `VideoStudioMotionPage.tsx` | ⚠️ refatorar | modo Remotion |
| `VideoStudioMotionStudioPage.tsx` | ❌ remover | duplicata de MotionPage |
| `SimLabPage.tsx` | ⚠️ refatorar | integrar com `sw_simlab_profiles` |
| `GeneratorPage.tsx` | ⚠️ refatorar | integrar com `sw_social_posts` |
| `CarouselBuilder.tsx` | ⚠️ absorver | mover para GeneratorPage como submodo |
| `ChatPage.tsx` | ⚠️ refatorar | integrar com sistema de agents |
| `SquadsPage.tsx` | ❌ remover | squads são EngiosAi, não Simwork |
| `ApiKeysPage.tsx` | ✅ redirecionar | já redireciona para settings (ok) |
| `SlidesPage.tsx` | ⚠️ avaliar | out of scope do Simwork v1 |
| `PublicBioLink.tsx` | ✅ manter | página pública do bio link |
| `NotFound.tsx` | ✅ manter | |
| `Index.tsx` | ✅ manter | |
| `ViralAnalyzer.tsx` | ⚠️ avaliar | absorver em analytics |
| `PromptStudio.tsx` | ⚠️ avaliar | absorver em video/agents |
| `ProductShots.tsx` | ⚠️ avaliar | absorver em biblioteca de assets |
| `BrandCharacter.tsx` | ⚠️ absorver | virar tipo de agent no AgentsPage |
| `FeedSimulatorPage.tsx` | ⚠️ absorver | submodo do Social Posts |
| `LibraryPage.tsx` | ✅ manter | refatorar para `sw_assets` |
| `WebClonerPage.tsx` | ❌ remover | fora do escopo Simwork |
| `VibeCoderPage.tsx` | ❌ remover | fora do escopo Simwork |
| `BrandDNAPage.tsx` | ⚠️ absorver | absorver no BrandKitPage |

### 2.2 Páginas a criar (não existem)

```
HubPage.tsx              AdminPage.tsx            AdminUsersPage.tsx
AdminWorkspacesPage.tsx  AdminPlansPage.tsx        AdminModulesPage.tsx
AdminFlagsPage.tsx       AdminBillingPage.tsx      AdminKeysPage.tsx
AdminGatewaysPage.tsx    AdminLogsPage.tsx         AdminIncidentsPage.tsx
AdminSupportPage.tsx     AgentsPage.tsx            AgentEditorPage.tsx
BillingPage.tsx          HelpPage.tsx              SupportPage.tsx
AnalyticsPage.tsx        CRMPage.tsx
```

---

## 3. COMPONENTES — `/src/components/`

### 3.1 Estado atual

| Diretório/Arquivo | Status |
|---|---|
| `AppShell.tsx` (65B!) | ❌ vazio/stub — precisa reconstrução completa |
| `AppSidebar.tsx` | ❌ stub vazio |
| `NavLink.tsx` | ✅ manter e adaptar |
| `biolink/` | ⚠️ refatorar |
| `canvas/` | ⚠️ avaliar |
| `postgen/` | ⚠️ absorver em social posts |
| `shared/` | ✅ inventariar e migrar para design system |
| `simlab/` | ⚠️ refatorar |
| `squads/` | ❌ remover (EngiosAi) |
| `ui/` | ✅ manter base shadcn |
| `video/` | ⚠️ refatorar |
| `website/` | ⚠️ refatorar |

### 3.2 Componentes do Design System a criar

```
SwButton.tsx    SwInput.tsx      SwSelect.tsx   SwBadge.tsx
SwToast.tsx     SwModal.tsx      SwSheet.tsx    SwDropdown.tsx
SwTooltip.tsx   SwCard.tsx       SwSkeleton.tsx SwSpinner.tsx
SwEmptyState.tsx SwTopbar.tsx    SwSidebar.tsx  SwHelpSheet.tsx
SwAssetPicker.tsx SwStatusBadge.tsx
```

---

## 4. ROTAS ATUAIS — Problemas

| Problema | Rota |
|---|---|
| Inglês na URL | `/site-builder`, `/video-studio`, `/brand-kit`, `/blog-manager` |
| Módulo removido ainda na rota | `/squads`, `/web-cloner`, `/vibe-coder` |
| Módulo sem rota | AgentsPage, HubPage, AdminPage, BillingPage, etc. |

### 4.1 Mapa de rotas Simwork

```
/                         → redirect /workspaces
/auth/login               → AuthPage
/workspaces               → WorkspacesPage
/onboarding               → OnboardingPage
/b/:slug                  → PublicBioLink
/workspace/:id/painel     → DashboardPage
/workspace/:id/hub        → HubPage  (NOVO)
/workspace/:id/sites      → SiteBuilderPage
/workspace/:id/sites/:id  → SiteEditorPage
/workspace/:id/biolinks   → BioLinkPage
/workspace/:id/blog       → BlogManagerPage
/workspace/:id/noticias   → NewsPortalPage
/workspace/:id/posts      → GeneratorPage (social)
/workspace/:id/video      → VideoStudioPage
/workspace/:id/agents     → AgentsPage  (NOVO)
/workspace/:id/crm        → CRMPage  (NOVO)
/workspace/:id/analytics  → AnalyticsPage  (NOVO)
/workspace/:id/brand-kit  → BrandKitPage
/workspace/:id/briefing   → BriefingPage
/workspace/:id/assets     → LibraryPage
/workspace/:id/ajuda      → HelpPage  (NOVO)
/workspace/:id/suporte    → SupportPage  (NOVO)
/workspace/:id/cobranca   → BillingPage  (NOVO)
/workspace/:id/config     → SettingsPage
/admin                    → AdminPage  (NOVO)
/admin/usuarios           → AdminUsersPage
/admin/workspaces         → AdminWorkspacesPage
/admin/planos             → AdminPlansPage
/admin/modulos            → AdminModulesPage
/admin/flags              → AdminFlagsPage
/admin/cobranca           → AdminBillingPage
/admin/chaves             → AdminKeysPage
/admin/gateways           → AdminGatewaysPage
/admin/logs               → AdminLogsPage
/admin/incidentes         → AdminIncidentsPage
/admin/suporte            → AdminSupportPage
```

---

## 5. LEGADO A ELIMINAR DA RAIZ DO PROJETO

| Arquivo | Motivo |
|---|---|
| `old_generator.tsx` | backup manual — não deve estar na raiz |
| `replace_generator.cjs` | script de patching manual |
| `replace_generator.py` | idem |
| `replace_squads.cjs` | idem |
| `db_push.cjs` | script de workaround |
| `run_migrations_direct.cjs` | idem |
| `patch-types.js` | gambiarra de tipos |
| `_MASTER_MIGRATION_FIX.sql` | SQL de emergência |
| `implementation_plan_v3.md` | substituído pelo SIMWORK-MASTER-PLAN.md |
| `implementation_plan_v4.md` | idem |
| `supabase_results.txt` | debug artifacts |
| `supabase_results_2.txt` | idem |
| `deploy_log.txt` | idem |
| `deploy_out.txt` | idem |
| `run_migrations_direct.txt` | idem |
| `lint_errors.log` | idem |
| `lint_errors_utf8.log` | idem |

---

## 6. ORDEM DE EXECUÇÃO VALIDADA

```
Passo 1: Limpar raiz (arquivos legado acima)
Passo 2: Criar migration sw_foundation (tabelas globais sw_*)
Passo 3: Criar migration sw_creators (sites, biolinks, editorial, video, agents)
Passo 4: Criar migration sw_operations (crm, billing, admin, analytics, help)
Passo 5: Reconstruir AppShell + Sidebar + Design System tokens
Passo 6: Recriar App.tsx com rotas PT-BR
Passo 7: Reconstuir módulos por fase (4→5→6→7→8...)
```

---

*Auditoria técnica Simwork v1.0 | 2026-04-03*
