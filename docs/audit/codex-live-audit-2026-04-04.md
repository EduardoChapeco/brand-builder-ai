# CODEX LIVE AUDIT - 2026-04-04

## Escopo

Auditoria direta do repositório e verificacao parcial do SWdb exposto pelo projeto `pjwupmxbsricseslxmbr`.

Camadas revisadas:

- frontend, rotas, hooks, forms, CRUDs e guards
- migrations, tipos, schemas e RLS
- edge functions, runtime de video e integracoes
- docs e audits existentes versus implementacao real
- validacao local de `build`, `lint` e `test`
- verificacao do banco live via REST com a mesma URL publica configurada no app

## Veredito

O sistema tem muita implementacao real, mas nao esta convergido para um contrato unico.

Hoje o estado observado e:

- build local volta a fechar apos a unificacao da rota publica de BioLink em `App.tsx`
- drift estrutural entre frontend, migrations, tipos e banco live
- RLS contraditorio e com falha objetiva em runtime
- docs descrevendo um estado mais estavel do que o codigo realmente entrega

Nao considero o projeto hoje "canonico", "reproduzivel" ou "fechado" apenas a partir do repositorio atual.

## Achados Principais

### 1. Build quebrado no runtime publico de BioLink

- `src/pages/PublicBioLink.tsx` importa `loadPublishedBioLinkBySlug`, mas `src/lib/biolink/service.ts` exporta `loadBioLinkPublicSnapshot`.
- `src/App.tsx` declara `/b/:slug` duas vezes, apontando para duas implementacoes publicas diferentes.
- `PublicBioLink` e `BioLinkPublicPage` usam contratos diferentes para o renderer.

Impacto observado no inicio da auditoria:

- o projeto nao fechava `npm run build`
- o runtime publico de BioLink nao tinha uma implementacao unica

Status apos correcao local desta rodada:

- `App.tsx` passou a expor uma unica implementacao publica via `BioLinkPublicPage`
- `npm run build` agora passa

### 2. Site Builder em dois backends diferentes

O repo hoje mistura dois modelos:

- stack nova: `websites`, `website_pages`, `website_sections`
- stack ativa no editor: `publications`, `publication_sections`

Impacto:

- a biblioteca de sites e o editor nao compartilham a mesma fonte de verdade
- o fluxo "Novo site visual" navega para `sites/new`, mas o editor espera um id real

### 3. Banco live nao expõe o schema novo de sites

Verificacao via REST do SWdb mostrou:

- `websites`: 404
- `website_pages`: 404
- `website_sections`: 404

Ao mesmo tempo, o banco live responde `200` para:

- `publications`
- `publication_sections`
- `publication_blocks`

Conclusao:

- o frontend novo de sites depende de tabelas que o SWdb live nao esta expondo
- a stack de `publications/*` continua sendo a verdade operacional do ambiente atual

### 4. Banco live nao expõe BioLink V3

Verificacao via REST do SWdb mostrou:

- `bio_links`: 404

Enquanto isso, o repo possui migrations e tipos para `bio_links`, `bio_link_blocks` e `bio_link_versions`.

Conclusao:

- o modelo BioLink V3 do repositorio nao esta refletido no banco live exposto ao app

### 5. RLS do workspace esta falhando em runtime no SWdb

Consultas REST no banco live retornaram:

- `workspace_members`: HTTP 500 com `infinite recursion detected in policy for relation "workspace_members"`
- `briefings`: HTTP 500 pela mesma recursao
- `brand_kits`: HTTP 500 pela mesma recursao

Impacto:

- carregamento de shell, contexto do workspace, briefing e brand kit pode falhar mesmo com as tabelas existentes
- o problema nao e teorico: ele esta visivel no banco live

### 6. RLS e migrations sao contraditorios

As migrations fazem movimentos conflitantes:

- hardening real em `workspace_members` e tabelas centrais
- bypass de leitura publica em `20260403050000_dev_bypass_rls.sql`
- reabertura massiva com `Allow all` em `20260402204100_legacy_workspace_client_compat.sql`

