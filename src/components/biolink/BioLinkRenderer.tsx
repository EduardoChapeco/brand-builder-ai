import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as LucideIcons from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type BioLinkBlock,
  type BioLinkPublicSnapshot,
  type BioLinkThemeTokens,
  type SocialLink,
  normalizeBackgroundConfig,
  socialPlatformLabel,
} from "@/lib/biolink/registry";
import { submitBioLinkCapture, trackBioLinkEvent } from "@/lib/biolink/tracking";

type RendererProps = {
  snapshot: BioLinkPublicSnapshot;
  mode?: "public" | "preview";
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string | null) => void;
};

const iconByPlatform: Record<string, keyof typeof LucideIcons> = {
  instagram: "Instagram",
  tiktok: "Music4",
  youtube: "Youtube",
  facebook: "Facebook",
  x: "Twitter",
  linkedin: "Linkedin",
  pinterest: "Pin",
  github: "Github",
  whatsapp: "MessageCircle",
  telegram: "Send",
  spotify: "Music2",
  threads: "AtSign",
  custom: "Globe",
};

const resolveIcon = (name?: string | null) => {
  if (!name) return LucideIcons.Link2;
  return (LucideIcons as Record<string, typeof LucideIcons.Link2>)[name] || LucideIcons.Link2;
};

const buildThemeStyles = (theme: BioLinkThemeTokens) => ({
  primary: theme.primaryColor,
  surface: theme.cardBackground,
  border: theme.cardBorderColor,
  text: theme.textColor,
  muted: theme.mutedTextColor,
  radius: `${theme.buttonRadius}px`,
  headingFont: `'${theme.fontHeading}', var(--font-display)`,
  bodyFont: `'${theme.fontBody}', var(--font-body)`,
});

const parseVideoUrl = (url?: string | null) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v") || ""}`;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id || ""}`;
    }
    if (parsed.hostname.includes("spotify.com")) {
      return url.replace("/track/", "/embed/track/").replace("/playlist/", "/embed/playlist/").replace("/episode/", "/embed/episode/");
    }
    return url;
  } catch {
    return url;
  }
};

const getCountdown = (targetDate?: string | null) => {
  if (!targetDate) return null;
  const diff = new Date(targetDate).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { done: false, days, hours, minutes, seconds };
};

const isBlockVisible = (block: BioLinkBlock, mode: "public" | "preview") => {
  if (mode === "preview") return true;
  if (!block.isVisible || block.draftOnly) return false;
  const startsAt = block.visibilityRules.startsAt ? new Date(block.visibilityRules.startsAt).getTime() : null;
  const endsAt = block.visibilityRules.endsAt ? new Date(block.visibilityRules.endsAt).getTime() : null;
  const expiresAt = block.visibilityRules.expiresAt ? new Date(block.visibilityRules.expiresAt).getTime() : null;
  const now = Date.now();
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  if (expiresAt && now > expiresAt) return false;
  return true;
};

