import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Play, RefreshCcw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import VideoJobStatusCard from "@/components/video/VideoJobStatusCard";
import VideoStudioShell from "@/components/video/VideoStudioShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

const CAMERA_OPTIONS = ["static", "zoom_in", "zoom_out", "pan_left", "pan_right", "orbit", "handheld", "dolly_in"];
const LIGHTING_OPTIONS = ["natural", "studio", "golden_hour", "dramatic", "neon"];

export default function VideoStudioGeneratePage() {
  const { workspace } = useWorkspace();
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [recentGenerations, setRecentGenerations] = useState<AIGeneratedVideo[]>([]);
  const [promptOriginal, setPromptOriginal] = useState("");
  const [sceneContext, setSceneContext] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [cameraMovement, setCameraMovement] = useState("static");
  const [lightingPreset, setLightingPreset] = useState("natural");
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [composedPrompt, setComposedPrompt] = useState<Record<string, unknown> | null>(null);
  const [generation, setGeneration] = useState<AIGeneratedVideo | null>(null);
  const [keyframeAsset, setKeyframeAsset] = useState<VideoAsset | null>(null);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [generatingKeyframe, setGeneratingKeyframe] = useState(false);
  const [requestingRender, setRequestingRender] = useState(false);

  const { payload, refresh } = useVideoJobStatus(renderJobId);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) || null,
    [templateId, templates],
  );

  const load = useCallback(async () => {
    if (!workspace?.id) return;
    const [{ data: templateRows }, { data: generationRows }] = await Promise.all([
      fromTable('video_templates')
        .select("*")
        .or(`is_system.eq.true,workspace_id.eq.${workspace.id}`)
        .order("is_system", { ascending: false })
        .order("created_at", { ascending: false }),
      fromTable('ai_generated_videos')
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setTemplates((templateRows || []) as VideoTemplate[]);
    setRecentGenerations((generationRows || []) as AIGeneratedVideo[]);
    if (!templateId && templateRows?.[0]?.id) {
      setTemplateId(templateRows[0].id);
    }
  }, [templateId, workspace?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCompose = async () => {
    if (!workspace?.id || !promptOriginal.trim()) {
      toast.error("Defina o prompt principal antes de compor.");
      return;
    }

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
      toast.success("Prompt modular composto e persistido.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setComposing(false);
    }
  };

  const handleGenerateKeyframe = async () => {
    if (!workspace?.id || !generation || !composedPrompt?.prompt) {
      toast.error("Componha o prompt antes de gerar o keyframe.");
      return;
    }

    setGeneratingKeyframe(true);
    try {
      const { data, error } = await supabase.functions.invoke<GeneratedImageResponse>("generate-image", {
        body: {
          workspace_id: workspace.id,
          prompt: String(composedPrompt.prompt),
          aspect_ratio: selectedTemplate?.preview_json?.ratio || "16:9",
          purpose: "video-studio-keyframe",
        },
      });
      if (error) throw error;
      if (!data?.asset?.id) throw new Error("O edge de imagem nao retornou asset valido.");

      const attached = await attachVideoKeyframe({
        workspace_id: workspace.id,
        generation_id: generation.id,
        source_media_asset_id: data.asset.id,
      });

      setGeneration(attached.generation);
      setKeyframeAsset(attached.keyframe_asset);
      toast.success("Keyframe gerado e anexado ao Video Studio.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingKeyframe(false);
    }
  };

  const handleRequestRender = async () => {
    if (!workspace?.id || !generation) {
      toast.error("Nenhuma geracao ativa para render.");
      return;
    }

    setRequestingRender(true);
    try {
      const result = await requestGeneratedVideoRender({
        workspace_id: workspace.id,
        generation_id: generation.id,
      });
      setRenderJobId(result.job_id);
      toast.success("Render solicitado ao video-runtime.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setRequestingRender(false);
    }
  };

  return (
    <VideoStudioShell
      title="AI Video Generator"
      description="Componha prompts por módulos, gere keyframes reais e solicite renders do pipeline de video IA."
      action={
        <Button className="rounded-xl" onClick={handleCompose} disabled={composing}>
          {composing ? <RefreshCcw size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Compose prompt
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <SectionCard className="space-y-5">
            <div>
              <AppSectionLabel>Prompt Composer</AppSectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                Build the modular prompt
              </h2>
            </div>

            <div className="space-y-3">
              <Label>Prompt principal</Label>
              <Textarea
                value={promptOriginal}
                onChange={(event) => setPromptOriginal(event.target.value)}
                placeholder="Ex: executiva em escritorio moderno explicando um framework para vendas B2B"
                className="min-h-[120px] rounded-2xl"
              />
            </div>

            <div className="space-y-3">
              <Label>Scene / context</Label>
              <Textarea
                value={sceneContext}
                onChange={(event) => setSceneContext(event.target.value)}
                placeholder="Contexto adicional, mood, props ou tipo de ambiente."
                className="min-h-[84px] rounded-2xl"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Duração (s)</Label>
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={durationSeconds}
                  onChange={(event) => setDurationSeconds(Number(event.target.value) || 5)}
                />
              </div>
              <div className="space-y-3">
                <Label>Camera</Label>
                <Select value={cameraMovement} onValueChange={setCameraMovement}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMERA_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Lighting</Label>
                <Select value={lightingPreset} onValueChange={setLightingPreset}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIGHTING_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          <VideoJobStatusCard
            title="Render status"
            job={payload?.job?.job || null}
            generation={payload?.job?.generation || null}
            onRefresh={renderJobId ? refresh : undefined}
          />

          <SectionCard className="space-y-4">
            <div>
              <AppSectionLabel>Recent generations</AppSectionLabel>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Saved prompt stacks
              </h2>
            </div>

            <div className="space-y-3">
              {recentGenerations.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Nenhuma geração ainda.</p>
              ) : recentGenerations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setGeneration(item);
                    setComposedPrompt(item.prompt_composed);
                    setRenderJobId(item.latest_job_id || null);
                  }}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title || "Untitled generation"}</p>
                    <span className="rounded-full bg-[var(--workspace-brand-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--text-primary)]">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {item.style_template || "custom"} · {item.camera_movement || "static"} · {item.duration_seconds}s
                  </p>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <AppSectionLabel>Composed Prompt</AppSectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Preview the stack
                </h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl" onClick={handleGenerateKeyframe} disabled={!generation || generatingKeyframe}>
                  {generatingKeyframe ? <RefreshCcw size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                  Generate keyframe
                </Button>
                <Button className="rounded-xl" onClick={handleRequestRender} disabled={!generation || generation.status !== "keyframe_ready" || requestingRender}>
                  {requestingRender ? <RefreshCcw size={14} className="animate-spin" /> : <Play size={14} />}
                  Render video
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <pre className="overflow-auto whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                {JSON.stringify(composedPrompt, null, 2)}
              </pre>
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div>
              <AppSectionLabel>Keyframe</AppSectionLabel>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Approval step
              </h2>
            </div>

            {keyframeAsset?.public_url ? (
              <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-2)]">
                <img src={keyframeAsset.public_url} alt="Keyframe" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-10 text-sm text-[var(--text-secondary)]">
                Gere um keyframe para aprovar a composicao visual antes de pedir o render final.
              </div>
            )}
          </SectionCard>

          <SectionCard className="space-y-4">
            <div>
              <AppSectionLabel>Current generation</AppSectionLabel>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Canonical state
              </h2>
            </div>
            <div className="grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
              <div>
                <span className="font-medium text-[var(--text-primary)]">Status:</span>{" "}
                {generation?.status || "none"}
              </div>
              <div>
                <span className="font-medium text-[var(--text-primary)]">Template:</span>{" "}
                {generation?.style_template || "custom"}
              </div>
              <div>
                <span className="font-medium text-[var(--text-primary)]">Camera:</span>{" "}
                {generation?.camera_movement || "static"}
              </div>
              <div>
                <span className="font-medium text-[var(--text-primary)]">Lighting:</span>{" "}
                {generation?.lighting_preset || "natural"}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </VideoStudioShell>
  );
}
