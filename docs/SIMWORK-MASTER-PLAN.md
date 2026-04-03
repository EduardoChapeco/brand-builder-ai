# SIMWORK — PLANO MESTRE DE IMPLEMENTAÇÃO
**Spec-Driven Development | Versão 1.0 | PT-BR | UTF-8**

> Regras globais: sem duplicação · sem sobreposição · sem legado · sem inglês na UI · tudo com schema · tudo com UI · tudo com teste real

---

## FASE 1 — FUNDAÇÃO TÉCNICA

### 1.1 Auditoria e remoção de legado

**Objetivo:** mapear e eliminar tudo que é legado, duplicado ou conflitante.

**Ações:**
- Inventariar todas tabelas existentes vs. usadas
- Mapear edge functions ativas vs. chamadas reais
- Identificar hardcodes de IDs, URLs e textos em inglês
- Listar componentes duplicados entre módulos
- Remover arquivos mortos, rotas órfãs e imports não usados

**Entregável:** relatório `audit-report.md` com status de cada item (manter / migrar / remover)

---

### 1.2 Schema canônico — Tabelas globais

**Tabelas a criar/validar:**

```sql
workspaces         (id, owner_id, name, slug, plan_id, settings jsonb, created_at)
workspace_members  (workspace_id, user_id, role, invited_at, accepted_at)
profiles           (id, user_id, full_name, avatar_url, bio, workspace_id)
plans              (id, name, limits jsonb, price_monthly, price_yearly, active)
subscriptions      (id, workspace_id, plan_id, status, current_period_end, gateway)
credits            (id, workspace_id, amount, source, used_at)
feature_flags      (id, key, enabled, scopes jsonb) -- global + por plano/workspace
audit_logs         (id, workspace_id, user_id, action, entity, entity_id, payload jsonb, created_at)
error_logs         (id, workspace_id, module, function_name, error_code, message, payload jsonb, retry_count, resolved, created_at)
```

**RLS obrigatório:** toda tabela com `workspace_id` deve ter policy `workspace_id = auth.uid()` via FK validada.

---

### 1.3 Sistema de logs e observabilidade

**Tabelas:**
```sql
system_logs   (id, level, module, workspace_id, message, metadata jsonb, created_at)
incidents     (id, title, status, severity, module, started_at, resolved_at, notes)
```

**Edge Function:** `sw-log` — recebe eventos de todos os módulos, valida workspace, persiste com timestamp.

**UI:** painel `/admin/logs` com filtros por workspace, módulo, severidade e timeline.

**Regra:** todo try/catch em edge function deve chamar `sw-log` antes de retornar erro.

---

### 1.4 Internacionalização PT-BR

**Ações:**
- Criar arquivo `src/i18n/pt-BR.json` com todos os textos da UI
- Substituir toda string hardcoded de UI por chave i18n
- Proibir labels, placeholders, toasts e títulos em inglês
- Validar: botões, menus, toasts, mensagens de erro, modais, tooltips

**Critério de aceite:** nenhum texto visível ao usuário em inglês em qualquer tela.

---

### 1.5 Design System — Dark Glassmorphism

**Tokens (`:root`):**
```css
--bg-base: #0a0a0f;
--bg-surface: rgba(255,255,255,0.04);
--bg-elevated: rgba(255,255,255,0.08);
--border-subtle: rgba(255,255,255,0.08);
--accent-primary: #7c3aed;
--accent-secondary: #06b6d4;
--text-primary: #f8fafc;
--text-muted: #94a3b8;
--radius-md: 12px;
--shadow-glass: 0 8px 32px rgba(0,0,0,0.4);
```

**Componentes base (sem duplicação entre módulos):**
- `<SwButton>`, `<SwInput>`, `<SwSelect>`, `<SwBadge>`, `<SwToast>`
- `<SwModal>`, `<SwSheet>`, `<SwDropdown>`, `<SwTooltip>`
- `<SwCard>`, `<SwSkeleton>`, `<SwSpinner>`, `<SwEmptyState>`
- `<SwTopbar>`, `<SwSidebar>`, `<SwHelpSheet>`

