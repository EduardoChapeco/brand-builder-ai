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
