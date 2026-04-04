# SIMWORK — SPEC-DRIVEN DEVELOPMENT MASTER

## Framework de Auditoria, Refatoração e Evolução Contínua

## Versão: SDD-1.0 | Abril 2026

## Idioma obrigatório: Português do Brasil (pt-BR, UTF-8)

---

> **DECLARAÇÃO DE CONTRATO PARA A IA EXECUTORA**
>
> Você não é um assistente que "tenta ajudar". Você é o **engenheiro sênior responsável** por este sistema.
> Cada tarefa neste documento é um contrato de implementação com critério de aceitação verificável.
>
> Antes de executar qualquer tarefa:
>
> 1. Declare: `[SDD-INICIANDO] Task: SW-XXX | Módulo: NOME`
> 2. Liste os arquivos que serão lidos, criados ou modificados
> 3. Execute a tarefa
> 4. Execute o critério de aceitação da tarefa
> 5. Declare: `[SDD-CONCLUÍDO] Task: SW-XXX | Status: PASS ou FAIL`
> 6. Se FAIL: descreva o motivo exato, não continue para a próxima task
>
> **Regras absolutas:**
>
> - NUNCA declare sucesso sem executar o critério de aceitação
> - NUNCA apague código existente sem antes entender o que ele faz
> - NUNCA simplifique ou hardcode o que deve vir do banco
> - NUNCA silencie um erro — todo erro vai para logs e para a interface
> - NUNCA avance para a fase seguinte sem que a fase atual esteja com todos os critérios PASS
> - Se encontrar ambiguidade, PARE e pergunte antes de implementar

---

## ÍNDICE MESTRE

```
FASE 0  — Auditoria Completa do Estado Real (leia antes de tudo)
FASE 1  — Fundação: Estrutura de Pastas, Contratos e Banco Canônico
FASE 2  — Correção de Erros Críticos de Carregamento
FASE 3  — Sistema de Logs e Erros (zero silêncio)
FASE 4  — Autenticação, Workspace e RLS
FASE 5  — Módulo Publicações (Bio Link, Site, Blog, Portal RSS)
FASE 6  — Módulo Conteúdo (Posts, Vídeos, Remotion)
FASE 7  — Módulo Agentes (Personas, Influencers, Squads)
FASE 8  — Módulo Marca (Brand Kit e Briefing)
FASE 9  — Analytics Central
FASE 10 — Painel Admin Completo
FASE 11 — Billing e Gateways de Pagamento
FASE 12 — Suporte e Tickets
FASE 13 — Orquestrador de Chaves de IA
FASE 14 — WebMCP e Automações

APÊNDICE A — Anatomia do Erro Que Nunca Resolve
APÊNDICE B — Como Ler Este Documento em Sessões de Trabalho
APÊNDICE C — Glossário de Termos do Sistema
APÊNDICE D — Regras de Nomenclatura Canônica
APÊNDICE E — Checklist de Qualidade por Módulo
```

---

## LEIA ESTE BLOCO ANTES DE QUALQUER OUTRA COISA

### Por que este projeto está quebrando silenciosamente

Sistemas construídos via vibe coding têm três doenças crônicas:

**Doença 1 — Contratos implícitos**
O frontend assume que uma tabela tem uma coluna. A tabela não tem. O erro não aparece no console porque foi capturado num catch vazio. A UI mostra "carregando..." ou "não encontrado" sem código, sem causa, sem ação. A IA que gerou o código disse "pronto". Não estava pronto.

**Doença 2 — Estado bifurcado**
Existem duas versões de "verdade" no sistema: o schema que a migration mais recente criou e o schema que o código do frontend assume que existe. Elas divergem silenciosamente a cada mudança. Nenhum teste valida a consistência entre elas.

**Doença 3 — Ausência de contrato de interface**
Cada módulo foi construído de forma independente. Quando um módulo muda o nome de uma coluna, de uma função ou de uma prop, nada falha em build time. O sistema falha em runtime, para o usuário final, de forma silenciosa.

**Este documento resolve as três doenças** por meio de:

- Auditoria explícita antes de qualquer mudança
- Schema canônico como fonte única de verdade
- Critérios de aceitação verificáveis para cada tarefa
- Sistema de logs que torna o silêncio impossível

---

## FASE 0 — AUDITORIA COMPLETA DO ESTADO REAL

> **Objetivo:** mapear o que existe de verdade, não o que deveria existir.
> Esta fase produz três artefatos: Mapa de Tabelas, Mapa de Rotas e Registro de Quebras.
> Nenhuma outra fase começa antes desta estar 100% completa.

---

### SW-000 — Auditoria de Schema do Banco

**O que fazer:**
Executar as queries abaixo no Supabase SQL Editor e registrar o resultado completo.
Não presumir nada. Copiar o resultado literal.

```sql
-- QUERY 1: Listar todas as tabelas do schema public
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS tamanho
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- QUERY 2: Para cada tabela, listar colunas, tipos e nullable
SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c
  ON t.table_name = c.table_name
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- QUERY 3: Listar todas as foreign keys
SELECT
  tc.table_name AS tabela_origem,
  kcu.column_name AS coluna_origem,
  ccu.table_name AS tabela_destino,
  ccu.column_name AS coluna_destino,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- QUERY 4: Listar todas as políticas RLS
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- QUERY 5: Verificar se RLS está habilitado nas tabelas
SELECT
  relname AS tabela,
  relrowsecurity AS rls_habilitado,
  relforcerowsecurity AS rls_forcado
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;

-- QUERY 6: Listar funções/edge functions referenciadas no banco
SELECT
  routine_name,
  routine_type,
  data_type AS retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- QUERY 7: Tabelas com zero linhas (possível legado abandonado)
-- Execute individualmente para cada tabela listada na Query 1
-- Exemplo:
SELECT 'nome_da_tabela' AS tabela, COUNT(*) AS total_linhas FROM nome_da_tabela;
```

**Critério de aceitação SW-000:**

- [ ] Resultado da Query 1 documentado em `docs/audit/tabelas.md`
- [ ] Resultado da Query 2 documentado em `docs/audit/colunas.md`
- [ ] Resultado da Query 3 documentado em `docs/audit/foreign-keys.md`
- [ ] Resultado da Query 4 documentado em `docs/audit/rls-policies.md`
- [ ] Resultado da Query 5 documentado em `docs/audit/rls-status.md`
- [ ] Resultado da Query 7 documentado em `docs/audit/tabelas-vazias.md`

---

### SW-001 — Auditoria de Rotas e Componentes do Frontend

**O que fazer:**
Mapear todas as rotas declaradas no App.tsx (ou equivalente) e verificar se o componente de destino existe no sistema de arquivos.

```bash
# Execute no terminal do projeto

# 1. Encontrar o arquivo de rotas
find src -name "App.tsx" -o -name "router.tsx" -o -name "routes.tsx" | head -5

# 2. Listar todos os imports de páginas no arquivo de rotas
grep -E "import.*Page|import.*View|lazy\(" src/App.tsx

# 3. Verificar se cada arquivo importado existe
# Para cada import encontrado, executar:
ls -la src/pages/[nome-do-arquivo]

# 4. Listar todas as pastas dentro de src/
find src -type d | sort

# 5. Contar linhas por arquivo (arquivos com >500 linhas são candidatos a split)
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -30

# 6. Encontrar hardcodes de texto em inglês no frontend
grep -r "\"[A-Z][a-z]" src/components --include="*.tsx" | grep -v "//.*\"" | head -30
grep -r "Could not\|Failed to\|Not found\|Loading\.\.\." src/ --include="*.tsx" | head -20
```

**Preencher o template abaixo com os resultados:**

```markdown
# MAPA DE ROTAS — docs/audit/rotas.md

| Rota                                | Componente Declarado | Arquivo Existe? | Observação |
| ----------------------------------- | -------------------- | --------------- | ---------- |
| /                                   | DashboardPage        | SIM/NÃO         |            |
| /workspace/:id/biolink              | BioLinkPage          | SIM/NÃO         |            |
| ... (continuar para todas as rotas) |

# ARQUIVOS GRANDES — docs/audit/arquivos-grandes.md

| Arquivo | Linhas | Candidato a Split? |
| ------- | ------ | ------------------ |
| ...     | ...    | SIM/NÃO            |

# TEXTOS EM INGLÊS — docs/audit/textos-ingles.md

| Arquivo | Linha | Texto encontrado |
| ------- | ----- | ---------------- |
| ...     | ...   | ...              |
```

**Critério de aceitação SW-001:**

- [ ] `docs/audit/rotas.md` preenchido com todas as rotas
- [ ] `docs/audit/arquivos-grandes.md` preenchido
- [ ] `docs/audit/textos-ingles.md` preenchido

---

### SW-002 — Auditoria de Edge Functions

**O que fazer:**
Listar todas as edge functions existentes e verificar o que cada uma realmente faz.

```bash
# 1. Listar todas as edge functions
ls -la supabase/functions/

# 2. Para cada função, verificar:
# - Se está sendo invocada pelo frontend
# - Se faz SELECT * (má prática)
# - Se tem try/catch vazio
# - Se usa variáveis de ambiente sem verificação

# 3. Buscar invocações de edge functions no frontend
grep -r "invoke\|functions\/" src/ --include="*.tsx" --include="*.ts" | grep -v ".test." | head -40

# 4. Verificar variáveis de ambiente usadas
grep -r "Deno.env\|process.env\|import.meta.env" supabase/functions/ --include="*.ts" | sort -u

# 5. Encontrar try/catch vazios ou com apenas console.error
grep -rA2 "catch" supabase/functions/ --include="*.ts" | grep -E "catch|console.error|\{\}" | head -30
```

**Preencher:**

```markdown
# MAPA DE EDGE FUNCTIONS — docs/audit/edge-functions.md

| Função | Invocada por | SELECT \*? | catch vazio? | Env vars verificadas? |
| ------ | ------------ | ---------- | ------------ | --------------------- |
| ...    | ...          | SIM/NÃO    | SIM/NÃO      | SIM/NÃO               |
```

**Critério de aceitação SW-002:**

- [ ] `docs/audit/edge-functions.md` preenchido

---

### SW-003 — Registro de Quebras (o coração da auditoria)

**O que fazer:**
Para cada módulo do sistema, acessar manualmente e registrar o que acontece.
Não confiar no que o código diz que deve acontecer. Testar e documentar.

**Template de teste por módulo:**

```markdown
# REGISTRO DE QUEBRAS — docs/audit/quebras.md

## Módulo: Bio Link

- URL testada: /workspace/[id]/biolink
- O que aparece na tela: [descrever exatamente]
- Erro visível na UI: [copiar texto exato do erro]
- Console do browser (F12 > Console): [copiar erros]
- Network tab (F12 > Network > falhas): [listar requests com status != 200]
- Suspeita de causa: [tabela ausente / coluna faltando / edge function off / RLS bloqueando]
- Confirmado: [SIM/NÃO/PARCIALMENTE]

## Módulo: Site Institucional

[repetir template]

## Módulo: Blog Manager

[repetir template]

## Módulo: News Portal RSS

[repetir template]

## Módulo: Video Studio

[repetir template]

## Módulo: PostGen

[repetir template]

## Módulo: SimLab / Agentes

[repetir template]

## Módulo: Brand Kit

[repetir template]

## Módulo: Briefing

[repetir template]

## Módulo: Analytics

[repetir template]
```

**Como identificar a causa real de "não foi possível encontrar":**

```
PASSO 1: Abrir o browser no módulo quebrado
PASSO 2: Abrir DevTools > Network > marcar "Preserve log"
PASSO 3: Recarregar a página
PASSO 4: Filtrar por "XHR" ou "Fetch"
PASSO 5: Localizar a request que falhou (status vermelho)
PASSO 6: Clicar na request > aba "Response"
PASSO 7: Copiar o body da resposta — esse é o erro real
PASSO 8: Se a request for para o Supabase, executar a mesma query
         no SQL Editor do Supabase e ver o resultado

CAUSAS MAIS COMUNS:
- Status 404 + body "relation does not exist" → tabela não existe no banco
- Status 200 + array vazio [] → tabela existe mas RLS bloqueia ou sem dados
- Status 400 + body "column X does not exist" → coluna renomeada ou nunca criada
- Status 500 + body "invalid input" → tipo errado sendo passado
- Status 0 ou "Failed to fetch" → edge function não deployada ou URL errada
```

**Critério de aceitação SW-003:**

- [ ] `docs/audit/quebras.md` preenchido com resultado real de cada módulo
- [ ] Causa confirmada (não presumida) para cada erro
- [ ] Prioridade de correção atribuída: CRÍTICO / GRAVE / MENOR

---

### SW-004 — Inventário de Código Duplicado e Legado

**O que fazer:**

```bash
# 1. Encontrar componentes com nomes similares (possível duplicação)
find src -name "*.tsx" | sed 's|.*/||' | sort | uniq -d

# 2. Encontrar imports de arquivos que não existem
# (causa de erros silenciosos em build)
grep -r "from \"\.\." src/ --include="*.tsx" | while read line; do
  file=$(echo $line | grep -oP "from \"[^\"]+\"" | tr -d 'from "')
  # verificar se existe
done

# 3. Encontrar tabelas referenciadas no frontend mas não na auditoria do banco
grep -r "\.from(" src/ --include="*.tsx" --include="*.ts" | grep -oP "from\(['\"][\w_]+['\"]" | sort -u

# 4. Encontrar SELECT * no código
grep -r "select\(\"\*\"\)\|select\(\'\*\'\)" src/ --include="*.tsx" --include="*.ts"

# 5. Encontrar any em TypeScript
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | wc -l
```

**Preencher:**

```markdown
# INVENTÁRIO DE LEGADO — docs/audit/legado.md

## Tabelas referenciadas no código mas NÃO no banco

| Tabela no código | Arquivo | Tabela no banco | Ação necessária |
| ---------------- | ------- | --------------- | --------------- |

## Componentes duplicados

| Nome | Arquivo 1 | Arquivo 2 | Qual manter |
| ---- | --------- | --------- | ----------- |

## SELECT \* encontrados

| Arquivo | Linha | Query |
| ------- | ----- | ----- |

## Contagem de any no TypeScript

- Total de `: any`: [número]
- Total de `as any`: [número]
```

**Critério de aceitação SW-004:**

- [ ] `docs/audit/legado.md` preenchido
- [ ] Lista de tabelas fantasma (código referencia mas não existe no banco) completa

---

> **PORTÃO DE FASE 0**
> As Fases 1+ APENAS começam quando todos os documentos em `docs/audit/` estiverem preenchidos.
> Sem auditoria completa = sem base para refatorar = risco de apagar o que funciona.

---

## FASE 1 — FUNDAÇÃO: ESTRUTURA, CONTRATOS E BANCO CANÔNICO

> **Objetivo:** Estabelecer a estrutura de pastas canônica, os contratos de tipos TypeScript
> e o schema de banco definitivo — sem apagar o que existe, apenas reorganizando e expandindo.

---

