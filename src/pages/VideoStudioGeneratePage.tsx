import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Play, RefreshCcw, Sparkles, Wand2, Film, Video, Camera, Settings2, Scissors } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client"
import { fromTable } from "@/integrations/supabase/db-custom";
import {
  attachVideoKeyframe,
  composeVideoPrompt,
  requestGeneratedVideoRender,
  type AIGeneratedVideo,
  type VideoAsset,
  type VideoTemplate,
} from "@/lib/video-studio";
import { useVideoJobStatus } from "@/hooks/useVideoJobStatus";

type GeneratedImageResponse = {
  asset?: {
    id: string;
    public_url?: string | null;
    storage_path?: string | null;
  };
};

const CAMERA_MOVEMENTS = [
  { id: 'static', label: 'Estática', desc: 'Foco fixo no assunto principal' },
  { id: 'zoom_in', label: 'Zoom In', desc: 'Aproximação suave e dramática' },
  { id: 'pan_left', label: 'Pan Esquerda', desc: 'Movimento horizontal de acompanhamento' },
  { id: 'orbit', label: 'Órbita 360', desc: 'Giro completo ao redor do objeto' },
  { id: 'handheld', label: 'Handheld', desc: 'Estilo documental, câmera na mão' }
];

const LIGHTING_PRESETS = [
  { id: 'natural', label: 'Natural / Sol', desc: 'Luz do dia limpa e brilhante' },
  { id: 'studio', label: 'Studio Pro', desc: 'Iluminação 3 pontos calibrada' },
  { id: 'neon', label: 'Cyberpunk Neon', desc: 'Cores vibrantes de alto contraste' },
  { id: 'dramatic', label: 'Shadows / Dark', desc: 'Alto contraste dramático' }
];

