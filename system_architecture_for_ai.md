# Cerebro Platform V3 — System Architecture & Context for AI
**Versão: V3.1 — Pós Video Studio & CCP Protocol**
*Última atualização: 2026-04-02*

Este documento é o contexto fundacional para qualquer modelo de IA que atue neste projeto.
Leia inteiro antes de fazer qualquer modificação no código ou banco.

---

## 1. Visão Geral

**Cerebro Platform** é uma SaaS multi-tenant de automação de marketing com IA. Cada empresa (workspace) tem isolamento completo de dados via RLS no Supabase.

### Stack
| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind + shadcn/ui |
| Estado/Rotas | React Router + `WorkspaceContext` (isolamento local de tenant) |
| Backend | Supabase (PostgreSQL + RLS) |
| Edge Runtime | Supabase Edge Functions (Deno) — 38 funções |
| IA Gateway | Groq → OpenRouter → Gemini (fallback em cascata) |
| Deploy | Lovable CI/CD (faz build + aplica migrations automaticamente) |
| Video | Remotion Engine (renders serverless) |

### Multi-tenancy
- Todo dado de domínio tem `workspace_id` + RLS
- `workspace_members` é a tabela pivô entre usuários e workspaces
- Usuários podem ser membros de múltiplos workspaces com papéis distintos

---

## 2. CCP — Cerebro Context Protocol (CRÍTICO)

O CCP é o **protocolo de contexto canônico** do sistema. Implementado em `_shared/ccp.ts`.

### O que é
Em vez de cada Edge Function buscar `briefings` + `brand_kits` separadamente, o CCP fornece um `CCPBrandSnapshot` tipado e cacheável:

```typescript
const snap = await getCCPSnapshot(supabase, workspaceId);
const xml = snapshotToXML(snap);  // ~180 tokens (vs ~480 tokens do texto livre)
```

### Cache
- Cache de 30s em memória por workspace
- Cobre toda a duração de um pipeline de geração (6 agentes × ~10s cada)
- Elimina 12 queries redundantes por pipeline (2 queries → 1 vez com cache)

### Tabela `ccp_prompt_templates`
Prompt templates dos 6 agentes armazenados no banco (hot-swap sem redeploy).
- IDs: `agent.trend_researcher.v1`, `agent.content_strategist.v1`, etc.
- Schema: `id, agent_id, version, system_xml, user_xml, output_schema, token_budget`

### `ccp_context` JSONB nos Outputs
Todo output publicável tem o campo `ccp_context` com metadados estruturados:
- `bio_links.ccp_context` → type: `"cerebro/biolink/v1"`
- `blog_articles.ccp_context` → type: `"cerebro/blog/v1"`
- `news_items.ccp_context` → type: `"cerebro/news/v1"`
- `websites.ccp_context` → type: `"cerebro/site/v1"`
- `scroll_sections.ccp_context` → type: `"cerebro/motion/v1"`
- `video_projects.ccp_context` → type: `"cerebro/video/v1"`

### Edge Function `cerebro-context`
```
GET /cerebro-context?ws=WORKSPACE_ID&r=brand,signals,personas,policies
```
Serve contexto estruturado para qualquer consumidor interno ou externo.

---

## 3. Módulos do Sistema (35 páginas)

### 3.1 — Publicações & Portais
| Módulo | Página | Tabelas Principais |
|---|---|---|
| Bio Link | `BioLinkPage` | `bio_links` (JSONB: profile, links, blocks, theme_config, seo_config) |
| Site Institucional | `SiteBuilderPage` + `SiteEditorPage` | `websites` + `website_pages` + `scroll_sections` |
| Blog | `BlogManagerPage` | `blog_articles` + Remotion `video_jobs` |
| News Portal | `NewsPortalPage` | `news_items` + `rss_sources` |

**SiteEditorPage** integra diretamente com o **Video Studio** via `scroll_section_ref` — blocos de site podem referenciar Motion Sections criadas no Video Studio.

**BlogManagerPage** tem integração Remotion: botão "Video Summary" converte o artigo em cenas de vídeo e enfileira no `video_jobs` via `launchRemotionComposition()`.

### 3.2 — Identidade da Marca (Estratégia)
| Módulo | Página | Tabelas |
|---|---|---|
| Briefing | `BriefingPage` | `briefings` — **fonte primária do CCP** |
| Brand Kit | `BrandKitPage` | `brand_kits` — **fonte visual do CCP** |
| Cérebro da Marca (DNA) | `BrandDNAPage` | `brand_templates` + `brand_template_assets` |
| Personagem da Marca | `BrandCharacter` | `brand_characters` + `character_images` |

> Briefing + Brand Kit são as 2 únicas fontes que alimentam o `CCPBrandSnapshot`. Qualquer outro módulo que precisar de contexto de marca DEVE usar `getCCPSnapshot()`, não queries diretas.

