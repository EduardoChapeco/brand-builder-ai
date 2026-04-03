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
