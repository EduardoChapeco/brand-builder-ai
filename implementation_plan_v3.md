# 🏗️ Plano de Arquitetura & Implementação: BrandBuilder AI (V3 Overhaul)

Você tem absoluta razão. O sistema de DNA atual está simplório, gera cores sem contraste e os templates gerados não batem com a realidade visual da marca minerada. Além disso, aplicar uma única imagem gerada para todos os slides de um carrossel destrói o propósito de engajamento do formato.

Abaixo está o nosso **Plano de Guerra** estruturado. Vamos executar isso em partes para garantir que nada quebre e que as funcionalidades sejam refinadas com perfeição cirúrgica.

---

## 🛑 FASE 1: Correção Imediata do Layout e Imagens (Slides & Aspect Ratio)

**1. Múltiplas Imagens por Slide (Fim da Imagem Única)**

- **Como é:** O `generate-post-content` gera 1 único `bg_prompt_hint` para o post inteiro.
- **A Solução:** Vou refatorar a Edge Function de texto para que **cada objeto do array `slides` tenha seu próprio `image_prompt_hint`**.
- O Gerador de imagens (quando você clicar em "Gerar Imagem com IA") passará a respeitar o prompt individual do slide selecionado.
- Adição da variável de **Formato (Aspect Ratio)** no prompt de imagem: Quadrado (1:1), Storie (9:16) ou Portrait (4:5). A imagem gerada respeitará 100% o tamanho da tela do editor atual.

**2. Biblioteca de Templates (Evolução Estética)**

- Vou recriar a `presentationTemplates.ts` com **Dezenas de templates novos muito mais sofisticados**:
  - `Template G1 / Notícia` (simulando um portal de notícias).
  - `Template Tweet / X` (simulando um print do X refinado).
  - `Template Viral Hook` (textão em destaque com tarjas neon).
  - `Template Apple / Minimalista` (inspirado no minimalismo ultra-limpo).
- Cada template usará grids reais (CSS Grid/Flexbox avançados) para garantir que a imagem não "salte" para fora.

**3. Injeção de Fontes Reais**

- Vamos montar uma lista curada das 20 melhores fontes do Google Fonts (Inter, Playfair Display, Montserrat, Anton, Bebas Neue, Outfit) e injetá-las nativamente no motor de renderização (`templateRegistry.ts`).

---

## 🧬 FASE 2: O Novo Minerador "DNA Extractor Elite"

**O Problema Atual:**
O Firecrawl pega o Markdown (texto) e a IA "chuta" as cores baseada no nome. O gerador HTML cria um HTML inline horrível de 540x540 que muitas vezes usa texto preto no fundo preto.

**A Refatoração Profunda:**

1. **Mineração Visual Baseada Múltipla (Vision):**
   - Vamos passar a focar agressivamente no modelo de visão do _Lovable AI Gateway_.
   - Em vez de pedir para a linguagem inferir, vamos passar regras de WCAG (Acessibilidade e Contraste): "SE o fundo detectado for escuro, a variável de texto TERÁ que obrigatoriamente ser clara".
2. **Template "Glassmorphism" e "Modern Grid":**
   - A IA de geração HTML do DNA será reprogramada. Ao invés de usar `<div>` chapada, ela vai gerar layouts usando CSS Moderno, `backdrop-filter` (vidro) e elementos sobrepostos de forma elegante e com design system real.
3. **Escopo de Onboarding:**
   - Essa ferramenta de Clonagem deixará de ser um mero botão perdido e será o **Coração do Onboarding do Workspace**. Quando o usuário se cadastrar, ele colocará a @ do Instagram e o sistema irá inicializar todo o manual da marca automaticamente.

---

## 📰 FASE 3: Ecossistema Expandido (News, BioLinks e Blogs)

Esse é o escopo épico que você solicitou. Já construiremos a arquitetura pensando nisso:

**1. BioLink & Landing Pages (PageBuilder)**

- Utilizaremos exatamente a mesma engenharia do Canva Editor de posts que finalizamos hoje, mas em vez de renderizar um quadrado, renderizaremos um canvas **infinito vertical**.
- Os templates de BioLink poderão ser editados campo a campo na coluna da direita.

**2. Motor Automático de Notícias (RSS Miner)**

- Criaremos uma base "Feeds", onde você ou a IA cadastram URLs RSS (Ex: G1, Forbes, TecMundo).
- Um _Cron-Job_ (Edge Function triggada por tempo) vai rodar às 6h da manhã, minerar as notícias do dia sem viés político, usar o "DNA Copywriter" do workspace e reescrever 3 stories.
- O resultado cai "Pronto para Aprovação" no painel do usuário.

**3. Blog Vertical Automático**

- Como agências (Ex: Big Golden Tour) precisam de SEO, geraremos arquivos HTML dinâmicos (artigos) com SEO Metatags completas já validadas, baseados nos _trending topics_ do nicho.

---

### 👉 Próximos Passos Imediatos (Sua Aprovação)

Estou pronto para abrir o código agora mesmo e começar pelas **Bases do Canva e Templates** (item 1 e 2).
Vou corrigir a Edge Function para gerar imagens responsivas, criar os novos templates (Tweet, G1, Minimal) e arrumar o contraste das cores.

Você autoriza o início desta Fase 1 agora? Assim que eu finalizar a Parte 1, partimos para consertar o cérebro da Clonagem visual!
