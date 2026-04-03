import { useEffect, useState } from "react";
import { Globe, Save, Shield, Zap, Loader2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBioLinkWorkspace } from "@/hooks/useBioLinkWorkspace";
import { saveWorkspaceBioLink } from "@/lib/biolink/service";
import { slugifyBioLink } from "@/lib/biolink/registry";

export default function BioLinkSettingsPage() {
  const { workspace, bioLink, blocks, refresh } = useBioLinkWorkspace();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    seoTitle: "",
    seoDescription: "",
    seoImageUrl: "",
    metaPixelId: "",
    ga4MeasurementId: "",
    tiktokPixelId: "",
    gtmId: "",
  });

  useEffect(() => {
    if (!bioLink) return;
    setForm({
      slug: bioLink.slug || "",
      seoTitle: bioLink.seo_title || "",
      seoDescription: bioLink.seo_description || "",
      seoImageUrl: bioLink.seo_image_url || "",
      metaPixelId: bioLink.meta_pixel_id || "",
      ga4MeasurementId: bioLink.ga4_measurement_id || "",
      tiktokPixelId: bioLink.tiktok_pixel_id || "",
      gtmId: bioLink.gtm_id || "",
    });
  }, [bioLink]);

  if (!workspace || !bioLink) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-500">
        <Loader2 size={20} className="animate-spin mr-2"/> Carregando configurações...
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/${form.slug || bioLink.slug}`;
  const updateField = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const saveSettings = async () => {
    setSaving(true);
    try {
      await saveWorkspaceBioLink({
        bioLinkId: bioLink.id,
        workspaceId: workspace.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bioLink: {
          ...bioLink,
          slug: slugifyBioLink(form.slug),
          seo_title: form.seoTitle,
          seo_description: form.seoDescription,
          seo_image_url: form.seoImageUrl || null,
          meta_pixel_id: form.metaPixelId || null,
          ga4_measurement_id: form.ga4MeasurementId || null,
          tiktok_pixel_id: form.tiktokPixelId || null,
          gtm_id: form.gtmId || null,
        } as Parameters<typeof saveWorkspaceBioLink>[0]['bioLink'],
        blocks,
      });
      toast.success("Configurações salvas com sucesso.");
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* URL Card */}
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">URL Pública do BioLink</p>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 font-mono text-xs text-[#3b82f6] bg-black border border-[#222] px-4 py-3 rounded-[14px] truncate">
            {publicUrl}
          </div>
          <button onClick={() => { void navigator.clipboard.writeText(publicUrl); toast.success("URL copiada!"); }} className="p-3 border border-[#222] rounded-[14px] text-stone-400 hover:text-white hover:bg-white/5 transition-all">
            <Copy size={14}/>
          </button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="p-3 border border-[#222] rounded-[14px] text-stone-400 hover:text-white hover:bg-white/5 transition-all">
            <ExternalLink size={14}/>
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">

        {/* Settings Form */}
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">Configuração</p>
            <h2 className="text-lg font-semibold text-white">Domínio, SEO e Pixels</h2>
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-xs font-bold text-stone-400">Slug público</Label>
            <Input id="slug" value={form.slug}
              onChange={(e) => updateField("slug", slugifyBioLink(e.target.value))}
              className="bg-black border-[#333] text-white font-mono"
              placeholder="meu-link"
            />
          </div>

          {/* SEO */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seo-title" className="text-xs font-bold text-stone-400">SEO Title</Label>
              <Input id="seo-title" value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} className="bg-black border-[#333] text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-image" className="text-xs font-bold text-stone-400">SEO OG Image URL</Label>
              <Input id="seo-image" value={form.seoImageUrl} onChange={(e) => updateField("seoImageUrl", e.target.value)} className="bg-black border-[#333] text-white" placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-desc" className="text-xs font-bold text-stone-400">SEO Description</Label>
            <Textarea id="seo-desc" value={form.seoDescription} onChange={(e) => updateField("seoDescription", e.target.value)} className="min-h-[100px] bg-black border-[#333] text-white resize-none" />
          </div>

          {/* Tracking */}
          <div className="border-t border-[#1f1f1f] pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-4">Tracking & Pixels</p>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { id: "meta-pixel", label: "Meta Pixel ID", field: "metaPixelId" as const },
                { id: "ga4", label: "GA4 Measurement ID", field: "ga4MeasurementId" as const },
                { id: "tiktok-pixel", label: "TikTok Pixel ID", field: "tiktokPixelId" as const },
                { id: "gtm", label: "Google Tag Manager ID", field: "gtmId" as const },
              ].map(({ id, label, field }) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id} className="text-xs font-bold text-stone-400">{label}</Label>
                  <Input id={id} value={form[field]} onChange={(e) => updateField(field, e.target.value)} className="bg-black border-[#333] text-white font-mono text-xs" placeholder="ID..." />
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveSettings} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-stone-100 text-black font-bold text-sm rounded-[16px] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            {saving ? "Salvando…" : "Salvar Configurações"}
          </button>
        </div>

        {/* Info Cards */}
        <div className="space-y-4">
          {[
            { icon: Globe, title: "Rota Pública", description: "A URL canônica usa /:slug. Posts compartilhados e analytics apontam para este endereço.", color: "#3b82f6" },
            { icon: Shield, title: "SEO & Open Graph", description: "Título, descrição e OG image alimentam o snapshot publicado e o <head> da página pública.", color: "#a855f7" },
            { icon: Zap, title: "Pixels & Tracking", description: "IDs de Meta, GA4, TikTok e GTM são injetados somente na versão pública, jamais no editor.", color: "#f59e0b" },
          ].map((card) => (
            <div key={card.title} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[24px] p-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 p-2.5 rounded-xl" style={{ background: card.color + '15' }}>
                  <card.icon size={16} style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{card.title}</p>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
