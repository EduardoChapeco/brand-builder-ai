# 🧠 Plano de Arquitetura: FASE 3 (Multi-Agent Expert System & Performance)

Você trouxe o nível para o "God Mode". O que você forneceu não são apenas _prompts_, é o manual completo de direção de arte e fotografia de luxo. Entendi perfeitamente a visão: o sistema não pode ser apenas um "fazedor de posts de IA", ele precisa atuar como um esquadrão de especialistas seniores (Diretor de Arte, Fotógrafo de Moda, Copywriter PhD e Estrategista).

Aqui está o plano detalhado de como vou injetar essa inteligência e otimizar toda a plataforma.

---

## 📸 1. O Novo "Vision Agent" (Engenharia de Fotografia)

_Alvo: `supabase/functions/generate-background-image/index.ts`_

Vou substituir o gerador de prompt simplório atual por um construtor de **Fotografia Ultra-Realista**:

- **Injeção de Hardware Virtual:** A IA vai compor prompts sempre incluindo `Canon EOS R5, lente 85mm f/1.4, RAW 50MP, DOF rasa`.
- **Iluminação 3-Point Studio:** Regras matemáticas exatas de luz (Key light 5600K 45°, Fill light 3200K 30%, Backlight 3000K).
- **Texturização Extrema:** Inserção obrigatória de `pele com poros visíveis`, `fios de cabelo individuais`, `trama do tecido nítida` para matar a estética amarelada/borrachuda comum da IA.
- **Micro-Decisões (Modo Clean vs Bold):** O Agente vai injetar reflexos da paleta de cores institucional dentro da foto e elementos abstratos (linhas flutuantes, glitch) apenas no modo Bold/Editorial.

## ✍️ 2. O Esquadrão Copywriter (Personas Especialistas)

_Alvo: `supabase/functions/generate-post-content/index.ts`_

A inteligência de texto deixará de ser genérica. O sistema passará a usar **Agentes de Função**:

- **Frameworks Científicos:** A IA será instruída a projetar o conteúdo respeitando padrões de leitura (Padrão F e Z) e alocação de texto.
- **Teoria das Cores (60-30-10):** A IA definirá exatamente as variações CSS que usam 60% cor primária, 30% neutra e 10% accent (para CA/Botão).
- **Personas Dinâmicas:** Dependendo do funil escolhido, o prompt evocará o perfil: "Estrategista Sênior de Marketing", "Ph.D em Neuromarketing" ou "Advogado Especialista" para garantir profundidade máxima e não respostas rasas.

## ⚡ 3. Auditoria de Alta Performance e Código Limpo (Frontend)

_Alvo: `React Frontend` & `Hooks`_

Para garantir que a performance seja absurdamente alta e sem bugs ou memory leaks (travamentos):

- **Implementação de Lazy Loading (`React.lazy`):** O `ArtboardStage`, Modais e os motores pesados de PDF/HTML export serão carregados apenas quando o usuário precisar (Code Splitting).
- **Remoção de Duplicações:** Revisão profunda em estados redundantes (`useState`) que causam re-renderizações desnecessárias. Removendo qualquer conflito entre os painéis laterais.
- **Cache Management:** Limpeza de sessões e storages pesados após exportações.

## 🎨 4. Coleção Expandida de Templates

_Alvo: `src/lib/templateRegistry.ts`_

Além da regra de contraste (já resolvida), você mencionou o cuidado com sombras, blurs e neons sem que o texto se perca numa área vazia do fundo:

- Nós injetaremos templates baseados em "Glassmorphism Dinâmico", onde uma caixa fosca (`backdrop-filter: blur()`) acompanha e se molda ao tamanho do texto gerado exatamente atrás dele, garantindo contraste perfeito em frente a qualquer imagem foto-realista, seja um rosto humano, seja um escritório luxuoso.

---

### 👉 Requisito de Aprovação

Como essa é uma reestruturação profunda da arquitetura Prompt/Orquestração e da performance do React Front-end:
**Está tudo alinhado com a sua visão de plataforma de elite? Posso disparar a implementação deste plano agora?**
