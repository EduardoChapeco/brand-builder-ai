# PRD — Simwork
## Refatoração completa, rebranding, padronização de UX, arquitetura e operação

Versão: 1.0  
Status: documento-base para redesign + reconstrução técnica  
Idioma obrigatório: português do Brasil, UTF-8

---

## 1. Resumo executivo

A plataforma atual apresenta sintomas graves de produto incompleto, inconsistente e visualmente confuso: telas com aparência de landing page onde deveria existir operação, mensagens genéricas de erro persistindo na interface, módulos que aparentam estar conectados mas não funcionam de forma real, excesso de fragmentação entre criadores, mistura de inglês com português e forte indício de dependência de estruturas legadas.

O novo produto passa a se chamar **Simwork**. O objetivo não é aplicar apenas um facelift. O objetivo é:

- reconstruir a experiência para uso real, diário e operacional;
- unificar a linguagem visual e o fluxo entre todos os builders e editores;
- eliminar conexões legadas, duplicações, estados silenciosos e hardcodes frágeis;
- garantir que cada módulo funcione de ponta a ponta com logs, validação, estados, fallback e publicação real;
- consolidar uma arquitetura orientada por workspaces, com administração central, cobrança, suporte e observabilidade.

---

## 2. Problemas que a refatoração precisa resolver

### 2.1 Problemas de UX identificados

1. Páginas internas com cara de landing page.
2. Títulos e descrições excessivamente grandes em telas que deveriam ser utilitárias.
3. Tabs horizontais em contextos que exigem navegação vertical e persistente.
4. Falta de split view consistente entre estrutura, edição, conversa e preview.
5. Ausência de onboarding contínuo por etapa.
6. Ajuda contextual inexistente ou exibida apenas uma vez sem reabertura simples.
7. Design genérico, simplificado e incapaz de transmitir que o sistema faz trabalho real.

### 2.2 Problemas de produto e funcionamento

1. Bio Link, Site Institucional, Blog Manager e News Portal exibem estados quebrados e mensagens de erro recorrentes.
2. Website Builder atual não comunica capacidade de edição real.
3. Video Studio ainda parece parcial, desconectado e sem fluxo unificado entre prompt, motion, render e exportação.
4. Fragmentação entre criadores: influencer, mascote, personagem, SimLab e outros conceitos relacionados.
5. Ausência de padrão para orquestração real de APIs, chaves, billing, logs e suporte.
6. Falta de central de administração robusta para operar a plataforma como SaaS.

### 2.3 Problemas técnicos presumidos

1. Dependência de tabelas, schemas ou contratos legados.
2. Queries e bindings inconsistentes entre frontend, edge functions e banco.
3. Falhas silenciosas sem telemetria útil.
4. Hardcodes de layout e conteúdo onde deveria haver estrutura orientada a dados.
5. Estados de erro genéricos sem código técnico e sem ação sugerida.
6. Localização incompleta: mistura de inglês e português.

---

## 3. Visão do Simwork

Simwork será uma plataforma operacional multi-workspace para criação, publicação, automação, análise e gestão de experiências digitais com IA.

Ela terá quatro pilares:

1. **Criar**: sites, bio links, blog, portal editorial, posts, vídeos, motion, agents.
2. **Operar**: workspaces, equipe, permissões, planos, billing, chaves, integrações.
3. **Validar**: analytics, SimLab, qualidade, logs, auditoria, rastreamento.
4. **Escalar**: WebMCP, orquestração de chaves, automações, central de ajuda e suporte.

---

## 4. Princípios invioláveis do redesign

### 4.1 Princípios de interface

1. Navegação principal sempre em sidebar vertical.
2. Interfaces internas não podem parecer landing pages.
3. Editor e preview precisam coexistir lado a lado sempre que fizer sentido.
4. Todo módulo complexo deve oferecer uma coluna contextual para chat, histórico ou assistente.
5. Todo módulo deve ter ajuda contextual reabrível via botão `?`.
6. O visual precisa sinalizar trabalho real: estrutura, status, etapas, dependências, dados e ações.

### 4.2 Princípios de produto

1. Nenhum módulo pode ser fake, mockado ou apenas "cenográfico".
2. Nenhum erro pode ser silencioso.
3. Nenhum módulo pode depender de contrato legado implícito.
4. Nenhum texto interno pode ficar em inglês.
5. Nenhuma funcionalidade relevante pode ficar escondida atrás de fluxo ilógico.
6. Nenhum builder pode funcionar como formulário gigante sem hierarquia.

### 4.3 Princípios técnicos

1. Tudo precisa ser orientado por workspace.
2. Toda integração precisa ter contrato, estado, retries, logs e fallback.
3. Toda mutação crítica precisa ser auditável.
4. Toda consulta sensível precisa validar escopo e permissão.
5. Todo módulo precisa ter testes de fluxo real e não só teste unitário isolado.

---

## 5. Mapa de produto completo

### 5.1 Camada do workspace
- Dashboard operacional, Workspaces, Brand Kit, Briefing, Biblioteca de assets, Analytics, Configurações

### 5.2 Camada de criação
- Criador de Sites, Criador de Bio Links, Criador Editorial (Blog + News Portal), Criador de Conteúdo Social, Criador de Vídeos, Criador de Agents

### 5.3 Camada operacional
- CRM / Leads, Suporte, Central de ajuda, Financeiro, Cobranças, Créditos, Planos, Integrações globais e por workspace

### 5.4 Camada administrativa
- Usuários, Perfis, Contas, Workspaces, Módulos, Feature flags, Billing, Logs, Incidentes, Chaves e providers, Gateways de pagamento

---

## 6–27. [Conteúdo completo disponível no SIMWORK-MASTER-PLAN.md]

Ver: `/docs/SIMWORK-MASTER-PLAN.md` para fragmentação técnica completa por fase, sub-fase, schema, UI e critério de aceite.