### 3.3 — Inteligência & IA
| Módulo | Página | Funcionamento |
|---|---|---|
| Viral Analyzer | `ViralAnalyzer` | Analisa perfis de redes sociais, extrai frameworks virais |
| SimLab | `SimLabPage` | Motor de validação por personas (ver Seção 4) |
| Squad Builder | `SquadsPage` | Configura agentes por objetivo |
| Squad Chat | `ChatPage` | Interface conversacional com squads |

### 3.4 — Estúdio Criativo
| Módulo | Página | Notas |
|---|---|---|
| Gerador de Posts | `GeneratorPage` (76KB) | Post completo via 6-agent pipeline |
| **Video Studio** | `VideoStudioPage` + 4 sub-páginas | Ver Seção 5 abaixo |
| Carousel Builder | `CarouselBuilder` | Storyboard + slides HTML |
| Slides & Decks | `SlidesPage` | Apresentações tipo pitch deck |
| Image Studio | `PromptStudio` | DALL-E / Gemini image gen |
| Product Shots | `ProductShots` | Fotos de produto com IA |
| Web Cloner | `WebClonerPage` | Análise + clonagem de landing pages |
| VibeCoder | `VibeCoderPage` | Mini IDE multi-arquivo com LLM |

### 3.5 — Biblioteca & Sistema
- `FeedSimulatorPage` → Preview grid do feed (posts_v2)
- `LibraryPage` → Todos os assets gerados
- `DashboardPage` → Agregação multi-tabela
- `SettingsPage` → api_keys + preferências

---

## 4. SimLab — Persona Engine

O SimLab valida conteúdo ANTES de publicar, simulando reações da audiência.

### Fluxo
```
1. Usuário solicita validação de conteúdo (post/blog/biolink)
2. simlab-dispatch carrega:
   - CCPBrandSnapshot (via getCCPSnapshot)
   - Política do módulo (simlab_module_policies)
   - Personas slim (getCCPPersonasSlim) → depois carrega prompt_template de cada selecionada
3. Para cada persona selecionada:
   - content_qa avalia sob a perspectiva da persona
   - Retorna: score + feedback + variante de melhoria
4. Veredicto final: approved | revise | blocked
```

### Personas
- `simlab_personas` — catálogo (system + workspace-específicas)
- `simlab_persona_versions` — histórico de versões do prompt_template
- Carregamento SLIM: listagem usa apenas id/slug/display_name/locale
- Carregamento FULL: prompt_template carregado individualmente apenas para personas selecionadas

### Tabelas Core
```
simlab_runs, simlab_variants, simlab_insights,
simlab_personas, simlab_persona_versions,
simlab_module_policies, simlab_run_persona_results
```

---

## 5. Video Studio — Infraestrutura Completa

O Video Studio é o módulo mais complexo, com 5 sub-páginas e ~15 Edge Functions.

### Sub-páginas e rotas
```
/video-studio                    → VideoStudioPage (hub, lista projetos)
/video-studio/editor/:projectId  → VideoStudioEditorPage (timeline + assets)
/video-studio/generate           → VideoStudioGeneratePage (AI video gen)
/video-studio/motion             → VideoStudioMotionPage (lista motion sections)
/video-studio/motion-studio      → VideoStudioMotionStudioPage (42KB — editor de motion)
```

### Tabelas
```
video_projects          → projeto de vídeo (container)
video_assets            → arquivos de vídeo, imagem, áudio
video_timeline_versions → versões do timeline (command log)
video_jobs              → fila de jobs (status: queued→running→completed|failed)
ai_generated_videos     → geração via Runway/Kling/Luma
video_exports           → exports renderizados
video_subtitle_tracks   → transcrições e legendas
layer_compositions      → compositions para Remotion
scroll_sections         → motion sections (usadas no site builder também)
```

### Tipos de Job (`video_jobs.job_type`)
- `export` → exportação de timeline
- `subtitles` → transcrição automática
- `silence_detection` → corte de silêncios
- `virality_analysis` → análise de virality
- `ai_video_generation` → geração IA
- `layer_composition` → compositor de layers
- `remotion_render` → render via Remotion
- `video_summary` → Blog → Vídeo (via BlogManagerPage)

### Polling de Jobs
`useVideoJobStatus` usa **progressive backoff**: 2s → 3s → 5s → 8s → 12s → 20s → 30s.
Para quando o job atinge status terminal (completed/failed/cancelled).

### Remotion Pipeline (Blog → Vídeo)
```typescript
// BlogManagerPage.handleVideoSummary():
const launch = await launchRemotionComposition({
  compositionKind: 'video_summary',
  sourceModule: 'blog_manager',
  scenes: [article_hero, ...paragraph_scenes],
});
// → layer-compositor Edge Function → remotion-render Edge Function → video_jobs
```

### ScrollSection ↔ Site Integration
Motion Sections criadas no Video Studio podem ser embarcadas em `SiteEditorPage` como blocos `scroll_section_ref`. O `resolveScrollSectionMotionContract()` pre-computa os contratos de animação (parallax, pin, video_scrub, etc.).

---

## 6. Pipeline de Geração de Posts (6 Agentes)

