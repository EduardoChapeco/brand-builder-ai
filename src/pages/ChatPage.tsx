import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp, ChevronLeft, ChevronRight, Download, Copy, Bookmark,
  Sparkles, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";

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

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [activePost, setActivePost] = useState<PostData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { workspace, briefing: wsBriefing } = useWorkspace();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Load messages on mount — workspace-isolated
  useEffect(() => {
    if (!workspace?.id) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content || "",
            postData: m.post_data as PostData | null,
          }))
        );
        const lastPost = [...(data || [])].reverse().find((m) => m.post_data);
        if (lastPost?.post_data) {
          setActivePost(lastPost.post_data as PostData);
          setCurrentSlide(0);
        }
      }
    };
    loadMessages();
  }, [workspace?.id]);

  const fetchBriefing = async () => {
    return wsBriefing ?? null;
  };

  const saveMessage = async (role: string, content: string, postData?: PostData | null) => {
    if (!workspace?.id) return;
    await supabase.from("messages").insert({
      role,
      content,
      post_data: postData ?? null,
      workspace_id: workspace.id,
    });
  };

  const savePost = async (postData: PostData) => {
    if (!workspace?.id) return;
    await supabase.from("posts_v2").insert({
      workspace_id: workspace.id,
      title: postData.title,
      format: postData.format,
      slides_html: postData.slides_html,
      caption: postData.caption,
      hashtags: postData.hashtags,
      template_name: postData.template,
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, postData: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);
    setActiveStep(0);

    // Save user message
    saveMessage("user", text);

    try {
      // Fetch briefing
      const briefing = await fetchBriefing();

      // Simulate agent step progression (UI only)
      const stepTimer1 = setTimeout(() => setActiveStep(1), 3000);
      const stepTimer2 = setTimeout(() => setActiveStep(2), 7000);

      // Call real edge function
      const { data, error } = await supabase.functions.invoke("orchestrate-post", {
        body: { user_message: text, briefing },
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const postData: PostData = {
        title: data.post.title,
        format: data.post.format,
        slides_html: data.post.slides_html,
        caption: data.post.caption,
        hashtags: data.post.hashtags,
        template: data.post.template,
      };

      // Show all steps as done briefly
      setActiveStep(3);
      await new Promise((r) => setTimeout(r, 600));

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Pronto! Criei ${postData.format === "carousel" ? `um carrossel com ${postData.slides_html.length} slides` : "um post"} — "${postData.title}". Confira o preview ao lado!`,
        postData,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setActivePost(postData);
      setCurrentSlide(0);

      // Save to DB
      saveMessage("assistant", assistantMsg.content, postData);
      savePost(postData);

      toast({ title: "✨ Post gerado!", description: `${postData.slides_html.length} slides criados com sucesso.` });
    } catch (err: unknown) {
      console.error("Generation error:", err);
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";

      const errorAssistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Erro ao gerar o post: ${errMsg}`,
      };
      setMessages((prev) => [...prev, errorAssistant]);

      toast({
        title: "Erro na geração",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setActiveStep(-1);
    }
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
    toast({ title: "✅ Legenda copiada!" });
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
            gemini-3-flash
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
                  "📱 Crie um carrossel com 5 dicas sobre marketing digital",
                  "🚀 Post de lançamento para um novo produto SaaS",
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
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
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
              disabled={isGenerating}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            PostGen usa agentes IA para gerar posts profissionais
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
