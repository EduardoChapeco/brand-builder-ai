import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp, ChevronLeft, ChevronRight, Download, Copy, Bookmark,
  Sparkles, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  postData?: PostData | null;
};

type PostData = {
  title: string;
  format: "single" | "carousel";
  slides_html: string[];
  caption: string;
  hashtags: string;
  template: string;
};

const quickActions = [
  { emoji: "📱", label: "Post único", prompt: "Crie um post único sobre " },
  { emoji: "🎬", label: "Carrossel", prompt: "Crie um carrossel com 5 slides sobre " },
  { emoji: "📊", label: "Post com dados", prompt: "Crie um post visual com dados e estatísticas sobre " },
  { emoji: "💬", label: "Depoimento", prompt: "Crie um post de depoimento de cliente sobre " },
  { emoji: "🚀", label: "Lançamento", prompt: "Crie um post de lançamento para " },
];

const agentSteps = [
  { emoji: "🧭", name: "Aria", action: "Interpretando pedido...", color: "text-primary" },
  { emoji: "✍️", name: "Bruno", action: "Escrevendo textos...", color: "text-accent" },
  { emoji: "🎨", name: "Carla", action: "Criando layout...", color: "text-success" },
];

const MOCK_SLIDES: string[] = [
  `<div style="width:540px;height:540px;background:linear-gradient(135deg,#7C3AED 0%,#4C1D95 100%);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;font-family:'DM Sans',sans-serif;color:white;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
    <div style="position:absolute;bottom:-40px;left:-40px;width:150px;height:150px;border-radius:50%;background:rgba(6,182,212,0.15);"></div>
    <div style="font-size:14px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin-bottom:20px;">PostGen AI</div>
    <div style="font-size:42px;font-weight:700;text-align:center;line-height:1.2;margin-bottom:24px;">5 Dicas Para Crescer Seu Negócio</div>
    <div style="font-size:16px;opacity:0.8;text-align:center;">Estratégias comprovadas para escalar</div>
  </div>`,
  `<div style="width:540px;height:540px;background:#111119;display:flex;flex-direction:column;justify-content:center;padding:60px;font-family:'DM Sans',sans-serif;color:white;position:relative;">
    <div style="position:absolute;top:40px;left:60px;font-size:64px;font-weight:800;color:rgba(124,58,237,0.15);">01</div>
    <div style="font-size:13px;color:#06B6D4;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">Dica #1</div>
    <div style="font-size:32px;font-weight:700;line-height:1.3;margin-bottom:20px;">Conheça Seu Público-Alvo</div>
    <div style="font-size:16px;color:#94a3b8;line-height:1.7;">Entenda profundamente quem são seus clientes. Pesquise seus hábitos, dores e desejos para criar soluções certeiras.</div>
    <div style="position:absolute;bottom:40px;left:60px;right:60px;height:3px;background:linear-gradient(90deg,#7C3AED,transparent);border-radius:2px;"></div>
  </div>`,
  `<div style="width:540px;height:540px;background:#111119;display:flex;flex-direction:column;justify-content:center;padding:60px;font-family:'DM Sans',sans-serif;color:white;position:relative;">
    <div style="position:absolute;top:40px;left:60px;font-size:64px;font-weight:800;color:rgba(124,58,237,0.15);">02</div>
    <div style="font-size:13px;color:#06B6D4;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">Dica #2</div>
    <div style="font-size:32px;font-weight:700;line-height:1.3;margin-bottom:20px;">Invista em Marketing Digital</div>
    <div style="font-size:16px;color:#94a3b8;line-height:1.7;">Presença online é essencial. Crie conteúdo relevante, use redes sociais estrategicamente e construa autoridade.</div>
    <div style="position:absolute;bottom:40px;left:60px;right:60px;height:3px;background:linear-gradient(90deg,#7C3AED,transparent);border-radius:2px;"></div>
  </div>`,
  `<div style="width:540px;height:540px;background:#111119;display:flex;flex-direction:column;justify-content:center;padding:60px;font-family:'DM Sans',sans-serif;color:white;position:relative;">
    <div style="position:absolute;top:40px;left:60px;font-size:64px;font-weight:800;color:rgba(124,58,237,0.15);">03</div>
    <div style="font-size:13px;color:#06B6D4;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">Dica #3</div>
    <div style="font-size:32px;font-weight:700;line-height:1.3;margin-bottom:20px;">Automatize Processos</div>
    <div style="font-size:16px;color:#94a3b8;line-height:1.7;">Use tecnologia para eliminar tarefas repetitivas. Foque seu tempo e energia no que realmente importa para crescer.</div>
    <div style="position:absolute;bottom:40px;left:60px;right:60px;height:3px;background:linear-gradient(90deg,#7C3AED,transparent);border-radius:2px;"></div>
  </div>`,
  `<div style="width:540px;height:540px;background:linear-gradient(135deg,#4C1D95 0%,#7C3AED 50%,#06B6D4 100%);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;font-family:'DM Sans',sans-serif;color:white;text-align:center;">
    <div style="font-size:36px;font-weight:700;margin-bottom:20px;">Pronto Para Crescer?</div>
    <div style="font-size:16px;opacity:0.85;margin-bottom:32px;line-height:1.6;">Aplique essas dicas hoje e veja a diferença no seu negócio.</div>
    <div style="padding:14px 40px;background:white;color:#4C1D95;border-radius:50px;font-weight:700;font-size:16px;">Fale Conosco →</div>
  </div>`,
];