const RichText = ({ html, theme }: { html: string; theme: ReturnType<typeof buildThemeStyles> }) => (
  <div
    className="prose max-w-none"
    style={{ color: theme.text }}
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const BlockShell = ({
  children,
  block,
  theme,
  mode,
  active,
  onSelect,
}: {
  children: ReactNode;
  block: BioLinkBlock;
  theme: ReturnType<typeof buildThemeStyles>;
  mode: "public" | "preview";
  active?: boolean;
  onSelect?: () => void;
}) => (
  <article
    className="group relative overflow-hidden border transition-all"
    onClick={mode === "preview" ? onSelect : undefined}
    style={{
      background: theme.surface,
      borderColor: active ? theme.primary : theme.border,
      borderRadius: theme.radius,
      cursor: mode === "preview" ? "pointer" : "default",
    }}
  >
    {mode === "preview" && !block.isVisible ? (
      <div className="absolute right-3 top-3 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em]" style={{ borderColor: theme.border, color: theme.muted }}>
        Oculto
      </div>
    ) : null}
    {children}
  </article>
);

const SocialLinksRow = ({
  items,
  theme,
  slug,
  mode,
  blockId,
  onSelectBlock,
}: {
  items: SocialLink[];
  theme: ReturnType<typeof buildThemeStyles>;
  slug: string;
  mode: "public" | "preview";
  blockId?: string | null;
  onSelectBlock?: (blockId: string | null) => void;
}) => (
  <div className="flex flex-wrap items-center justify-center gap-3">
    {items.filter((item) => item.url).map((item, index) => {
      const Icon = resolveIcon(iconByPlatform[item.platform] || item.icon);
      return (
        <a
          key={`${item.platform}-${index}`}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            if (mode !== "public") {
              event.preventDefault();
              event.stopPropagation();
              onSelectBlock?.(blockId || null);
              return;
            }
            void trackBioLinkEvent({ slug, eventType: "block_click", blockType: "social_icons", targetUrl: item.url, metadata: { platform: item.platform } });
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border"
          style={{ borderColor: theme.border, color: theme.text, background: theme.border }}
          aria-label={socialPlatformLabel[item.platform]}
        >
          <Icon size={18} />
        </a>
      );
    })}
  </div>
);

export const BioLinkRenderer = ({
  snapshot,
  mode = "preview",
  activeBlockId = null,
  onSelectBlock,
}: RendererProps) => {
  const theme = useMemo(() => buildThemeStyles(snapshot.themeTokens), [snapshot.themeTokens]);
  const background = useMemo(() => normalizeBackgroundConfig(snapshot.background), [snapshot.background]);
  const visibleBlocks = useMemo(
    () => snapshot.blocks.filter((block) => isBlockVisible(block, mode)),
    [mode, snapshot.blocks],
  );
  const [countdowns, setCountdowns] = useState<Record<string, ReturnType<typeof getCountdown>>>({});
  const [captureState, setCaptureState] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdowns((current) => {
        const next = { ...current };
        snapshot.blocks.forEach((block) => {
          if (block.type === "countdown") {
            next[block.id] = getCountdown(String(block.config.targetDate || ""));
          }
        });
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.blocks]);

  const backgroundStyle = (() => {
    if (background.type === "solid") return { background: background.color };
    if (background.type === "image" || background.type === "gif") {
      return {
        backgroundColor: background.color,
        backgroundImage: background.mediaUrl ? `url(${background.mediaUrl})` : background.color,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    if (background.type === "video") {
      return { background: `linear-gradient(135deg, ${background.gradientFrom}, ${background.gradientTo})` };
    }
    return { background: `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientTo})` };
  })();

  const handlePreviewInteraction = (event: { preventDefault: () => void; stopPropagation: () => void }, blockId?: string | null) => {
    if (mode !== "preview") return false;
    event.preventDefault();
    event.stopPropagation();
    onSelectBlock?.(blockId || null);
    return true;
  };

  const submitCapture = async (block: BioLinkBlock, captureType: "newsletter" | "contact_form", data: Record<string, unknown>) => {
    setCaptureState((current) => ({ ...current, [block.id]: "submitting" }));
    try {
      await submitBioLinkCapture({
        slug: snapshot.slug,
        captureType,
        blockId: block.id,
        blockType: block.type,
        data,
      });
      void trackBioLinkEvent({ slug: snapshot.slug, eventType: "form_submit", blockId: block.id, blockType: block.type });
      setCaptureState((current) => ({ ...current, [block.id]: "success" }));
    } catch (error) {
      console.error(error);
      setCaptureState((current) => ({ ...current, [block.id]: "error" }));
    }
  };

  const renderBlock = (block: BioLinkBlock) => {
    const config = block.config;

    if (block.type === "link_simple") {
      const Icon = resolveIcon(String(config.icon || "Link2"));
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <a
            href={String(config.url || "#")}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (handlePreviewInteraction(event, block.id)) return;
              void trackBioLinkEvent({ slug: snapshot.slug, eventType: "block_click", blockId: block.id, blockType: block.type, targetUrl: String(config.url || "") });
            }}
            className="flex items-center gap-4 p-5 no-underline"
            style={{ color: theme.text }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: theme.border }}>
              <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{String(config.title || "Novo link")}</p>
              {config.subtitle ? <p className="truncate text-sm" style={{ color: theme.muted }}>{String(config.subtitle)}</p> : null}
            </div>
            <LucideIcons.ArrowUpRight size={18} />
          </a>
        </BlockShell>
      );
    }

    if (block.type === "link_thumbnail" || block.type === "feature_link") {
      const imageUrl = String(config.imageUrl || "");
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <a
            href={String(config.url || "#")}
            target="_blank"
            rel="noreferrer"
            className="block no-underline"
            onClick={(event) => {
              if (handlePreviewInteraction(event, block.id)) return;
              void trackBioLinkEvent({ slug: snapshot.slug, eventType: "block_click", blockId: block.id, blockType: block.type, targetUrl: String(config.url || "") });
            }}
          >
            {imageUrl ? (
              <div className="h-40 w-full" style={{ backgroundImage: `linear-gradient(${String(config.overlayColor || "rgba(15,23,42,0.32)")}, ${String(config.overlayColor || "rgba(15,23,42,0.48)")}), url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            ) : null}
            <div className="space-y-3 p-5" style={{ color: theme.text }}>
              <div>
                <p className="text-lg font-semibold">{String(config.title || "Destaque")}</p>
                {config.subtitle ? <p className="mt-1 text-sm" style={{ color: theme.muted }}>{String(config.subtitle)}</p> : null}
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium" style={{ borderColor: theme.border }}>
                {String(config.ctaText || "Abrir")}
                <LucideIcons.ArrowRight size={16} />
              </span>
            </div>
          </a>
        </BlockShell>
      );
    }

    if (block.type === "link_stack") {
      const items = Array.isArray(config.items) ? config.items : [];
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <Accordion type="single" collapsible defaultValue="stack">
            <AccordionItem value="stack" className="border-none px-5">
              <AccordionTrigger className="py-5" style={{ color: theme.text }}>{String(config.title || "Links")}</AccordionTrigger>
              <AccordionContent className="space-y-3 pb-5">
                {items.map((item, index) => {
                  const record = item as Record<string, unknown>;
                  return (
                    <a
                      key={String(record.id || index)}
                      href={String(record.url || "#")}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border px-4 py-3 no-underline"
                      style={{ borderColor: theme.border, color: theme.text }}
                      onClick={(event) => {
                        if (handlePreviewInteraction(event, block.id)) return;
                        void trackBioLinkEvent({
                          slug: snapshot.slug,
                          eventType: "block_click",
                          blockId: block.id,
                          blockType: block.type,
                          targetUrl: String(record.url || ""),
                        });
                      }}
                    >
                      <div>
                        <p className="font-medium">{String(record.title || `Link ${index + 1}`)}</p>
                        {record.subtitle ? <p className="text-sm" style={{ color: theme.muted }}>{String(record.subtitle)}</p> : null}
                      </div>
                      <LucideIcons.ArrowUpRight size={16} />
                    </a>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </BlockShell>
      );
    }

    if (block.type === "social_icons") {
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <div className="space-y-4 p-5">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>{String(config.title || "Redes")}</p>
            <SocialLinksRow
              items={(Array.isArray(config.items) ? config.items : []) as SocialLink[]}
              theme={theme}
              slug={snapshot.slug}
              mode={mode}
              blockId={block.id}
              onSelectBlock={onSelectBlock}
            />
          </div>
        </BlockShell>
      );
    }

    if (block.type === "video_embed" || block.type === "spotify_embed") {
      const ratio = String(config.aspectRatio || "16:9");
      const paddingTop = ratio === "9:16" ? "177%" : ratio === "1:1" ? "100%" : "56.25%";
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <div className="space-y-4 p-5">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>{String(config.title || "Embed")}</p>
            <div className="relative overflow-hidden rounded-2xl" style={{ paddingTop }}>
              <iframe
                title={String(config.title || "Embed")}
                src={parseVideoUrl(String(config.url || ""))}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
                style={{ pointerEvents: mode === "preview" ? "none" : "auto" }}
              />
            </div>
          </div>
        </BlockShell>
      );
    }

    if (block.type === "image") {
      const content = (
        <div className="space-y-3 p-3">
          {config.imageUrl ? (
            <img
              src={String(config.imageUrl)}
              alt={String(config.altText || config.title || "Imagem")}
              className="w-full"
              style={{ borderRadius: `${Number(config.borderRadius || 24)}px`, objectFit: String(config.objectFit || "cover"), maxHeight: 380 }}
            />
          ) : (
            <div className="grid h-48 place-items-center rounded-3xl border border-dashed" style={{ borderColor: theme.border, color: theme.muted }}>
              Adicione uma imagem
            </div>
          )}
        </div>
      );
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          {config.linkUrl ? (
            <a
              href={String(config.linkUrl)}
              target="_blank"
              rel="noreferrer"
              className="block"
              onClick={(event) => {
                if (handlePreviewInteraction(event, block.id)) return;
                void trackBioLinkEvent({
                  slug: snapshot.slug,
                  eventType: "block_click",
                  blockId: block.id,
                  blockType: block.type,
                  targetUrl: String(config.linkUrl || ""),
                });
              }}
            >
              {content}
            </a>
          ) : content}
        </BlockShell>
      );
    }

    if (block.type === "rich_text") {
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <div className="space-y-4 p-5">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>{String(config.title || "Texto")}</p>
            <RichText html={String(config.bodyHtml || "<p>Escreva aqui.</p>")} theme={theme} />
          </div>
        </BlockShell>
      );
    }

    if (block.type === "newsletter") {
      const status = captureState[block.id] || "idle";
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <form
            className="space-y-4 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (mode !== "public") {
                onSelectBlock?.(block.id);
                return;
              }
              const formData = new FormData(event.currentTarget);
              void submitCapture(block, "newsletter", {
                name: String(formData.get("name") || ""),
                email: String(formData.get("email") || ""),
                consent: formData.get("consent") === "on",
              });
            }}
          >
            <div>
              <p className="text-lg font-semibold" style={{ color: theme.text }}>{String(config.title || "Entre na lista")}</p>
              <p className="mt-1 text-sm" style={{ color: theme.muted }}>{String(config.description || "")}</p>
            </div>
            {config.collectName ? <Input name="name" placeholder="Seu nome" /> : null}
            <Input name="email" type="email" placeholder="Seu melhor e-mail" />
            <label className="flex items-start gap-3 text-sm" style={{ color: theme.muted }}>
              <input type="checkbox" name="consent" className="mt-1" />
              <span>{String(config.consentLabel || "Concordo em receber comunicações por e-mail.")}</span>
            </label>
            <Button type="submit" disabled={mode !== "public" || status === "submitting"} className="w-full">
              {status === "submitting" ? "Enviando..." : String(config.buttonText || "Quero receber")}
            </Button>
            {status === "success" ? <p className="text-sm text-emerald-400">{String(config.successMessage || "Cadastro recebido com sucesso.")}</p> : null}
            {status === "error" ? <p className="text-sm text-rose-400">Não foi possível enviar agora.</p> : null}
          </form>
        </BlockShell>
      );
    }

    if (block.type === "contact_form") {
      const status = captureState[block.id] || "idle";
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <form
            className="space-y-4 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (mode !== "public") {
                onSelectBlock?.(block.id);
                return;
              }
              const formData = new FormData(event.currentTarget);
              void submitCapture(block, "contact_form", {
                name: String(formData.get("name") || ""),
                email: String(formData.get("email") || ""),
                phone: String(formData.get("phone") || ""),
                subject: String(formData.get("subject") || ""),
                message: String(formData.get("message") || ""),
              });
            }}
          >
            <div>
              <p className="text-lg font-semibold" style={{ color: theme.text }}>{String(config.title || "Fale com a marca")}</p>
              <p className="mt-1 text-sm" style={{ color: theme.muted }}>{String(config.description || "")}</p>
            </div>
            <Input name="name" placeholder="Seu nome" />
            <Input name="email" type="email" placeholder="Seu e-mail" />
            {config.showPhone ? <Input name="phone" placeholder="Telefone" /> : null}
            {config.showSubject ? <Input name="subject" placeholder="Assunto" /> : null}
            <Textarea name="message" placeholder="Sua mensagem" className="min-h-[110px]" />
            <Button type="submit" disabled={mode !== "public" || status === "submitting"} className="w-full">
              {status === "submitting" ? "Enviando..." : "Enviar mensagem"}
            </Button>
            {status === "success" ? <p className="text-sm text-emerald-400">{String(config.successMessage || "Mensagem enviada.")}</p> : null}
            {status === "error" ? <p className="text-sm text-rose-400">Não foi possível enviar agora.</p> : null}
          </form>
        </BlockShell>
      );
    }

    if (block.type === "whatsapp") {
      const href = `https://wa.me/${String(config.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(String(config.message || ""))}`;
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 p-5 no-underline"
            style={{ color: theme.text }}
            onClick={(event) => {
              if (handlePreviewInteraction(event, block.id)) return;
              void trackBioLinkEvent({ slug: snapshot.slug, eventType: "cta_conversion", blockId: block.id, blockType: block.type, targetUrl: href });
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: theme.border, color: theme.text }}>
              <LucideIcons.MessageCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{String(config.title || "Falar no WhatsApp")}</p>
              {config.subtitle ? <p className="text-sm" style={{ color: theme.muted }}>{String(config.subtitle)}</p> : null}
            </div>
            <LucideIcons.ArrowUpRight size={18} />
          </a>
        </BlockShell>
      );
    }

    if (block.type === "map") {
      const address = encodeURIComponent(String(config.address || "São Paulo, Brasil"));
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <div className="space-y-4 p-5">
            <div>
              <p className="text-lg font-semibold" style={{ color: theme.text }}>{String(config.title || "Onde estamos")}</p>
              <p className="text-sm" style={{ color: theme.muted }}>{String(config.placeName || "")}</p>
            </div>
            <iframe
              title={String(config.title || "Mapa")}
              src={`https://maps.google.com/maps?q=${address}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
              className="h-64 w-full rounded-3xl border-0"
              style={{ pointerEvents: mode === "preview" ? "none" : "auto" }}
            />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p style={{ color: theme.text }}>{String(config.address || "")}</p>
                {config.hours ? <p className="text-sm" style={{ color: theme.muted }}>{String(config.hours)}</p> : null}
              </div>
              <a
                href={`https://maps.google.com/?q=${address}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-4 py-2 text-sm no-underline"
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={(event) => {
                  if (handlePreviewInteraction(event, block.id)) return;
                  void trackBioLinkEvent({
                    slug: snapshot.slug,
                    eventType: "block_click",
                    blockId: block.id,
                    blockType: block.type,
                    targetUrl: `https://maps.google.com/?q=${address}`,
                  });
                }}
              >
                Rotas
              </a>
            </div>
          </div>
        </BlockShell>
      );
    }

    if (block.type === "stats") {
      const items = Array.isArray(config.items) ? config.items : [];
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <div className="space-y-4 p-5">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>{String(config.title || "Resultados")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {items.map((item, index) => {
                const record = item as Record<string, unknown>;
                return (
                  <div key={index} className="rounded-2xl border p-4" style={{ borderColor: theme.border }}>
                    <p className="text-2xl font-bold" style={{ color: theme.text }}>{String(record.value || "0")}{String(record.suffix || "")}</p>
                    <p className="mt-1 text-sm" style={{ color: theme.muted }}>{String(record.label || "Métrica")}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </BlockShell>
      );
    }

    if (block.type === "countdown") {
      const countdown = countdowns[block.id] || getCountdown(String(config.targetDate || ""));
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <div className="space-y-4 p-5">
            <div>
              <p className="text-lg font-semibold" style={{ color: theme.text }}>{String(config.title || "Lançamento")}</p>
              {config.subtitle ? <p className="text-sm" style={{ color: theme.muted }}>{String(config.subtitle)}</p> : null}
            </div>
            {countdown?.done ? (
              <p className="text-lg font-semibold" style={{ color: theme.text }}>{String(config.finishedMessage || "Já está no ar.")}</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Dias", countdown?.days || 0],
                  ["Horas", countdown?.hours || 0],
                  ["Min", countdown?.minutes || 0],
                  ["Seg", countdown?.seconds || 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border p-4 text-center" style={{ borderColor: theme.border }}>
                    <p className="text-2xl font-bold" style={{ color: theme.text }}>{value}</p>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: theme.muted }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BlockShell>
      );
    }

    if (block.type === "faq") {
      const items = Array.isArray(config.items) ? config.items : [];
      return (
        <BlockShell key={block.id} block={block} theme={theme} mode={mode} active={activeBlockId === block.id} onSelect={() => onSelectBlock?.(block.id)}>
          <div className="space-y-4 p-5">
            <p className="text-lg font-semibold" style={{ color: theme.text }}>{String(config.title || "Perguntas frequentes")}</p>
            <Accordion type="single" collapsible className="rounded-3xl border px-4" style={{ borderColor: theme.border }}>
              {items.map((item, index) => {
                const record = item as Record<string, unknown>;
                return (
                  <AccordionItem value={`faq-${index}`} key={index} className="border-b last:border-none" style={{ borderColor: theme.border }}>
                    <AccordionTrigger style={{ color: theme.text }}>{String(record.question || `Pergunta ${index + 1}`)}</AccordionTrigger>
                    <AccordionContent style={{ color: theme.muted }}>{String(record.answer || "")}</AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </BlockShell>
      );
    }

    return null;
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        ...backgroundStyle,
        color: theme.text,
        fontFamily: theme.bodyFont,
      }}
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-4 py-6 sm:px-6">
        <section
          className="sticky top-4 z-20 overflow-hidden border px-6 py-7 text-center backdrop-blur-xl"
          style={{
            background: theme.surface,
            borderColor: theme.border,
            borderRadius: theme.radius,
          }}
        >
          <div className="mx-auto mb-4 grid h-24 w-24 place-items-center overflow-hidden rounded-full border" style={{ borderColor: theme.border, background: theme.border }}>
            {snapshot.avatarUrl ? (
              <img src={snapshot.avatarUrl} alt={snapshot.displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold">{snapshot.displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: theme.muted }}>{snapshot.displayName}</p>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: theme.text, fontFamily: theme.headingFont }}>@{snapshot.username}</h1>
          {snapshot.bioText ? <p className="mx-auto mt-3 max-w-[520px] text-sm leading-7" style={{ color: theme.muted }}>{snapshot.bioText}</p> : null}
          {snapshot.socialLinks.length > 0 ? (
            <div className="mt-5">
              <SocialLinksRow items={snapshot.socialLinks} theme={theme} slug={snapshot.slug} mode={mode} onSelectBlock={onSelectBlock} />
            </div>
          ) : null}
          {snapshot.cta.enabled && snapshot.cta.url ? (
            <a
              href={snapshot.cta.url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-full px-5 py-3 text-sm font-semibold no-underline"
              style={{ background: snapshot.themeTokens.primaryColor, color: "#fff" }}
              onClick={(event) => {
                if (handlePreviewInteraction(event, null)) return;
                void trackBioLinkEvent({
                  slug: snapshot.slug,
                  eventType: "cta_conversion",
                  targetUrl: snapshot.cta.url,
                });
              }}
            >
              {snapshot.cta.text || "Abrir"}
            </a>
          ) : null}
        </section>

        {visibleBlocks.map(renderBlock)}
      </div>
    </div>
  );
};

export type { BioLinkPublicSnapshot };