### SW-010 — Criar Estrutura de Pastas Canônica

**O que fazer:**
Criar as pastas que ainda não existem. NÃO mover arquivos ainda — apenas criar a estrutura.
Mover arquivos acontece nas fases específicas de cada módulo.

```
src/
├── app/
│   ├── App.tsx                     ← router principal (único)
│   ├── main.tsx
│   └── index.css
│
├── components/
│   ├── ui/                         ← componentes atômicos reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Dialog.tsx
│   │   └── Toast.tsx
│   ├── layout/                     ← shells de layout
│   │   ├── WorkspaceLayout.tsx     ← sidebar global + topbar
│   │   ├── EditorShell.tsx         ← 3 colunas: ctx + editor + painel
│   │   ├── SidebarGlobal.tsx
│   │   ├── SidebarContextual.tsx
│   │   ├── PainelDireito.tsx
│   │   └── EditorTopbar.tsx
│   ├── shared/                     ← componentes de negócio reutilizáveis
│   │   ├── ErrorBadge.tsx          ← OBRIGATÓRIO — exibe erro com código
│   │   ├── EmptyState.tsx          ← estado vazio com ação sugerida
│   │   ├── SheetInfo.tsx           ← painel informativo lateral (abre 1x)
│   │   ├── StatusBadge.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── LoadingOverlay.tsx
│   ├── publicacoes/                ← componentes do módulo publicações
│   ├── conteudo/                   ← componentes do módulo conteúdo
│   ├── agentes/                    ← componentes do módulo agentes
│   ├── marca/                      ← componentes brand kit + briefing
│   ├── analytics/                  ← componentes analytics
│   └── admin/                      ← componentes painel admin
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── DashboardPage.tsx
│   ├── OnboardingPage.tsx
│   ├── publicacoes/
│   │   ├── PublicacoesListPage.tsx
│   │   ├── BioLinkEditorPage.tsx
│   │   ├── SiteEditorPage.tsx
│   │   ├── BlogEditorPage.tsx
│   │   ├── ArtigoEditorPage.tsx
│   │   └── PortalNoticasPage.tsx
│   ├── conteudo/
│   │   ├── ConteudoListPage.tsx
│   │   ├── PostEditorPage.tsx
│   │   └── VideoEditorPage.tsx
│   ├── agentes/
│   │   ├── AgentesListPage.tsx
│   │   ├── PersonaEditorPage.tsx
│   │   └── SquadEditorPage.tsx
│   ├── marca/
│   │   ├── BrandKitPage.tsx
│   │   └── BriefingPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── ConfiguracoesPage.tsx
│   ├── public/
│   │   ├── BioLinkPublicPage.tsx
│   │   ├── SitePublicPage.tsx
│   │   └── BlogPublicPage.tsx
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── AdminUsuariosPage.tsx
│       ├── AdminWorkspacesPage.tsx
│       ├── AdminFinanceiroPage.tsx
│       ├── AdminChavesIAPage.tsx
│       ├── AdminModulosPage.tsx
│       ├── AdminTicketsPage.tsx
│       └── AdminLogsPage.tsx
│
├── contexts/
│   ├── AuthContext.tsx
│   ├── WorkspaceContext.tsx
│   └── ErrorContext.tsx            ← contexto global de erros
│
├── hooks/
│   ├── useWorkspace.ts
│   ├── usePublication.ts
│   ├── useErrorLogger.ts           ← hook para logar erros no banco
│   ├── useSimLab.ts
│   └── useAnalytics.ts
│
├── lib/
│   ├── supabase.ts                 ← cliente supabase (único)
│   ├── error-logger.ts             ← função logError() → system_logs
│   ├── key-orchestrator.ts         ← orquestrador de chaves de IA
│   ├── ccp.ts                      ← getCCPSnapshot() — contexto de marca
│   └── utils.ts
│
├── types/
│   ├── database.types.ts           ← gerado pelo Supabase CLI (nunca editar à mão)
│   ├── app.types.ts                ← tipos de negócio do Simwork
│   └── index.ts                    ← re-exports
│
└── docs/
    └── audit/                      ← artefatos da Fase 0
        ├── tabelas.md
        ├── colunas.md
        ├── rotas.md
        ├── edge-functions.md
        ├── quebras.md
        └── legado.md
```

```bash
# Comando para criar todas as pastas de uma vez (não move arquivos existentes)
mkdir -p src/components/{ui,layout,shared,publicacoes,conteudo,agentes,marca,analytics,admin}
mkdir -p src/pages/{auth,publicacoes,conteudo,agentes,marca,public,admin}
mkdir -p src/{contexts,hooks,lib,types}
mkdir -p docs/audit
```

**Critério de aceitação SW-010:**

- [ ] Todas as pastas criadas
- [ ] Nenhum arquivo existente foi movido ou deletado
- [ ] `docs/audit/` existe e está pronto para receber os artefatos

---

### SW-011 — Schema Canônico do Banco (Migration Definitiva)

**Regras desta migration:**

- Usar `CREATE TABLE IF NOT EXISTS` em tudo — idempotente
- Usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para colunas novas — sem quebrar o existente
- NUNCA usar `DROP TABLE` ou `DROP COLUMN`
- NUNCA renomear coluna existente — apenas adicionar nova + migrar dados + deprecar antiga
- Comentar cada tabela e coluna com propósito claro

```sql
-- =============================================================
-- MIGRATION: 001_simwork_foundation.sql
-- Data: [data de execução]
-- Propósito: Schema canônico do Simwork — idempotente e seguro
-- NUNCA executar DROP TABLE ou DROP COLUMN nesta migration
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSÕES NECESSÁRIAS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- para buscas de texto

-- ─────────────────────────────────────────────────────────────
-- WORKSPACES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  -- plano: starter | pro | business | corp | admin_free
  plan            TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter','pro','business','corp','admin_free')),
  -- status: active | suspended | trial | canceled
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','suspended','trial','canceled')),
  trial_ends_at   TIMESTAMPTZ,
  settings        JSONB NOT NULL DEFAULT '{}', -- configurações extras
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE workspaces IS 'Cada workspace representa uma marca/projeto isolado';

-- ─────────────────────────────────────────────────────────────
-- MEMBROS DO WORKSPACE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- role: owner | admin | editor | viewer
  role            TEXT NOT NULL DEFAULT 'editor'
                  CHECK (role IN ('owner','admin','editor','viewer')),
  invited_by      UUID REFERENCES auth.users(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
COMMENT ON TABLE workspace_members IS 'Relação N:N entre usuários e workspaces';

-- ─────────────────────────────────────────────────────────────
-- BRAND KIT
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_kits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- colors: {primary, secondary, accent, background, text, palette: []}
  colors          JSONB NOT NULL DEFAULT '{}',
  -- fonts: {heading: {family, weight}, body: {family, weight}, sizes: {}}
  fonts           JSONB NOT NULL DEFAULT '{}',
  -- logos: {main_url, icon_url, dark_url, light_url}
  logos           JSONB NOT NULL DEFAULT '{}',
  -- voice: {tone, formality, use_words: [], avoid_words: []}
  voice           JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);
COMMENT ON TABLE brand_kits IS 'Identidade visual e verbal da marca. Um por workspace.';

-- ─────────────────────────────────────────────────────────────
-- BRIEFING
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- company: {name, segment, website, mission, vision, values, differentials}
  company         JSONB NOT NULL DEFAULT '{}',
  -- audience: {description, age_range, income, pain_points, desires}
  audience        JSONB NOT NULL DEFAULT '{}',
  -- market: {competitors: [{name, url, notes}], position, opportunities}
  market          JSONB NOT NULL DEFAULT '{}',
  -- content: {pillars: [], keywords: [], avoid_topics, cadence}
  content         JSONB NOT NULL DEFAULT '{}',
  -- channels: [{platform, goal, frequency}]
  channels        JSONB NOT NULL DEFAULT '[]',
  -- 0-100: percentual de preenchimento calculado
  completeness_score INTEGER NOT NULL DEFAULT 0
                     CHECK (completeness_score BETWEEN 0 AND 100),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);
COMMENT ON TABLE briefings IS 'Base de conhecimento da marca. Alimenta o CCP (contexto de IA).';

-- ─────────────────────────────────────────────────────────────
-- PUBLICAÇÕES (Bio Link, Site, Blog, Portal, Landing Page)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- type: biolink | site | blog | portal | landing
  type            TEXT NOT NULL
                  CHECK (type IN ('biolink','site','blog','portal','landing')),
  name            TEXT NOT NULL,
  slug            TEXT, -- URL pública relativa
  -- status: draft | published | archived
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','archived')),
  -- config: dados específicos por tipo
  config          JSONB NOT NULL DEFAULT '{}',
  -- seo: {title, description, og_image, keywords: []}
  seo             JSONB NOT NULL DEFAULT '{}',
  simlab_score    INTEGER CHECK (simlab_score BETWEEN 0 AND 100),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE publications IS 'Tabela central de tudo que é publicável externamente';

-- ─────────────────────────────────────────────────────────────
-- BLOCOS DE BIO LINK
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publication_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- type: link | highlight | newsletter | product | video | music
  --       | countdown | separator | text | social | booking | map
  block_type      TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  -- content: dados específicos do tipo de bloco
  content         JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE publication_blocks IS 'Blocos de conteúdo do Bio Link. Ordenados por position.';

-- ─────────────────────────────────────────────────────────────
-- SEÇÕES DE SITE / LANDING PAGE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publication_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- page_slug: para sites multi-página (null = página principal)
  page_slug       TEXT,
  -- section_type: hero | features | testimonials | cta | gallery
  --              | faq | contact | footer | pricing | team | custom
  section_type    TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  -- content: textos, imagens, links do conteúdo desta seção
  content         JSONB NOT NULL DEFAULT '{}',
  -- styles: cores, fontes, espaçamentos desta seção
  styles          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE publication_sections IS 'Seções do construtor de site. Ordenadas por position dentro de cada page_slug.';

-- ─────────────────────────────────────────────────────────────
-- ARTIGOS DE BLOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  -- content: HTML rico gerado pelo editor
  content         TEXT,
  excerpt         TEXT,
  cover_image_url TEXT,
  -- seo: {meta_title, meta_description, og_image, focus_keyword}
  seo             JSONB NOT NULL DEFAULT '{}',
  -- status: draft | review | published | archived
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','review','published','archived')),
  simlab_score    INTEGER CHECK (simlab_score BETWEEN 0 AND 100),
  word_count      INTEGER,
  reading_time_minutes INTEGER,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(publication_id, slug)
);
COMMENT ON TABLE blog_articles IS 'Artigos do blog. Um blog (publication type=blog) tem N artigos.';

-- ─────────────────────────────────────────────────────────────
-- FONTES E ITENS RSS (Portal de Notícias)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rss_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id  UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  feed_url        TEXT NOT NULL,
  name            TEXT NOT NULL,
  -- status: active | error | paused
  status          TEXT NOT NULL DEFAULT 'active',
  last_fetched_at TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rss_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID NOT NULL REFERENCES rss_sources(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- item_url é unique para evitar duplicatas
  item_url        TEXT NOT NULL,
  title           TEXT,
  description     TEXT,
  image_url       TEXT,
  author          TEXT,
  published_at    TIMESTAMPTZ,
  -- 0-100: calculado por IA baseado no briefing
  relevance_score INTEGER NOT NULL DEFAULT 0,
  -- derivations: {post_id, video_id, article_id} — rastreia o que foi gerado a partir deste item
  derivations     JSONB NOT NULL DEFAULT '{}',
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_url)
);
COMMENT ON TABLE rss_items IS 'Artigos capturados dos feeds RSS. Deduplicados por item_url.';

-- ─────────────────────────────────────────────────────────────
-- CONTEÚDO (Posts e Vídeos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- type: post | video
  type            TEXT NOT NULL CHECK (type IN ('post','video')),
  title           TEXT NOT NULL,
  -- status: draft | processing | ready | published | archived
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','processing','ready','published','archived')),
  -- format: 1:1 | 9:16 | 16:9 | 4:5
  format          TEXT,
  -- Para posts: array de objetos {template_id, texts: {}, styles: {}}
  slides          JSONB NOT NULL DEFAULT '[]',
  -- Para vídeos: {job_id, render_url, duration_seconds, fps, remotion_template}
  video_job       JSONB NOT NULL DEFAULT '{}',
  -- template_id: referência ao template usado (banco, não hardcoded)
  template_id     UUID,
  simlab_score    INTEGER CHECK (simlab_score BETWEEN 0 AND 100),
  thumbnail_url   TEXT,
  -- source: manual | ai_generated | rss_derived | squad_generated
  source          TEXT NOT NULL DEFAULT 'manual',
  -- rss_item_id: se foi gerado a partir de um item RSS
  rss_item_id     UUID REFERENCES rss_items(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE content_items IS 'Posts de carrossel e vídeos criados no workspace.';

-- ─────────────────────────────────────────────────────────────
-- TEMPLATES DE CONTEÚDO (não mais hardcoded no frontend)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- scope: global (disponível para todos) | workspace (exclusivo do workspace)
  scope           TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','workspace')),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  -- type: post | video_remotion | video_prompt
  type            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  -- structure: estrutura de slots e defaults do template
  structure       JSONB NOT NULL DEFAULT '{}',
  -- guardrails: regras que o conteúdo deve respeitar neste template
  guardrails      JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE content_templates IS 'Templates de posts e vídeos. Nunca hardcoded no frontend.';

-- ─────────────────────────────────────────────────────────────
-- AGENTES (Personas, Influencers, Mascotes, Squads)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- agent_type: persona | influencer | mascote | squad
  agent_type      TEXT NOT NULL
                  CHECK (agent_type IN ('persona','influencer','mascote','squad')),
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  -- config: dados específicos por tipo
  --   persona: {demographics: {}, psychographics: {}, sor_model: {}}
  --   influencer: {handle, platform, audience_size, niche}
  --   mascote: {visual_description, personality, use_cases: []}
  --   squad: descrito em squad_nodes
  config          JSONB NOT NULL DEFAULT '{}',
  -- calibration_score: 0-100, qualidade do agente calibrado
  calibration_score INTEGER CHECK (calibration_score BETWEEN 0 AND 100),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE agents IS 'Todos os tipos de agentes de IA do workspace: personas, influencers, mascotes, squads.';

-- ─────────────────────────────────────────────────────────────
-- NÓS DO SQUAD (builder visual de automação)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS squad_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- node_type: trigger | ai_agent | validator | transformer | publisher | condition
  node_type       TEXT NOT NULL,
  -- position: {x: number, y: number} no canvas visual
  position        JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
  -- config: configuração específica deste nó
  config          JSONB NOT NULL DEFAULT '{}',
  -- connections: [{target_node_id: uuid, condition?: string}]
  connections     JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- VALIDAÇÕES SIMLAB
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simlab_validations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- content_type: post | video | blog_article | biolink | site
  content_type    TEXT NOT NULL,
  content_id      UUID NOT NULL,
  -- personas_used: [uuid, uuid, ...] — IDs dos agentes tipo persona usados
  personas_used   UUID[] NOT NULL DEFAULT '{}',
  -- scores: {overall: 0-100, by_persona: [{agent_id, score}], by_trigger: {}}
  scores          JSONB NOT NULL DEFAULT '{}',
  -- recommendations: [{issue, suggestion, impact: 'alto|médio|baixo'}]
  recommendations JSONB NOT NULL DEFAULT '[]',
  -- passed: score >= 60
  passed          BOOLEAN NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE simlab_validations IS 'Histórico de validações SimLab. Gate obrigatório antes de publicar.';

-- ─────────────────────────────────────────────────────────────
-- LEADS (CRM)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- publication_id: de qual publicação veio (bio link, landing page, etc.)
  publication_id  UUID REFERENCES publications(id),
  -- block_id: de qual bloco específico (newsletter, formulário, etc.)
  block_id        UUID REFERENCES publication_blocks(id),
  name            TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  -- status: new | contacted | qualified | customer | lost
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','qualified','customer','lost')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  -- metadata: dados extras capturados no formulário
  metadata        JSONB NOT NULL DEFAULT '{}',
  -- utm: {source, medium, campaign, content}
  utm             JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- LOGS DO SISTEMA (ZERO SILÊNCIO — obrigatório)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id),
  user_id         UUID REFERENCES auth.users(id),
  -- level: info | warning | error | critical
  level           TEXT NOT NULL CHECK (level IN ('info','warning','error','critical')),
  -- code: código único por tipo de erro — ex: ERR_BIOLINK_LOAD_001
  code            TEXT NOT NULL,
  -- module: biolink | site | blog | portal | video | post | agent | billing | auth
  module          TEXT NOT NULL,
  message         TEXT NOT NULL,
  -- detail: stacktrace, contexto adicional, payload da request que falhou
  detail          JSONB NOT NULL DEFAULT '{}',
  -- resolved: true quando o erro foi corrigido
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE system_logs IS 'Log centralizado de erros e eventos. NUNCA silenciar erros — sempre registrar aqui.';

-- Índice para busca rápida de erros por módulo e período
CREATE INDEX IF NOT EXISTS idx_system_logs_module_level
  ON system_logs(module, level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_workspace
  ON system_logs(workspace_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- CHAVES DE API DO ADMIN (orquestrador)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- service: openrouter | groq | firecrawl | steeldev | mapbox | resend | render
  service         TEXT NOT NULL,
  label           TEXT NOT NULL,     -- ex: 'Conta Free 1', 'Principal'
  -- key_encrypted: NUNCA armazenar em plaintext
  key_encrypted   TEXT NOT NULL,     -- pgcrypto encrypt
  monthly_limit   INTEGER,           -- NULL = sem limite
  current_usage   INTEGER NOT NULL DEFAULT 0,
  reset_date      DATE,              -- data de reset do contador
  is_active       BOOLEAN NOT NULL DEFAULT true,
  -- prioridade: menor número = usado primeiro
  priority_order  INTEGER NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE admin_api_keys IS 'Chaves de IA do admin. Rotacionadas automaticamente. NUNCA em plaintext.';

-- ─────────────────────────────────────────────────────────────
-- CHAVES DE API DO WORKSPACE (plano Business+)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  service         TEXT NOT NULL,
  label           TEXT NOT NULL,
  key_encrypted   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, service, label)
);

-- ─────────────────────────────────────────────────────────────
-- ASSINATURAS E FATURAMENTO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL,
  -- status: active | past_due | canceled | trialing | paused
  status          TEXT NOT NULL DEFAULT 'active',
  -- gateway: mercadopago | asaas | abacatepay | paypal
  gateway         TEXT NOT NULL,
  gateway_sub_id  TEXT,              -- ID da assinatura no gateway
  amount_cents    INTEGER NOT NULL,
  -- billing_cycle: monthly | yearly
  billing_cycle   TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  canceled_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount_cents    INTEGER NOT NULL,
  -- status: pending | paid | failed | refunded | canceled
  status          TEXT NOT NULL DEFAULT 'pending',
  gateway         TEXT NOT NULL,
  gateway_charge_id TEXT,
  -- payment_method: pix | credit_card | boleto | paypal
  payment_method  TEXT,
  payment_url     TEXT,
  paid_at         TIMESTAMPTZ,
  due_date        DATE,
  description     TEXT,
  -- metadata: dados extras do gateway (webhook payload, etc.)
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- TICKETS DE SUPORTE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  subject         TEXT NOT NULL,
  -- priority: low | medium | high | critical
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high','critical')),
  -- status: new | open | pending_user | pending_support | resolved | closed
  status          TEXT NOT NULL DEFAULT 'new',
  assignee_id     UUID REFERENCES auth.users(id),
  -- channel: widget | email | chat
  channel         TEXT NOT NULL DEFAULT 'widget',
  -- sla_deadline: calculado na criação baseado na prioridade
  sla_deadline    TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  -- rating: 1-5, preenchido pelo usuário ao fechar
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id),
  -- is_internal: true = nota interna (não visível para o usuário)
  is_internal     BOOLEAN NOT NULL DEFAULT false,
  message         TEXT NOT NULL,
  -- attachments: [{url, name, size_bytes, mime_type}]
  attachments     JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- FEATURE FLAGS (módulos ativados por plano/usuário)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- feature: nome único da feature — ex: 'module_video', 'simlab', 'own_api_keys'
  feature         TEXT NOT NULL,
  -- scope: global | plan | workspace | user
  scope           TEXT NOT NULL CHECK (scope IN ('global','plan','workspace','user')),
  -- scope_value: o valor do scope (nome do plano, workspace_id, user_id)
  scope_value     TEXT,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(feature, scope, scope_value)
);
COMMENT ON TABLE feature_flags IS 'Controle granular de features por plano, workspace ou usuário.';

-- ─────────────────────────────────────────────────────────────
-- ÍNDICES GIN PARA CAMPOS JSONB DE ALTA QUERY
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_publications_config ON publications USING GIN (config);
CREATE INDEX IF NOT EXISTS idx_briefings_content ON briefings USING GIN (content);
CREATE INDEX IF NOT EXISTS idx_agents_config ON agents USING GIN (config);
CREATE INDEX IF NOT EXISTS idx_content_items_slides ON content_items USING GIN (slides);

-- ─────────────────────────────────────────────────────────────
-- FUNÇÃO: updated_at automático
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas com updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspaces','brand_kits','briefings','publications',
    'publication_blocks','blog_articles','content_items',
    'agents','leads','support_tickets'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I;
       CREATE TRIGGER set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;
```