const MOCK_CAPTION = `🚀 5 dicas essenciais para fazer seu negócio crescer de forma sustentável!

Cada uma dessas estratégias foi comprovada por empresas que saíram do zero ao sucesso. O segredo? Consistência e ação.

Salve este post para consultar sempre que precisar de inspiração! 💡`;

const MOCK_HASHTAGS = "#empreendedorismo #marketing #negocios #crescimento #dicas #estrategia #sucesso #marketingdigital";

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [activePost, setActivePost] = useState<PostData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, postData: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);
    setActiveStep(0);

    // Simulate agent steps
    for (let i = 0; i < agentSteps.length; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      setActiveStep(i + 1);
    }

    await new Promise((r) => setTimeout(r, 800));

    const postData: PostData = {
      title: "5 Dicas Para Crescer Seu Negócio",
      format: "carousel",
      slides_html: MOCK_SLIDES,
      caption: MOCK_CAPTION,
      hashtags: MOCK_HASHTAGS,
      template: "minimal-dark",
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Pronto! Criei um carrossel com 5 slides sobre crescimento de negócios. Confira o preview ao lado e faça download quando quiser.",
      postData,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setActivePost(postData);
    setCurrentSlide(0);
    setIsGenerating(false);
    setActiveStep(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyCaption = () => {
    if (!activePost) return;
    navigator.clipboard.writeText(activePost.caption + "\n\n" + activePost.hashtags);
  };

  return (
    <div className="flex h-full">
      {/* Left: Chat */}
      <div className="flex flex-1 flex-col border-r border-border">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">PostGen AI</h1>
            <p className="text-xs text-muted-foreground">Gerador de posts com IA</p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            llama-3.3-70b
          </Badge>
        </div>

        {/* Messages */}
        <div className="chat-scrollbar flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !isGenerating && (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">O que você quer criar?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Descreva o post e nossos agentes cuidam do resto.</p>
              </div>
              <div className="grid max-w-lg gap-3">
                {[
                  "📱 Crie um carrossel com 5 dicas sobre meu segmento",
                  "🚀 Post de lançamento para meu produto",
                  "💬 Post com depoimento de cliente satisfeito",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[85%] space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="text-sm text-foreground leading-relaxed pt-0.5">{msg.content}</p>
                      </div>
                      {msg.postData && (
                        <div className="ml-10 rounded-xl border border-border bg-card p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">✨ {msg.postData.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">{msg.postData.format === "carousel" ? "Carrossel" : "Post"}</Badge>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {msg.postData.slides_html.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => { setActivePost(msg.postData!); setCurrentSlide(i); }}
                                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary transition-colors hover:border-primary/50"
                              >
                                <div
                                  style={{ transform: "scale(0.148)", transformOrigin: "top left", width: 540, height: 540 }}
                                  dangerouslySetInnerHTML={{ __html: msg.postData!.slides_html[i] }}
                                />
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{msg.postData.slides_html.length} slides · {msg.postData.template} template</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Agent loading */}
            {isGenerating && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="ml-10 rounded-xl border border-border bg-card p-4 space-y-3">
                  {agentSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: i <= activeStep ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      {i < activeStep ? (
                        <span className="text-success">✓</span>
                      ) : i === activeStep ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse-violet" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-muted" />
                      )}
                      <span>{step.emoji}</span>
                      <span className={`font-medium ${step.color}`}>{step.name}</span>
                      <span className="text-muted-foreground">{step.action}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-6 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {action.emoji} {action.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o post que você quer criar..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ maxHeight: "120px" }}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            PostGen usa seus agentes IA configurados em Settings
          </p>
        </div>
      </div>

      {/* Right: Preview */}
      <div className="hidden w-[380px] flex-col lg:flex">
        {!activePost ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <div className="text-5xl text-primary opacity-30">✦</div>
            <p className="text-sm font-medium text-muted-foreground">Seu post aparecerá aqui</p>
            <p className="text-center text-xs text-muted-foreground/60">Envie uma mensagem no chat para gerar seu primeiro post</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Preview</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))} disabled={currentSlide === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  {currentSlide + 1} / {activePost.slides_html.length}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentSlide((p) => Math.min(activePost.slides_html.length - 1, p + 1))} disabled={currentSlide === activePost.slides_html.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Slide preview */}
            <div className="p-4">
              <div className="overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "1" }}>
                <div style={{ width: 540, height: 540, transform: `scale(${352 / 540})`, transformOrigin: "top left" }}>
                  <div dangerouslySetInnerHTML={{ __html: activePost.slides_html[currentSlide] }} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 px-4">
              <Button className="w-full justify-start gap-2" size="sm">
                <Download className="h-4 w-4" /> Baixar PNG
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Download className="h-4 w-4" /> Baixar Todos os Slides
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2" size="sm">
                <Bookmark className="h-4 w-4" /> Salvar como Template
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2" size="sm" onClick={handleCopyCaption}>
                <Copy className="h-4 w-4" /> Copiar Legenda
              </Button>
            </div>

            {/* Caption preview */}
            <div className="mt-4 border-t border-border p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Legenda</p>
              <p className="whitespace-pre-wrap text-xs text-foreground/80 leading-relaxed">{activePost.caption}</p>
              <p className="mt-2 text-xs text-primary/70">{activePost.hashtags}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
