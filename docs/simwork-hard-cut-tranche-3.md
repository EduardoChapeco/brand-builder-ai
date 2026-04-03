# Simwork Hard Cut — Tranche 3

Data: 2026-04-03  
Status: concluído localmente

## Entregas desta tranche

- Criação das migrations:
  - `20260403100000_sw_foundation.sql`
  - `20260403100001_sw_creators.sql`
  - `20260403100002_sw_operations.sql`
- Introdução do schema `sw_*` com:
  - base de workspace, membership, logs, ajuda e dashboard
  - bootstrap inicial de `workspaces`, `workspace_members`, `brand_kits`, `briefings`
  - bootstrap inicial de `websites`, `website_pages`, `website_sections`, `bio_links`, `bio_link_blocks`, `rss_feeds`, `posts_v2`
- Novo helper backend:
  - `supabase/functions/_shared/simwork-access.ts`
- Nova edge function:
  - `supabase/functions/sw-log/index.ts`
- Reescrita do `WorkspaceContext` para:
  - remover bypass de `owner`
  - usar `sw_workspace_members`, `sw_workspaces`, `sw_brand_kits`, `sw_briefings`
  - manter aliases legados de shape para não quebrar as telas existentes
- Reconciliação do shell:
  - `App.tsx` com rotas Simwork PT-BR
  - `AppShell.tsx` novo com `WorkspaceSidebar`, `SwTopbar` e `SwHelpSheet`
  - `workspaceNavigation.ts` canônico
- Novas páginas operacionais base:
  - `HubPage.tsx`
  - `AgentsPage.tsx`
  - `CRMPage.tsx`
  - `AnalyticsPage.tsx`
  - `HelpPage.tsx`
  - `SupportPage.tsx`
  - `BillingPage.tsx`
  - `AdminPage.tsx`
- Refatoração do `DashboardPage.tsx` para layout operacional, removendo a antiga cara de landing page.
- Reescrita de `index.css` com UTF-8 limpo, tokens consolidados e constituição sem sombras.

## Validação

- `npm run build`: PASS
- `npm test -- siteDesignConstitution`: PASS

## Pendências abertas para a próxima tranche

- Aplicar as migrations no ambiente Supabase.
- Migrar os módulos restantes do frontend para leitura/escrita direta em `sw_*`:
  - `SettingsPage`
  - `BrandKitPage`
  - `BriefingPage`
  - `BioLink*`
  - `Site*`
  - `BlogManagerPage`
  - `NewsPortalPage`
  - `GeneratorPage`
  - `VideoStudio*`
- Criar subrotas administrativas reais (`/admin/*`).
- Ligar `sw-log` ao `try/catch` das edge functions existentes.
- Completar RLS nas tabelas `sw_*` criadas nas migrations de creators e operations.
