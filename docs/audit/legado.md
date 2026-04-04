# INVENTÁRIO DE LEGADO — docs/audit/legado.md

Este documento consolida a rastreabilidade do código legado com base no projeto arquitetural SDD-1.0 Fase 0 (SW-004).

## Tabelas referenciadas no código mas NÃO no banco

Foi rastreado o uso intensivo de `fromTable` carregando entidades nominais que fisicamente não existem mais no banco (agora empacotadas em `publications` e schema expandido). Estas entidades rodam sob o escudo seguro de um *shim* temporário em `db-custom.ts`. 

| Tabela no código | Arquivo | Status / Tabela Canônica | Ação necessária |
| ---------------- | ------- | --------------- | --------------- |
| `sw_briefings` | `BriefingPage.tsx` / `WorkspaceService.ts` | `briefings` | Converter no lado do front (já mapeada no shim) |
| `sw_brand_kits`| `BrandKitPage.tsx` / `WorkspaceService.ts` | `brand_kits`| Converter no lado do front (já mapeada no shim) |
| `sw_provider_keys` | `SettingsPage.tsx` | `workspace_settings` ou `api_keys` | Refatoração estrutural no App de Config. |
| `sw_editorial_sources` | `SettingsPage.tsx` | - | Revalidar necessidade (PostGen Fase 3). |
| `sw_workspace_members` | `WorkspacesPage.tsx` | `workspace_members` | Atualizar front para string real. |
| `sw_workspaces`| `WorkspacesPage.tsx`| `workspaces` | Atualizar front para string real. |
| `sw_sites` | `WorkspaceService` | `websites` | Atualizar queries brutas do Dashboard. |

*(O módulo BioLink já foi completamente reescrito para utilizar as tabelas Canônicas e não consta mais nestas chamadas problemáticas no React, excluindo logs fantasmas).*

## Componentes duplicados

| Nome | Arquivo 1 | Arquivo 2 | Qual manter |
| ---- | --------- | --------- | ----------- |
| `AdminPage` | *Resolvido e Excluído* | - | A auditoria inicial removeu a raiz morta `AdminPage.tsx` e implantou as rotas corretas na subpasta `/admin/*`. Não foram constatadas outras duplicações sistêmicas ativas no AppShell. |

## SELECT \* encontrados

Em grande parte do ecossistema front-end o fetch de registros usa `select('*')`. Por estarmos sob o SDK restrito do Supabase atrelado com PostgREST JWT, as políticas limitam o vazamento colateral.

| Arquivo (Exemplos Primários) | Contagem Encontrada | Ação recomendada (Fase 7) |
| ------- | ----- | ----- |
| `src/pages/VideoStudioPage.tsx` e subpáginas | 10 incidências | Otimizar payload de vídeo para trazer apenas metadados nas listagens. |
| `src/pages/BioLinkCRMPage.tsx` | 5 incidências | Otimizar leitura do CRM limitando campos (nome, data, payload). |
| `src/pages/ChatPage.tsx` | 3 incidências | Reduzir banda trafegada de blobs de transcrição de chat. |

## Contagem de any no TypeScript

O `strict` flag foi intensificado e reparamos vários casts de `any` durante as correções do WorkspaceContext e BioLinkProvider, os números reduziram:

- Total de ocorrências de `: any`: Aproximadamente **16** arquivos infectados. (Sobretudo nas engines de UI legadas como GeneratorSideBar e BioLinkRenderer).
- Total de ocorrências de `as any`: Aproximadamente **6** arquivos (Workaround transitório em páginas base e DB maps).