**Regra:** nenhum módulo cria componente próprio se já existe no design system.

---

### 1.6 Segurança e escopo por workspace

**Ações:**
- Aplicar RLS em todas as tabelas com `workspace_id`
- Criar helper `assertWorkspaceAccess(userId, workspaceId)` usado em toda edge function
- Validar role do membro antes de mutações críticas
- Sanitizar payload antes de logar (remover senhas, tokens)

---

## FASE 2 — APP SHELL E NAVEGAÇÃO

### 2.1 Sidebar global (fixa, esquerda)

**Seções:**
1. Seletor de workspace (dropdown com avatar)
2. Painel
3. Criadores (Hub)
4. Conteúdo
5. Vídeo
6. Agents
7. CRM
8. Analytics
9. Configurações
10. Ajuda
11. Admin *(visível apenas para role `admin`)*

**Comportamento:**
- Colapsa para ícones em viewport < 1280px
- Badge de alertas sobre ícone de módulo com pendências
- Workspace ativo persistido em `localStorage` + sincronizado com URL

**Schema:** sem tabela nova — usa `workspaces` e `workspace_members`

---

### 2.2 Dashboard operacional

**Tabela:**
```sql
dashboard_widgets (id, workspace_id, user_id, type, position, config jsonb)
```

**Widgets:**
- Resumo do workspace (nome, plano, uso)
- Pendências (itens em rascunho / aguardando ação)
- Itens recentes (últimas 10 edições)
- Consumo de IA (tokens usados / limite do plano)
- Erros abertos (link para `/admin/logs`)
- Atalhos rápidos configuráveis

**Regra:** dashboard não é landing page — exibe dados reais imediatamente.

---

### 2.3 Hub de criadores

**UI:** grade de cards com 7 módulos:

| Card | Módulo destino |
|------|---------------|
| Sites e páginas | `/sites` |
| Bio links | `/biolinks` |
| Blog e SEO | `/blog` |
| Curadoria e notícias | `/news` |
| Posts e carrosséis | `/posts` |
| Vídeos e motion | `/video` |
| Agents | `/agents` |

**Comportamento:** cada card mostra contagem de itens ativos + último item editado + botão "Novo".

---

### 2.4 Sistema de ajuda contextual (`<SwHelpSheet>`)

**Comportamento:**
- Primeiro acesso ao módulo: abre automaticamente
- Acessos seguintes: botão `?` na topbar
- Conteúdo por módulo: o que é, para que serve, etapa atual, próximos passos, erros comuns

**Tabela:**
```sql
help_views (user_id, module_key, first_seen_at, last_seen_at)
```

**Regra:** nunca bloquear o editor; nunca sumir para sempre; sempre reabrível.

---

### 2.5 Topbar padrão (todos os editores)

Itens fixos (da esquerda para direita):
1. ← Voltar
2. Nome do item editado (editável inline)
3. Badge de status: `Rascunho` / `Publicado` / `Erro`
4. Auto-save indicator (ícone + timestamp)
5. Histórico de versões
6. `?` Ajuda contextual
7. Pré-visualizar
8. **Publicar / Renderizar / Sincronizar** (CTA primário)

---

## FASE 3 — MÓDULO: WORKSPACE

### 3.1 Gestão de workspaces

**Tabelas:** `workspaces`, `workspace_members`

**UI `/workspaces`:**
- Lista de workspaces do usuário
- Criar novo workspace (nome, slug, setor)
- Configurações do workspace (nome, logo, fuso, idioma)
- Gerenciar membros: convidar, definir role, remover

**Edge Functions:**
- `sw-workspace-create` — cria workspace + membership `owner`
- `sw-workspace-invite` — envia convite por e-mail via Resend
- `sw-workspace-update` — atualiza nome/logo/configurações

---

### 3.2 Brand Kit

**Tabela:**
```sql
brand_kits (id, workspace_id, colors jsonb, fonts jsonb, logos jsonb, tone_of_voice text, brand_name text, updated_at)
```

**UI `/workspace/brand`:**
- Paleta de cores (primária, secundária, neutros)
- Fontes (títulos, corpo, código)
- Logos (SVG/PNG: principal, alternativo, ícone)
- Tom de voz e diretrizes

