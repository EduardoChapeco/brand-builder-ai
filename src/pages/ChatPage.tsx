import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Sparkles,
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

type AgentTaskStatus = {
  id: string;
  agent_id: string;
  label: string;
  status: "queued" | "running" | "completed" | "failed";
  task_order: number;
  is_fallback?: boolean | null;
  error_msg?: string | null;
};

type AgentStatusPayload = {
  prd_id: string;
  status: "queued" | "running" | "completed" | "failed";
  module_type: string;
  original_prompt: string;
  assembled_prd?: string | null;
  final_prompt?: string | null;
  specialist_results?: Record<string, unknown> | null;
  tasks: AgentTaskStatus[];
};

const quickActions = [
  { label: "Post Unico", prompt: "Crie um post unico sobre " },
  { label: "Carrossel", prompt: "Crie um carrossel com 5 slides sobre " },
  { label: "Post com Dados", prompt: "Crie um post com dados e estatisticas sobre " },
  { label: "Depoimento", prompt: "Crie um post de depoimento de cliente sobre " },
  { label: "Lancamento", prompt: "Crie um post de lancamento para " },
];

const taskStatusLabel: Record<AgentTaskStatus["status"], string> = {
  queued: "Na fila",
  running: "Executando",
  completed: "Concluido",
  failed: "Falhou",
};

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePost, setActivePost] = useState<PostData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runTasks, setRunTasks] = useState<AgentTaskStatus[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handledRunsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const { workspace, briefing: wsBriefing } = useWorkspace();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, runTasks]);

  useEffect(() => {
    if (!workspace?.id) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!data) return;

      setMessages(
        data.map((message) => ({
          id: message.id,
          role: message.role as "user" | "assistant",
          content: message.content || "",
          postData: coercePostData(message.post_data),
        })),
      );

      const lastPost = [...data].reverse().find((message) => message.post_data);
      const parsedPost = coercePostData(lastPost?.post_data);
      if (parsedPost) {
        setActivePost(parsedPost);
        setCurrentSlide(0);
      }
    };

    void loadMessages();
  }, [workspace?.id]);

  const fetchBriefing = async () => wsBriefing ?? null;

  const saveMessage = useCallback(async (role: string, content: string, postData?: PostData | null) => {
    if (!workspace?.id) return;

    await supabase.from("messages").insert({
      role,
      content,
      post_data: postData ?? null,
      workspace_id: workspace.id,
    });
  }, [workspace?.id]);

  const failRun = useCallback((message: string, runId?: string | null) => {
    if (runId) handledRunsRef.current.add(runId);

    const errorAssistant: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Erro ao gerar o post: ${message}`,
    };

    setMessages((prev) => [...prev, errorAssistant]);
    setIsGenerating(false);
    setActiveRunId(null);
    setRunTasks([]);

    toast({
      title: "Erro na geracao",
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  const finalizeCompletedRun = useCallback(async (payload: AgentStatusPayload) => {
    if (handledRunsRef.current.has(payload.prd_id)) return;

    handledRunsRef.current.add(payload.prd_id);

    const specialistResults = toRecord(payload.specialist_results);
    const qaResult = toRecord(specialistResults.content_qa);
    const finalPost = coercePostData(qaResult.final_post);
    const summary = typeof qaResult.summary === "string" ? qaResult.summary : null;

    if (!finalPost) {
      failRun("O squad concluiu sem retornar um payload final valido.", payload.prd_id);
      return;
    }

    const assistantContent = summary
      ? `${summary}\n\nPost pronto: "${finalPost.title}".`
      : `Post pronto: "${finalPost.title}". Confira o preview ao lado.`;

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantContent,
      postData: finalPost,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setActivePost(finalPost);
    setCurrentSlide(0);
    setIsGenerating(false);
    setActiveRunId(null);
    setRunTasks([]);

    await saveMessage("assistant", assistantMsg.content, finalPost);

    toast({
      title: "Post gerado",
      description: `${finalPost.slides_html.length} slide(s) produzidos pelo squad real.`,
    });
  }, [failRun, saveMessage, toast]);

  useEffect(() => {
    if (!activeRunId) return;

    let cancelled = false;

    const pollStatus = async () => {
      const { data, error } = await supabase.functions.invoke("agent-status", {
        body: { prd_id: activeRunId },
      });

      if (cancelled) return;
      if (error) return;

      const payload = data as AgentStatusPayload | undefined;
      if (!payload) return;

      const tasks = Array.isArray(payload.tasks)
        ? [...payload.tasks].sort((left, right) => left.task_order - right.task_order)
        : [];

      setRunTasks(tasks);

      if (payload.status === "completed") {
        void finalizeCompletedRun(payload);
        return;
      }

      if (payload.status === "failed") {
        const failedTask = tasks.find((task) => task.status === "failed");
        failRun(failedTask?.error_msg || "O squad falhou durante a execucao.", payload.prd_id);
      }
    };

    void pollStatus();
    const interval = window.setInterval(() => {
      void pollStatus();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeRunId, failRun, finalizeCompletedRun]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating || !workspace?.id) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      postData: null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);
    setRunTasks([]);
    void saveMessage("user", text);

    try {
      const briefing = await fetchBriefing();
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: {
          workspace_id: workspace.id,
          prompt: text,
          module_type: "content_post",
          mode: "balanced",
          config: {
            surface: "chat",
            briefing_snapshot: briefing,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.prd_id) throw new Error("Nao foi possivel iniciar o squad.");

      handledRunsRef.current.delete(data.prd_id as string);
      setActiveRunId(data.prd_id as string);

      toast({
        title: "Squad iniciado",
        description: "O progresso abaixo reflete tasks reais persistidas no backend.",
      });

      void supabase.functions.invoke("agent-worker", {
        body: { prd_id: data.prd_id },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      failRun(message);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleCopyCaption = () => {
    if (!activePost) return;

    void navigator.clipboard.writeText(`${activePost.caption}\n\n${activePost.hashtags}`);
    toast({ title: "Legenda copiada" });
  };

  const visibleTasks = runTasks.length
    ? runTasks
    : activeRunId
      ? [{
        id: "queued-run",
        agent_id: "orchestrator",
        label: "Enfileirando run",
        status: "queued" as const,
        task_order: 0,
        is_fallback: false,
        error_msg: null,
      }]
      : [];

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">PostGen AI</h1>
            <p className="text-xs text-muted-foreground">Chat de geracao conectado ao squad real</p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            agent-runtime-v1
          </Badge>
        </div>

        <div className="chat-scrollbar flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !isGenerating && (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">O que voce quer criar?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Descreva o post e acompanhe o squad real executando cada task.
                </p>
              </div>
              <div className="grid max-w-lg gap-3">
                {[
                  "Crie um carrossel com 5 dicas sobre marketing digital",
                  "Post de lancamento para um novo produto SaaS",
                  "Post com depoimento de cliente satisfeito",
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
                        <p className="pt-0.5 text-sm leading-relaxed text-foreground">{msg.content}</p>
                      </div>
                      {msg.postData && (
                        <div className="ml-10 rounded-xl border border-border bg-card p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{msg.postData.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {msg.postData.format === "carousel" ? "Carrossel" : "Post"}
                            </Badge>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {msg.postData.slides_html.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setActivePost(msg.postData || null);
                                  setCurrentSlide(index);
                                }}
                                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary transition-colors hover:border-primary/50"
                              >
                                <div
                                  style={{ transform: "scale(0.148)", transformOrigin: "top left", width: 540, height: 540 }}
                                  dangerouslySetInnerHTML={{ __html: msg.postData.slides_html[index] }}
                                />
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {msg.postData.slides_html.length} slides · {msg.postData.template}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isGenerating && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="ml-10 space-y-3 rounded-xl border border-border bg-card p-4">
                  {visibleTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 text-sm">
                      {task.status === "completed" ? (
                        <span className="text-success">✓</span>
                      ) : task.status === "running" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : task.status === "failed" ? (
                        <span className="text-destructive">!</span>
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-muted" />
                      )}
                      <span className="font-medium text-foreground">{task.label}</span>
                      <span className="text-muted-foreground">{taskStatusLabel[task.status]}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border px-6 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {action.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o post que voce quer criar..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ maxHeight: "120px" }}
              disabled={isGenerating}
            />
            <Button
              size="icon"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isGenerating}
              className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            O painel acima reflete tasks reais persistidas em `agent_prds` e `agent_tasks`.
          </p>
        </div>
      </div>

      <div className="hidden w-[380px] flex-col lg:flex">
        {!activePost ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <div className="text-5xl text-primary opacity-30">✦</div>
            <p className="text-sm font-medium text-muted-foreground">Seu post aparecera aqui</p>
            <p className="text-center text-xs text-muted-foreground/60">
              Envie uma mensagem no chat para gerar seu primeiro post
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Preview</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  {currentSlide + 1} / {activePost.slides_html.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentSlide((prev) => Math.min(activePost.slides_html.length - 1, prev + 1))}
                  disabled={currentSlide === activePost.slides_html.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4">
              <div className="overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "1" }}>
                <div style={{ width: 540, height: 540, transform: `scale(${352 / 540})`, transformOrigin: "top left" }}>
                  <div dangerouslySetInnerHTML={{ __html: activePost.slides_html[currentSlide] }} />
                </div>
              </div>
            </div>

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

            <div className="mt-4 border-t border-border p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Legenda</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">{activePost.caption}</p>
              <p className="mt-2 text-xs text-primary/70">{activePost.hashtags}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const coercePostData = (value: unknown): PostData | null => {
  const record = toRecord(value);
  const slides = Array.isArray(record.slides_html)
    ? record.slides_html.filter((item): item is string => typeof item === "string")
    : [];

  const format = record.format === "single" ? "single" : record.format === "carousel" ? "carousel" : null;
  if (!format || slides.length === 0 || typeof record.title !== "string") return null;

  return {
    title: record.title,
    format,
    slides_html: slides,
    caption: typeof record.caption === "string" ? record.caption : "",
    hashtags: typeof record.hashtags === "string" ? record.hashtags : "",
    template: typeof record.template === "string" ? record.template : "unknown",
  };
};

export default ChatPage;