**Critério de aceitação SW-011:**

- [ ] Migration executada sem erros no Supabase SQL Editor
- [ ] Query 1 da SW-000 re-executada: todas as novas tabelas aparecem
- [ ] Nenhuma tabela existente foi deletada (verificar contagem antes vs depois)
- [ ] Todas as tabelas novas têm COMMENT documentado

---

### SW-012 — Tipos TypeScript Canônicos

**O que fazer:**
Criar `src/types/app.types.ts` com os tipos de negócio do Simwork.
Estes tipos são gerados a partir do schema — não inventados.

```typescript
// src/types/app.types.ts
// CONTRATO: Estes tipos devem refletir exatamente o schema do banco.
// Quando o schema mudar, este arquivo DEVE ser atualizado primeiro.

// ── Workspace ────────────────────────────────────────────────
export type WorkspacePlan =
  | "starter"
  | "pro"
  | "business"
  | "corp"
  | "admin_free";
export type WorkspaceStatus = "active" | "suspended" | "trial" | "canceled";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  trial_ends_at: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MemberRole = "owner" | "admin" | "editor" | "viewer";

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

// ── Brand Kit ────────────────────────────────────────────────
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  palette: string[];
}

export interface BrandFonts {
  heading: { family: string; weight: number };
  body: { family: string; weight: number };
  sizes: Record<string, string>;
}

export interface BrandLogos {
  main_url: string | null;
  icon_url: string | null;
  dark_url: string | null;
  light_url: string | null;
}

export interface BrandVoice {
  tone: string;
  formality: "formal" | "neutro" | "descontraído";
  use_words: string[];
  avoid_words: string[];
}

export interface BrandKit {
  id: string;
  workspace_id: string;
  colors: Partial<BrandColors>;
  fonts: Partial<BrandFonts>;
  logos: Partial<BrandLogos>;
  voice: Partial<BrandVoice>;
  updated_at: string;
}

// ── Publication ──────────────────────────────────────────────
export type PublicationType =
  | "biolink"
  | "site"
  | "blog"
  | "portal"
  | "landing";
export type PublicationStatus = "draft" | "published" | "archived";

export interface Publication {
  id: string;
  workspace_id: string;
  type: PublicationType;
  name: string;
  slug: string | null;
  status: PublicationStatus;
  config: Record<string, unknown>;
  seo: {
    title?: string;
    description?: string;
    og_image?: string;
    keywords?: string[];
  };
  simlab_score: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Bloco do Bio Link ────────────────────────────────────────
export type BlockType =
  | "link"
  | "highlight"
  | "newsletter"
  | "product"
  | "video"
  | "music"
  | "countdown"
  | "separator"
  | "text"
  | "social"
  | "booking"
  | "map";

export interface PublicationBlock {
  id: string;
  publication_id: string;
  workspace_id: string;
  block_type: BlockType;
  position: number;
  content: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Conteúdo ─────────────────────────────────────────────────
export type ContentType = "post" | "video";
export type ContentStatus =
  | "draft"
  | "processing"
  | "ready"
  | "published"
  | "archived";
export type ContentFormat = "1:1" | "9:16" | "16:9" | "4:5";

export interface ContentItem {
  id: string;
  workspace_id: string;
  type: ContentType;
  title: string;
  status: ContentStatus;
  format: ContentFormat | null;
  slides: SlideData[];
  video_job: VideoJobData;
  template_id: string | null;
  simlab_score: number | null;
  thumbnail_url: string | null;
  source: "manual" | "ai_generated" | "rss_derived" | "squad_generated";
  created_at: string;
  updated_at: string;
}

export interface SlideData {
  template_id: string;
  position: number;
  texts: Record<string, string>;
  styles: Record<string, string>;
}

export interface VideoJobData {
  job_id?: string;
  render_url?: string;
  duration_seconds?: number;
  fps?: number;
  remotion_template?: string;
  status?: "queued" | "processing" | "completed" | "failed";
  error?: string;
}

// ── Agente ───────────────────────────────────────────────────
export type AgentType = "persona" | "influencer" | "mascote" | "squad";

export interface Agent {
  id: string;
  workspace_id: string;
  agent_type: AgentType;
  name: string;
  avatar_url: string | null;
  config:
    | PersonaConfig
    | InfluencerConfig
    | MascoteConfig
    | Record<string, unknown>;
  calibration_score: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonaConfig {
  demographics: {
    age_range: string;
    gender: string;
    location: string;
    income_range: string;
    education: string;
    occupation: string;
  };
  psychographics: {
    values: string[];
    lifestyle: string;
    pain_points: string[];
    desires: string[];
  };
  sor_model: {
    stimulus_sensitivity: Record<string, number>; // gatilhos 0-100
    organism_filters: string[];
    typical_responses: string[];
  };
}

export interface InfluencerConfig {
  handle: string;
  platform: string;
  audience_size: number;
  niche: string;
  personality: string;
  content_style: string;
}

export interface MascoteConfig {
  visual_description: string;
  personality: string;
  backstory: string;
  use_cases: string[];
}

// ── SimLab ───────────────────────────────────────────────────
export interface SimLabValidation {
  id: string;
  workspace_id: string;
  content_type: string;
  content_id: string;
  personas_used: string[];
  scores: {
    overall: number;
    by_persona: Array<{ agent_id: string; score: number; name: string }>;
    by_trigger: Record<string, number>;
  };
  recommendations: Array<{
    issue: string;
    suggestion: string;
    impact: "alto" | "médio" | "baixo";
  }>;
  passed: boolean;
  created_at: string;
}

// ── Log de Sistema ───────────────────────────────────────────
export type LogLevel = "info" | "warning" | "error" | "critical";

export interface SystemLog {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  level: LogLevel;
  code: string;
  module: string;
  message: string;
  detail: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
}

// ── CCP Snapshot (contexto de marca para IA) ─────────────────
export interface CCPSnapshot {
  workspace: Pick<Workspace, "id" | "name" | "slug" | "plan">;
  brand_kit: Partial<BrandKit> | null;
  briefing: {
    company: Record<string, unknown>;
    audience: Record<string, unknown>;
    content: Record<string, unknown>;
    completeness_score: number;
  } | null;
  active_personas: Array<Pick<Agent, "id" | "name" | "config">>;
  completeness: "completo" | "parcial" | "vazio";
}
```

**Critério de aceitação SW-012:**

- [ ] Arquivo criado sem erros TypeScript
- [ ] Todos os tipos correspondem 1:1 com colunas do banco (sem inventar campos)
- [ ] Nenhum `any` nos tipos

---

### SW-013 — Cliente Supabase Único e getCCPSnapshot

**O que fazer:**
Garantir que existe apenas UM arquivo `lib/supabase.ts` no projeto.
Criar `lib/ccp.ts` com a função `getCCPSnapshot()`.

```typescript
// src/lib/supabase.ts
// REGRA: Este é o ÚNICO lugar onde o cliente Supabase é criado.
// Nunca criar createClient() em outros arquivos.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Erro fatal — não pode silenciar
  throw new Error(
    "[SIMWORK] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados. " +
      "Verifique o arquivo .env",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

```typescript
// src/lib/ccp.ts
// CCP = Context Control Protocol
// Função que compila o contexto completo de marca para uso nas IAs
// REGRA: Chamar esta função antes de QUALQUER geração com IA

import { supabase } from "./supabase";
import type { CCPSnapshot } from "../types/app.types";

export async function getCCPSnapshot(
  workspaceId: string,
): Promise<CCPSnapshot> {
  // Executa 3 queries em paralelo — sem esperar sequencialmente
  const [workspaceResult, brandKitResult, briefingResult, personasResult] =
    await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, slug, plan")
        .eq("id", workspaceId)
        .single(),

      supabase
        .from("brand_kits")
        .select("id, colors, fonts, logos, voice")
        .eq("workspace_id", workspaceId)
        .maybeSingle(), // maybeSingle: não lança erro se não existir

      supabase
        .from("briefings")
        .select("company, audience, content, completeness_score")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),

      supabase
        .from("agents")
        .select("id, name, config")
        .eq("workspace_id", workspaceId)
        .eq("agent_type", "persona")
        .eq("is_active", true),
    ]);

  // Erros fatais — workspace deve existir
  if (workspaceResult.error || !workspaceResult.data) {
    throw new Error(
      `[CCP_001] Workspace ${workspaceId} não encontrado: ${workspaceResult.error?.message}`,
    );
  }

  const snapshot: CCPSnapshot = {
    workspace: workspaceResult.data,
    brand_kit: brandKitResult.data ?? null,
    briefing: briefingResult.data ?? null,
    active_personas: personasResult.data ?? [],
    completeness: calcCompleteness(briefingResult.data, brandKitResult.data),
  };

  return snapshot;
}

