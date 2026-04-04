# CODEX CONVERGENCE PLAN - 2026-04-04

## Objetivo

Convergir o repositorio, o SWdb live e os docs para uma unica plataforma canonica, com:

- uma fonte de verdade por modulo
- um historico de migrations reproduzivel
- edge functions e frontend alinhados ao schema real
- rotas e modulos sem caminhos paralelos

## Diagnostico de Drift

O estado atual nao pede "mais patches". Pede controle de baseline.

Diagnostico:

- o SWdb live nao pode ser reconstruido com seguranca apenas pelo estado atual de `supabase/migrations`
- o app consulta tabelas e colunas que o live nao expõe
- varios modulos usam dois contratos ao mesmo tempo
- ha recursao de RLS em `workspace_members`, contaminando `brand_kits` e `briefings`
- a documentacao descreve uma convergencia que ainda nao aconteceu

Decisao operacional:

- nao aplicar cegamente a cadeia atual de migrations no SWdb
- nao continuar escrevendo novas telas em cima de contratos duplos
- tratar o live atual como baseline operacional a ser congelado e reconciliado

## Andamento Ja Concluido Nesta Rodada

- a duplicidade de rota publica de BioLink foi removida em `src/App.tsx`
- `/b/:slug` e `/l/:slug` agora apontam para uma unica implementacao publica
- `npm run build` voltou a passar localmente
- `Notícias` e `Vídeo` sairam da navegação ativa e agora caem em tela de indisponibilidade controlada
- foi adicionada a migration candidata `20260404120000_fix_workspace_members_rls_recursion.sql` para resolver a recursao de `workspace_members`

Isso reduz um P0 de compilacao, mas nao muda o diagnostico estrutural do banco e dos contratos.

## Matriz Canonica por Modulo

| Modulo | Frontend / runtime usado hoje | Estado live conhecido | Status | Decisao canonica recomendada |
| --- | --- | --- | --- | --- |
| Workspace shell | `workspaces`, `workspace_members`, `brand_kits`, `briefings` | `workspaces` responde; `workspace_members`, `brand_kits`, `briefings` falham por RLS recursivo | quebrado | manter as tabelas atuais e corrigir RLS antes de qualquer refactor |
| Sites | `websites/*` e `publications/*` convivem | `websites/*` nao existe; `publications/*` existe, mas `publications.settings` e `publication_sections.updated_at` nao existem | drift/quebrado | padronizar em `publications/*` se o live seguir como base; remover caminho `websites/*` do app ou migrar o live primeiro |
| BioLink | runtime publico duplicado; editor em `publications` + `publication_blocks` | `bio_links` nao existe; `publications/*` e `publication_blocks` existem | quebrado | padronizar em `publications(type='biolink')` + `publication_blocks` |
| Blog | `blog_articles`, `blog-generate`, SimLab e Remotion | `blog_articles` existe; `source_url` nao existe | drift | manter `blog_articles`, ajustar function e tipos ao contrato real ou forward-migrar o live |
| News | `news_items`, `news-fetch`, `rss_sources`, `rss_feeds` | `news_items` e `rss_feeds` nao existem; `rss_items` e `rss_sources` existem, mas `rss_sources.url` nao existe | quebrado | escolher uma linha: migrar tudo para `rss_items`/`rss_sources` ou subir `news_items`/`rss_feeds` no live |
| Settings / keys / feeds | `workspace_api_keys`, `rss_sources`; handlers legados usam `api_keys`, `rss_feeds` | `workspace_api_keys` e `rss_sources` existem com colunas diferentes; `api_keys` e `rss_feeds` nao existem | quebrado | escolher `workspace_api_keys` + `rss_sources` como base e alinhar handlers/colunas |
| Billing / Support | `subscriptions`, `invoices`, `support_tickets` | tabelas existem, mas queries do app pedem colunas que nao existem | drift | recontratar o frontend ao schema real ou forward-migrar o schema antes de manter as telas |
| CRM | `leads` | `leads` existe e o contrato principal responde | quase ok | manter `leads` e limpar tipos/docs |
| Agents | `agents` | `agents` existe; select real do hook responde | ok com drift documental | manter `agents` e limpar docs/tipos residuais |
| Video / Remotion | `video_projects`, `video_assets`, `layer_compositions`, `remotion_compositions`, `video_jobs` | nada disso existe no live | quebrado | ou o modulo sai do shell ate o schema existir, ou o schema vai ao live antes de manter UI/runtime |
| Admin / Logs | `profiles`, `system_logs`, `admin_api_keys` | respondem no live | drift | manter tabelas atuais e alinhar contratos, ids e naming |

