# Brand Builder AI (Cerebro Platform) — Arquitetura de Sistema & Contexto de IA
**Versão: V4.0 — Ecossistema Autônomo Definitivo**
*Última atualização: 2026-04-02*

Este documento serve como a **Bíblia da Plataforma** e o contexto fundacional definitivo para IAs e Engenheiros que atuem no ecossistema Brand Builder AI. Ele detalha não apenas a camada técnica de código, mas a arquitetura de negócios, casos de uso reais e fluxos completos de operação.

---

## 1. Visão Executiva: O que é a plataforma?

A **Brand Builder AI (Cerebro Platform)** não é apenas uma ferramenta de design, é uma **SaaS Multi-tenant de Operações de Marketing e Mídia Autônoma**. A plataforma substitui a necessidade de uma agência de marketing tradicional criando um ecosistema contínuo que **aprende sobre a marca, planeja conteúdo, gera assets visuais/vídeo de alta conversão, valida o conteúdo com "humanos sintéticos" e publica em interfaces de alta performance (Sites/Biolinks).**

### O Grande Diferencial (The "Moat")
A grande inovação arquitetural da plataforma é centralizar a inteligência da empresa no **CCP (Cerebro Context Protocol)**. Ao invés do usuário precisar repetir "Quem é minha empresa?" para gerar um Post, um Site ou um Vídeo, o sistema injeta magicamente o DNA completo da marca em qualquer orquestração de Agente ou renderização na plataforma, em milissegundos.

**Stack Tecnológico:**
*   **Frontend:** React + TypeScript + Vite + Tailwind + shadcn/ui.
*   **Backend/Banco:** Supabase (PostgreSQL relacional com Row Level Security por `workspace_id`).
*   **Cloud Functions:** Supabase Edge Functions (Ambiente Deno — escalável e serverless).
*   **Renderização Gráfica:** HTML5 Canvas Engine (para Posts/Carrosséis) e Remotion Engine (para Vídeos programáticos).
*   **IA Gateway:** Orquestração dinâmica via Groq / OpenRouter conectando com LLMs, DALL-E, e Motores de Vídeo (Runway/Kling).
*   **CI/CD:** Pipelines integrados Lovable + Supabase migrations.

---

## 2. CCP — Cerebro Context Protocol (O Cérebro da Marca)

O **CCP** é o coração da plataforma. Sem ele, a plataforma seria apenas ferramentas de IA isoladas. Com ele, tudo é hiper-contextualizado.

### Como funciona (Pipeline):
1.  **Entrada:** O usuário define uma vez o seu **Briefing** (Missão, Visão, Tom de Voz) e seu **Brand Kit** (Cores HSL primárias/secundárias, Fontes, Logotipos).
2.  **Snapshot:** A função `getCCPSnapshot` consolida as informações em um objeto ultra-rápido, compactado em XML otimizado (redução de 80% no peso de tokens).
3.  **Distribuição:** Qualquer módulo (Gerador de Post, Video Studio, Bio Link) puxa este snapshot.
4.  **Tabela Estrela:** `ccp_prompt_templates` gerencia os Prompts dos Agentes diretamente via Banco de Dados (Hot-swap sem a necessidade de deploy).
5.  **Output Tagueado:** Todo material gerado contém a assinatura `ccp_context` no banco de dados, registrando o histórico estrutural do que motivou aquela criação.

---

## 3. End-to-End: Fluxos Principais e Como as Coisas se Integram

### FLUXO 1: A "Vitrine da Marca" (Publicadores B2C)
O objetivo principal da operação de Marketing é levar o cliente a uma landing page otimizada.
*   **Módulo: Bio Link (Bento Layout)**
    *   *O que é:* Um micro-site ultra otimizado para link-in-bio do Instagram/TikTok.
    *   *Como funciona:* Usa um Layout "Bento Grid" (Apple/Framer style) de 3 colunas para gerenciamento, com um Dock (Island) inferior flutuante para injeção de novos blocos.
    *   *Integração:* Blocos não são estáticos; o Bloco "Maps" carrega iFrames nativos do Google Maps, o "YouTube" toca vídeos em overlay. Formulários de Lead (Newsletter) capturam e-mails diretamente para o Supabase.
*   **Módulo: Website Builder Institute**
    *   *O que é:* Criar Landing Pages corporativas complexas.
    *   *Arquitetura:* Baseado em `websites` -> `website_pages` -> `scroll_sections`.
    *   *Integração Futura (Vision):* Landing Pages criadas dinamicamente conectadas a campanhas geradas pelos agentes (Se o agente focar em "Páscoa", o site ganha assets de Páscoa via IA).
*   **Módulo: News e Blog Portals**
    *   *Fluxo E2E:* Uma notícia quente surge (RSS via News Portal). Com um clique, a plataforma pega a notícia e pede aos Agentes para gerar um Artigo de Blog com a opinião da empresa sobre o tema. Do artigo do blog, aperta-se um botão que transforma o texto em **Vídeo** através do módulo Video Studio (via camada *Remotion*).

### FLUXO 2: A "Fábrica de Conteúdo Automática" (PostGen & Video Studio)
Acabou a síndrome da folha em branco. Módulos que geram o criativo massivo.
*   **Módulo: Gerador de Posts (Orquestração de Agentes)**
    *   *Workflow (O 6-Step Pipeline):*
        1.  `Trend Researcher`: Olha na internet os sinais virais.
        2.  `Content Strategist`: Formula o arco narrativo em Slides.
        3.  `Content Writer`: Escreve roteiros e calls to action precisos.
        4.  `Content Designer`: Escolhe entre 10 Templates (Quotes, Rankings, etc.) e compõe o Post visando o Canvas.
        5.  `SimLab QA`: Faz uma auditoria pré-lançamento.
        6.  `Orchestrator`: Finaliza na galeria do cliente e deixa pronto para download em PNG/HTML5.
    *   *Integrações:* Usa o banco `post_sessions_v2`, amarrando JSONB para estados do canvas.