function calcCompleteness(
  briefing: CCPSnapshot["briefing"],
  brandKit: CCPSnapshot["brand_kit"],
): CCPSnapshot["completeness"] {
  if (!briefing && !brandKit) return "vazio";
  const score = briefing?.completeness_score ?? 0;
  if (score >= 80 && brandKit?.colors) return "completo";
  return "parcial";
}

// Converte o snapshot em XML para injetar no system prompt das IAs
export function snapshotToXML(snapshot: CCPSnapshot): string {
  return `<context>
  <workspace name="${snapshot.workspace.name}" plan="${snapshot.workspace.plan}" />
  <brand_kit status="${snapshot.brand_kit ? "configurado" : "não configurado"}" />
  <briefing completeness="${snapshot.briefing?.completeness_score ?? 0}%">
    <company>${JSON.stringify(snapshot.briefing?.company ?? {})}</company>
    <audience>${JSON.stringify(snapshot.briefing?.audience ?? {})}</audience>
    <content>${JSON.stringify(snapshot.briefing?.content ?? {})}</content>
  </briefing>
  <personas count="${snapshot.active_personas.length}">
    ${snapshot.active_personas
      .map((p) => `<persona id="${p.id}" name="${p.name}" />`)
      .join("\n    ")}
  </personas>
</context>`;
}
```

**Critério de aceitação SW-013:**

- [ ] Apenas 1 arquivo com `createClient()` no projeto
- [ ] `getCCPSnapshot()` executa sem erro quando workspace existe
- [ ] `getCCPSnapshot()` lança erro com código quando workspace não existe (não retorna null silenciosamente)

---

## FASE 2 — CORREÇÃO DE ERROS CRÍTICOS DE CARREGAMENTO

> **Objetivo:** Resolver os erros "não foi possível carregar X" identificados na Fase 0.
> Esta fase executa uma task por módulo quebrado. Cada task segue o mesmo protocolo.

---

### PROTOCOLO DE CORREÇÃO DE MÓDULO QUEBRADO

Para cada módulo com erro de carregamento, executar nesta ordem:

```
PASSO 1 — DIAGNÓSTICO CONFIRMADO
  Usar os dados da SW-003 (docs/audit/quebras.md)
  Confirmar a causa raiz antes de escrever qualquer código

PASSO 2 — CORREÇÃO NO BANCO (se necessário)
  Executar migration específica para adicionar tabela/coluna faltante
  Verificar com SELECT que o dado existe

PASSO 3 — CORREÇÃO NA EDGE FUNCTION (se necessário)
  Corrigir a query, o nome da tabela ou a coluna
  Re-deployar a função
  Testar diretamente com curl ou Supabase Dashboard

PASSO 4 — CORREÇÃO NO FRONTEND
  Corrigir o nome da tabela, coluna ou campo no componente
  Verificar que o erro exibe ErrorBadge (não some silenciosamente)

PASSO 5 — VALIDAÇÃO FINAL
  Acessar o módulo no browser
  Confirmar que não há mais o erro "não foi possível carregar"
  Confirmar que dados reais aparecem (ou EmptyState correto)
```

---

### SW-020 — Corrigir Módulo Bio Link

**Diagnóstico esperado (confirmar com docs/audit/quebras.md antes de executar):**

A causa mais comum para "não foi possível carregar o Bio Link" é uma das seguintes:

- O código faz query em uma tabela chamada `bio_links` (legado) mas a tabela no banco agora é `publications` com `type = 'biolink'`
- A query inclui uma coluna que não existe (ex: `bio_link_config` em vez de `config`)
- RLS está bloqueando sem motivo — workspace_id não está sendo passado

**Migration específica (executar se necessário):**

```sql
-- SW-020-fix.sql
-- Se bio_links existir como tabela legada, migrar os dados para publications
-- NUNCA dropar bio_links antes de migrar

-- Verificar se bio_links existe como tabela legada
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'bio_links'
) AS bio_links_existe;

-- Se existir, migrar dados (executar apenas se a query acima retornar true)
INSERT INTO publications (
  id,
  workspace_id,
  type,
  name,
  slug,
  status,
  config,
  created_at,
  updated_at
)
SELECT
  id,                         -- preservar mesmo ID
  workspace_id,
  'biolink',
  COALESCE(name, title, 'Bio Link'),  -- tentar encontrar o campo certo
  COALESCE(slug, username),
  COALESCE(status, 'draft'),
  -- tudo que for específico vai para config
  jsonb_build_object(
    'theme', COALESCE(theme, '{}'),
    'background', COALESCE(background_config, '{}')
  ),
  created_at,
  COALESCE(updated_at, created_at)
FROM bio_links
ON CONFLICT (id) DO NOTHING;  -- não duplicar se já foi migrado

-- APENAS DEPOIS DE CONFIRMAR que os dados estão em publications:
-- NÃO dropar bio_links ainda — deixar até a próxima fase ser validada
```

**Correção no Frontend:**

```typescript
// ANTES (legado — causava o erro):
const { data } = await supabase
  .from("bio_links") // ← tabela que não existe mais
  .select("*") // ← SELECT * proibido
  .eq("workspace_id", workspaceId);

// DEPOIS (correto):
const { data, error } = await supabase
  .from("publications")
  .select(
    "id, name, slug, status, config, seo, simlab_score, published_at, updated_at",
  )
  .eq("workspace_id", workspaceId)
  .eq("type", "biolink")
  .order("created_at", { ascending: false });

if (error) {
  // NUNCA silenciar — sempre chamar logError
  await logError({
    code: "ERR_BIOLINK_LOAD_001",
    module: "biolink",
    message: "Não foi possível carregar os Bio Links",
    detail: { error: error.message, workspaceId },
    workspaceId,
  });
  // Lançar para o ErrorBoundary exibir
  throw error;
}
```

**Critério de aceitação SW-020:**

- [ ] Acessar /workspace/[id]/biolink sem ver "não foi possível carregar"
- [ ] Se não há bio links: EmptyState correto exibido (não mensagem de erro)
- [ ] Se há bio links: lista exibida corretamente
- [ ] Erro de carregamento (quando simulado) exibe ErrorBadge com código ERR_BIOLINK_LOAD_001
- [ ] Log registrado em system_logs quando erro ocorre

---

### SW-021 — Corrigir Módulo Blog / Artigos

```typescript
// ANTES (legado):
const { data } = await supabase
  .from("blog_posts") // tabela legada
  .select("*")
  .eq("workspace_id", workspaceId);

// DEPOIS (correto):
// Primeiro buscar a publication do tipo blog
const { data: blogPublication, error: pubError } = await supabase
  .from("publications")
  .select("id, name, status")
  .eq("workspace_id", workspaceId)
  .eq("type", "blog")
  .maybeSingle();

if (pubError) {
  await logError({
    code: "ERR_BLOG_PUB_LOAD_001",
    module: "blog",
    message: "Não foi possível carregar a publicação do Blog",
    detail: { error: pubError.message, workspaceId },
    workspaceId,
  });
  throw pubError;
}

// Se blog não existe ainda, mostrar EmptyState (não é erro)
if (!blogPublication) {
  return { articles: [], blogExists: false };
}

// Agora buscar os artigos
const { data: articles, error: artError } = await supabase
  .from("blog_articles")
  .select(
    "id, title, slug, excerpt, status, simlab_score, published_at, updated_at",
  )
  .eq("publication_id", blogPublication.id)
  .eq("workspace_id", workspaceId)
  .order("updated_at", { ascending: false });

if (artError) {
  await logError({
    code: "ERR_BLOG_ARTICLES_LOAD_001",
    module: "blog",
    message: "Não foi possível carregar os artigos do Blog",
    detail: { error: artError.message, publicationId: blogPublication.id },
    workspaceId,
  });
  throw artError;
}
```

**Critério de aceitação SW-021:**

- [ ] Acessar /workspace/[id]/blog sem ver "não foi possível carregar os artigos"
- [ ] Se não há blog criado: EmptyState com opção "Criar blog"
- [ ] Se há artigos: lista exibida corretamente
- [ ] Criar artigo funciona e salva em blog_articles

---

### SW-022 — Corrigir Módulo Site Institucional

```typescript
// DEPOIS (correto):
const { data: sites, error } = await supabase
  .from("publications")
  .select(
    "id, name, slug, status, config, seo, simlab_score, published_at, updated_at",
  )
  .eq("workspace_id", workspaceId)
  .eq("type", "site")
  .order("created_at", { ascending: false });

// Para carregar seções de um site específico:
const { data: sections, error: secError } = await supabase
  .from("publication_sections")
  .select("id, page_slug, section_type, position, content, styles, is_active")
  .eq("publication_id", siteId)
  .eq("workspace_id", workspaceId)
  .order("position", { ascending: true });
```

**Critério de aceitação SW-022:**

- [ ] Lista de sites carrega sem erro
- [ ] Seções de um site específico carregam corretamente
- [ ] Adicionar seção salva em publication_sections

---

### SW-023 — Corrigir Módulo News Portal RSS

```typescript
// DEPOIS (correto):

// Carregar fontes RSS da publicação do tipo portal
const { data: sources, error } = await supabase
  .from("rss_sources")
  .select("id, feed_url, name, status, last_fetched_at, last_error")
  .eq("workspace_id", workspaceId)
  .order("created_at", { ascending: true });

// Carregar itens RSS mais recentes
const { data: items, error: itemsError } = await supabase
  .from("rss_items")
  .select(
    "id, title, description, image_url, item_url, published_at, relevance_score",
  )
  .eq("workspace_id", workspaceId)
  .order("relevance_score", { ascending: false })
  .order("published_at", { ascending: false })
  .limit(50);
```

**Edge function news-rss-parser (parser REAL — não fictício):**

```typescript
// supabase/functions/news-rss-parser/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Parser XML simples para RSS — sem dependência externa problemática
function parseRSSXML(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
}> {
  const items: ReturnType<typeof parseRSSXML> = [];

  // Regex para extrair items do RSS
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const get = (tag: string) => {
      const m = itemXml.match(
        new RegExp(
          `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`,
        ),
      );
      return m ? (m[1] || m[2] || "").trim() : "";
    };

    const imageMatch = itemXml.match(
      /<media:content[^>]+url="([^"]+)"|<enclosure[^>]+url="([^"]+)"/,
    );

    items.push({
      title: get("title"),
      link: get("link"),
      description: get("description")
        .replace(/<[^>]*>/g, "")
        .substring(0, 300),
      pubDate: get("pubDate"),
      image: imageMatch ? imageMatch[1] || imageMatch[2] : undefined,
    });
  }

  return items;
}

