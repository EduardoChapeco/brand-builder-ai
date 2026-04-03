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
