# MAPA DE ROTAS — SDD-1.0

A auditoria confirmou que as rotas estão refletindo as implementações canônicas mais recentes, e as páginas de administração estáticas antigas já foram migradas.

| Rota | Componente Declarado | Arquivo Existe? | Observação |
| ----------------------------------- | -------------------- | --------------- | ---------- |
| `/` | *NA* (`Navigate`) | SIM | Redireciona para `/workspaces` |
| `/auth/login` | `AuthPage` | SIM | Fluxo base Auth |
| `/workspaces` | `WorkspacesPage` | SIM | Lista de Tenants |
| `/onboarding` | `OnboardingPage` | SIM | Criação de workspace |
| `/b/:slug` e `/l/:slug` | `PublicBioLink` | SIM | Runtime público BioLink |
| `/admin` | `AdminDashboardPage` | SIM | Dashboard global (Substituiu `AdminPage`) |
| `/admin/chaves-ia` | `AdminChavesIAPage` | SIM | Cofre Global IA |
| `/admin/logs` | `AdminSystemLogsPage` | SIM | Monitoramento zero-silêncio |
| `/admin/usuarios` | `AdminUsersPage` | SIM | Gestão de membros |
| `/admin/workspaces` | `AdminWorkspacesPage`| SIM | Auditoria de tenants SaaS |
| `/workspace/:workspaceId/*` | `AppShell` | SIM | Layout protegido SDD |
| `/workspace/:workspaceId/painel` | `DashboardPage` | SIM | Painel do Workspace |
| `/workspace/:workspaceId/sites` | `SiteBuilderPage` | SIM | Migrado para Canonico |
| `/workspace/:workspaceId/biolinks` | `BioLinkModuleLayout`| SIM | Módulo Canonico SDD |
| `/workspace/:workspaceId/blog` | `BlogManagerPage` | SIM | Baseado em `blog_articles` |
| `/workspace/:workspaceId/video` | `VideoStudioPage` | SIM | Integrado ao Remotion |
| `/workspace/:workspaceId/config` | `SettingsPage` | SIM | Integrado a settings json |

*Nota:* Existia uma possível duplicação de declaração de rotea para BioLink public (`PublicBioLink` vs `BioLinkPublicPage`), a ser verificada no root.