**Uso:** injetado automaticamente em Sites, Bio Links, Posts e Vídeos.

---

### 3.3 Briefing

**Tabela:**
```sql
briefings (id, workspace_id, title, content jsonb, status, created_by, created_at)
```

**UI `/workspace/briefing`:**
- Editor de briefing com seções: objetivo, público, diferenciais, concorrentes, mensagem-chave
- Briefing ativo usado como contexto em todos os módulos de criação

---

### 3.4 Biblioteca de assets

**Tabela:**
```sql
assets (id, workspace_id, name, type, url, size, tags text[], created_by, created_at)
```

**UI `/workspace/assets`:**
- Upload de imagens, vídeos, fontes, PDFs
- Filtro por tipo e tag
- Seletor reutilizável em todos os editores (`<SwAssetPicker>`)

---

## FASE 4 — MÓDULO: CRIADOR DE SITES

### 4.1 Schema completo

```sql
sites          (id, workspace_id, name, slug, status, domain, settings jsonb, seo jsonb, created_at)
site_pages     (id, site_id, title, slug, status, seo jsonb, order_index, template_key)
site_sections  (id, page_id, component_key, props jsonb, order_index, visible, breakpoint_config jsonb)
site_versions  (id, site_id, snapshot jsonb, created_by, created_at, message)
```

### 4.2 Layout do editor (4 colunas)

**Col 1 — Estrutura:**
- Árvore de páginas do site
- Seções de cada página (arrastar para reordenar)
- Visibilidade por breakpoint (desktop / tablet / mobile)
- Ações: duplicar, mover, ocultar, excluir

**Col 2 — Ferramentas:**
- Biblioteca de componentes (Hero, CTA, Features, Testimonials, etc.)
- Blocos prontos da marca (usa Brand Kit)
- Assets do workspace

**Col 3 — Canvas:**
- Renderização real da página no breakpoint selecionado
- Edição inline: títulos, subtítulos, CTAs, listas
- Borda de seleção de seção + toolbar contextual (mover ↑↓, duplicar, excluir)

**Col 4 — Inspeção e publicação:**
- Propriedades da seção selecionada
- SEO da página (title, description, og:image)
- Configuração de domínio customizado
- Publicar / Despublicar
- Analytics da página

### 4.3 Edge Functions

- `sw-site-save` — persiste seções com versionamento automático
- `sw-site-publish` — gera HTML estático + invalida CDN
- `sw-site-domain` — valida DNS e associa domínio customizado
- `sw-site-seo` — valida e otimiza meta tags com IA

### 4.4 Fluxo E2E obrigatório

1. Criar site → 2. Criar páginas → 3. Adicionar seções → 4. Editar inline → 5. Configurar SEO → 6. Conectar domínio → 7. Publicar → 8. Validar URL pública → 9. Ver analytics

---

## FASE 5 — MÓDULO: CRIADOR DE BIO LINKS

### 5.1 Schema completo

```sql
biolinks       (id, workspace_id, title, slug, status, theme jsonb, settings jsonb, published_at)
biolink_blocks (id, biolink_id, type, content jsonb, order_index, visible, schedule_start, schedule_end)
biolink_clicks (id, biolink_id, block_id, referrer, country, device, created_at)
```

### 5.2 Layout do editor (4 colunas)

**Col 1 — Blocos disponíveis:**
- Todos os 17 tipos de bloco (link simples, link com miniatura, destaque, vídeo, galeria, formulário, newsletter, WhatsApp, produto, agenda, feed social, artigo, vídeo recente, separador, texto, botão CTA, embed)

**Col 2 — Canvas mobile-first:**
- Simulador de dispositivo (iPhone frame)
- Blocos arrastáveis, reordenáveis
- Clique no bloco → abre painel direito

**Col 3 — Propriedades do bloco:**
- Título, URL, ícone, cor, visibilidade
- Regras: exibir só para mobile/desktop, agendar, expirar
- Tag de rastreamento UTM