Orquestrado por `orchestrate-post` → `agent-runtime.ts`:

```
trend_researcher   → identifica sinal de tendência
       ↓
content_strategist → define formato, slides, template
       ↓
content_writer     → escreve copy de cada slide
       ↓
content_designer   → gera HTML dos slides
       ↓
simlab_validator   → valida com personas (opcional)
       ↓
content_qa         → revisão final + monta payload
```

### Prompts (CCP Protocol)
Os 6 prompts estão em `ccp_prompt_templates` no banco (não hardcoded).
Cada agente usa `snapshotToXML(snap)` como contexto de marca (~180 tokens).

### Token Budget por Pipeline
- **Antes do CCP:** ~8.020 tokens por pipeline completo
- **Após CCP:** ~3.160 tokens (-61%)

---

## 7. Edge Functions — Catálogo Completo (38 funções)

### Contexto & Agentes
`cerebro-context`, `agent-dispatcher`, `agent-orchestrator`, `agent-worker`, `agent-scraper`, `agent-status`, `agent-vision-analyzer`

### Brand & Conteúdo
`extract-brand-identity`, `clone-brand-template`, `extract-product-colors`, `generate-post-content`, `orchestrate-post`, `suggest-carousel-arc`, `generate-image`, `generate-background-image`, `generate-image-prompt`, `generate-character-seed`

### Publicações
`biolink-render-publish`, `blog-generate`, `news-fetch`, `fetch-rss-topics`, `news-extract-content`, `news-relevance-score`

### Análise Web
`analyze-url`, `landing-analyze-url`, `landing-clone-generate`, `analyze-viral-content`, `analyze-viral-patterns`

### SimLab
`simlab-dispatch`, `simlab-status`, `simlab-feedback`, `simlab-module-policy`, `simlab-personas`, `simlab-character-bind`

### Video Studio
`video-upload-handler`, `video-export-processor`, `video-job-status`, `video-prompt-composer`, `video-silence-detector`, `virality-analyzer`, `video-quality-enhancer`, `generate-subtitles`, `scroll-section-generator`, `layer-compositor`, `remotion-render`

---

## 8. Padrões Obrigatórios de Código

### TypeScript + Supabase
Todo campo JSONB passado ao Supabase client DEVE ser castado:
```typescript
// CORRETO
content_blocks: myArray as unknown as Json

// ERRADO — causa erro de compilação
content_blocks: myArray
```

### Queries Supabase
Nunca usar `select("*")` em tabelas com campos JSONB grandes. Listar colunas explicitamente:
```typescript
// CORRETO
.select("id,name,status,renderer_config,background_video_asset_id")

// ERRADO — carrega preview_data e content desnecessariamente
.select("*")
```

### Erros Graceful
Tabelas podem não existir imediatamente após deploy (Lovable tem delay de migração).
Use `toast.info()` + fallback vazio — nunca crash da UI para erro `42P01`.

### Lint de Deno nas Edge Functions
Os erros `"Não é possível localizar o módulo https://esm.sh/..."` e `"Não é possível encontrar o nome 'Deno'"` são **falsos positivos** do IDE TypeScript. As Edge Functions rodam em Deno, não em Node. Ignorar esses erros.

---

## 9. Navegação & Ícones (workspaceNavigation.ts)

### Grupos e Seções
| Seção | Rótulo visível |
|---|---|
| `"Painel"` | Início |
| `"Publicacoes"` | Publicações & Portais |
| `"Estrategia"` | Identidade da Marca |
| `"Inteligencia"` | Inteligência & IA |
| `"Estudio Criativo"` | Estúdio Criativo |
| `"Gestao"` | Biblioteca |

### Ícones (sem duplicatas)
- `Activity` → Cérebro da Marca (DNA)
- `TrendingUp` → Viral Analyzer
- `Bot` → Squad Builder + Squad Chat
- `UserCircle2` → Personagem da Marca
- `Clapperboard` → Video Studio

---

## 10. Regras para IA Atuando neste Projeto

1. **Nunca recriar contexto de marca do zero** — sempre usar `getCCPSnapshot()` + `snapshotToXML()`
2. **Nunca buscar briefings e brand_kits separadamente** — o CCP já faz isso com cache
3. **Todo output salvo deve incluir `ccp_context`** — use os builders em `_shared/ccp.ts`
4. **Prompts de agentes** → buscar de `ccp_prompt_templates` (não hardcodar inline)
5. **Video Studio**: `video_jobs` são assíncronos — nunca await diretamente; usar polling com `useVideoJobStatus`
6. **SimLab personas**: carregar slim para listar; carregar `prompt_template` individual apenas para run
7. **SiteEditorPage**: `motionContracts` e `motionSectionMap` são memoizados — nunca recriar no render
8. **Semântica corporativa**: nunca termos de engenharia na UI (ex: "inserindo registro" → "salvando rascunho")

---

**Fim do documento de arquitetura.** Este arquivo representa o estado real do projeto V3.1.