Conclusao:

- o estado final de seguranca depende do historico aplicado, nao do discurso de "schema canonico"

### 7. Tipos e contratos de dados estao em drift

Ha pelo menos tres "verdades" concorrentes no repo:

- `src/integrations/supabase/types.ts`
- `src/types/app.types.ts`
- `src/types/database.ts`

Exemplos:

- `WorkspaceContext` le `plan`, `status`, `trial_ends_at`, `settings`, `updated_at`
- o tipo gerado ainda descreve `workspaces` como tabela minima
- `BrandKitPage`, `BriefingPage` e `OnboardingPage` gravam payloads JSON/nested
- as migrations principais continuam modelando varias dessas tabelas como contratos flat

### 8. Settings, billing, support e CRM usam tabelas que o repo nao versiona como fonte unica

O frontend usa diretamente:

- `workspace_api_keys`
- `subscriptions`
- `invoices`
- `support_tickets`
- `leads`
- `profiles`
- `system_logs`

No banco live, essas tabelas respondem `200`.

No repo:

- `workspace_api_keys`, `subscriptions`, `invoices`, `support_tickets`, `profiles`, `system_logs`, `leads` nao aparecem como linha canonica unificada nas migrations revisadas
- o shim `db-custom.ts` declara varias delas como se fossem "canonicas", mas isso nao corresponde a um contrato versionado unico

Conclusao:

- parte relevante da plataforma depende de schema live que nao esta claramente reconstruivel a partir do repositorio

### 9. Integracoes e runtime possuem gaps reais

Confirmado no codigo:

- `analytics-beacon` e chamado pelo frontend e nao existe em `supabase/functions`
- Settings salva `workspace_api_keys`, mas handlers criticos usam `api_keys`
- `rss_sources` e usado na UI, enquanto fluxos legados ainda usam `rss_feeds`
- caminho de Remotion usa ids/entidades incompatíveis
- jobs `render_generated_video` e `enhance_video` sao enfileirados, mas o `video-runtime` marca como nao suportados
- `sw-brand-generate` e `sw-briefing-generate` retornam mock/fallback quando falta chave

Status apos esta rodada:

- `Notícias` e `Vídeo` foram retirados da navegação ativa e passaram a cair em tela de indisponibilidade controlada no shell, porque o SWdb live auditado nao expõe `news_items` nem o schema `video_*`
- foi adicionada uma migration candidata para resolver a recursao de `workspace_members` sem depender de bypass total: `supabase/migrations/20260404120000_fix_workspace_members_rls_recursion.sql`

### 10. Admin e documentacao estao em drift com o ambiente real

Confirmado no repo:

- `AdminDashboardPage` mostra um project id diferente do `supabase/config.toml`
- docs de auditoria afirmam estabilizacao que o codigo nao confirma
- README e parte do material ainda carregam residuos do Lovable

## Validacoes Executadas

### Validacao local

- `npm run build`: passou apos a consolidacao da rota publica de BioLink em `App.tsx`
- `npm run lint`: falhou com 68 erros e 15 warnings
- `npm test`: passou, mas com apenas 4 testes rasos

### Validacao do SWdb via REST

Tabelas com resposta `200`:

- `workspaces`
- `publications`
- `publication_sections`
- `publication_blocks`
- `profiles`
- `system_logs`
- `workspace_api_keys`
- `rss_sources`
- `subscriptions`
- `invoices`
- `support_tickets`
- `leads`

Tabelas com resposta `404`:

- `websites`
- `website_pages`
- `website_sections`
- `bio_links`
- `api_keys`
- `rss_feeds`
- `sw_system_logs`

Tabelas com falha de policy:

- `workspace_members`
- `briefings`
- `brand_kits`

### Contrato live detalhado