## Migration Path Recomendado

### Recomendacao

Usar **baseline controlado + forward migrations por modulo**.

Isso significa:

1. congelar o SWdb live como verdade operacional atual
2. extrair schema real e policies reais do ambiente
3. criar um baseline novo e limpo para local/staging
4. aplicar forward migrations pequenas e explicitas por modulo
5. apos a convergencia, aposentar a cadeia hibrida antiga

### O que nao fazer

- nao rodar toda a pasta `supabase/migrations` atual contra o SWdb
- nao gerar novos tipos como se o repo ja fosse canonico
- nao continuar adicionando bridges entre tabelas paralelas
- nao "resolver" drift apenas no frontend

## Backup e Cutover

Antes de qualquer mudanca estrutural em schema ou RLS:

1. tirar dump completo de schema e dados do SWdb
2. exportar policies atuais, functions, triggers e extensoes ativas
3. registrar tabela por tabela o que existe no live
4. criar um staging/clone para validar replay das migrations novas
5. congelar deploys de frontend e functions durante a janela de RLS

Cutover notes:

- RLS primeiro em janela controlada
- schema antes de edge functions
- edge functions antes do frontend
- docs e tipos so depois da validacao tecnica

## Ordem de Rollout

1. backup do SWdb e inventario real do schema
2. correcoes de RLS em `workspace_members`
3. decisao canonica de tabelas por modulo
4. baseline novo para local/staging
5. forward migrations do modulo Workspace
6. convergencia de BioLink e fechamento do build
7. convergencia de Sites
8. convergencia de Settings / keys / feeds
9. convergencia de Billing / Support
10. convergencia de Blog / News
11. decidir Video / Remotion: deployar schema ou tirar do shell
12. regenerar tipos
13. alinhar edge functions
14. alinhar frontend
15. limpar docs e remover trilhas legadas

## Rollback

- manter dump pre-cutover
- separar migrations por modulo, nunca em lote grande
- evitar `DROP` destrutivo antes de uma release estavel
- usar route gating para modulos ainda nao convergidos
- manter funcoes antigas desligadas por rotas/feature flags antes de deletar tabelas

## Backlog Priorizado

### P0

- corrigir RLS recursivo em `workspace_members`
- consolidar definitivamente o runtime publico de BioLink no restante do codigo
- decidir a fonte unica de verdade para Sites
- decidir a fonte unica de verdade para keys/feeds
- congelar o baseline real do SWdb antes de novas migrations

### P1

- alinhar Blog e News a um pipeline editorial unico
- alinhar Billing / Support ao schema real
- alinhar Admin / Logs ao projeto e naming reais
- regenerar tipos a partir do baseline escolhido
- remover docs que marcam `PASS` sem evidencia tecnica

### P2

- decidir se Video / Remotion entra no live ou sai do shell por enquanto
- remover tabelas, routes e bridges legadas apos uma release estavel
- reduzir arquivos espelho de tipos e adapters temporarios

## Tranche 1 - Ataque Imediato

Objetivo:

- parar de aumentar o drift
- estabilizar o shell central
- fechar o build
- impedir que modulos sem schema live continuem parecendo prontos

Escopo da tranche:

1. `T01`: congelar baseline real do SWdb
2. `T02`: revisar, aplicar em staging/live e validar a migration de RLS de `workspace_members`
3. `T04`: consolidar o runtime publico de BioLink alem da correção do router
4. gate provisoria para Video / Remotion e para fluxos `news_items` enquanto nao houver schema live
5. decisao formal de fonte unica para Sites e para keys/feeds

Saidas obrigatorias:

- dump/schema inventory armazenado
- `workspace_members`, `brand_kits` e `briefings` respondendo `200`
- `npm run build` passando
- uma unica rota publica de BioLink
- shell sem links ativos para modulos que dependem de tabelas ausentes no live
- documento de decisao canonica para Sites e Settings

Critério de encerramento:

- a equipe consegue abrir o app sem cair em RLS recursivo
- o repo volta a buildar
- fica claro, por modulo, qual tabela e a verdade
- o proximo ciclo pode atacar convergencia estrutural sem ambiguidade

## Task Graph

| ID | Owner | Titulo | Dependencias | Saida esperada |
| --- | --- | --- | --- | --- |
| T01 | `site_data_contract_planner` | Congelar baseline real do SWdb | - | dump, inventario de tabelas/policies e mapa repo vs live final |
| T02 | `site_data_contract_planner` | Corrigir RLS de `workspace_members` | T01 | migration de policy + validacao REST `200` para `workspace_members`, `brand_kits`, `briefings` |
| T03 | `site_repo_planner` | Decidir a tabela canonica por modulo | T01 | decisao formal para Sites, BioLink, News, keys/feeds e Video |
| T04 | `site_builder_executor` | Corrigir build e runtime publico de BioLink | T02, T03 | `npm run build` passando e uma unica rota publica de BioLink |
| T05 | `site_builder_executor` | Convergir Sites para um unico backend | T02, T03 | listagem, editor e publish usando a mesma linha de dados |
| T06 | `site_builder_executor` | Convergir Settings / keys / feeds | T02, T03 | UI, functions e schema usando as mesmas tabelas e colunas |
| T07 | `site_builder_executor` | Recontratar Billing / Support ao schema real | T01 | queries do frontend voltando `200` no live ou em staging |
| T08 | `site_builder_executor` | Unificar pipeline Blog / News | T03 | fluxo unico noticia -> extracao -> artigo com tabelas reais |
| T09 | `site_builder_executor` | Gatear ou ativar Video / Remotion | T03 | shell sem rotas quebradas ou schema live deployado |
| T10 | `site_quality_reviewer` | Regenerar tipos e validar repositorio | T04, T05, T06, T07, T08, T09 | tipos unicos, build/lint/test/smoke REST aprovados |
| T11 | `site_quality_reviewer` | Limpar docs e selar baseline canonico | T10 | docs coerentes com o que roda de fato |

## Critical Path

`T01 -> T02 -> T03 -> T04/T05/T06 -> T10 -> T11`

## Blockers

- falta de baseline limpo do SWdb
- recursao de RLS no modulo central de workspace
- ausencia de decisao canonica para Sites, News, keys/feeds e Video
- tipos concorrentes no repo

## QA Gates

### Gate A - Banco

- `workspace_members`, `brand_kits` e `briefings` respondem `200`
- queries reais do app deixam de retornar `column does not exist`

### Gate B - Build

- `npm run build` passa
- rotas publicas e internas criticas nao duplicam runtime

### Gate C - Contrato

- `select`s reais de Sites, BioLink, Settings, Billing e Support retornam `200`
- edge functions param de usar tabelas ausentes no live

### Gate D - Release

- `npm run lint`
- `npm test`
- smoke manual de shell, Sites, BioLink, Blog/News, Settings e Admin

## Evidencias Base

Arquivos e areas que sustentam este plano:

- `src/App.tsx`
- `src/pages/PublicBioLink.tsx`
- `src/pages/BioLinkPublicPage.tsx`
- `src/lib/biolink/service.ts`
- `src/pages/SiteBuilderPage.tsx`
- `src/lib/websites/service.ts`
- `src/lib/sites/service.ts`
- `src/hooks/useWebsiteBuilder.ts`
- `src/pages/SettingsPage.tsx`
- `src/pages/BillingPage.tsx`
- `src/pages/SupportPage.tsx`
- `src/pages/NewsPortalPage.tsx`
- `supabase/functions/news-fetch/index.ts`
- `supabase/functions/blog-generate/index.ts`
- `src/pages/VideoStudioPage.tsx`
- `src/pages/VideoStudioEditorPage.tsx`
- `src/pages/admin/AdminDashboardPage.tsx`
- `docs/audit/codex-live-audit-2026-04-04.md`

## Veredito

O projeto nao precisa de "mais uma fase". Precisa de uma convergencia disciplinada.

Enquanto `workspace_members` estiver recursivo e Sites/BioLink/News/Video continuarem com contratos paralelos, qualquer nova feature aumenta o drift e piora a reproducibilidade do produto.
