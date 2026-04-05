/**
 * BioLinkRenderer.tsx — SDD-1.0 / SW-020
 *
 * Renderiza o BioLink a partir de uma `publication` (type='biolink').
 * REGRA: os campos display_name, bio_text, avatar_url e theme_id estão
 *        armazenados dentro de publications.config (JSONB), NÃO em colunas raiz.
 *
 * Este componente é usado tanto pelo editor (BioLinkPage) quanto
 * pela página pública (/b/:slug → BioLinkPublicPage).
 */
import { cn } from "@/lib/utils";
import { getBioLinkThemeDefinition, type BioLinkBlock } from "@/lib/biolink/registry";
import {
  ExternalLink,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Facebook,
  Github,
  Globe,
  MessageCircle,
  Play,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrai string de um valor desconhecido com fallback seguro */
function asStr(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  return fallback;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Tipo do ícone Lucide compatível com SOCIAL_ICONS record */
type SocialIconComponent = typeof Globe;

interface RendererProps {
  /** publicações.config é um JSONB; profile pode ser o row completo ou parcial */
  profile: Record<string, unknown> | null;
  blocks: BioLinkBlock[];
  wrapperClassName?: string;
  isEditor?: boolean;
}

interface SocialLink {
  platform: string;
  url: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOCIAL_ICONS: Record<string, SocialIconComponent> = {
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  facebook: Facebook,
  github: Github,
  website: Globe,
  whatsapp: MessageCircle,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BioLinkRenderer({
  profile,
  blocks,
  wrapperClassName = "",
  isEditor = false,
}: RendererProps) {
  // Campos de perfil armazenados dentro do JSONB config da tabela publications
  const cfg = (profile?.config ?? {}) as Record<string, unknown>;

  const themeKey  = asStr(cfg.theme_id, asStr(profile?.theme_id, asStr(profile?.theme_key, "brand-auto")));
  const displayName = asStr(cfg.display_name, asStr(profile?.display_name, asStr(profile?.name, "Sem nome")));
  const bioText   = asStr(cfg.bio_text, asStr(profile?.bio_text));
  const avatarUrl: string | null =
    typeof cfg.avatar_url === "string" ? cfg.avatar_url
    : typeof profile?.avatar_url === "string" ? profile.avatar_url
    : null;

  const theme = getBioLinkThemeDefinition(themeKey);

  return (
    <div
      className={cn("min-h-screen w-full relative flex flex-col items-center", wrapperClassName)}
      style={{ background: theme.background.value, ...theme.cssVars }}
    >
      {/* Background Overlay */}
      {theme.background.overlay && (
        <div
          className="absolute inset-0 bg-black/40 pointer-events-none"
          style={{ opacity: theme.background.overlay / 100 }}
        />
      )}

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 py-16 z-10">

        {/* ── Profile Header ───────────────────────────────────────────── */}
        <section className="text-center space-y-6 mb-4 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full border-4 border-white/10 mx-auto overflow-hidden bg-white/5 backdrop-blur-xl shadow-2xl relative z-10">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-700 bg-stone-900">
                  <span className="text-2xl font-black tracking-tighter">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-[var(--primary)] blur-3xl opacity-20 rounded-full scale-150" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tightest">{displayName}</h1>
            {bioText && (
              <p className="text-sm text-stone-400 max-w-sm mx-auto leading-relaxed font-medium">
                {bioText}
              </p>
            )}
          </div>
        </section>

        {/* ── Blocks ───────────────────────────────────────────────────── */}
        <div className="space-y-4 w-full">
          {blocks.map((block) => {
            const config = block.config ?? {};

            // 1. LINK SIMPLES / THUMBNAIL
            if (block.type === "link_simple" || block.type === "link_thumbnail") {
              const url = asStr(config.url);
              const title = asStr(config.title, "Link sem título");
              const thumbnail = asStr(config.thumbnail_url);
              const borderRadius = asStr(config.borderRadius, "rounded-[24px]");
              const isPulse = config.animation === "pulse";

              return (
                <button
                  key={block.id}
                  className={cn(
                    "group w-full p-4 flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] relative overflow-hidden",
                    borderRadius,
                    isPulse && "animate-pulse"
                  )}
                  onClick={() => url && window.open(url, "_blank")}
                >
                  {thumbnail && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 text-center">
                    <span className="text-white font-bold tracking-tight">{title}</span>
                  </div>
                  <ExternalLink size={14} className="text-white/20 group-hover:text-white transition-colors" />
                </button>
              );
            }

            // 2. ÍCONES SOCIAIS
            if (block.type === "social_icons") {
              const links = Array.isArray(config.links) ? (config.links as SocialLink[]) : [];
              if (links.length === 0) {
                return isEditor ? (
                  <p key={block.id} className="text-center text-[10px] text-stone-600">
                    Configure seus ícones sociais
                  </p>
                ) : null;
              }
              return (
                <div key={block.id} className="flex flex-wrap justify-center gap-4 py-4">
                  {links.map((link, i) => {
                    const Icon = SOCIAL_ICONS[link.platform?.toLowerCase()] ?? Globe;
                    return (
                      <button
                        key={i}
                        onClick={() => link.url && window.open(link.url, "_blank")}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all hover:scale-110 active:scale-95 text-white/70 hover:text-white"
                        title={link.platform}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              );
            }

            // 3. IMAGEM
            if (block.type === "image") {
              const imageUrl = asStr(config.imageUrl);
              if (!imageUrl) {
                return isEditor ? (
                  <div key={block.id} className="aspect-video bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-xs text-stone-600">
                    Placeholder de Imagem
                  </div>
                ) : null;
              }
              return (
                <div key={block.id} className="w-full overflow-hidden rounded-[24px] border border-white/10 shadow-2xl">
                  <img src={imageUrl} alt="" className="w-full h-auto object-cover" />
                </div>
              );
            }

            // 4. VÍDEO EMBED
            if (block.type === "video_embed") {
              const rawUrl = asStr(config.videoUrl);
              const embedUrl = rawUrl.replace("watch?v=", "embed/");
              return (
                <div key={block.id} className="w-full aspect-video rounded-[24px] overflow-hidden border border-white/10 bg-black relative group shadow-2xl">
                  <div className="p-2 absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={48} className="text-white fill-white" />
                  </div>
                  {embedUrl && (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      title="Video embed"
                    />
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* ── Branding Footer ──────────────────────────────────────────── */}
        {!isEditor && (
          <div className="pt-20 pb-12 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Criado com</span>
              <span className="text-xs text-white font-black tracking-tighter">SIMWORK</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