- `workspaces`: responde para `id,name,slug,logo_url,plan,status,trial_ends_at,settings,created_at,updated_at`. `avatar_url` nao existe.
- `workspace_members`: `select *` falha com `infinite recursion detected in policy for relation "workspace_members"`.
- `brand_kits` e `briefings`: as tabelas existem, mas `select *` tambem falha pela mesma recursao de policy. Alem disso, o live nao possui `created_at` nessas tabelas.
- `publications`: suporta o contrato usado por `usePublications`, mas nao possui `settings`. Isso quebra a expectativa de `useSites`.
- `publication_sections`: existe, mas `updated_at` nao existe.
- `publication_blocks`: existe e atende o contrato real de BioLink baseado em `block_type`, `content` e `is_active`.
- `workspace_api_keys`: existe, mas `provider` nao existe.
- `rss_sources`: existe, mas `url` nao existe.
- `subscriptions`: existe, mas `updated_at` nao existe.
- `invoices`: existe, mas `amount` nao existe.
- `support_tickets`: existe, mas `title` nao existe.
- `agents`: existe e atende `useAgents`, mas `status` nao existe.
- `blog_articles`: `select *` funciona, mas `source_url` nao existe.
- `rss_items`: `select *` funciona, mas `rss_source_id` nao existe.
- `profiles` e `admin_api_keys`: os contratos testados pelo admin respondem no live.
- `websites`, `website_pages`, `website_sections`, `bio_links`, `news_items`, `rss_feeds`, `api_keys`, `video_projects`, `video_assets`, `layer_compositions`, `remotion_compositions` e `video_jobs`: nao existem no SWdb live.

## Matriz de Divergencia por Modulo

### Workspace shell e onboarding

- Docs e audits descrevem a camada de workspace como estabilizada.
- O repo carrega `workspaces`, `workspace_members`, `brand_kits` e `briefings`.
- No SWdb live, `workspaces` responde, mas `workspace_members`, `brand_kits` e `briefings` falham por recursao de RLS.
- Resultado: o shell central do produto ainda depende de uma policy quebrada em producao.

### Sites

- A documentacao fala em rotas canonicas e builder estabilizado.
- O repo esta dividido entre `websites/*` e `publications/*`.
- O SWdb live nao expõe `websites`, `website_pages` nem `website_sections`.
- O SWdb live sustenta `publications/*`, mas sem `publications.settings` e sem `publication_sections.updated_at`.
- Resultado: a verdade operacional do live e `publications/*`, mas o frontend de Sites ainda nao convergiu para esse contrato.

### BioLink

- Os audits afirmam que BioLink ja migrou para `publications(type='biolink')`.
- O repo ainda tem duas implementacoes publicas, rota duplicada e codigo quebrando build.
- O SWdb live nao expõe `bio_links`.
- Resultado: o runtime publico de BioLink nao tem fonte unica de verdade nem no app nem no banco.

### Blog e News

- `blog_articles` existe no live e o Blog Manager consegue operar em cima de `select *`.
- A Edge Function `blog-generate` espera `source_url` e integra com `news_items`.
- `news_items` nao existe no SWdb live.
- `rss_items` existe, mas `news-fetch` continua misturando `rss_sources`, `rss_feeds` e `news_items`.
- Resultado: blog parcial, news quebrado, e a cadeia noticia -> extracao -> artigo nao bate com o banco live.

### Settings, chaves e feeds

- A UI usa `workspace_api_keys` e `rss_sources`.
- Edge functions e fluxos legados ainda usam `api_keys` e `rss_feeds`.
- No live, `workspace_api_keys` e `rss_sources` existem, mas sem as colunas esperadas pela UI (`provider` e `url`).
- `api_keys` e `rss_feeds` nao existem no live.
- Resultado: o modulo de configuracoes esta apoiado em dois contratos incompatíveis ao mesmo tempo.

### Billing e Support

- `subscriptions`, `invoices` e `support_tickets` existem no live.
- As queries do frontend pedem colunas que nao existem no live (`subscriptions.updated_at`, `invoices.amount`, `support_tickets.title`).
- Resultado: nao e ausencia de tabela; e drift de contrato entre pagina e banco real.