*   **Módulo: Video Studio (O Peso Pesado)**
    *   *O que é:* O módulo final para renderizar mídias dinâmicas em uma timeline reativa, substituindo ferramentas como Premiere para formatos virais no modelo Shorts/Reels.
    *   *Workflow:* Possui 5 rotas (`/video-studio` -> `/editor` -> `/generate` -> `/motion`). Gerencia Polling exponencial (Progressive Backoff) para esperar o servidor Groq/OpenRouter renderizar as cenas pesadas (`video_jobs`). Possui detecção de silêncio, transcrição nativa (legendas) e compositor de camadas (Layers).
    *   *Tabelas Base:* `video_projects`, `video_assets`, `video_jobs`, `scroll_sections`.

### FLUXO 3: Laboratório de Audência e Validação (SimLab)
O ambiente que previne o "cancelamento" e garante a alta conversão.
*   **Visão Geral:** O SimLab opera injetando Personas (Simulações Sintéticas de Humanos com dores, sonhos e idades bem definidas) para validar Conteúdos.
*   *Fluxo E2E:* O usuário quer publicar seu BioLink. Antes do envio final, o sistema envia a página pelo SimLab. O motor levanta a 'Persona A' (Cliente Conservador) e a 'Persona B' (Geração Z Analítica). Se o BioLink estiver com baixa clareza para a Persona A, o SimLab retorna um estado de `revise` e bloqueia uma publicação insegura, ou salva um 'override' justificando por que ignorou as queixas sintéticas.

---

## 4. O Sistema de Organização e Squads
*   **VibeCoder & Squad Builder:** Áreas dedicadas para programar a Alma da Inteligência Artificial.
    *   Ao invés de ter um LLM estúpido genérico, o Usuário cria 'Agentes/Squads' nomeando-os (Ex: 'Engenheiro de Produto').
    *   A tabela `squad_members` conecta-se aos contextos da marca para focar na meta.
*   **Web Cloner:** Extrai LPs concorrentes para reescrever com baseando na brand estrategy.

---

## 5. Análise de Completude Conceitual & Casos de Uso Futuro

A arquitetura tecnológica das soluções supracitadas representa o **Estado da Arte** em integrações AI-Product. A plataforma cobre perfeitamente:
1.  **Entendimento** (Briefing/CCP).
2.  **Validação** (SimLab).
3.  **Criação** (PostGen/Video/Blog).
4.  **Distribuição Passiva** (BioLink/Site).

**Análises do que Falta ser Realizado / Casos de Uso Futuros OBRIGATÓRIOS:**

1.  **Auto-Distribuição Ativa (Social Publishing):**
    *   *Funcionalidade:* O `PostGen` terminar a arte e empurrar direto via API para o Instagram Reels/Carousel ou LinkedIn.
    *   *Cenário:* Uma agenda na plataforma que, baseada nas tendências (via RSS Portal News), gera, valida com SimLab e publica enquanto o dono do negócio dorme.

2.  **Data Loop Reverso de Analytics (The Closed Loop):**
    *   *Funcionalidade:* O Bio Link já registra cliques via pixels (`meta_pixel_id`). Quando um cliente compra pelo site B2C, os dados devem voltar ao Agente Estrategista, alterando dinamicamente o `Briefing` para dizer: *"Campanhas tipo A vendem mais. Foque nelas."*

3.  **CRM de Leads Totalmente Autônomo:**
    *   *Funcionalidade:* Hoje o usuário engaja deixando o email no componente Newsletter do Bio Link (que acabamos de integrar). No futuro, a própria IA da `Brand Builder AI` criará relatórios da empresa (ex: "Tendências do Mercado"), compactará em PDF e enviará automaticamente ao email recém-capturado em nome da empresa do cliente.

---

## 6. Padronizações de Engenharia, Banco e Tipagens

Para IAs programadoras mantendo a sanidade deste ecosistema:

*   **Padrões de Casting (TypeScript):** Todo dado complexo do PostgreSQL mapeado pelo Supabase chega tipado como `Json`. Nunca assine `any`. Em componentes React, sempre faça o casting via `(data as YourInterface)` quando mapeado ou transforme usando um normalizador: `normalizeBioLinkBlocks(data as BioLinkRecord)`
*   **Selects no Supabase:** JAMAIS USE `selec(*)`. Se a tabela de Posts ou Vídeos retornar dezenas de `JSONBs`, a UI crasherá em OOM (Out Of Memory). Mapeie apenas as IDs, Status, Titulos necessários no painel. O detalhe fino carrega apenas no `/editor/:id`.
*   **Idempotência:** Migrations precisam ter a cláusula `IF NOT EXISTS`, garantindo robustez caso os ambientes CI/CD do Lovable engasgem na verificação de esquema.
*   **Fallback Gracioso (UX):** Erros de Supabase (ex: `42P01` tabela não existente) devem ser silenciados e mostrados como `toast.info('Sincronizando ambiente')`, retornando arrays vazios em vez de travar o App com uma "Error Boundary Tela Branca".
*   **Segurança (Multi-Tenant Core):** Toda e qualquer ação de INSERIR/ATUALIZAR no banco de dados DEVE passar explicitamente o `workspace_id`. O Supabase RLS (Row Level Security) irá declinar comandos onde o `workspace_id` do registro não bater com a sessão logada, protegendo contra vazamentos verticais de dados entre corporações clientes.

---
**Fim do Documento Estratégico AI Context (V4.0)**
*O ecossistema está estabelecido - Avante na dominação de mercado!*