serve(async (req) => {
  const { source_id, feed_url, workspace_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Fazer fetch do feed RSS
    const response = await fetch(feed_url, {
      headers: { "User-Agent": "Simwork RSS Parser/1.0" },
    });

    if (!response.ok) {
      throw new Error(`Feed retornou ${response.status}: ${feed_url}`);
    }

    const xml = await response.text();
    const parsedItems = parseRSSXML(xml);

    if (parsedItems.length === 0) {
      throw new Error(`Nenhum item encontrado no feed: ${feed_url}`);
    }

    // Inserir itens no banco (ignorar duplicatas pelo item_url)
    const { error: insertError } = await supabase.from("rss_items").upsert(
      parsedItems.map((item) => ({
        source_id,
        workspace_id,
        item_url: item.link,
        title: item.title,
        description: item.description,
        image_url: item.image ?? null,
        published_at: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : null,
        relevance_score: 50, // será recalculado pela IA num segundo passo
      })),
      { onConflict: "item_url", ignoreDuplicates: true },
    );

    if (insertError) throw insertError;

    // Atualizar status da fonte
    await supabase
      .from("rss_sources")
      .update({ last_fetched_at: new Date().toISOString(), last_error: null })
      .eq("id", source_id);

    return new Response(
      JSON.stringify({
        success: true,
        items_found: parsedItems.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    // Registrar erro na fonte
    await supabase
      .from("rss_sources")
      .update({ last_error: error.message })
      .eq("id", source_id);

    // Registrar em system_logs
    await supabase.from("system_logs").insert({
      workspace_id,
      level: "error",
      code: "ERR_RSS_PARSE_001",
      module: "portal",
      message: `Falha ao parsear feed RSS: ${feed_url}`,
      detail: { error: error.message, source_id, feed_url },
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

**Critério de aceitação SW-023:**

- [ ] Adicionar fonte RSS e fazer fetch retorna itens reais
- [ ] Itens ficam salvos em rss_items
- [ ] Erro de feed inválido aparece em last_error da rss_sources e em system_logs

---

### SW-024 — Corrigir Módulo Video Studio

**Diagnóstico do erro "Failed to send a request to the Edge Function":**

```bash
# Verificar se a edge function existe e está deployada
supabase functions list

# Verificar variáveis de ambiente configuradas
supabase secrets list

# Testar a edge function diretamente
curl -X POST 'https://[project-ref].supabase.co/functions/v1/video-studio-orchestrator' \
  -H 'Authorization: Bearer [anon-key]' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

**Se a função não existir:**

```typescript
// supabase/functions/video-studio-orchestrator/index.ts
// Versão mínima funcional — sem Remotion ainda (será adicionado na Fase 6)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { action, workspace_id, content_id } = body;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "workspace_id é obrigatório",
          code: "ERR_VIDEO_MISSING_WORKSPACE",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    switch (action) {
      case "get_templates": {
        const { data, error } = await supabase
          .from("content_templates")
          .select("id, name, description, thumbnail_url, structure, guardrails")
          .eq("type", "video_remotion")
          .eq("is_active", true)
          .or(
            `scope.eq.global,and(scope.eq.workspace,workspace_id.eq.${workspace_id})`,
          );

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, templates: data }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Ação desconhecida: ${action}`,
            code: "ERR_VIDEO_UNKNOWN_ACTION",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }
  } catch (error) {
    await supabase.from("system_logs").insert({
      level: "error",
      code: "ERR_VIDEO_EDGE_001",
      module: "video",
      message: "Erro na edge function video-studio-orchestrator",
      detail: { error: error.message },
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: "ERR_VIDEO_EDGE_001",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

**Critério de aceitação SW-024:**

- [ ] Edge function responde com status 200 a um request básico
- [ ] Erro na função retorna JSON com `code` legível (não "Failed to fetch")
- [ ] Frontend exibe o erro com código quando a função falha

---

## FASE 3 — SISTEMA DE LOGS E ERROS (ZERO SILÊNCIO)

> **Objetivo:** Tornar impossível que um erro aconteça sem ser registrado e exibido.
> Esta fase cria a infraestrutura que todas as outras fases dependem.

---

### SW-030 — Função logError (lib/error-logger.ts)

```typescript
// src/lib/error-logger.ts
// REGRA: Todo erro no sistema DEVE passar por esta função.
// Nunca usar apenas console.error() sem chamar logError().

import { supabase } from "./supabase";
import type { LogLevel } from "../types/app.types";

export interface LogErrorParams {
  code: string; // ex: 'ERR_BIOLINK_LOAD_001'
  module: string; // ex: 'biolink'
  message: string; // mensagem para o usuário (pt-BR)
  detail?: Record<string, unknown>; // dados técnicos (stacktrace, payload, etc.)
  workspaceId?: string;
  userId?: string;
  level?: LogLevel;
}

export async function logError(params: LogErrorParams): Promise<void> {
  const {
    code,
    module,
    message,
    detail = {},
    workspaceId,
    userId,
    level = "error",
  } = params;

  // 1. Console sempre — para debugging durante desenvolvimento
  console.error(`[${code}] ${module}: ${message}`, detail);

  // 2. Banco de dados — para observabilidade em produção
  try {
    await supabase.from("system_logs").insert({
      workspace_id: workspaceId ?? null,
      user_id: userId ?? null,
      level,
      code,
      module,
      message,
      detail,
    });
  } catch (logError) {
    // Se o próprio log falhar, pelo menos mostrar no console
    // (não lançar erro aqui — causaria loop infinito)
    console.error(
      "[SIMWORK-LOG-FAILURE] Não foi possível salvar log:",
      logError,
    );
  }
}

// Hook para uso em componentes React
// Uso: const { logError } = useErrorLogger();
export function useErrorLogger() {
  // Obtém user_id e workspace_id do contexto automaticamente
  // Para não ter que passar sempre manualmente

  const log = async (
    params: Omit<LogErrorParams, "userId" | "workspaceId"> & {
      workspaceId?: string;
    },
  ) => {
    // userId virá do AuthContext — implementar quando AuthContext estiver pronto
    await logError(params);
  };

  return { logError: log };
}
```

---

### SW-031 — Componente ErrorBadge

```typescript
// src/components/shared/ErrorBadge.tsx
// REGRA: Todo erro exibido na UI DEVE usar este componente.
// Nunca exibir strings de erro diretamente no JSX.

import React, { useState } from 'react';

export interface ErrorBadgeProps {
  code: string;           // ex: 'ERR_BIOLINK_LOAD_001'
  message: string;        // mensagem amigável pt-BR
  detail?: string;        // detalhe técnico (stacktrace, SQL error, etc.)
  onRetry?: () => void;   // função para tentar novamente
  fullWidth?: boolean;    // se deve ocupar toda a largura
}

export function ErrorBadge({
  code,
  message,
  detail,
  onRetry,
  fullWidth = false,
}: ErrorBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {/* Ícone */}
      <span style={{ color: '#EF4444', fontSize: '16px', marginTop: '1px' }}>⛔</span>

      {/* Conteúdo */}
      <div style={{ flex: 1 }}>
        {/* Código do erro — sempre visível */}
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: '#EF4444',
            fontWeight: 600,
            marginBottom: '3px',
            letterSpacing: '0.5px',
          }}
        >
          {code}
        </div>

        {/* Mensagem amigável */}
        <div style={{ fontSize: '13px', color: '#E2E8F0', marginBottom: '4px' }}>
          {message}
        </div>

        {/* Detalhe técnico (expansível) */}
        {detail && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '11px',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              {expanded ? '▲ Ocultar detalhe técnico' : '▼ Ver detalhe técnico'}
            </button>
            {expanded && (
              <pre
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#94A3B8',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {detail}
              </pre>
            )}
          </>
        )}
      </div>

      {/* Botão de retry */}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '5px 12px',
            background: '#EF4444',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
```

---

### SW-032 — ErrorBoundary Global

```typescript
// src/components/shared/ErrorBoundary.tsx
// REGRA: Envolver CADA página e módulo com ErrorBoundary.
// Um erro em um módulo não pode travar o app inteiro.

import React from 'react';
import { ErrorBadge } from './ErrorBadge';
import { logError } from '../../lib/error-logger';

interface Props {
  children: React.ReactNode;
  module: string;         // nome do módulo — para o código de erro
  fallback?: React.ReactNode;  // UI alternativa opcional
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCode: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCode: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    const module = 'unknown';
    const errorCode = `ERR_${module.toUpperCase()}_BOUNDARY_001`;
    return { hasError: true, error, errorCode };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const { module } = this.props;
    const errorCode = `ERR_${module.toUpperCase().replace(/-/g, '_')}_BOUNDARY_001`;

    // Sempre logar — nunca silenciar
    logError({
      code: errorCode,
      module,
      message: `Erro não tratado no módulo ${module}: ${error.message}`,
      detail: {
        error: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      },
      level: 'critical',
    });

    this.setState({ errorCode });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{ padding: '24px' }}>
          <ErrorBadge
            code={this.state.errorCode}
            message={`Ocorreu um erro inesperado neste módulo.`}
            detail={this.state.error?.stack}
            onRetry={() => {
              this.setState({ hasError: false, error: null, errorCode: '' });
            }}
            fullWidth
          />
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### SW-033 — EmptyState (substitui landing pages internas)

```typescript
// src/components/shared/EmptyState.tsx
// REGRA: Usar este componente quando um módulo não tem dados ainda.
// NUNCA mostrar landing page informativa — apenas EmptyState + ação.

interface EmptyStateProps {
  icon: string;                    // emoji ou ícone
  title: string;                   // pt-BR, ex: "Nenhum Bio Link criado"
  description: string;             // pt-BR, breve
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon, title, description, action, secondaryAction
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      gap: '16px',
    }}>
      <div style={{ fontSize: '40px' }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '300px' }}>
        {description}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '10px 20px',
            background: '#6366F1',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366F1',
            fontSize: '12px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
```

**Critério de aceitação Fase 3:**

- [ ] `logError()` chamado em todo catch block do projeto
- [ ] `ErrorBoundary` envolvendo todas as páginas no App.tsx
- [ ] `ErrorBadge` usado em todos os pontos de exibição de erro
- [ ] `EmptyState` substituindo todas as mensagens de "não encontrado" sem código
- [ ] Query em system_logs retorna registros após simular erros

---

## FASE 4 — AUTENTICAÇÃO, WORKSPACE E RLS

> **Objetivo:** Garantir que o sistema de multi-tenancy funciona corretamente.
> Nenhum usuário vê dados de outro workspace. Nenhuma query sem workspace_id.

---

### SW-040 — Políticas RLS Canônicas

```sql
-- SW-040-rls.sql
-- Aplicar em TODAS as tabelas de dados do workspace

-- ─────────────────────────────────────────────────────────────
-- FUNÇÃO AUXILIAR: verificar se usuário é membro do workspace
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_workspace_member(wid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = wid
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- HABILITAR RLS EM TODAS AS TABELAS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simlab_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- POLÍTICAS PARA CADA TABELA
-- Padrão: usuário acessa apenas dados do workspace do qual é membro
-- ─────────────────────────────────────────────────────────────

-- workspaces: vê apenas os workspaces onde é membro
DROP POLICY IF EXISTS "members_see_workspace" ON workspaces;
CREATE POLICY "members_see_workspace" ON workspaces
  FOR ALL USING (is_workspace_member(id));

-- workspace_members: vê apenas os membros do mesmo workspace
DROP POLICY IF EXISTS "members_see_members" ON workspace_members;
CREATE POLICY "members_see_members" ON workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));

-- Somente owner/admin podem gerenciar membros
DROP POLICY IF EXISTS "admins_manage_members" ON workspace_members;
CREATE POLICY "admins_manage_members" ON workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
    )
  );

-- Macro para tabelas com workspace_id direto
-- Aplica a: brand_kits, briefings, publications, content_items, agents, leads, etc.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'brand_kits','briefings','publications','content_items',
    'content_templates','agents','leads','workspace_api_keys',
    'system_logs','subscriptions','invoices','support_tickets'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "workspace_member_access" ON %I;
       CREATE POLICY "workspace_member_access" ON %I
       FOR ALL USING (is_workspace_member(workspace_id));',
      t, t
    );
  END LOOP;
END;
$$;

-- Tabelas com publication_id ou source_id (acesso via workspace_id na linha)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'publication_blocks','publication_sections','blog_articles',
    'rss_sources','rss_items','squad_nodes','simlab_validations'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "workspace_member_access" ON %I;
       CREATE POLICY "workspace_member_access" ON %I
       FOR ALL USING (is_workspace_member(workspace_id));',
      t, t
    );
  END LOOP;
END;
$$;

-- ticket_messages: apenas quem participou do ticket
DROP POLICY IF EXISTS "ticket_participants" ON ticket_messages;
CREATE POLICY "ticket_participants" ON ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_messages.ticket_id
      AND (st.user_id = auth.uid() OR st.assignee_id = auth.uid())
    )
  );
```

**Critério de aceitação SW-040:**

- [ ] RLS habilitado em todas as tabelas listadas (verificar com Query 5 da SW-000)
- [ ] Usuário A não consegue ler dados do workspace do Usuário B
- [ ] Usuário consegue ler seus próprios dados normalmente

---

### SW-041 — WorkspaceContext Canônico

```typescript
// src/contexts/WorkspaceContext.tsx
// REGRA: Este é o ÚNICO provider de workspace no app.
// Todo componente que precisa do workspace usa useWorkspace().

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/error-logger';
import type { Workspace, WorkspaceMember, MemberRole } from '../types/app.types';

interface WorkspaceContextValue {
  workspace: Workspace | null;
  role: MemberRole | null;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  workspaceId,
}: {
  children: React.ReactNode;
  workspaceId: string;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: wsError } = await supabase
        .from('workspaces')
        .select(`
          id, name, slug, logo_url, plan, status,
          trial_ends_at, settings, created_at, updated_at,
          workspace_members!inner(role)
        `)
        .eq('id', workspaceId)
        .eq('workspace_members.user_id', user.id)
        .single();

      if (wsError) throw wsError;
      if (!data) throw new Error('Workspace não encontrado ou acesso negado');

      setWorkspace(data as Workspace);
      setRole((data.workspace_members as unknown as WorkspaceMember[])[0]?.role ?? null);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      const code = 'ERR_WORKSPACE_LOAD_001';

      setError(message);
      setErrorCode(code);

      await logError({
        code,
        module: 'workspace',
        message: `Não foi possível carregar o workspace ${workspaceId}`,
        detail: { error: message, workspaceId },
        workspaceId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  return (
    <WorkspaceContext.Provider value={{
      workspace,
      role,
      isLoading,
      error,
      errorCode,
      refetch: fetchWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace() deve ser usado dentro de WorkspaceProvider');
  }
  return ctx;
}
```

**Critério de aceitação SW-041:**

- [ ] `useWorkspace()` retorna dados corretos para usuário autenticado
- [ ] `useWorkspace()` retorna `error` e `errorCode` quando workspace não existe
- [ ] Nenhum outro componente do app faz query direta em `workspaces` — todos usam o contexto

---

## FASE 5 — MÓDULO PUBLICAÇÕES

> **Objetivo:** Fazer Bio Link, Site, Blog e Portal funcionarem de ponta a ponta.
> Cada sub-módulo tem seu fluxo completo: listar → criar → editar → publicar.

---

### SW-050 — Fluxo Completo do Bio Link

**Contrato de API (o que o frontend espera do banco):**

```typescript
// Operações obrigatórias para o Bio Link funcionar:

// 1. LISTAR bio links do workspace
async function listBioLinks(workspaceId: string) {
  return supabase
    .from("publications")
    .select("id, name, slug, status, simlab_score, published_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("type", "biolink")
    .order("updated_at", { ascending: false });
  // Retorna: Publication[] filtrado por type=biolink
}

// 2. BUSCAR um bio link específico com seus blocos
async function getBioLink(bioLinkId: string, workspaceId: string) {
  const [pubResult, blocksResult] = await Promise.all([
    supabase
      .from("publications")
      .select("id, name, slug, status, config, seo, simlab_score, published_at")
      .eq("id", bioLinkId)
      .eq("workspace_id", workspaceId)
      .eq("type", "biolink")
      .single(),
    supabase
      .from("publication_blocks")
      .select("id, block_type, position, content, is_active")
      .eq("publication_id", bioLinkId)
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true }),
  ]);
  // Retorna: {publication: Publication, blocks: PublicationBlock[]}
}

// 3. CRIAR bio link
async function createBioLink(workspaceId: string, name: string, slug: string) {
  return supabase
    .from("publications")
    .insert({
      workspace_id: workspaceId,
      type: "biolink",
      name,
      slug,
      status: "draft",
    })
    .select("id")
    .single();
  // Retorna: {id: string}
}

// 4. ADICIONAR bloco ao bio link
async function addBlock(
  publicationId: string,
  workspaceId: string,
  blockType: BlockType,
  position: number,
) {
  return supabase
    .from("publication_blocks")
    .insert({
      publication_id: publicationId,
      workspace_id: workspaceId,
      block_type: blockType,
      position,
      content: getDefaultContentForBlock(blockType),
      is_active: true,
    })
    .select("id")
    .single();
}

// 5. ATUALIZAR bloco
async function updateBlock(
  blockId: string,
  workspaceId: string,
  content: Record<string, unknown>,
) {
  return supabase
    .from("publication_blocks")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", blockId)
    .eq("workspace_id", workspaceId); // sempre filtrar por workspace!
}

// 6. REORDENAR blocos
async function reorderBlocks(
  blocks: Array<{ id: string; position: number }>,
  workspaceId: string,
) {
  const updates = blocks.map((b) =>
    supabase
      .from("publication_blocks")
      .update({ position: b.position })
      .eq("id", b.id)
      .eq("workspace_id", workspaceId),
  );
  return Promise.all(updates);
}

// 7. PUBLICAR bio link
async function publishBioLink(bioLinkId: string, workspaceId: string) {
  return supabase
    .from("publications")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", bioLinkId)
    .eq("workspace_id", workspaceId)
    .eq("type", "biolink");
}
```

**Critério de aceitação SW-050:**

- [ ] Criar bio link → aparece na lista
- [ ] Abrir editor do bio link → blocos carregam
- [ ] Adicionar bloco → salvo no banco e aparece no preview
- [ ] Reordenar blocos → nova ordem persiste
- [ ] Publicar → status muda para 'published', published_at preenchido
- [ ] Acessar URL pública → bio link renderiza

---

### SW-051 — Códigos de Erro por Módulo (tabela de referência)

```markdown
# TABELA DE CÓDIGOS DE ERRO — docs/error-codes.md

## Bio Link

| Código                       | Quando ocorre                         |
| ---------------------------- | ------------------------------------- |
| ERR_BIOLINK_LOAD_001         | Falha ao listar bio links             |
| ERR_BIOLINK_GET_001          | Falha ao carregar bio link específico |
| ERR_BIOLINK_CREATE_001       | Falha ao criar bio link               |
| ERR_BIOLINK_BLOCK_ADD_001    | Falha ao adicionar bloco              |
| ERR_BIOLINK_BLOCK_UPDATE_001 | Falha ao atualizar bloco              |
| ERR_BIOLINK_PUBLISH_001      | Falha ao publicar                     |
| ERR_BIOLINK_PUBLIC_001       | Falha ao servir página pública        |
| ERR_BIOLINK_SLUG_DUP_001     | Slug já existe no sistema             |

## Site

| ERR_SITE_LOAD_001 | Falha ao listar sites |
| ERR_SITE_SECTIONS_001 | Falha ao carregar seções |
| ERR_SITE_SECTION_SAVE_001 | Falha ao salvar seção |
| ERR_SITE_PUBLISH_001 | Falha ao publicar site |

## Blog

| ERR_BLOG_PUB_LOAD_001 | Publicação do blog não encontrada |
| ERR_BLOG_ARTICLES_LOAD_001 | Falha ao carregar artigos |
| ERR_BLOG_ARTICLE_SAVE_001 | Falha ao salvar artigo |
| ERR_BLOG_ARTICLE_PUBLISH_001 | Falha ao publicar artigo |

## Portal RSS

| ERR_RSS_SOURCE_ADD_001 | Falha ao adicionar fonte RSS |
| ERR_RSS_FETCH_001 | Falha ao buscar feed (edge function) |
| ERR_RSS_PARSE_001 | Falha ao parsear XML do feed |
| ERR_RSS_ITEMS_LOAD_001 | Falha ao carregar itens |

## Vídeo

| ERR_VIDEO_EDGE_001 | Edge function video-studio indisponível |
| ERR_VIDEO_TEMPLATES_001 | Falha ao carregar templates |
| ERR_VIDEO_RENDER_001 | Falha ao iniciar renderização |
| ERR_VIDEO_RENDER_TIMEOUT_001 | Renderização demorou além do limite |
| ERR_VIDEO_PREVIEW_NULL | Preview Remotion retornou null |

## Post

| ERR_POST_LOAD_001 | Falha ao carregar posts |
| ERR_POST_GENERATE_001 | Falha na geração com IA |
| ERR_POST_TEMPLATE_001 | Template não encontrado no banco |
| ERR_POST_EXPORT_001 | Falha na exportação de imagem |

## Agentes

| ERR_AGENT_LOAD_001 | Falha ao carregar agentes |
| ERR_AGENT_SAVE_001 | Falha ao salvar agente |
| ERR_SIMLAB_RUN_001 | Falha ao executar validação SimLab |
| ERR_SIMLAB_NO_PERSONAS | Nenhuma persona ativa para validar |

## Chaves de IA

| ERR_KEY_ORCH_001 | Nenhuma chave configurada para o serviço |
| ERR_KEY_ORCH_002 | Todas as chaves atingiram o limite |
| ERR_KEY_DECRYPT_001 | Falha ao descriptografar chave |

## Workspace

| ERR_WORKSPACE_LOAD_001 | Workspace não encontrado ou sem acesso |
| ERR_WORKSPACE_MEMBER_001 | Falha ao gerenciar membros |
| ERR_WORKSPACE_RLS_001 | RLS bloqueando acesso inesperadamente |

## Pagamentos

| ERR_GATEWAY_SESSION_001 | Falha ao criar sessão de checkout |
| ERR_GATEWAY_WEBHOOK_001 | Webhook com payload inválido |
| ERR_PAYMENT_CONFIRM_001 | Confirmação de pagamento falhou |
```

---

## FASE 6 — MÓDULO CONTEÚDO (POSTS E VÍDEOS)

> **Objetivo:** Posts gerados por IA com templates do banco (não hardcoded).
> Vídeos com Remotion real e status de job visível.

---

### SW-060 — Seed de Templates no Banco

```sql
-- SW-060-templates-seed.sql
-- Inserir templates base no banco — não mais no código React

INSERT INTO content_templates (scope, type, name, description, structure, guardrails, is_active)
VALUES

-- Template: Carrossel Educacional
('global', 'post', 'Carrossel Educacional',
 'Apresenta um conceito com introdução, desenvolvimento e conclusão',
 '{
   "slides": [
     {"slot": "capa", "required_fields": ["titulo", "subtitulo"], "max_chars": {"titulo": 60, "subtitulo": 120}},
     {"slot": "desenvolvimento", "count": "3-7", "required_fields": ["ponto", "explicacao"]},
     {"slot": "cta", "required_fields": ["chamada", "acao"]}
   ]
 }',
 '[
   {"rule": "Capa deve ter título em no máximo 8 palavras"},
   {"rule": "Cada slide de desenvolvimento: 1 ponto por slide"},
   {"rule": "CTA deve ter verbo de ação"}
 ]',
 true),

-- Template: Lançamento / Promoção
('global', 'post', 'Lançamento / Promoção',
 'Anuncia produto ou serviço com urgência e CTA claro',
 '{
   "slides": [
     {"slot": "gancho", "required_fields": ["headline", "subheadline"]},
     {"slot": "beneficios", "count": "2-4", "required_fields": ["beneficio", "icone"]},
     {"slot": "prova_social", "optional": true, "required_fields": ["depoimento", "autor"]},
     {"slot": "oferta", "required_fields": ["preco", "desconto", "validade"]},
     {"slot": "cta", "required_fields": ["chamada", "link"]}
   ]
 }',
 '[
   {"rule": "Headline deve criar urgência ou curiosidade"},
   {"rule": "Benefícios: foco em resultado, não em feature"},
   {"rule": "CTA deve ser específico — não usar ''Saiba mais''"}
 ]',
 true),

-- Template: Remotion — Launch Burst
('global', 'video_remotion', 'Launch Burst',
 'Hook rápido, uma prova clara e CTA de lançamento. Urgência máxima.',
 '{
   "compositions": [
     {"id": "hook", "duration_frames": 48, "required_props": ["headline"]},
     {"id": "proof", "duration_frames": 60, "required_props": ["proof_statement"]},
     {"id": "cta", "duration_frames": 36, "required_props": ["cta_text", "cta_url"]}
   ],
   "supported_formats": ["9:16", "1:1", "16:9"],
   "fps": 30
 }',
 '[
   {"rule": "Hook deve ter no máximo 48 frames para manter urgência"},
   {"rule": "Apenas uma prova por vídeo — não empilhar statements"},
   {"rule": "Logo chip: ativar apenas quando asset de logo estiver aprovado"}
 ]',
 true),

-- Template: Remotion — Proof Stack
('global', 'video_remotion', 'Proof Stack',
 'Apresenta métricas, features e CTA com base em dados.',
 '{
   "compositions": [
     {"id": "metric_1", "duration_frames": 45, "required_props": ["metric_value", "metric_label"]},
     {"id": "metric_2", "duration_frames": 45, "required_props": ["metric_value", "metric_label"]},
     {"id": "feature_list", "duration_frames": 60, "required_props": ["features"]},
     {"id": "cta", "duration_frames": 36, "required_props": ["cta_text"]}
   ],
   "supported_formats": ["1:1", "16:9"],
   "fps": 30
 }',
 '[
   {"rule": "Métricas devem ser reais — não inventar dados"},
   {"rule": "Features: máximo 4 itens por lista"},
   {"rule": "CTA deve ser derivado do benefício demonstrado"}
 ]',
 true)

ON CONFLICT DO NOTHING;
```

**Critério de aceitação SW-060:**

- [ ] Templates existem no banco (SELECT count(\*) FROM content_templates > 0)
- [ ] Frontend não usa nenhum template hardcoded no código React
- [ ] Editor de post carrega templates do banco via query

---

### SW-061 — Contrato de Video Job

```typescript
// src/hooks/useVideoJob.ts
// Gerencia o estado de renderização de um vídeo

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";

export function useVideoJob(contentId: string | null) {
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  useEffect(() => {
    if (!contentId) return;

    // Subscrição em tempo real no job de vídeo
    subscriptionRef.current = supabase
      .channel(`video-job-${contentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "content_items",
          filter: `id=eq.${contentId}`,
        },
        (payload) => {
          const videoJob = payload.new.video_job as Record<string, unknown>;
          setJobStatus(videoJob.status as string);
          if (videoJob.render_url) {
            setRenderUrl(videoJob.render_url as string);
          }
          if (videoJob.status === "failed") {
            logError({
              code: "ERR_VIDEO_RENDER_001",
              module: "video",
              message: "Renderização do vídeo falhou",
              detail: { contentId, error: videoJob.error },
            });
          }
        },
      )
      .subscribe();

    // CRÍTICO: cleanup para evitar memory leak
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [contentId]);

  return { jobStatus, renderUrl };
}
```

---

## FASE 7 — MÓDULO AGENTES

> Spec completo para personas SimLab, squads e validação.
> Ver: simlab_v2_cerebro_real.md já existente — integrar ao schema canônico.

### SW-070 — Migração de Dados de Agentes Legados

```sql
-- SW-070-agents-migrate.sql
-- Verificar se existem tabelas legadas de personas/influencers/mascotes

-- Tabelas legadas conhecidas possíveis (verificar com docs/audit/tabelas.md)
-- sim_personas, simlab_personas, influencer_profiles, mascotes, characters

-- Para cada tabela legada encontrada, migrar para agents:
INSERT INTO agents (workspace_id, agent_type, name, config, is_active, created_at)
SELECT
  workspace_id,
  'persona',
  name,
  jsonb_build_object(
    'demographics', COALESCE(demographics, '{}'),
    'psychographics', COALESCE(psychographics, '{}'),
    'sor_model', COALESCE(sor_model, '{}')
  ),
  COALESCE(is_active, true),
  created_at
FROM sim_personas  -- substituir pelo nome real da tabela legada
ON CONFLICT DO NOTHING;

-- Repetir para influencer_profiles, mascotes, etc.
-- Usar agent_type correto: 'influencer', 'mascote'
```

---

## FASE 8 — GESTÃO DE MARCA

### SW-080 — Brand Kit e Briefing com Auto-Save

```typescript
// src/hooks/useBrandKit.ts

export function useBrandKit(workspaceId: string) {
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const save = async (updates: Partial<BrandKit>) => {
    // Debounce: salvar 1.5s após última mudança
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("brand_kits")
          .upsert(
            { workspace_id: workspaceId, ...updates },
            { onConflict: "workspace_id" },
          );
        if (error) throw error;
      } catch (err) {
        await logError({
          code: "ERR_BRANDKIT_SAVE_001",
          module: "marca",
          message: "Não foi possível salvar o Brand Kit",
          detail: { error: String(err) },
          workspaceId,
        });
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  };

  return { brandKit, isSaving, save };
}
```

---

## FASE 9 — ANALYTICS CENTRAL

### SW-090 — Analytics Beacon (eventos reais)

```typescript
// src/lib/analytics.ts
// Registra eventos de analytics sem bloquear a UI

export type AnalyticsEvent =
  | "page_view"
  | "block_click"
  | "lead_captured"
  | "video_played"
  | "link_clicked";

export async function trackEvent(params: {
  event: AnalyticsEvent;
  publication_id: string;
  workspace_id: string;
  block_id?: string;
  metadata?: Record<string, unknown>;
}) {
  // Usar sendBeacon para não bloquear a navegação
  const payload = JSON.stringify({
    ...params,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    referrer: document.referrer,
  });

  // Tentar sendBeacon primeiro (não bloqueia)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-beacon`,
      payload,
    );
    return;
  }

  // Fallback: fetch normal
  try {
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-beacon`,
      {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      },
    );
  } catch {
    // Analytics não pode quebrar a experiência do usuário
    // Silenciar este erro específico é aceitável
  }
}
```

---

## FASE 10 — PAINEL ADMIN

### SW-100 — Rota Admin Protegida

```typescript
// src/pages/admin/AdminGuard.tsx
// Protege rotas de admin — apenas email autorizado pode acessar

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '').split(',');

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user ? ADMIN_EMAILS.includes(user.email ?? '') : false);
    });
  }, []);

  if (isAdmin === null) return <LoadingOverlay />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

---

## FASE 11 — BILLING E GATEWAYS

### SW-110 — Orquestrador de Gateways de Pagamento

```typescript
// src/lib/payment-orchestrator.ts

type PaymentMethod = "pix" | "credit_card" | "boleto";
type Gateway = "mercadopago" | "asaas" | "abacatepay" | "paypal";

const GATEWAY_PRIORITY: Record<PaymentMethod, Gateway[]> = {
  // PIX: AbacatePay tem menor taxa — usar primeiro
  pix: ["abacatepay", "mercadopago", "asaas"],
  // Cartão BR: Mercado Pago é mais robusto
  credit_card: ["mercadopago", "asaas"],
  // Boleto: Asaas especializado
  boleto: ["asaas"],
};

export async function selectGateway(method: PaymentMethod): Promise<Gateway> {
  const priority = GATEWAY_PRIORITY[method];

  // Verificar quais gateways estão ativos nas configurações do admin
  // (buscar de feature_flags ou de uma tabela de config de gateways)
  const activeGateways = await getActiveGateways();

  for (const gateway of priority) {
    if (activeGateways.includes(gateway)) return gateway;
  }

  throw new Error(
    `[ERR_GATEWAY_SESSION_001] Nenhum gateway disponível para ${method}`,
  );
}
```

---

## FASE 12 — SUPORTE E TICKETS

### SW-120 — Cálculo de SLA por Prioridade

```typescript
// supabase/functions/support-ticket-create/index.ts

const SLA_HOURS: Record<string, { response: number; resolution: number }> = {
  critical: { response: 2, resolution: 12 },
  high: { response: 4, resolution: 24 },
  medium: { response: 8, resolution: 48 },
  low: { response: 24, resolution: 72 },
};

function calcSLADeadline(priority: string): string {
  const sla = SLA_HOURS[priority] ?? SLA_HOURS.medium;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + sla.response);
  return deadline.toISOString();
}
```

---

## FASE 13 — ORQUESTRADOR DE CHAVES DE IA

### SW-130 — Função getKeyForService (Edge Function)

```typescript
// supabase/functions/_shared/key-orchestrator.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getKeyForService(
  service: string,
  workspaceId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string> {
  // 1. Verificar se workspace tem chave própria (plano Business+)
  const { data: wsKey } = await supabaseAdmin
    .from("workspace_api_keys")
    .select("key_encrypted")
    .eq("workspace_id", workspaceId)
    .eq("service", service)
    .eq("is_active", true)
    .maybeSingle();

  if (wsKey) {
    return decryptKey(wsKey.key_encrypted);
  }

  // 2. Buscar chaves admin para o serviço, ordenadas por prioridade
  const { data: keys, error } = await supabaseAdmin
    .from("admin_api_keys")
    .select("id, key_encrypted, monthly_limit, current_usage")
    .eq("service", service)
    .eq("is_active", true)
    .order("priority_order", { ascending: true });

  if (error || !keys || keys.length === 0) {
    throw new Error(
      `[ERR_KEY_ORCH_001] Nenhuma chave configurada para o serviço: ${service}`,
    );
  }

  // 3. Encontrar primeira chave dentro do limite
  for (const key of keys) {
    const withinLimit =
      !key.monthly_limit || key.current_usage < key.monthly_limit;
    if (withinLimit) {
      // Incrementar uso
      await supabaseAdmin
        .from("admin_api_keys")
        .update({
          current_usage: key.current_usage + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", key.id);

      return decryptKey(key.key_encrypted);
    }
  }

  throw new Error(
    `[ERR_KEY_ORCH_002] Todas as chaves de ${service} atingiram o limite mensal`,
  );
}

function decryptKey(encryptedKey: string): string {
  // Usar pgcrypto decrypt via query ao banco
  // Implementar com Deno Crypto API ou chamar função SQL
  // Placeholder — substituir pela implementação real
  return encryptedKey; // TODO: implementar decrypt real
}
```

---

## FASE 14 — WEBMCP E AUTOMAÇÕES

> Esta fase é executada APÓS as Fases 1-13 estarem completas e estáveis.

### SW-140 — Estrutura do WebMCP

```typescript
// src/lib/mcp/server.ts
// Cada módulo registra suas tools aqui
// O LLM consulta as tools disponíveis antes de executar qualquer ação

export interface MCPTool {
  name: string;
  description: string; // em pt-BR — o LLM vai ler isso
  parameters: Record<
    string,
    { type: string; description: string; required: boolean }
  >;
  handler: (
    params: Record<string, unknown>,
    context: MCPContext,
  ) => Promise<unknown>;
}

export interface MCPContext {
  workspaceId: string;
  userId: string;
  ccpSnapshot: CCPSnapshot;
  supabase: ReturnType<typeof createClient>;
}
```

---

## APÊNDICE A — ANATOMIA DO ERRO "NÃO FOI POSSÍVEL ENCONTRAR"

Este é o erro mais recorrente e mais mal-diagnosticado em sistemas vibe-coded.

### Por que a IA diz "tudo funciona" mas na prática quebra

```
CENÁRIO TÍPICO:

Você: "O bio link não carrega"
IA:   "Verifiquei o código. A função fetchBioLink() está correta."

Por que isso acontece:
- A IA lê o código e vê que a lógica parece correta
- A IA não executa o código
- A IA não verifica se a tabela realmente existe no banco
- A IA não verifica se as colunas correspondem
- A IA não verifica se o RLS está bloqueando
- O código pode estar "correto" mas a infraestrutura está errada

SOLUÇÃO: Nunca aceitar "está correto" como resposta.
Sempre exigir: "execute a query no banco e me mostre o resultado".
```

### Checklist de diagnóstico para qualquer erro de carregamento

```
□ 1. Qual é a URL exata que falha?
□ 2. Qual é o erro exato no Console do browser? (copiar completo)
□ 3. Qual é o request que falha no Network tab? (status e response body)
□ 4. A tabela consultada existe no banco? (executar SELECT no Supabase Dashboard)
□ 5. A coluna consultada existe na tabela? (executar SELECT column_name FROM info_schema)
□ 6. O RLS está bloqueando? (executar a query como service_role e comparar)
□ 7. A edge function existe e está deployada? (supabase functions list)
□ 8. As variáveis de ambiente estão configuradas? (supabase secrets list)
□ 9. O workspace_id está sendo passado na query?
□ 10. A query está usando nome de tabela legado?

Se qualquer resposta for NÃO ou DESCONHECIDO → esse é o problema.
```

---

## APÊNDICE B — COMO USAR ESTE DOCUMENTO EM SESSÕES DE TRABALHO

### Fluxo de trabalho por sessão

```
SESSÃO 1: Fase 0 completa (auditoria)
  → Resultado: docs/audit/ preenchido
  → Duração estimada: 2-4 horas
  → Entregável: Registro de quebras com causas confirmadas

SESSÃO 2: SW-010 a SW-013 (fundação)
  → Resultado: Estrutura de pastas + schema + tipos
  → Duração estimada: 3-5 horas
  → Entregável: Migration executada sem erros

SESSÃO 3: SW-030 a SW-033 (sistema de logs)
  → Resultado: Zero erros silenciosos
  → Duração estimada: 2-3 horas
  → Entregável: ErrorBadge funcionando com código visível

SESSÃO 4: SW-020 a SW-024 (correção dos módulos quebrados)
  → Uma task por sessão — não resolver tudo junto
  → Duração estimada: 1-2 horas por módulo
  → Entregável: Módulo acessa o banco sem erro de carregamento

SESSÕES SEGUINTES: Fases 5-14 em ordem
  → Uma fase por semana
  → Cada fase tem critérios de aceitação verificáveis
  → Próxima fase só começa quando todos os critérios passaram
```

### Como pedir para a IA executar uma task

```
FORMATO CORRETO:

"Execute a task SW-020 do documento SDD.
Antes de escrever qualquer código:
1. Leia docs/audit/quebras.md para o módulo Bio Link
2. Confirme a causa raiz do erro
3. Liste os arquivos que vai modificar
4. Execute a correção
5. Execute o critério de aceitação
6. Me mostre o resultado"

FORMATO ERRADO:

"Corrija o bio link que não carrega"
→ Isso gera uma correção genérica sem diagnóstico real
```

---

## APÊNDICE C — GLOSSÁRIO

```
CCP (Context Control Protocol)
  Snapshot de contexto da marca (workspace + brand kit + briefing + personas)
  que é injetado no system prompt de toda chamada de IA.

EditorShell
  Componente de layout de 3 colunas usado em todos os editores:
  Sidebar contextual | Editor/Preview | Painel direito

EmptyState
  Estado de módulo sem dados. NUNCA mensagem de erro. SEMPRE com ação.

ErrorBadge
  Componente que exibe erro com código único, mensagem amigável e detalhe técnico.

Feature Flag
  Toggle de feature por plano, workspace ou usuário. Sempre no banco.

MCP (Model Context Protocol)
  Protocolo que expõe capacidades do sistema como "tools" consumíveis por LLMs.

Publication
  Tabela central para tudo que é publicável: bio link, site, blog, portal, landing.

RLS (Row Level Security)
  Segurança em nível de linha no Supabase. Garante que usuário A não vê dados de B.

SDD (Spec-Driven Development)
  Metodologia onde cada feature começa com uma spec verificável,
  não com código. O código é a consequência da spec.

SimLab
  Sistema de validação de conteúdo por personas sintéticas (modelo S-O-R).
  Gate obrigatório antes de publicar.

slug
  Identificador de URL legível. Ex: "bio-link-oficial". Único por publication.

system_logs
  Tabela centralizada de todos os logs de erro do sistema. Zero silêncio.
```

---

## APÊNDICE D — REGRAS DE NOMENCLATURA CANÔNICA

```
TABELAS (snake_case, plural):
  ✓ publications, publication_blocks, blog_articles
  ✗ Bio_Links, biolinks, BioLink

COLUNAS (snake_case, singular):
  ✓ workspace_id, block_type, created_at
  ✗ workspaceId, BlockType, createdAt

FUNÇÕES/EDGE FUNCTIONS (kebab-case):
  ✓ video-studio-orchestrator, news-rss-parser
  ✗ videoStudioOrchestrator, video_studio

COMPONENTES REACT (PascalCase):
  ✓ ErrorBadge, EditorShell, PublicationBlock
  ✗ error-badge, errorBadge, error_badge

HOOKS (camelCase, prefixo "use"):
  ✓ useWorkspace, useVideoJob, useErrorLogger
  ✗ WorkspaceHook, getWorkspace

TIPOS TYPESCRIPT (PascalCase):
  ✓ Workspace, PublicationType, CCPSnapshot
  ✗ workspace, publicationtype, ccpSnapshot

CONSTANTES (SCREAMING_SNAKE_CASE):
  ✓ ADMIN_EMAILS, SLA_HOURS, GATEWAY_PRIORITY
  ✗ adminEmails, slaHours

CÓDIGOS DE ERRO (ERR_MODULO_TIPO_NNN):
  ✓ ERR_BIOLINK_LOAD_001, ERR_VIDEO_EDGE_001
  ✗ error1, bioLinkError, failed

VARIÁVEIS DE AMBIENTE (VITE_ para frontend, sem prefixo para edge functions):
  ✓ VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  ✗ REACT_APP_SUPABASE, supabaseUrl
```

---

## APÊNDICE E — CHECKLIST DE QUALIDADE POR MÓDULO

Antes de marcar qualquer módulo como "concluído", verificar todos os itens:

```markdown
# CHECKLIST DE QUALIDADE — [Nome do Módulo]

## Banco de Dados

□ Tabela(s) existem com IF NOT EXISTS
□ Todas as colunas têm tipos corretos
□ Foreign keys declaradas e testadas
□ RLS habilitado e testado com usuário real
□ workspace_id presente em todos os INSERTs
□ Nenhum SELECT \* — colunas explícitas sempre
□ Índices criados para colunas de busca frequente

## Edge Functions (se aplicável)

□ Função existe e está deployada
□ Responde com status 200 a request básico
□ Erros retornam JSON com campo "code" legível
□ Logs registrados em system_logs no catch
□ Variáveis de ambiente verificadas na inicialização
□ CORS headers configurados

## Frontend

□ Nenhum texto em inglês na UI
□ Estados de loading (Skeleton) implementados
□ Estado de erro usa ErrorBadge com código
□ Estado vazio usa EmptyState com ação
□ ErrorBoundary envolvendo o módulo
□ Nenhum any em TypeScript
□ Cleanup de subscriptions no useEffect

## Fluxo End-to-End

□ Criar → aparece na lista
□ Editar → mudanças persistem
□ Publicar → status muda, data preenchida
□ Erro simulado → aparece ErrorBadge + log em system_logs
□ RLS testado: usuário B não vê dados do usuário A

## Qualidade de Código

□ Nenhum console.error sem logError() correspondente
□ Nenhum catch vazio ou catch que apenas loga
□ Nenhuma tabela legada referenciada
□ Nenhum hardcode que deveria vir do banco
```

---

_SIMWORK SDD MASTER v1.0 — Abril 2026_
_"Um sistema funcional é um sistema auditável."_


---

## APÊNDICE OMEGA — LEGADOS E OUTROS MÓDULOS

> Documentação legada unificada para referência e retenção de detalhes perdidos.



### Documento Analisado e Unificado: docs/AUDIT-REPORT.md

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




### Documento Analisado e Unificado: docs/PRD.md

# PRD — Simwork
## Refatoração completa, rebranding, padronização de UX, arquitetura e operação

Versão: 1.0  
Status: documento-base para redesign + reconstrução técnica  
Idioma obrigatório: português do Brasil, UTF-8

---

## 1. Resumo executivo

A plataforma atual apresenta sintomas graves de produto incompleto, inconsistente e visualmente confuso: telas com aparência de landing page onde deveria existir operação, mensagens genéricas de erro persistindo na interface, módulos que aparentam estar conectados mas não funcionam de forma real, excesso de fragmentação entre criadores, mistura de inglês com português e forte indício de dependência de estruturas legadas.

O novo produto passa a se chamar **Simwork**. O objetivo não é aplicar apenas um facelift. O objetivo é:

- reconstruir a experiência para uso real, diário e operacional;
- unificar a linguagem visual e o fluxo entre todos os builders e editores;
- eliminar conexões legadas, duplicações, estados silenciosos e hardcodes frágeis;
- garantir que cada módulo funcione de ponta a ponta com logs, validação, estados, fallback e publicação real;
- consolidar uma arquitetura orientada por workspaces, com administração central, cobrança, suporte e observabilidade.

---

## 2. Problemas que a refatoração precisa resolver

### 2.1 Problemas de UX identificados

1. Páginas internas com cara de landing page.
2. Títulos e descrições excessivamente grandes em telas que deveriam ser utilitárias.
3. Tabs horizontais em contextos que exigem navegação vertical e persistente.
4. Falta de split view consistente entre estrutura, edição, conversa e preview.
5. Ausência de onboarding contínuo por etapa.
6. Ajuda contextual inexistente ou exibida apenas uma vez sem reabertura simples.
7. Design genérico, simplificado e incapaz de transmitir que o sistema faz trabalho real.

### 2.2 Problemas de produto e funcionamento

1. Bio Link, Site Institucional, Blog Manager e News Portal exibem estados quebrados e mensagens de erro recorrentes.
2. Website Builder atual não comunica capacidade de edição real.
3. Video Studio ainda parece parcial, desconectado e sem fluxo unificado entre prompt, motion, render e exportação.
4. Fragmentação entre criadores: influencer, mascote, personagem, SimLab e outros conceitos relacionados.
5. Ausência de padrão para orquestração real de APIs, chaves, billing, logs e suporte.
6. Falta de central de administração robusta para operar a plataforma como SaaS.

### 2.3 Problemas técnicos presumidos

1. Dependência de tabelas, schemas ou contratos legados.
2. Queries e bindings inconsistentes entre frontend, edge functions e banco.
3. Falhas silenciosas sem telemetria útil.
4. Hardcodes de layout e conteúdo onde deveria haver estrutura orientada a dados.
5. Estados de erro genéricos sem código técnico e sem ação sugerida.
6. Localização incompleta: mistura de inglês e português.

---

## 3. Visão do Simwork

Simwork será uma plataforma operacional multi-workspace para criação, publicação, automação, análise e gestão de experiências digitais com IA.

Ela terá quatro pilares:

1. **Criar**: sites, bio links, blog, portal editorial, posts, vídeos, motion, agents.
2. **Operar**: workspaces, equipe, permissões, planos, billing, chaves, integrações.
3. **Validar**: analytics, SimLab, qualidade, logs, auditoria, rastreamento.
4. **Escalar**: WebMCP, orquestração de chaves, automações, central de ajuda e suporte.

---

## 4. Princípios invioláveis do redesign

### 4.1 Princípios de interface

1. Navegação principal sempre em sidebar vertical.
2. Interfaces internas não podem parecer landing pages.
3. Editor e preview precisam coexistir lado a lado sempre que fizer sentido.
4. Todo módulo complexo deve oferecer uma coluna contextual para chat, histórico ou assistente.
5. Todo módulo deve ter ajuda contextual reabrível via botão `?`.
6. O visual precisa sinalizar trabalho real: estrutura, status, etapas, dependências, dados e ações.

### 4.2 Princípios de produto

1. Nenhum módulo pode ser fake, mockado ou apenas "cenográfico".
2. Nenhum erro pode ser silencioso.
3. Nenhum módulo pode depender de contrato legado implícito.
4. Nenhum texto interno pode ficar em inglês.
5. Nenhuma funcionalidade relevante pode ficar escondida atrás de fluxo ilógico.
6. Nenhum builder pode funcionar como formulário gigante sem hierarquia.

### 4.3 Princípios técnicos

1. Tudo precisa ser orientado por workspace.
2. Toda integração precisa ter contrato, estado, retries, logs e fallback.
3. Toda mutação crítica precisa ser auditável.
4. Toda consulta sensível precisa validar escopo e permissão.
5. Todo módulo precisa ter testes de fluxo real e não só teste unitário isolado.

---

## 5. Mapa de produto completo

### 5.1 Camada do workspace
- Dashboard operacional, Workspaces, Brand Kit, Briefing, Biblioteca de assets, Analytics, Configurações

### 5.2 Camada de criação
- Criador de Sites, Criador de Bio Links, Criador Editorial (Blog + News Portal), Criador de Conteúdo Social, Criador de Vídeos, Criador de Agents

### 5.3 Camada operacional
- CRM / Leads, Suporte, Central de ajuda, Financeiro, Cobranças, Créditos, Planos, Integrações globais e por workspace

### 5.4 Camada administrativa
- Usuários, Perfis, Contas, Workspaces, Módulos, Feature flags, Billing, Logs, Incidentes, Chaves e providers, Gateways de pagamento

---

## 6–27. [Conteúdo completo disponível no SIMWORK-MASTER-PLAN.md]

Ver: `/docs/SIMWORK-MASTER-PLAN.md` para fragmentação técnica completa por fase, sub-fase, schema, UI e critério de aceite.




### Documento Analisado e Unificado: docs/SIMWORK-MASTER-PLAN.md

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




### Documento Analisado e Unificado: docs/error-codes.md

# TABELA DE CÓDIGOS DE ERRO — SW-051
# Simwork SDD-1.0 | Abril 2026
# REGRA: Todo erro exibido na UI DEVE usar um código desta tabela.

## Bio Link

| Código                        | Quando ocorre                          | HTTP |
|-------------------------------|----------------------------------------|------|
| ERR_BIOLINK_LOAD_001          | Falha ao listar bio links              | 500  |
| ERR_BIOLINK_GET_001           | Falha ao carregar bio link específico  | 404  |
| ERR_BIOLINK_CREATE_001        | Falha ao criar bio link                | 400  |
| ERR_BIOLINK_BLOCK_LOAD_001    | Falha ao carregar blocos               | 500  |
| ERR_BIOLINK_BLOCK_ADD_001     | Falha ao adicionar bloco               | 400  |
| ERR_BIOLINK_BLOCK_UPDATE_001  | Falha ao atualizar bloco               | 400  |
| ERR_BIOLINK_BLOCK_DELETE_001  | Falha ao remover bloco                 | 400  |
| ERR_BIOLINK_REORDER_001       | Falha ao reordenar blocos              | 500  |
| ERR_BIOLINK_PUBLISH_001       | Falha ao publicar                      | 500  |
| ERR_BIOLINK_PUBLIC_001        | Falha ao servir página pública         | 500  |
| ERR_BIOLINK_SLUG_DUP_001      | Slug já existe no sistema              | 409  |

## Site

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_SITE_LOAD_001             | Falha ao listar sites                  |
| ERR_SITE_SECTIONS_001         | Falha ao carregar seções               |
| ERR_SITE_SECTION_SAVE_001     | Falha ao salvar seção                  |
| ERR_SITE_PUBLISH_001          | Falha ao publicar site                 |

## Blog

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_BLOG_PUB_LOAD_001         | Publicação do blog não encontrada      |
| ERR_BLOG_ARTICLES_LOAD_001    | Falha ao carregar artigos              |
| ERR_BLOG_ARTICLE_SAVE_001     | Falha ao salvar artigo                 |
| ERR_BLOG_ARTICLE_PUBLISH_001  | Falha ao publicar artigo               |

## Portal RSS

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_RSS_SOURCE_ADD_001        | Falha ao adicionar fonte RSS           |
| ERR_RSS_FETCH_001             | Falha ao buscar feed                   |
| ERR_RSS_PARSE_001             | Falha ao parsear XML do feed           |
| ERR_RSS_ITEMS_LOAD_001        | Falha ao carregar itens                |
| ERR_RSS_MISSING_PARAMS        | Parâmetros obrigatórios ausentes       |

## Vídeo

| Código                         | Quando ocorre                          |
|--------------------------------|----------------------------------------|
| ERR_VIDEO_EDGE_001             | Edge function indisponível             |
| ERR_VIDEO_TEMPLATES_001        | Falha ao carregar templates            |
| ERR_VIDEO_RENDER_001           | Falha ao iniciar renderização          |
| ERR_VIDEO_RENDER_TIMEOUT_001   | Renderização além do limite de tempo   |
| ERR_VIDEO_PREVIEW_NULL         | Preview Remotion retornou null         |
| ERR_VIDEO_MISSING_WORKSPACE    | workspace_id ausente                   |
| ERR_VIDEO_MISSING_CONTENT_ID   | content_id ausente                     |
| ERR_VIDEO_UNKNOWN_ACTION       | Ação desconhecida enviada              |

## Posts / Conteúdo

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_POST_LOAD_001             | Falha ao carregar posts                |
| ERR_POST_GENERATE_001         | Falha na geração com IA               |
| ERR_POST_TEMPLATE_001         | Template não encontrado no banco       |
| ERR_POST_EXPORT_001           | Falha na exportação de imagem          |

## Agentes

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_AGENT_LOAD_001            | Falha ao carregar agentes              |
| ERR_AGENT_SAVE_001            | Falha ao salvar/criar/remover agente   |
| ERR_SIMLAB_RUN_001            | Falha ao executar validação SimLab     |
| ERR_SIMLAB_NO_PERSONAS        | Nenhuma persona ativa para validar     |

## Brand Kit

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_BRANDKIT_LOAD_001         | Falha ao carregar Brand Kit            |
| ERR_BRANDKIT_SAVE_001         | Falha ao salvar Brand Kit              |

## Workspace

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_WORKSPACE_LOAD_001        | Workspace não encontrado               |
| ERR_WORKSPACE_MEMBER_001      | Falha ao gerenciar membros             |
| ERR_WORKSPACE_RLS_001         | RLS bloqueando inesperadamente         |

## CCP (Contexto IA)

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| CCP_001                       | Workspace não encontrado no CCP        |

## Chaves de IA

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_KEY_ORCH_001              | Nenhuma chave para o serviço           |
| ERR_KEY_ORCH_002              | Todas as chaves atingiram limite       |
| ERR_KEY_DECRYPT_001           | Falha ao descriptografar chave         |

## Pagamentos

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_GATEWAY_SESSION_001       | Falha ao criar sessão de checkout      |
| ERR_GATEWAY_WEBHOOK_001       | Webhook com payload inválido           |
| ERR_PAYMENT_CONFIRM_001       | Confirmação de pagamento falhou        |

---

_Gerado em: 2026-04-04 | SW-051 PASS_




### Documento Analisado e Unificado: docs/sdd-foundation-tranche-1.md

# SDD Foundation Tranche 1

Data: 2026-04-02  
Escopo: TASK-003, TASK-004, TASK-005, TASK-006, TASK-030, TASK-034

## Current-state map

- `WorkspaceContext` agora resolve membership por `workspace_members`, expõe `role`, `canView`, `canEdit`, `canAdmin` e para de depender de prop drilling de `workspace_id`.
- O app ganhou camada WebMCP local em `src/lib/mcp/*` com registry, server, client e tools base de `ccp` e `workspace`.
- O provider MCP foi conectado globalmente na árvore de workspace em `src/App.tsx`.
- O path de `api_keys` saiu do insert plaintext no frontend e passou a usar edge functions com criptografia e preview mascarado.
- O chrome visual compartilhado do app (`SectionCard`, `PageHeader`, `MetricCard`) foi normalizado para `shadow-none`, propagando o padrão global.

## Audit findings addressed

1. `api_keys` ainda era gravada em plaintext pelo cliente.
   - Fix: `api-key-secure-upsert`, `api-key-secure-delete`, RPC `secure_store_api_key`, helper `src/lib/apiKeys.ts`.

2. O módulo tinha drift visual por sombra aplicada em shells compartilhados e preview do Bio Link.
   - Fix: `shadow-none` nos componentes base e remoção da sombra do frame do preview em `BioLinkPage.tsx`.

3. O fluxo MCP estava criado, mas não propagado na árvore principal.
   - Fix: `MCPProvider` montado dentro de `WorkspaceProvider` em `App.tsx`.

4. Ainda havia `SELECT *` em pontos do fluxo novo.
   - Fix: remoção em `SettingsPage.tsx` e `agent-run-approve/index.ts`.

5. `ApiKeysPage.tsx` tinha bug de runtime (`showKey` inexistente) e UI fora do padrão.
   - Fix: página reescrita com componentes compartilhados e tokens semânticos.

## QA report

- `npm run build`: PASS
- `npm run test -- siteDesignConstitution`: PASS

## Remaining risks after tranche 1

- O backend inteiro ainda não está convergido ao contrato SDD. Esta tranche fecha a fundação, não o programa completo.
- `src/integrations/supabase/types.ts` continua desatualizado em relação a tabelas novas; o projeto ainda depende parcialmente de `fromTable(...)` para tabelas fora do snapshot tipado.
- Há módulos legacy fora desta tranche que ainda usam padrões visuais e writes antigos e precisam ser migrados em lotes seguintes.
- As edge functions novas precisam ser deployadas junto com as migrations para valerem em ambiente real.

## Next critical tasks

1. Reconstruir Website Builder real sobre `websites -> website_pages -> website_sections`.
2. Convergir mais edge functions ao `getCCPSnapshot()` canônico e `toXMLContext()`.
3. Migrar mais queries legacy com `SELECT *` para colunas explícitas.
4. Substituir casts soltos por contratos tipados regenerando `src/integrations/supabase/types.ts`.
5. Implementar validação/bloqueio SimLab no publish path de conteúdo público.




### Documento Analisado e Unificado: docs/sdd-website-builder-tranche-2.md

# SDD Website Builder Tranche 2

Data: 2026-04-02  
Escopo: TASK-010, TASK-012

## Current-state map

- O Website Builder agora opera sobre uma camada canonicamente estruturada em `websites -> website_pages -> website_sections`, com migration dedicada para RLS, indices e soft delete.
- O editor visual deixou de depender dos blocos fake `hero_3d`, `glass_features` e `glow_footer` como UI principal.
- A compatibilidade com `website_pages.content_blocks` foi preservada para leitura e escrita, permitindo rollout gradual sem quebrar sites legados.
- O preview passou a usar renderer de secoes reais com edicao inline e reordenacao drag-and-drop no canvas de estrutura.

## Implementacao entregue

1. Banco
   - Migration nova em `supabase/migrations/20260403060000_website_builder_sections.sql`.
   - `website_pages` ganhou `workspace_id`, `sort_order` e `deleted_at`.
   - `website_sections` foi criada com schema canonico, indices GIN e RLS por workspace.
   - Trigger de sincronizacao garante `workspace_id` nas paginas a partir de `website_id`.

2. Servico e estado
   - `src/lib/websites/service.ts` faz load dual-mode: usa `website_sections` quando existe e cai para `content_blocks` quando necessario.
   - `src/hooks/useWebsiteBuilder.ts` centraliza draft, paginas, secoes, dirty state, save e compatibilidade.
   - `src/lib/websites/defaults.ts` define a biblioteca inicial de secoes e os defaults do builder.

3. UI
   - `src/pages/SiteBuilderPage.tsx` virou biblioteca real de sites com metricas, contagem de paginas e ponte para o chat spec-driven.
   - `src/pages/SiteEditorPage.tsx` foi reconstruida com:
     - lista de paginas
     - biblioteca de secoes
     - reorder drag-and-drop
     - preview desktop/tablet/mobile
     - inspector lateral
   - `src/components/website/WebsiteSectionRenderer.tsx` passou a renderizar secoes canonicamente.
   - `src/components/website/WebsiteSectionInspector.tsx` concentra a edicao lateral de conteudo, estilo e animacao.

## QA report

- `npm run build`: PASS
- `npm run test -- siteDesignConstitution`: PASS
- Varredura visual manual dos arquivos tocados: sem `bg-black`, `bg-white`, `text-black`, `text-white`, `box-shadow` ou `shadow-*` indevido; apenas `shadow-none`.

## Compatibility notes

- Se `website_sections` ainda nao existir no ambiente, o editor continua lendo `website_pages.content_blocks`.
- Ao salvar, o builder tenta persistir em `website_sections` e mantem snapshot em `content_blocks`.
- Blocos legados continuam aparecendo como `legacy_block` para migracao gradual, sem descarte de dados.

## Remaining risks after tranche 2

- O inspector ainda esta pragmático: cobre o essencial por tipo de secao, mas nao fecha toda a profundidade do PRD.
- A publicacao publica do Website ainda nao foi reescrita para SSR/SSG sobre `website_sections`.
- Os tipos gerados de Supabase continuam atrasados em relacao ao schema real; o modulo ainda depende parcialmente de `fromTable(...)`.
- Ainda faltam historico formal de versoes, publish workflow, animacao via Intersection Observer e geracao de secoes com IA.

## Next critical tasks

1. Reconstruir o runtime publico do website sobre `website_sections`.
2. Introduzir publish/versioning de site com snapshots e restore.
3. Levar o mesmo contrato para geracao de secoes com IA e para o chat spec-driven.
4. Regenerar tipos Supabase para reduzir casts e `fromTable(...)`.
5. Fechar a trilha de SSR, analytics e SEO por pagina publica.




### Documento Analisado e Unificado: docs/simwork-hard-cut-tranche-3.md

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




### Documento Analisado e Unificado: docs/site-chat-spec-driven-audit.md

# Site Chat Spec-Driven Audit

## Scope

This audit covers the ENGIOS site creation stack across:
- `src/pages/SiteBuilderPage.tsx`
- `src/pages/SiteEditorPage.tsx`
- `src/pages/VibeCoderPage.tsx`
- `supabase/functions/_shared/agent-runtime.ts`
- `supabase/functions/_shared/website-squad.ts`
- `supabase/functions/agent-run-approve/index.ts`
- `supabase/migrations/20260403023000_website_spec_runtime.sql`

## Current target architecture

- Site chat enters through `VibeCoderPage`.
- The chat creates a `website_spec` run through `agent-orchestrator`.
- The spec run persists artifacts in `agent_artifacts`.
- Approval is explicit through `agent-run-approve`.
- Approval creates a `website_build` run.
- `agent-worker` executes the website squad task-by-task.
- `agent-status` exposes tasks and artifacts.
- A successful build persists back to `projects.source_files_json`.

## Gaps closed by this rollout

- direct prompt-to-build bypass removed from the active site chat UI
- explicit approval gate before build
- persisted artifacts for spec, plan, task graph, constitution, QA, and handoff
- runtime enforcement that `ready` templates only use supported agent handlers
- linkage between `projects`, `platform_conversations`, and `websites`
- local design constitution and scanner for visual drift

## Guardrails

- no `website_build` without an approved source spec
- no `ready` squad template without a real runtime handler
- no hardcoded black/white or shadow-based shell styling in the site chat shell
- site editor shell aligned with app tokens and workspace brand surfaces

## Residual expansion path

- promote approved outputs back into structured `website_pages` only through an explicit future conversion phase
- expand the same runtime to `website_refine` and `website_block_build`
- add deeper QA for schema diffs, runtime errors, and E2E preview verification