### CRM e Agents

- `leads` existe e o contrato principal do CRM responde.
- `agents` existe e o select real de `useAgents` responde.
- Mesmo assim, o repo e os docs continuam misturando narrativas `sw_*`, `agents` e modelos legados de squads/personas.
- Resultado: CRM esta mais perto do banco live do que outros modulos; Agents ainda sofre com drift conceitual e documental.

### Video e Remotion

- O repo tem UI, hooks, edge functions, runtime e migrations para `video_projects`, `video_assets`, `layer_compositions`, `remotion_compositions` e `video_jobs`.
- Nenhuma dessas tabelas aparece no SWdb live exposto ao app.
- Resultado: todo o stack de Video/Remotion do repositorio depende de schema que nao esta presente no ambiente live auditado.

### Admin e logs

- `profiles`, `system_logs` e `admin_api_keys` respondem no live.
- O logger do app e o admin nao concordam totalmente sobre projeto, fontes e naming.
- O dashboard admin ainda mostra um project id diferente do configurado no repo.
- Resultado: existe base real para admin, mas a camada de observabilidade ainda nao esta alinhada com a realidade do ambiente.

### Docs, planos e fases

- `docs/audit/quebras.md` afirma estado "pos-estabilizacao" e ausencia de quebras letais de banco.
- `docs/audit/rotas.md` afirma que as rotas refletem implementacoes canonicas.
- `docs/audit/edge-functions.md` afirma que o mapa de functions ja esta coerente e sem gaps centrais.
- `docs/SIMWORK-CANONICAL-MASTER.md` mistura metas futuras, schema `sw_*`, validacoes marcadas como `PASS` e pendencias que o codigo ainda nao resolveu.
- Resultado: os docs sao uteis como historico de intencao, mas hoje nao podem ser tratados como verdade operacional.

## Caminho Seguro de Convergencia

1. Congelar o estado real do SWdb antes de qualquer nova migration. O repo nao reconstrói sozinho o live atual.
2. Corrigir primeiro a recursao de RLS em `workspace_members`. Enquanto isso nao for resolvido, shell, briefing e brand kit continuam instaveis.
3. Escolher a linha canonica por modulo:
   - Sites e BioLink: `publications/*` ou `websites/*`, nao as duas.
   - Feeds e chaves: `rss_sources` ou `rss_feeds`, `workspace_api_keys` ou `api_keys`.
   - Video: confirmar se o schema `video_*` vai existir no SWdb ou sair do app.
4. Regerar tipos a partir do schema real escolhido e eliminar `types.ts`, `database.ts` e `app.types.ts` conflitantes.
5. Alinhar edge functions e frontend so depois da decisao de schema. Hoje ha handlers corretos contra tabelas que o live nao expõe.
6. Revalidar build, lint, testes e consultas REST depois da convergencia. Sem isso, os docs continuam sobre-prometendo.

## Conclusao Operacional

O projeto atual esta em estado hibrido:

- parte antiga ainda e a verdade do banco live
- parte nova ja foi escrita no frontend e nas migrations
- as duas nao convergiram

O maior risco atual nao e apenas "falta de tabela".

Os maiores riscos sao:

- contratos concorrentes
- ambiente live diferente do repo
- RLS quebrado ou reaberto
- modulos com UI pronta apoiados em schemas e handlers inconsistentes

## Prioridade Imediata

1. Corrigir o build e remover a duplicidade de runtime publico de BioLink.
2. Aplicar e validar a correcao da recursao de RLS em `workspace_members`.
3. Decidir a fonte unica de verdade para Sites: `publications/*` ou `websites/*`.
4. Congelar e documentar o schema real do SWdb antes de continuar qualquer refatoracao estrutural.
5. Alinhar Settings e edge functions para uma unica tabela de chaves e uma unica tabela de feeds.
6. Parar de tratar docs/audits atuais como ground truth sem validacao em codigo e banco.