export default function VideoStudioGeneratePage() {
  const { workspace } = useWorkspace();
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [recentGenerations, setRecentGenerations] = useState<AIGeneratedVideo[]>([]);
  
  // Prompt builder state
  const [promptOriginal, setPromptOriginal] = useState("");
  const [sceneContext, setSceneContext] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [cameraMovement, setCameraMovement] = useState("static");
  const [lightingPreset, setLightingPreset] = useState("studio");
  const [durationSeconds, setDurationSeconds] = useState(5);
  
  // Engine Output state
  const [composedPrompt, setComposedPrompt] = useState<Record<string, unknown> | null>(null);
  const [generation, setGeneration] = useState<AIGeneratedVideo | null>(null);
  const [keyframeAsset, setKeyframeAsset] = useState<VideoAsset | null>(null);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  
  // Action State
  const [composing, setComposing] = useState(false);
  const [generatingKeyframe, setGeneratingKeyframe] = useState(false);
  const [requestingRender, setRequestingRender] = useState(false);

  const { payload, refresh } = useVideoJobStatus(renderJobId);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templateId, templates],
  );

  const load = useCallback(async () => {
    if (!workspace?.id) return;
    const [{ data: templateRows }, { data: generationRows }] = await Promise.all([
      fromTable('video_templates').select("*").or(`is_system.eq.true,workspace_id.eq.${workspace.id}`).order("is_system", { ascending: false }),
      fromTable('ai_generated_videos').select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(5),
    ]);

    setTemplates((templateRows || []) as VideoTemplate[]);
    setRecentGenerations((generationRows || []) as AIGeneratedVideo[]);
    if (!templateId && templateRows?.[0]?.id) setTemplateId(templateRows[0].id);
  }, [templateId, workspace?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCompose = async () => {
    if (!workspace?.id || !promptOriginal.trim()) return toast.error("O Prompt Principal é obrigatório para compor o pipeline.");
    setComposing(true);
    try {
      const result = await composeVideoPrompt({
        workspace_id: workspace.id,
        prompt_original: promptOriginal.trim(),
        scene_context: sceneContext.trim() || null,
        template_id: templateId || null,
        camera_movement: cameraMovement,
        lighting_preset: lightingPreset,
        style_template: selectedTemplate?.name || null,
        duration_seconds: durationSeconds,
      });
      setGeneration(result.generation);
      setComposedPrompt(result.prompt_composed);
      setRenderJobId(result.generation.latest_job_id || null);
      toast.success("Prompt Modular Construído!");
      await load();
    } catch (e) { toast.error(String(e)); } finally { setComposing(false); }
  };

  const handleGenerateKeyframe = async () => {
    if (!workspace?.id || !generation || !composedPrompt?.prompt) return toast.error("Por favor, componha e valide o prompt antes da geração visual.");
    setGeneratingKeyframe(true);
    toast.info("A IA visual está gerando a primeira cena (Keyframe). Aguarde...");
    try {
      const { data, error } = await supabase.functions.invoke<GeneratedImageResponse>("generate-image", {
        body: {
          workspace_id: workspace.id,
          prompt: String(composedPrompt.prompt),
          aspect_ratio: selectedTemplate?.preview_json?.ratio || "16:9",
          purpose: "video-studio-keyframe",
        },
      });
      if (error || !data?.asset?.id) throw new Error("A Inteligência Generativa Visual está indisponível ou falhou. Revise a quota.");

      const attached = await attachVideoKeyframe({
        workspace_id: workspace.id,
        generation_id: generation.id,
        source_media_asset_id: data.asset.id,
      });

      setGeneration(attached.generation);
      setKeyframeAsset(attached.keyframe_asset);
      toast.success("Keyframe base gerado! Pronto para animação final.");
      await load();
    } catch (e) { toast.error(String(e)); } finally { setGeneratingKeyframe(false); }
  };

  const handleRequestRender = async () => {
    if (!workspace?.id || !generation) return toast.error("Nenhuma geração processada.");
    setRequestingRender(true);
    try {
      const result = await requestGeneratedVideoRender({ workspace_id: workspace.id, generation_id: generation.id });
      setRenderJobId(result.job_id);
      toast.success("Job de Render de Vídeo escalonado para a GPU.");
      await load();
    } catch (e) { toast.error(String(e)); } finally { setRequestingRender(false); }
  };

  return (
    <div className="flex bg-[#0a0a0a] min-h-screen text-white font-sans overflow-hidden">
      {/* 
        ======== LEFT PANE (Prompt Engine) ======== 
      */}
      <div className="flex-1 flex flex-col border-r border-[#1f1f1f] overflow-y-auto no-scrollbar relative min-h-screen">
        
        {/* Magic Glowing Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3b82f6] rounded-full blur-[160px] opacity-[0.08] pointer-events-none" />
        
        {/* Header */}
        <div className="sticky top-0 z-20 bg-black/60 backdrop-blur-2xl border-b border-[#1f1f1f] p-8 flex justify-between items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#3b82f6] mb-3 flex items-center gap-2"><Film size={14}/> AI Cinematography Suite</p>
            <h1 className="text-4xl font-black bg-gradient-to-r from-white to-[#6b7280] text-transparent bg-clip-text tracking-tight">Studio Generator</h1>
          </div>
          <button onClick={handleCompose} disabled={composing}
            className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-8 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            {composing ? <RefreshCcw size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Processar Prompt Multi-Layer
          </button>
        </div>

        {/* Builder Canvas */}
        <div className="p-8 max-w-4xl space-y-10 relative z-10">
          
          {/* Main Input */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles className="text-[#a855f7]" size={18}/> Ação Base e Sujeito</h3>
            <textarea value={promptOriginal} onChange={e => setPromptOriginal(e.target.value)} rows={4}
              placeholder="O que está acontecendo na cena principal? Ex: Um influenciador dinâmico de tecnologia apontando para a câmera segurando um notebook. (O cenário e ambiente detalheremos adiante)."
              className="w-full bg-[#111] border border-[#222] focus:border-[#3b82f6] rounded-[24px] p-6 text-base text-white placeholder-stone-600 outline-none resize-none transition-colors shadow-inner" />
          </div>

          <div className="w-full h-[1px] bg-gradient-to-r from-[#222] via-[#333] to-[#222]" />

          {/* Engine Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Settings2 className="text-[#f59e0b]" size={18}/> Ambiente Físico / Set</h3>
              <textarea value={sceneContext} onChange={e => setSceneContext(e.target.value)} rows={3}
                placeholder="Exemplo: Escritório moderno no Google, paredes de vidro, chuva forte lá fora, mesas de carvalho, reflexos no chão."
                className="w-full bg-[#111] border border-[#222] focus:border-[#f59e0b] rounded-[20px] p-5 text-sm text-white placeholder-stone-600 outline-none resize-none transition-colors" />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Video className="text-[#10b981]" size={18}/> Duração Base da Cena</h3>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map(s => (
                  <button key={s} onClick={() => setDurationSeconds(s)}
                    className={`flex-1 py-4 rounded-[20px] font-mono text-sm font-bold border transition-all ${durationSeconds === s ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]' : 'bg-[#111] border-[#222] text-stone-400 hover:border-[#333]'}`}>
                    {s} secs
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500 font-medium">Gerações acima de 5s requerem mais recursos da GPU Generativa (até +3 min de fila).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111] border border-[#222] rounded-[24px] p-6">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-widest text-stone-400"><Camera size={14}/> Movimentação e Enquadramento</h3>
              <div className="space-y-2">
                {CAMERA_MOVEMENTS.map(cam => (
                  <button key={cam.id} onClick={() => setCameraMovement(cam.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-colors ${cameraMovement === cam.id ? 'bg-[#3b82f6]/10 border-[#3b82f6]' : 'bg-transparent border-transparent hover:bg-[#222]'}`}>
                    <div className={`w-2 h-2 rounded-full ${cameraMovement === cam.id ? 'bg-[#3b82f6]' : 'bg-stone-700'}`}/>
                    <div>
                      <p className={`text-sm font-bold ${cameraMovement === cam.id ? 'text-white' : 'text-stone-300'}`}>{cam.label}</p>
                      <p className="text-[11px] text-stone-500">{cam.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-[24px] p-6">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-widest text-stone-400"><Sparkles size={14}/> Direção de Arte e Iluminação</h3>
              <div className="space-y-2">
                {LIGHTING_PRESETS.map(light => (
                  <button key={light.id} onClick={() => setLightingPreset(light.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-colors ${lightingPreset === light.id ? 'bg-[#f59e0b]/10 border-[#f59e0b]' : 'bg-transparent border-transparent hover:bg-[#222]'}`}>
                    <div className={`w-2 h-2 rounded-full ${lightingPreset === light.id ? 'bg-[#f59e0b]' : 'bg-stone-700'}`}/>
                    <div>
                      <p className={`text-sm font-bold ${lightingPreset === light.id ? 'text-white' : 'text-stone-300'}`}>{light.label}</p>
                      <p className="text-[11px] text-stone-500">{light.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* 
        ======== RIGHT PANE (Pipeline Preview) ======== 
      */}
      <div className="w-[480px] bg-[#050505] flex flex-col shrink-0 relative border-r border-[#1f1f1f]">
        
        {/* Tab Header */}
        <div className="p-6 border-b border-[#1f1f1f] bg-black">
          <h2 className="text-sm font-bold flex items-center gap-2"><Scissors size={16}/> Composição em Andamento</h2>
          <p className="text-xs text-stone-500 mt-1">Status da fila de geração de IA</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          
          {/* STEP 1: Prompt Builder Result */}
          <div className="bg-[#111]/80 backdrop-blur border border-[#222] rounded-[20px] p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 font-mono">1. Prompt Machine</h4>
            {!composedPrompt ? (
              <p className="text-sm italic text-stone-600">Aguardando inserção de dados...</p>
            ) : (
              <div className="text-[11px] text-[#3b82f6] leading-relaxed p-4 bg-black/50 border border-[#3b82f6]/30 rounded-xl font-mono overflow-hidden">
                {String(composedPrompt.prompt)}
              </div>
            )}
            {composedPrompt && (
              <button disabled={generatingKeyframe} onClick={handleGenerateKeyframe}
                className="w-full mt-4 bg-white hover:bg-stone-200 text-black font-bold py-3 text-sm rounded-xl transition-transform hover:scale-[1.02] flex justify-center items-center gap-2">
                {generatingKeyframe ? <RefreshCcw size={14} className="animate-spin text-black" /> : <ImagePlus size={14} />} 
                Aprovar & Gerar Keyframe (Frame 0)
              </button>
            )}
          </div>

          {/* STEP 2: Visual Preview */}
          <div className="bg-[#111]/80 backdrop-blur border border-[#222] rounded-[20px] p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 font-mono">2. Look & Feel (Keyframe)</h4>
            {keyframeAsset?.public_url ? (
              <div className="aspect-video w-full rounded-xl bg-black border border-[#333] overflow-hidden relative group">
                <img src={keyframeAsset.public_url} alt="Keyframe Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex items-end p-3">
                  <p className="text-[10px] font-mono text-white opacity-80 uppercase">SEED_READY</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full rounded-xl border border-dashed border-[#333] flex flex-col items-center justify-center text-stone-600">
                <ImagePlus size={24} className="mb-2 opacity-50"/>
                <p className="text-xs font-medium">Nenhuma imagem carregada</p>
              </div>
            )}
            
            {keyframeAsset && (
              <button disabled={requestingRender || generation?.status !== "keyframe_ready"} onClick={handleRequestRender}
                className="w-full mt-4 bg-[#f59e0b] hover:bg-[#d97706] text-black font-black py-3 text-sm rounded-xl transition-transform hover:scale-[1.02] flex justify-center items-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.2)] disabled:opacity-50">
                {requestingRender ? <RefreshCcw size={14} className="animate-spin text-black" /> : <Play size={14} />} 
                Enviar para Render Engine
              </button>
            )}
          </div>

          {/* STEP 3: Job Status */}
          <div className="bg-[#111]/80 backdrop-blur border border-[#222] rounded-[20px] p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 font-mono">3. Render Output</h4>
             <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-400">Status Geral</span>
                  <span className={`font-mono font-bold uppercase ${generation?.status === 'keyframe_ready' ? 'text-blue-400' : generation?.status === 'done' ? 'text-green-400' : 'text-stone-500'}`}>{generation?.status || "Aguardando"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-400">Job ID Ativo</span>
                  <span className="font-mono">{renderJobId ? renderJobId.split('-')[0] : '...'}</span>
                </div>
             </div>
             {payload?.job?.job && <div className="mt-4"><VideoJobStatusCard title="Status do Nó de GPU" job={payload.job.job} generation={payload.job.generation} onRefresh={refresh} /></div>}
          </div>

        </div>
      </div>
    </div>
  );
}
