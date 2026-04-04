# MAPA DE EDGE FUNCTIONS — docs/audit/edge-functions.md

Auditoria da camada de Serverless Functions baseada na Fase 0 (SW-002) do SDD-1.0.

| Função | Invocada por | SELECT \*? | catch vazio? | Env vars verificadas? |
| ------ | ------------ | ---------- | ------------ | --------------------- |
| `blog-generate` | `BlogManager` | NÃO | NÃO | SIM (Supabase Auth Context) |
| `generate-image` | `VideoStudio` / `PostGen` | NÃO | NÃO | SIM |
| `generate-post-content`| `GeneratorPage` / `Slides` | NÃO | NÃO | SIM |
| `news-fetch` | `NewsPortalPage` | NÃO | NÃO | SIM |
| `api-key-secure-upsert`| `AdminKeysPage` | NÃO | NÃO | SIM |
| `biolink-track` | `PublicBioLink` | NÃO | NÃO | SIM |
| `video-upload-handler` | `VideoStudio` | NÃO | NÃO | SIM |
| `agent-orchestrator` | `ChatPage` | NÃO | NÃO | SIM |
| `simlab-dispatch` | `Simlab` (Hooks) | NÃO | NÃO | SIM |
| `simlab-feedback` | `Simlab` | NÃO | NÃO | SIM |

## Resumo das Exceções

1. **SELECT \* não foi encontrado** em nenhuma Edge Function. Todas utilizam payloads especificos ou ORM Supabase fortemente tipado no lado do cliente com retornos sanitizados.
2. **Tratamento de Catch:** A maioria das Edge Functions de IA loga os blocos de erro e repassa ao Cliente para o Error Logger local resolver e mostrar com os Toasters adequados. Foram encontrados alguns blocos *vazios* residuais em `orchestrate-post/index.ts` e `_shared/postgen.ts`, que operam silenciosamente falhas parciais.
3. Não há chamadas expostas na codebase a `Deno.env.get` desprotegidas; todo o ecossistema utiliza Contextos autenticados, ou envios através do middleware do Supabase (onde o próprio `createClient` já assina o RLS ou Secret de forma auto-contida).

## Funções Não Mapeadas no Frontend
Existem várias funções na pasta `supabase/functions` (*Ex: biolink-restore-version*, *news-relevance-score*, etc) que não têm binds explícitas no client web gerado no `src`. Estas são operadas por agendamentos via pg_cron (Database Webhooks) ou invocações de trigger banco-a-banco (não representam débitos diretos na web, mas precisam ser mantidas).
