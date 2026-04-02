import { useEffect, useState } from "react";
import { Globe, Save, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBioLinkWorkspace } from "@/hooks/useBioLinkWorkspace";
import { saveWorkspaceBioLink } from "@/lib/biolink/service";
import { slugifyBioLink } from "@/lib/biolink/registry";

const BioLinkSettingsPage = () => {
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
    return <div className="page-inner">Carregando configuracoes...</div>;
  }

  const publicUrl = `${window.location.origin}/${form.slug || bioLink.slug}`;

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await saveWorkspaceBioLink({
        bioLinkId: bioLink.id,
        workspaceId: workspace.id,
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
        },
        blocks,
      });
      toast.success("Configuracoes salvas.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel salvar as configuracoes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-inner space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Publicacao</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Dominio, SEO e pixels</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug publico</Label>
            <Input id="slug" value={form.slug} onChange={(event) => updateField("slug", slugifyBioLink(event.target.value))} />
            <p className="text-xs text-[var(--text-muted)]">Rota oficial: {publicUrl}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seo-title">SEO title</Label>
              <Input id="seo-title" value={form.seoTitle} onChange={(event) => updateField("seoTitle", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-image">SEO image URL</Label>
              <Input id="seo-image" value={form.seoImageUrl} onChange={(event) => updateField("seoImageUrl", event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-description">SEO description</Label>
            <Textarea id="seo-description" value={form.seoDescription} onChange={(event) => updateField("seoDescription", event.target.value)} className="min-h-[140px]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meta-pixel">Meta Pixel ID</Label>
              <Input id="meta-pixel" value={form.metaPixelId} onChange={(event) => updateField("metaPixelId", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ga4">GA4 Measurement ID</Label>
              <Input id="ga4" value={form.ga4MeasurementId} onChange={(event) => updateField("ga4MeasurementId", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok-pixel">TikTok Pixel ID</Label>
              <Input id="tiktok-pixel" value={form.tiktokPixelId} onChange={(event) => updateField("tiktokPixelId", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gtm">Google Tag Manager ID</Label>
              <Input id="gtm" value={form.gtmId} onChange={(event) => updateField("gtmId", event.target.value)} />
            </div>
          </div>

          <Button onClick={saveSettings} disabled={saving}>
            <Save size={16} />
            Salvar configuracoes
          </Button>
        </div>

        <div className="space-y-4">
          {[
            {
              icon: Globe,
              title: "Rota publica",
              description: "O runtime oficial usa /:slug, com /b/:slug mantido como compatibilidade temporaria.",
            },
            {
              icon: Shield,
              title: "SEO e preview",
              description: "Titulo, descricao e imagem alimentam o snapshot publicado e o head da pagina publica.",
            },
            {
              icon: Zap,
              title: "Pixels e tracking",
              description: "IDs de Meta, GA4, TikTok e GTM ficam centralizados aqui para o runtime publico.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)]">
                  <card.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{card.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BioLinkSettingsPage;