**Col 4 — Preview e analytics:**
- Preview ao vivo sincrônico com o canvas
- Cliques por bloco (últimos 7 dias)
- Taxa de conversão
- Ajuda contextual

### 5.3 Edge Functions

- `sw-biolink-save` — persiste blocos com ordem e agendamentos
- `sw-biolink-publish` — gera página pública no subdomínio
- `sw-biolink-click` — registra clique com metadados (não bloqueia UI)

---

## FASE 6 — MÓDULO: CRIADOR EDITORIAL

### 6.1 Schema compartilhado (Blog + News)

```sql
editorial_posts   (id, workspace_id, type[blog|news], title, slug, status, body jsonb, seo jsonb, author_id, published_at, source_id)
editorial_sources (id, workspace_id, name, feed_url, active, last_fetched, error_count)
editorial_queue   (id, workspace_id, source_id, raw_content jsonb, score, status[pending|approved|rejected], reason, created_at)
editorial_tags    (id, workspace_id, name, slug)
post_tags         (post_id, tag_id)
```

### 6.2 Blog Manager — Layout do editor

**Col 1 — Estrutura:**
- Lista de posts por status (rascunho, revisão, publicado, arquivado)
- Filtro por tag, autor, data

**Col 2 — Chat com IA:**
- Pauta → Briefing → Estrutura → Redação → Revisão
- Cada etapa tem prompt contextual com Brand Kit e Briefing do workspace

**Col 3 — Editor de texto rico:**
- Blocos: parágrafo, título H2/H3, citação, código, imagem, vídeo embed, CTA
- Autosave a cada 30s

**Col 4 — SEO e publicação:**
- Title tag, meta description, slug, OG Image
- Score de SEO em tempo real
- Publicar agora / Agendar / Despublicar

### 6.3 News Portal — Fluxo

**UI `/news`:**
1. Fila de ingestão com cards (título, fonte, score, motivo da classificação)
2. Painel de aprovação: aprovar → vai para `editorial_posts` como rascunho
3. Ação de derivação: → Blog Post / → Post Social / → Vídeo / → Newsletter

**Edge Functions:**
- `sw-news-fetch` — cron que consome RSS de todas as fontes ativas, parseia, salva na fila
- `sw-news-score` — classifica relevância com IA, grava motivo
- `sw-news-derive` — cria rascunho no módulo de destino selecionado

---

## FASE 7 — MÓDULO: CRIADOR DE VÍDEOS

### 7.1 Schema completo

```sql
video_projects  (id, workspace_id, title, status, mode[chat|timeline|motion|template], settings jsonb, created_at)
video_tracks    (id, project_id, type[video|audio|subtitle|overlay], order_index, clips jsonb)
video_assets    (id, workspace_id, name, type, url, duration, created_at)
video_jobs      (id, project_id, status[queued|rendering|done|failed], provider, output_url, error, started_at, finished_at)
video_voices    (id, workspace_id, provider, voice_id, name, preview_url)
```

### 7.2 Layout do editor (4 colunas)

**Col 1 — Modo e biblioteca:**
- Seletor de modo (Chat / Timeline / Motion / Templates)
- Biblioteca: assets, vídeos, áudios, vozes, trilhas

**Col 2 — Chat e pipeline:**
- Histórico de prompts e respostas
- Estado do pipeline (etapas: roteiro → assets → composição → render)
- Comandos executados e guardrails

**Col 3 — Preview e timeline:**
- Player de vídeo com controles
- Timeline multi-track (vídeo, áudio, legenda, overlay)
- Keyframes editáveis

**Col 4 — Propriedades e exportação:**
- Propriedades do clip selecionado
- Configurações de legenda
- Jobs de render (status, progresso, download)
- Histórico de versões exportadas

### 7.3 Modos de edição

| Modo | Descrição |
|------|-----------|
| Chat | Edição por prompt — IA executa cortes, transições, narrações |
| Timeline | Edição manual multi-track estilo NLE simplificado |
| Motion | Remotion para animações e motion design programáticos |
| Templates | Seleção de template pré-composto editável |

### 7.4 Edge Functions

