# QUEBRAS IDENTIFICADAS — SW-003
**Auditoria:** 2026-04-04 | **Projeto:** pjwupmxbsricseslxmbr

## ⚠️ LISTA DE QUEBRAS CONFIRMADAS

---

### QUEBRA-001 — RLS Desabilitado em Tabelas de Dados de Marca
**Severidade:** CRÍTICA  
**Tabelas:** `sw_brand_kits`, `sw_briefings`  
**Causa:** Row Level Security não foi habilitado durante a criação das tabelas  
**Impacto:** Qualquer usuário autenticado pode ler/escrever dados de outros workspaces  
**Status:** ✅ CORRIGIDO — Migration `20260404_sw011_enable_rls_and_indexes.sql`

---

### QUEBRA-002 — Foreign Keys Referenciando Tabela Legada
**Severidade:** ALTA  
**Tabelas:** `sw_brand_kits`, `sw_briefings`  
**Causa:** FK `workspace_id` aponta para `engios_workspaces` (legada) ao invés de `sw_workspaces` (canônica)  
**Impacto:** Usuários que só têm `sw_workspaces` (novos) não conseguem criar Brand Kit ou Briefing  
**Fix Temporário:** RLS policy usa OR para aceitar ambas as tabelas  
**Fix Definitivo Pendente:** Migrar dados e atualizar FK para apontar para `sw_workspaces`

---

### QUEBRA-003 — sw-log Edge Function com Schema Desatualizado
**Severidade:** MÉDIA  
**Função:** `supabase/functions/sw-log/index.ts`  
**Causa:** Função pode estar referenciando tabela `system_logs` (legada) ao invés de `sw_error_logs`  
**Status:** ✅ CORRIGIDO — Reescrita para usar `sw_error_logs`

---

### QUEBRA-004 — Falta de Índices em Queries Frequentes
**Severidade:** MÉDIA  
**Tabelas:** `sw_biolinks`, `sw_sites`, `sw_agents`, `sw_editorial_posts`, `sw_error_logs`  
**Causa:** Queries filtradas por `workspace_id + status` sem índices compostos  
**Impacto:** Performance degradada com volume de dados  
**Status:** ✅ CORRIGIDO — Migration `20260404_sw011_enable_rls_and_indexes.sql`

---

### QUEBRA-005 — Ausência de WorkspaceProvider em Módulos Antigos
**Severidade:** ALTA  
**Localização:** Páginas antigas que usam hooks legados  
**Causa:** WorkspaceContext importado do lugar errado ou não presente  
**Impacto:** `workspace_id` não disponível → queries retornam vazio  
**Status:** ✅ CORRIGIDO — App.tsx já usa o WorkspaceProvider correto

---

### QUEBRA-006 — ErrorLogger Fazia Silêncio em Catch Blocks
**Severidade:** ALTA  
**Localização:** Vários hooks e páginas  
**Causa:** Padrão `catch(err) { console.error(err) }` sem persistência  
**Impacto:** Erros de produção passam invisíveis sem rastreio  
**Status:** ✅ CORRIGIDO — `lib/errorLogger.ts` com persistência em `sw_error_logs`

---

### QUEBRA-007 — cerebro-context sem Suporte a sw_workspaces
**Severidade:** MÉDIA  
**Função:** `supabase/functions/cerebro-context/index.ts`  
**Causa:** Buscava workspace apenas em `engios_workspaces`  
**Impacto:** CCP vazios para usuários do schema canônico `sw_`  
**Status:** ✅ CORRIGIDO — Reescrita para buscar em `sw_workspaces` primeiro

---

## ✅ NÃO SÃO QUEBRAS (Verificado)

- `publications` table não existe: **Deliberado** — sistema usa sw_biolinks + sw_sites + sw_editorial_posts separados
- `agents` com tipos diferentes: **Deliberado** — sw_agents usa brand|creator|persona|consumer|operational
- 69 Edge Functions existem: **Confirmado** — lista no `supabase/functions/`
- TypeScript compila sem erros: **Confirmado** — `tsc --noEmit` zerado

---

## 📊 INVENTÁRIO LEGADO (SW-004)

Tabelas legadas que ainda existem mas não devem ser usadas:

| Tabela | Substituta Canônica | Ação |
|--------|---------------------|------|
| `engios_workspaces` | `sw_workspaces` | Manter por retrocompat. (sw_brand_kits e sw_briefings ainda referenciam) |
| `engios_brand_kits` | `sw_brand_kits` | Deprecar após migrar dados |
| `system_logs` | `sw_error_logs` | Deprecar |
| `api_keys_vault` | `engios_api_keys_vault` ou `sw_provider_keys` | Deprecar |
| `prompt_fragments` | `engios_prompt_fragments` | Deprecar |
| `squad_executions` | `engios_squad_executions` | Deprecar |
| `generated_sites` | `sw_sites` | Deprecar |

---

_SW-003 Concluído: 2026-04-04_
