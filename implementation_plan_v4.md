# PRD Fase 4 (Integração do "PostGen V2" ao BrandBuilder AI)

Analisei profundamente o PRD fornecido. O BrandBuilder atual já possui um motor de renderização robusto (HTML2Canvas), geração via LLM e o *Vision Agent* (Edge Functions). Para incorporar esta nova fase estrutural **sem gerar duplicação de responsabilidades**, a estratégia será modularizar as novas IAs em módulos satélites ao redor do motor central.

## Estado Atual vs. Novos Requisitos
1. **Gerador Atual (`/generator`)**: Hoje atua como um construtor de carrossel linear pre-configurado de 1 à N partes. O PRD o evolui para um construtor narrativo profundo e introduz estúdios de sub-tarefas autônomos.
2. **Novos Requisitos Principais**:
   - 5 Novas Rotas com Sub-Sistemas: `/viral-analyzer`, `/image-prompts`, `/carousel-builder`, `/product-shots`, `/brand-character`.
   - 4 Novas Tabelas Core no Supabase para dados.
   - Migrações em `workspaces`, `briefings` e `posts_v2`.
   - +25 Novos Templates focados em performance e nicho (Jurídico, Saúde, Educacional, Viral).

---

## Estratégia de Implementação: Arquitetura em Módulos

> [!IMPORTANT]
> **Como evitaremos duplicar componentes:**
> - O **Carousel Builder 2.0** fará o pipeline "Ideação -> Storyboard -> Engine Canvas". O Engine de Renderização será unificado: Extrairemos o `<ArtboardStage>` e `<SlideFrame>` para componentes independentes injetáveis. O Workflow "Fase 3" de lá, reusará a mesma engine atual do gerador, mas com states controlados diferentes.
> - O **Prompt Studio** e o **Product Shots** não disputarão espaço de render visual do Carrossel. São IAs que trabalharão em *Isolamento* e exportarão as fotos geradas ou Prompts para a Biblioteca Master do Usuário.

### Fase de Dados (Supabase Migration & SDK)
- `execute_sql` das novas entidades: `brand_characters`, `image_prompt_templates`, `viral_analyses`, `carousel_storyboards`.
- Alterações em `posts_v2` e `briefings` para associar o character_id e histórico de scrapes.

### Fase do Edge Functions & Integração (Back-End IA)
- **`analyze-viral-patterns`**: Integrar Firecrawl + LLM via OpenRouter. Retorna JSON padronizado com as teses de viralização.
- **`generate-character-seed`**: Monta o master-prompt descritivo técnico mantendo consistência da persona visual (Canon, Setup de Luz, Traços de Identidade Físca).
- **`suggest-carousel-arc`**: Recebe o gancho principal e propõe Arquétipos Narrativos (Lista Tópicos, Prova Hierárquica, Problema/Solução).

### Fase de UI & Routing Modules (Front-end)
1. **Sidebar Navigation**: Ajustar Navbar lateral para dispor o Expand icon dos 5 novos módulos (Módulos Inteligentes / Ferramentas Específicas).
2. **Carousel Builder 2.0 (Drag & Drop)**: Interface de DND (requer pacote extra) e Storyboard com os arcos pré-formados (`@dnd-kit/core`).
3. **Prompt Studio & Library**: UI estática robusta, formulários para manipulação de string templates, importando cores nativamente do BrandKit.
4. **Product Shots**: Implementar o ColorThief e FileUploader integrado com Canvas Drop.
5. **Brand Character**: Gerenciador CRUD simples de persona e seu Seed-Prompt com Galeria (usando masonry ou grids).
6. **Novos Templates Dinâmicos**: Injetaremos templates focados em "Listicle", Mockup Phones, Progress Bars, Jurídico e Editorial no `src/lib/templateRegistry.ts`.

## Open Questions (Aguardando Retorno)

> [!WARNING]  
> 1. Posso instalar e usar frameworks nativos de Drag & Drop (`@dnd-kit/core`) e Extração de Cores (`colorthief`, `react-color`), mandando os comandos pelo Terminal, conforme o PRD solicita na seção 11?
> 2. **Chave do FireCrawl**: A Edge Function `analyze-viral-patterns` usará a infra FireCrawl para o Web Scrub. Você tem o token `FIRECRAWL_API_KEY` cadastrado como secret lá no seu dashboard Edge Functions no Supabase? (Sem ela, teremos de usar proxies web scrapings básicos do Node, o que reduz qualidade do scrape).
> 3. Quanto ao **Carousel Builder vs Generator**: Prefere que as duas rotas existam `/generator` (um "Quick Post") e `/carousel-builder` ("Modo Storyboard Avançado"), ou que o `/carousel-builder` do novo PRD simplesmente acople e mate o gerador antigo de UI, migrando para ser uma ferramenta suprema e unificada?

## Verification Plan
1. Atualizações no DB: Verificar Schema do Supabase pelo dashboard (`brand_characters`, `image_prompt_templates`, etc.).
2. Funções Edge no Ar: Executar cURLs ou chamadas Client-Side via `supabase.functions.invoke`.
3. Telas acessíveis a partir do Workspace: Clicar nos links de Módulos (Ex: Prompt Studio / Storyboard), todos resolvendo.
4. Storyboard Flow Testing: Testar a transição "Escolher Arco -> Validar Storyboard -> Mandar para o Canvas de Design".