- `sw-video-chat` — interpreta prompt, executa ação no projeto, retorna estado atualizado
- `sw-video-render` — enfileira job no provedor (Remotion/FFmpeg), monitora e atualiza `video_jobs`
- `sw-video-subtitle` — gera legendas via Whisper para o áudio do projeto
- `sw-video-export` — empacota saída final por formato (mp4, gif, webm)

---

## FASE 8 — MÓDULO: CRIADOR DE AGENTS

### 8.1 Schema completo

```sql
agents          (id, workspace_id, name, type[brand|creator|persona|consumer|operational], status, identity jsonb, voice jsonb, memory jsonb, behavior jsonb, tools jsonb, created_at)
agent_sessions  (id, agent_id, user_id, messages jsonb, started_at, ended_at)
agent_tools     (id, name, description, schema jsonb, endpoint, active)
simlab_profiles (id, workspace_id, agent_id, persona jsonb, behaviors jsonb, insights jsonb, created_at)
```

### 8.2 Editor de agents (etapas lineares)

1. **Tipo** — selecionar entre os 5 tipos de agent
2. **Identidade** — nome, avatar, bio, missão
3. **Voz** — tom, linguagem, exemplos de frases
4. **Memória** — contexto persistente, documentos de base, Brand Kit
5. **Comportamento** — regras, limites, guardrails
6. **Ferramentas** — selecionar tools disponíveis (WebSearch, WritePost, PublishBioLink, etc.)
7. **Integrações** — conectar com outros módulos do workspace
8. **Validação** — testar agent com conversa real antes de publicar
9. **Publicação** — ativar agent para uso no workspace

### 8.3 SimLab

**Objetivo:** criar agents consumidores sintéticos para simular comportamentos de audiência.

**Tabela:** `simlab_profiles`

**UI `/agents/simlab`:**
- Criar perfil de consumidor sintético (dados demográficos, comportamentos, preferências)
- Rodar simulações: como esse perfil reagiria ao site / bio link / post?
- Ver insights gerados

### 8.4 Edge Functions

- `sw-agent-run` — executa agent com contexto de workspace + memória + tools
- `sw-agent-validate` — roda sessão de teste antes da publicação
- `sw-simlab-simulate` — executa simulação de consumidor sintético contra conteúdo

---

## FASE 9 — MÓDULO: CONTEÚDO SOCIAL

### 9.1 Schema

```sql
social_posts      (id, workspace_id, type[post|carousel|story], content jsonb, status, scheduled_at, published_at, platforms jsonb)
social_templates  (id, workspace_id, name, type, structure jsonb, thumbnail_url)
social_calendars  (id, workspace_id, month, year, entries jsonb)
```

### 9.2 Layout do editor

**Col 1 — Templates:** grade de templates por tipo (post quadrado, carrossel, story vertical)

**Col 2 — Chat com IA:** geração de copy, legenda, hashtags, variações

**Col 3 — Canvas do post:** visualizador do post em simulador de feed/story

**Col 4 — Publicação:** plataformas alvo, agendamento, aprovação, derivar para Bio Link

### 9.3 Edge Functions

- `sw-post-generate` — gera copy e estrutura visual via IA com Brand Kit
- `sw-post-schedule` — agenda publicação e enfileira no cron
- `sw-post-publish` — publica nas plataformas conectadas via integração

---

## FASE 10 — MÓDULO: CRM E LEADS

### 10.1 Schema

```sql
leads            (id, workspace_id, name, email, phone, source, tags text[], status, custom_fields jsonb, created_at)
lead_events      (id, lead_id, type, metadata jsonb, created_at)
crm_pipelines    (id, workspace_id, name, stages jsonb)
crm_deals        (id, pipeline_id, lead_id, stage, value, notes, updated_at)
lead_forms       (id, workspace_id, name, fields jsonb, redirect_url, active)
form_submissions (id, form_id, data jsonb, lead_id, created_at)
```

### 10.2 UI `/crm`

- Lista de leads com filtros (source, tag, status, data)
- Kanban do pipeline por estágio
- Perfil do lead com timeline de eventos
- Construtor de formulários de captação
- Formulários embutíveis no Bio Link, Site e Blog

### 10.3 Edge Functions

- `sw-lead-capture` — recebe submission, cria/atualiza lead, dispara eventos
- `sw-crm-move` — move deal entre estágios, cria evento, registra em audit

---

## FASE 11 — PAINEL ADMINISTRATIVO

### 11.1 Schema específico do admin

```sql
admin_sessions    (id, user_id, action, target_type, target_id, created_at)
provider_keys     (id, key_type, provider, key_value_encrypted, scope[global|workspace], workspace_id, active, created_at)
gateway_configs   (id, gateway, credentials_encrypted jsonb, methods jsonb, priority, active)
module_configs    (id, module_key, plan_ids text[], enabled_by_default, feature_flags jsonb)
```

### 11.2 Módulos do admin (acessíveis em `/admin/*`)

| Rota | Conteúdo |
|------|---------|
| `/admin` | Visão geral: usuários ativos, receita, erros abertos, consumo de IA |
| `/admin/users` | Lista, busca, ativar/desativar, forçar reset de senha |
| `/admin/workspaces` | Todos os workspaces, owner, plano, consumo, actions |
| `/admin/plans` | CRUD de planos com limites granulares |
| `/admin/modules` | Ativar/desativar módulos por plano ou workspace |
| `/admin/flags` | Feature flags globais e sobrescritas por workspace |
| `/admin/billing` | Transações, reembolsos, emissão de créditos |
| `/admin/keys` | Chaves globais por provider (criptografadas, sem exibir valor) |
| `/admin/gateways` | Configuração dos gateways de pagamento e regras do orquestrador |
| `/admin/logs` | Logs técnicos com filtros e timeline |
| `/admin/incidents` | Criar, escalar, resolver incidentes |
| `/admin/support` | Fila de tickets de suporte com atribuição e SLA |

### 11.3 Edge Functions

- `sw-admin-impersonate` — admin visualiza workspace de outro usuário sem trocar de conta
- `sw-admin-credit` — emite créditos para workspace
- `sw-admin-flag` — ativa/desativa feature flag em escopo específico

---

## FASE 12 — BILLING, PLANOS E GATEWAYS

### 12.1 Schema

```sql
invoices          (id, workspace_id, amount, status, gateway, gateway_ref, issued_at, paid_at, items jsonb)
payment_attempts  (id, invoice_id, gateway, method, status, error, attempted_at)
credit_ledger     (id, workspace_id, amount, type[earned|used|refunded|promotional], ref_id, created_at)
```

### 12.2 Orquestrador de pagamentos

**Edge Function `sw-payment-route`:**
```
1. Verificar método (Pix / Cartão / Boleto)
2. Filtrar gateways ativos para o método
3. Aplicar regra de seleção:
   - Pix  → menor custo líquido + maior disponibilidade
   - Cartão → melhor antifraude + menor taxa final
   - Boleto → menor custo + liquidação confiável
4. Tentar gateway primário
5. Em falha → tentar próximo na fila
6. Registrar toda tentativa em payment_attempts
7. Notificar webhook de resultado
```

### 12.3 UI de billing (`/billing`)

- Plano atual com uso vs. limites
- Histórico de faturas (download PDF)
- Saldo de créditos
- Métodos de pagamento salvos
- Upgrade / downgrade de plano

---

## FASE 13 — SUPORTE E HELP CENTER

### 13.1 Schema

```sql
help_articles     (id, title, slug, content, category, lang, published, updated_at)
help_categories   (id, name, slug, order_index)
tickets           (id, workspace_id, user_id, subject, status, priority, assignee_id, created_at)
ticket_messages   (id, ticket_id, sender_id, content, attachments jsonb, created_at)
ticket_ratings    (id, ticket_id, score, comment, created_at)
platform_status   (id, service, status[operational|degraded|outage], message, updated_at)
onboarding_steps  (id, workspace_id, user_id, step_key, completed_at)
```

### 13.2 UI

**`/help`:** busca de artigos, categorias, tutoriais em vídeo, checklist de onboarding, status da plataforma, notas de versão

**`/support`:** criar ticket, histórico, status, avaliação do atendimento

**`/admin/support`:** fila de tickets, atribuição, SLA countdown, reatribuição, emissão de crédito compensatório

---

## FASE 14 — ANALYTICS E OBSERVABILIDADE

### 14.1 Schema

```sql
analytics_events  (id, workspace_id, module, entity_id, event_type, properties jsonb, created_at)
analytics_daily   (id, workspace_id, module, date, metrics jsonb) -- agregado por cron
```

### 14.2 UI `/analytics`

- Visão por módulo: sites, bio links, posts, vídeos
- Métricas: visitas, cliques, conversões, tempo médio
- Gráficos de tendência (7d, 30d, 90d)
- Exportar como CSV

### 14.3 Edge Functions

- `sw-analytics-track` — recebe evento, valida workspace, persiste (batching de 50 eventos)
- `sw-analytics-aggregate` — cron diário que consolida `analytics_daily`

---

## FASE 15 — ORQUESTRAÇÃO DE CHAVES E WEBMCP

### 15.1 Gestão de chaves

**Tabela:** `provider_keys` (criptografadas com AES-256 via Supabase Vault)

**UI `/admin/keys`:**
- Adicionar chave global (provider, tipo, valor, escopo)
- Ver health de cada chave (última chamada, taxa de erro, quota restante estimada)
- Ativar / desativar / rotacionar

**Edge Function `sw-key-resolve`:**
```
1. Receber (provider, workspace_id, funcionalidade)
2. Buscar chaves do workspace → se ativa, usar
3. Fallback para chave global do provider
4. Aplicar round-robin se múltiplas chaves globais
5. Registrar consumo em key_usage_log
6. Nunca retornar valor da chave ao frontend
```

### 15.2 WebMCP — Tools expostas

Cada módulo expõe tools consumíveis por agents e automações:

| Tool | Módulo | Descrição |
|------|--------|-----------|
| `getWorkspaceContext` | Workspace | retorna briefing + brand kit + configurações |
| `listSitePages` | Sites | lista páginas e seções do site ativo |
| `publishBioLink` | Bio Links | ativa/desativa blocos e publica |
| `createBlogPost` | Blog | cria rascunho com estrutura e conteúdo |
| `schedulePost` | Social | agenda post para plataforma |
| `runAgent` | Agents | executa agent com prompt e retorna resposta |
| `trackEvent` | Analytics | registra evento personalizado |

**Regra:** toda tool valida `workspace_id` antes de executar. Nunca aceita workspace externo ao contexto do agent ativo.

---

## MATRIZ DE DEPENDÊNCIAS

```
Fase 1 (Fundação) → Todas as fases dependem dela
Fase 2 (App Shell) → depende de Fase 1
Fase 3 (Workspace) → depende de Fase 1 + 2
Fases 4–9 (Criadores) → dependem de Fase 3 (workspace + brand kit)
Fase 10 (CRM) → depende de Fase 4 (sites) e 5 (bio links) para captação
Fase 11 (Admin) → depende de Fase 1 (schemas) e 12 (billing)
Fase 12 (Billing) → depende de Fase 11 (admin) e Fase 3 (workspace/planos)
Fase 13 (Suporte) → pode iniciar em paralelo com Fase 11
Fase 14 (Analytics) → depende de Fases 4–9 (eventos dos módulos)
Fase 15 (WebMCP) → depende de todas as fases anteriores
```

---

## CRITÉRIOS GLOBAIS DE ACEITE

- [ ] Todos os módulos operam sem dados mockados
- [ ] Nenhum erro é silencioso (todos registrados em `error_logs`)
- [ ] Toda UI está em português do Brasil
- [ ] RLS validado em todas as tabelas com `workspace_id`
- [ ] Design System aplicado uniformemente (sem estilos inline ad-hoc)
- [ ] Topbar padrão presente em todos os editores
- [ ] Ajuda contextual reabrível em todos os módulos
- [ ] Autosave funcionando em Sites, Bio Links, Blog e Vídeo
- [ ] Admin consegue operar workspaces, planos, chaves, billing e suporte
- [ ] Fluxo E2E de cada módulo testado e aprovado

---

*Versão 1.0 | Simwork | Spec-Driven Development*
