import { z } from "zod";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export const BIO_LINK_RESERVED_SLUGS = [
  "api",
  "app",
  "auth",
  "b",
  "dashboard",
  "onboarding",
  "settings",
  "workspace",
  "workspaces",
] as const;

export type BioLinkBlockSize = "S" | "M" | "L" | "XL" | "F";
export type BioLinkBlockCategory =
  | "links"
  | "social"
  | "media"
  | "contact"
  | "commerce"
  | "proof"
  | "interactive";

export type BioLinkBlockType =
  | "link_simple"
  | "link_thumbnail"
  | "link_stack"
  | "feature_link"
  | "social_icons"
  | "video_embed"
  | "spotify_embed"
  | "image"
  | "rich_text"
  | "newsletter"
  | "contact_form"
  | "whatsapp"
  | "map"
  | "stats"
  | "countdown"
  | "faq";

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "x"
  | "linkedin"
  | "pinterest"
  | "github"
  | "whatsapp"
  | "telegram"
  | "spotify"
  | "threads"
  | "custom";

export const socialPlatformLabel: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  github: "GitHub",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  spotify: "Spotify",
  threads: "Threads",
  custom: "Custom",
};

export type BackgroundType = "solid" | "gradient" | "image" | "video" | "gif" | "pattern" | "mesh";
export type ButtonStyle = "filled" | "hollow" | "soft_shadow" | "3d" | "glossy";
export type CardStyle = "rounded" | "sharp" | "glassmorphism" | "flat" | "elevated";
export type AvatarBorderStyle = "none" | "solid" | "gradient" | "glow" | "animated_gradient";

export const socialLinkSchema = z.object({
  platform: z.enum([
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "x",
    "linkedin",
    "pinterest",
    "github",
    "whatsapp",
    "telegram",
    "spotify",
    "threads",
    "custom",
  ]),
  label: z.string().default(""),
  url: z.string().default(""),
  icon: z.string().optional(),
});

export const visibilityRuleSchema = z.object({
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  lockPassword: z.string().nullable().optional(),
});

export const backgroundConfigSchema = z.object({
  type: z.enum(["solid", "gradient", "image", "video", "gif", "pattern", "mesh"]).default("gradient"),
  color: z.string().default("#0f172a"),
  gradientFrom: z.string().default("#111827"),
  gradientTo: z.string().default("#312e81"),
  gradientAngle: z.number().default(135),
  mediaUrl: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  blur: z.number().default(0),
});

export const themeTokenSchema = z.object({
  primaryColor: z.string().default("#2563eb"),
  secondaryColor: z.string().default("#0f172a"),
  accentColor: z.string().default("#f97316"),
  textColor: z.string().default("#f8fafc"),
  mutedTextColor: z.string().default("rgba(248,250,252,0.72)"),
  cardBackground: z.string().default("rgba(15,23,42,0.72)"),
  cardBorderColor: z.string().default("rgba(255,255,255,0.10)"),
  buttonStyle: z.enum(["filled", "hollow", "soft_shadow", "3d", "glossy"]).default("filled"),
  buttonRadius: z.number().default(18),
  cardStyle: z.enum(["rounded", "sharp", "glassmorphism", "flat", "elevated"]).default("glassmorphism"),
  fontHeading: z.string().default("Syne"),
  fontBody: z.string().default("Inter"),
  avatarBorderStyle: z.enum(["none", "solid", "gradient", "glow", "animated_gradient"]).default("gradient"),
});

export type SocialLink = z.infer<typeof socialLinkSchema>;
export type BioLinkVisibilityRules = z.infer<typeof visibilityRuleSchema>;
export type BioLinkBackgroundConfig = z.infer<typeof backgroundConfigSchema>;
export type BioLinkThemeTokens = z.infer<typeof themeTokenSchema>;

export type BioLinkRow = Tables<"bio_links">;
export type BioLinkInsert = TablesInsert<"bio_links">;
export type BioLinkUpdate = TablesUpdate<"bio_links">;
export type BioLinkBlockRow = Tables<"bio_link_blocks">;
export type BioLinkBlockInsert = TablesInsert<"bio_link_blocks">;
export type BioLinkVersionRow = Tables<"bio_link_versions">;
export type PublicPageEventRow = Tables<"public_page_events">;
export type CrmContactRow = Tables<"crm_contacts">;
export type CrmMessageRow = Tables<"crm_messages">;
export type CrmBookingRow = Tables<"crm_bookings">;
export type CrmEventRegistrationRow = Tables<"crm_event_registrations">;
export type CrmDownloadRow = Tables<"crm_downloads">;
export type CrmCampaignRow = Tables<"crm_campaigns">;

export type BioLinkBlockConfig = Record<string, Json | undefined>;

export type BioLinkBlock = {
  id: string;
  type: BioLinkBlockType;
  size: BioLinkBlockSize;
  position: number;
  isVisible: boolean;
  draftOnly: boolean;
  layoutSlot: string | null;
  visibilityRules: BioLinkVisibilityRules;
  config: BioLinkBlockConfig;
};

export type BioLinkPublicSnapshot = {
  id: string;
  workspaceId: string;
  slug: string;
  status: string;
  displayName: string;
  username: string;
  bioText: string;
  avatarUrl: string | null;
  headerConfig: Record<string, Json | undefined>;
  background: BioLinkBackgroundConfig;
  themeKey: string;
  themeTokens: BioLinkThemeTokens;
  layoutTemplateKey: string;
  socialLinks: SocialLink[];
  cta: {
    enabled: boolean;
    text: string;
    url: string;
  };
  seo: {
    title: string;
    description: string;
    imageUrl: string | null;
  };
  tracking: {
    metaPixelId: string | null;
    ga4MeasurementId: string | null;
    tiktokPixelId: string | null;
    gtmId: string | null;
  };
  blocks: BioLinkBlock[];
  publishedAt: string | null;
};

const faqItemSchema = z.object({
  question: z.string().default("Pergunta"),
  answer: z.string().default("Resposta"),
});

const statItemSchema = z.object({
  value: z.string().default("120+"),
  label: z.string().default("Clientes"),
  suffix: z.string().default(""),
});

const linkItemSchema = z.object({
  id: z.string().default(""),
  title: z.string().default("Link"),
  subtitle: z.string().default(""),
  url: z.string().default(""),
  icon: z.string().default("Link2"),
});

export type BioLinkBlockDefinition = {
  type: BioLinkBlockType;
  label: string;
  category: BioLinkBlockCategory;
  description: string;
  sizes: BioLinkBlockSize[];
  defaultSize: BioLinkBlockSize;
  schema: z.ZodType<BioLinkBlockConfig>;
  createConfig: () => BioLinkBlockConfig;
  trackable?: boolean;
  collectsContact?: boolean;
  supportsScheduling?: boolean;
  requiresOAuth?: boolean;
  proOnly?: boolean;
};

const makeDefinition = (
  definition: Omit<BioLinkBlockDefinition, "schema"> & { schema: z.ZodObject<Record<string, z.ZodTypeAny>> },
): BioLinkBlockDefinition => ({
  ...definition,
  schema: definition.schema as unknown as z.ZodType<BioLinkBlockConfig>,
});

export const BIO_LINK_BLOCK_DEFINITIONS: BioLinkBlockDefinition[] = [
  makeDefinition({
    type: "link_simple",
    label: "Link simples",
    category: "links",
    description: "CTA com ícone, título e subtítulo opcional.",
    sizes: ["XL", "F"],
    defaultSize: "XL",
    trackable: true,
    supportsScheduling: true,
    schema: z.object({
      title: z.string().default("Novo link"),
      subtitle: z.string().default("Descrição curta"),
      url: z.string().default("https://"),
      icon: z.string().default("Link2"),
      buttonText: z.string().default("Abrir"),
    }),
    createConfig: () => ({
      title: "Novo link",
      subtitle: "Descrição curta",
      url: "https://",
      icon: "Link2",
      buttonText: "Abrir",
    }),
  }),
  makeDefinition({
    type: "link_thumbnail",
    label: "Link com thumbnail",
    category: "links",
    description: "Card com imagem lateral ou superior.",
    sizes: ["M", "L", "XL", "F"],
    defaultSize: "L",
    trackable: true,
    supportsScheduling: true,
    schema: z.object({
      title: z.string().default("Lançamento"),
      subtitle: z.string().default("Descrição curta"),
      url: z.string().default("https://"),
      imageUrl: z.string().default(""),
      imagePosition: z.enum(["left", "top"]).default("top"),
      icon: z.string().default("Image"),
    }),
    createConfig: () => ({
      title: "Lançamento",
      subtitle: "Descrição curta",
      url: "https://",
      imageUrl: "",
      imagePosition: "top",
      icon: "Image",
    }),
  }),
  makeDefinition({
    type: "link_stack",
    label: "Grupo de links",
    category: "links",
    description: "Container expansível com múltiplos sublinks.",
    sizes: ["F"],
    defaultSize: "F",
    trackable: true,
    supportsScheduling: true,
    schema: z.object({
      title: z.string().default("Links"),
      collapsed: z.boolean().default(false),
      items: z.array(linkItemSchema).default([
        { id: crypto.randomUUID(), title: "Link 1", subtitle: "", url: "https://", icon: "Link2" },
      ]),
    }),
    createConfig: () => ({
      title: "Links",
      collapsed: false,
      items: [{ id: crypto.randomUUID(), title: "Link 1", subtitle: "", url: "https://", icon: "Link2" }],
    }),
  }),
  makeDefinition({
    type: "feature_link",
    label: "Link destaque",
    category: "links",
    description: "Card rico com capa, overlay e CTA.",
    sizes: ["L", "XL", "F"],
    defaultSize: "L",
    trackable: true,
    supportsScheduling: true,
    schema: z.object({
      title: z.string().default("Oferta principal"),
      subtitle: z.string().default("Explique o benefício em uma linha."),
      url: z.string().default("https://"),
      ctaText: z.string().default("Quero acessar"),
      imageUrl: z.string().default(""),
      overlayColor: z.string().default("rgba(15,23,42,0.45)"),
    }),
    createConfig: () => ({
      title: "Oferta principal",
      subtitle: "Explique o benefício em uma linha.",
      url: "https://",
      ctaText: "Quero acessar",
      imageUrl: "",
      overlayColor: "rgba(15,23,42,0.45)",
    }),
  }),
  makeDefinition({
    type: "social_icons",
    label: "Ícones sociais",
    category: "social",
    description: "Linha de redes com links oficiais.",
    sizes: ["XL", "F"],
    defaultSize: "XL",
    trackable: true,
    schema: z.object({
      title: z.string().default("Redes"),
      iconStyle: z.enum(["filled", "outline", "colored"]).default("filled"),
      iconSize: z.number().default(18),
      items: z.array(socialLinkSchema).default([
        { platform: "instagram", label: "Instagram", url: "" },
        { platform: "linkedin", label: "LinkedIn", url: "" },
      ]),
    }),
    createConfig: () => ({
      title: "Redes",
      iconStyle: "filled",
      iconSize: 18,
      items: [
        { platform: "instagram", label: "Instagram", url: "" },
        { platform: "linkedin", label: "LinkedIn", url: "" },
      ],
    }),
  }),
  makeDefinition({
    type: "video_embed",
    label: "Vídeo embed",
    category: "media",
    description: "YouTube, Vimeo, Loom ou Wistia.",
    sizes: ["L", "XL", "F"],
    defaultSize: "XL",
    trackable: true,
    schema: z.object({
      title: z.string().default("Vídeo"),
      url: z.string().default("https://youtube.com/watch?v="),
      aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      autoplay: z.boolean().default(false),
      muted: z.boolean().default(true),
    }),
    createConfig: () => ({
      title: "Vídeo",
      url: "https://youtube.com/watch?v=",
      aspectRatio: "16:9",
      autoplay: false,
      muted: true,
    }),
  }),
  makeDefinition({
    type: "spotify_embed",
    label: "Spotify embed",
    category: "media",
    description: "Track, playlist ou podcast do Spotify.",
    sizes: ["XL", "F"],
    defaultSize: "XL",
    trackable: true,
    schema: z.object({
      title: z.string().default("Spotify"),
      url: z.string().default("https://open.spotify.com/track/"),
      compact: z.boolean().default(true),
    }),
    createConfig: () => ({
      title: "Spotify",
      url: "https://open.spotify.com/track/",
      compact: true,
    }),
  }),
  makeDefinition({
    type: "image",
    label: "Imagem",
    category: "media",
    description: "Imagem, gif ou banner com link opcional.",
    sizes: ["S", "M", "L", "XL", "F"],
    defaultSize: "L",
    trackable: true,
    schema: z.object({
      title: z.string().default("Imagem"),
      imageUrl: z.string().default(""),
      altText: z.string().default(""),
      linkUrl: z.string().default(""),
      objectFit: z.enum(["cover", "contain", "fill"]).default("cover"),
      borderRadius: z.number().default(24),
    }),
    createConfig: () => ({
      title: "Imagem",
      imageUrl: "",
      altText: "",
      linkUrl: "",
      objectFit: "cover",
      borderRadius: 24,
    }),
  }),
  makeDefinition({
    type: "rich_text",
    label: "Texto rico",
    category: "media",
    description: "Bloco de texto com HTML básico.",
    sizes: ["XL", "F"],
    defaultSize: "F",
    schema: z.object({
      title: z.string().default("Texto"),
      bodyHtml: z.string().default("<p>Escreva aqui.</p>"),
      align: z.enum(["left", "center", "right"]).default("left"),
    }),
    createConfig: () => ({
      title: "Texto",
      bodyHtml: "<p>Escreva aqui.</p>",
      align: "left",
    }),
  }),
  makeDefinition({
    type: "newsletter",
    label: "Newsletter",
    category: "contact",
    description: "Captura de e-mail com consentimento.",
    sizes: ["XL", "F"],
    defaultSize: "F",
    trackable: true,
    collectsContact: true,
    schema: z.object({
      title: z.string().default("Entre na lista"),
      description: z.string().default("Receba novidades, campanhas e conteúdos da marca."),
      buttonText: z.string().default("Quero receber"),
      successMessage: z.string().default("Cadastro recebido com sucesso."),
      collectName: z.boolean().default(true),
      consentLabel: z.string().default("Concordo em receber comunicações por e-mail."),
    }),
    createConfig: () => ({
      title: "Entre na lista",
      description: "Receba novidades, campanhas e conteúdos da marca.",
      buttonText: "Quero receber",
      successMessage: "Cadastro recebido com sucesso.",
      collectName: true,
      consentLabel: "Concordo em receber comunicações por e-mail.",
    }),
  }),
  makeDefinition({
    type: "contact_form",
    label: "Formulário",
    category: "contact",
    description: "Mensagem com campos configuráveis.",
    sizes: ["XL", "F"],
    defaultSize: "F",
    trackable: true,
    collectsContact: true,
    schema: z.object({
      title: z.string().default("Fale com a marca"),
      description: z.string().default("Envie uma mensagem e retornaremos em breve."),
      showPhone: z.boolean().default(true),
      showSubject: z.boolean().default(true),
      successMessage: z.string().default("Mensagem enviada."),
      destinationEmail: z.string().default(""),
    }),
    createConfig: () => ({
      title: "Fale com a marca",
      description: "Envie uma mensagem e retornaremos em breve.",
      showPhone: true,
      showSubject: true,
      successMessage: "Mensagem enviada.",
      destinationEmail: "",
    }),
  }),
  makeDefinition({
    type: "whatsapp",
    label: "WhatsApp",
    category: "contact",
    description: "CTA direto para conversa.",
    sizes: ["M", "XL", "F"],
    defaultSize: "XL",
    trackable: true,
    schema: z.object({
      title: z.string().default("Falar no WhatsApp"),
      subtitle: z.string().default("Atendimento rápido"),
      phone: z.string().default("5511999999999"),
      message: z.string().default("Olá! Vim pelo seu Bio Link."),
    }),
    createConfig: () => ({
      title: "Falar no WhatsApp",
      subtitle: "Atendimento rápido",
      phone: "5511999999999",
      message: "Olá! Vim pelo seu Bio Link.",
    }),
  }),
  makeDefinition({
    type: "map",
    label: "Mapa",
    category: "contact",
    description: "Localização com rota rápida.",
    sizes: ["L", "XL", "F"],
    defaultSize: "XL",
    trackable: true,
    schema: z.object({
      title: z.string().default("Onde estamos"),
      address: z.string().default("São Paulo, Brasil"),
      placeName: z.string().default("Nosso endereço"),
      hours: z.string().default("Seg-Sex, 9h às 18h"),
    }),
    createConfig: () => ({
      title: "Onde estamos",
      address: "São Paulo, Brasil",
      placeName: "Nosso endereço",
      hours: "Seg-Sex, 9h às 18h",
    }),
  }),
  makeDefinition({
    type: "stats",
    label: "Stats",
    category: "proof",
    description: "Provas sociais e resultados.",
    sizes: ["XL", "F"],
    defaultSize: "XL",
    schema: z.object({
      title: z.string().default("Resultados"),
      items: z.array(statItemSchema).default([
        { value: "120+", label: "Clientes", suffix: "" },
        { value: "98%", label: "Satisfação", suffix: "" },
        { value: "24h", label: "Resposta", suffix: "" },
      ]),
    }),
    createConfig: () => ({
      title: "Resultados",
      items: [
        { value: "120+", label: "Clientes", suffix: "" },
        { value: "98%", label: "Satisfação", suffix: "" },
        { value: "24h", label: "Resposta", suffix: "" },
      ],
    }),
  }),
  makeDefinition({
    type: "countdown",
    label: "Countdown",
    category: "interactive",
    description: "Contagem regressiva para ofertas e lançamentos.",
    sizes: ["M", "L", "XL", "F"],
    defaultSize: "XL",
    trackable: true,
    schema: z.object({
      title: z.string().default("Lançamento"),
      subtitle: z.string().default("Faltam poucos dias."),
      targetDate: z.string().default(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      finishedMessage: z.string().default("Já está no ar."),
      redirectUrl: z.string().default(""),
    }),
    createConfig: () => ({
      title: "Lançamento",
      subtitle: "Faltam poucos dias.",
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      finishedMessage: "Já está no ar.",
      redirectUrl: "",
    }),
  }),
  makeDefinition({
    type: "faq",
    label: "FAQ",
    category: "interactive",
    description: "Perguntas frequentes em acordeão.",
    sizes: ["F"],
    defaultSize: "F",
    schema: z.object({
      title: z.string().default("Perguntas frequentes"),
      items: z.array(faqItemSchema).default([
        { question: "Como funciona?", answer: "Explique em uma resposta objetiva." },
      ]),
    }),
    createConfig: () => ({
      title: "Perguntas frequentes",
      items: [{ question: "Como funciona?", answer: "Explique em uma resposta objetiva." }],
    }),
  }),
];

export const BIO_LINK_BLOCKS_BY_TYPE = Object.fromEntries(
  BIO_LINK_BLOCK_DEFINITIONS.map((definition) => [definition.type, definition]),
) as Record<BioLinkBlockType, BioLinkBlockDefinition>;

export const BIO_LINK_THEMES = [
  {
    key: "brand-auto",
    label: "Brand Auto",
    description: "Deriva cores e fontes do Brand Kit com glass suave.",
    preview: "linear-gradient(135deg,#111827 0%,#312e81 100%)",
    background: { type: "gradient", color: "#111827", gradientFrom: "#111827", gradientTo: "#312e81", gradientAngle: 135, blur: 0 },
  },
  {
    key: "business-dark",
    label: "Dark Premium",
    description: "Visual escuro, premium e direto.",
    preview: "linear-gradient(135deg,#020617 0%,#111827 100%)",
    background: { type: "gradient", color: "#020617", gradientFrom: "#020617", gradientTo: "#111827", gradientAngle: 135, blur: 0 },
  },
  {
    key: "light-minimal",
    label: "Light Minimal",
    description: "Fundo claro com cards limpos e contraste forte.",
    preview: "linear-gradient(135deg,#ffffff 0%,#f1f5f9 100%)",
    background: { type: "gradient", color: "#ffffff", gradientFrom: "#ffffff", gradientTo: "#f1f5f9", gradientAngle: 135, blur: 0 },
  },
  {
    key: "artist-neon",
    label: "Neon Night",
    description: "Glow neon para creators, música e tech criativo.",
    preview: "linear-gradient(135deg,#030712 0%,#052e2b 100%)",
    background: { type: "gradient", color: "#030712", gradientFrom: "#030712", gradientTo: "#052e2b", gradientAngle: 135, blur: 0 },
  },
  {
    key: "gradient-vibe",
    label: "Gradient Vibe",
    description: "Mesh vibrante com cards claros translúcidos.",
    preview: "linear-gradient(135deg,#ef4444 0%,#fb7185 35%,#f59e0b 100%)",
    background: { type: "mesh", color: "#ef4444", gradientFrom: "#ef4444", gradientTo: "#f59e0b", gradientAngle: 135, blur: 0 },
  },
  {
    key: "earth-nature",
    label: "Nature & Earth",
    description: "Paleta orgânica e tipografia elegante.",
    preview: "linear-gradient(135deg,#556b2f 0%,#9f7c4a 100%)",
    background: { type: "gradient", color: "#556b2f", gradientFrom: "#556b2f", gradientTo: "#9f7c4a", gradientAngle: 135, blur: 0 },
  },
  {
    key: "corporate-blue",
    label: "Corporate Blue",
    description: "Leitura corporativa B2B com azul navy.",
    preview: "linear-gradient(135deg,#1e3a8a 0%,#1e293b 100%)",
    background: { type: "gradient", color: "#1e3a8a", gradientFrom: "#1e3a8a", gradientTo: "#1e293b", gradientAngle: 135, blur: 0 },
  },
  {
    key: "pastel-soft",
    label: "Pastel Soft",
    description: "Tons suaves para lifestyle, moda e beleza.",
    preview: "linear-gradient(135deg,#fdf2f8 0%,#ede9fe 100%)",
    background: { type: "gradient", color: "#fdf2f8", gradientFrom: "#fdf2f8", gradientTo: "#ede9fe", gradientAngle: 135, blur: 0 },
  },
] as const;

export const BIO_LINK_LAYOUT_TEMPLATES = [
  { key: "creator-standard", label: "Creator Standard", blocks: ["feature_link", "social_icons", "link_simple", "newsletter"] as BioLinkBlockType[] },
  { key: "business-professional", label: "Business Professional", blocks: ["social_icons", "stats", "contact_form", "map"] as BioLinkBlockType[] },
  { key: "artist", label: "Músico / Artista", blocks: ["feature_link", "spotify_embed", "video_embed", "countdown"] as BioLinkBlockType[] },
  { key: "store", label: "Loja / E-commerce", blocks: ["feature_link", "image", "link_stack", "whatsapp"] as BioLinkBlockType[] },
  { key: "coach", label: "Infoprodutor / Coach", blocks: ["video_embed", "stats", "newsletter", "faq"] as BioLinkBlockType[] },
  { key: "portfolio", label: "Portfolio / Agência", blocks: ["image", "rich_text", "stats", "contact_form"] as BioLinkBlockType[] },
  { key: "minimal", label: "Minimalista", blocks: ["link_simple", "link_simple", "link_simple", "social_icons"] as BioLinkBlockType[] },
  { key: "bento-ai", label: "Bento AI", blocks: ["feature_link", "stats", "link_thumbnail", "faq"] as BioLinkBlockType[] },
] as const;

const legacyTypeMap: Record<string, BioLinkBlockType> = {
  link: "link_simple",
  site_card: "feature_link",
  blog_card: "link_thumbnail",
  youtube: "video_embed",
  spotify: "spotify_embed",
  map: "map",
  newsletter: "newsletter",
};

export const getBioLinkThemeDefinition = (key?: string | null) =>
  BIO_LINK_THEMES.find((theme) => theme.key === key) || BIO_LINK_THEMES[0];

export const createBioLinkBlock = (type: BioLinkBlockType, position = 0): BioLinkBlock => {
  const definition = BIO_LINK_BLOCKS_BY_TYPE[type];
  return {
    id: crypto.randomUUID(),
    type,
    size: definition.defaultSize,
    position,
    isVisible: true,
    draftOnly: false,
    layoutSlot: null,
    visibilityRules: {},
    config: definition.createConfig(),
  };
};

export const isReservedBioLinkSlug = (value: string) => BIO_LINK_RESERVED_SLUGS.includes(value as (typeof BIO_LINK_RESERVED_SLUGS)[number]);

export const slugifyBioLink = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

export const safeJsonObject = (value: Json | null | undefined) =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, Json | undefined>) : {};

export const safeJsonArray = (value: Json | null | undefined) => (Array.isArray(value) ? value : []);

export const normalizeThemeTokens = (value: Json | null | undefined): BioLinkThemeTokens =>
  themeTokenSchema.parse(safeJsonObject(value));

export const normalizeBackgroundConfig = (value: Json | null | undefined): BioLinkBackgroundConfig =>
  backgroundConfigSchema.parse(safeJsonObject(value));

export const normalizeSocialLinks = (value: Json | null | undefined): SocialLink[] =>
  socialLinkSchema.array().parse(safeJsonArray(value));

export const normalizeBlockRow = (row: Partial<BioLinkBlockRow>): BioLinkBlock | null => {
  const type = (row.block_type || row.block_type === "" ? row.block_type : null) as BioLinkBlockType | null;
  if (!type || !BIO_LINK_BLOCKS_BY_TYPE[type]) return null;

  const definition = BIO_LINK_BLOCKS_BY_TYPE[type];
  const parsed = definition.schema.safeParse(safeJsonObject((row.config as Json | null | undefined) ?? null));

  return {
    id: row.id || crypto.randomUUID(),
    type,
    size: ((row.size as BioLinkBlockSize | null | undefined) || definition.defaultSize) as BioLinkBlockSize,
    position: row.position || 0,
    isVisible: row.is_visible !== false,
    draftOnly: row.draft_only === true,
    layoutSlot: row.layout_slot || null,
    visibilityRules: visibilityRuleSchema.parse(safeJsonObject((row.visibility_rules as Json | null | undefined) ?? null)),
    config: parsed.success ? parsed.data : definition.createConfig(),
  };
};

export const normalizeLegacyBlock = (value: Record<string, unknown>, position: number): BioLinkBlock | null => {
  const mappedType = legacyTypeMap[String(value.type || "link")] || "link_simple";
  const block = createBioLinkBlock(mappedType, position);

  if (mappedType === "link_simple") {
    block.config = {
      title: String(value.title || value.label || "Novo link"),
      subtitle: String(value.note || ""),
      url: String(value.url || ""),
      icon: String(value.emoji || "Link2"),
      buttonText: "Abrir",
    };
  } else if (mappedType === "feature_link") {
    block.config = {
      title: String(value.title || "Link destaque"),
      subtitle: String(value.note || ""),
      url: String(value.url || ""),
      ctaText: "Acessar",
      imageUrl: "",
      overlayColor: "rgba(15,23,42,0.45)",
    };
  } else if (mappedType === "link_thumbnail") {
    block.config = {
      title: String(value.title || "Destaque"),
      subtitle: String(value.note || ""),
      url: String(value.url || ""),
      imageUrl: "",
      imagePosition: "top",
      icon: String(value.emoji || "Image"),
    };
  } else if (mappedType === "video_embed") {
    block.config = {
      title: String(value.title || "Vídeo"),
      url: String(value.url || value.embedUrl || ""),
      aspectRatio: "16:9",
      autoplay: false,
      muted: true,
    };
  } else if (mappedType === "spotify_embed") {
    block.config = {
      title: String(value.title || "Spotify"),
      url: String(value.url || value.embedUrl || ""),
      compact: true,
    };
  } else if (mappedType === "map") {
    block.config = {
      title: String(value.title || "Localização"),
      address: String(value.note || value.url || ""),
      placeName: String(value.title || "Nosso endereço"),
      hours: "",
    };
  } else if (mappedType === "newsletter") {
    block.config = {
      title: String(value.title || "Entre na lista"),
      description: String(value.note || ""),
      buttonText: String(value.buttonLabel || "Quero receber"),
      successMessage: "Cadastro recebido com sucesso.",
      collectName: false,
      consentLabel: "Concordo em receber comunicações por e-mail.",
    };
  } else {
    return null;
  }

  return block;
};

export const normalizeBioLinkBlocks = (
  blockRows: Array<Partial<BioLinkBlockRow>> = [],
  legacyBlocks: Json | null | undefined = null,
  legacyLinks: Json | null | undefined = null,
): BioLinkBlock[] => {
  const normalizedRows = blockRows
    .map(normalizeBlockRow)
    .filter((item): item is BioLinkBlock => Boolean(item))
    .sort((a, b) => a.position - b.position);

  if (normalizedRows.length > 0) return normalizedRows;

  const normalizedLegacyBlocks = safeJsonArray(legacyBlocks)
    .map((item, index) => normalizeLegacyBlock(safeJsonObject(item), index))
    .filter((item): item is BioLinkBlock => Boolean(item));

  if (normalizedLegacyBlocks.length > 0) return normalizedLegacyBlocks;

  return safeJsonArray(legacyLinks)
    .map((item, index) => {
      const record = safeJsonObject(item);
      return {
        id: String(record.id || crypto.randomUUID()),
        type: "link_simple" as const,
        size: "XL" as const,
        position: index,
        isVisible: true,
        draftOnly: false,
        layoutSlot: null,
        visibilityRules: {},
        config: {
          title: String(record.label || `Link ${index + 1}`),
          subtitle: "",
          url: String(record.url || ""),
          icon: String(record.emoji || "Link2"),
          buttonText: "Abrir",
        },
      };
    });
};

export const serializeBlockForInsert = (
  bioLinkId: string,
  workspaceId: string,
  block: BioLinkBlock,
): BioLinkBlockInsert => ({
  id: block.id,
  bio_link_id: bioLinkId,
  workspace_id: workspaceId,
  block_type: block.type,
  size: block.size,
  config: block.config as Json,
  position: block.position,
  is_visible: block.isVisible,
  layout_slot: block.layoutSlot,
  visibility_rules: block.visibilityRules as Json,
  draft_only: block.draftOnly,
});

export const buildBioLinkSnapshot = (
  row: Pick<
    BioLinkRow,
    | "id"
    | "workspace_id"
    | "slug"
    | "status"
    | "display_name"
    | "username"
    | "bio_text"
    | "avatar_url"
    | "header_config"
    | "background_config"
    | "theme_key"
    | "theme_tokens"
    | "layout_template_key"
    | "social_links"
    | "cta_enabled"
    | "cta_text"
    | "cta_url"
    | "seo_title"
    | "seo_description"
    | "seo_image_url"
    | "meta_pixel_id"
    | "ga4_measurement_id"
    | "tiktok_pixel_id"
    | "gtm_id"
    | "published_at"
  >,
  blocks: BioLinkBlock[],
): BioLinkPublicSnapshot => ({
  id: row.id,
  workspaceId: row.workspace_id,
  slug: row.slug,
  status: row.status || "draft",
  displayName: row.display_name || row.slug,
  username: row.username || row.slug,
  bioText: row.bio_text || "",
  avatarUrl: row.avatar_url,
  headerConfig: safeJsonObject(row.header_config),
  background: normalizeBackgroundConfig(row.background_config),
  themeKey: row.theme_key || "brand-auto",
  themeTokens: normalizeThemeTokens(row.theme_tokens),
  layoutTemplateKey: row.layout_template_key || "creator-standard",
  socialLinks: normalizeSocialLinks(row.social_links),
  cta: {
    enabled: row.cta_enabled === true,
    text: row.cta_text || "",
    url: row.cta_url || "",
  },
  seo: {
    title: row.seo_title || row.display_name || row.slug,
    description: row.seo_description || row.bio_text || "",
    imageUrl: row.seo_image_url,
  },
  tracking: {
    metaPixelId: row.meta_pixel_id,
    ga4MeasurementId: row.ga4_measurement_id,
    tiktokPixelId: row.tiktok_pixel_id,
    gtmId: row.gtm_id,
  },
  blocks,
  publishedAt: row.published_at,
});

export const buildDefaultThemeTokens = (brandKit?: {
  color_primary?: string | null;
  color_secondary?: string | null;
  color_accent?: string | null;
  font_headline?: string | null;
  font_body?: string | null;
} | null): BioLinkThemeTokens =>
  themeTokenSchema.parse({
    primaryColor: brandKit?.color_primary || "#2563eb",
    secondaryColor: brandKit?.color_secondary || "#0f172a",
    accentColor: brandKit?.color_accent || "#f97316",
    fontHeading: brandKit?.font_headline || "Syne",
    fontBody: brandKit?.font_body || "Inter",
  });

export const buildDefaultBioLinkDraft = (params: {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug?: string | null;
  brandKit?: {
    logo_url?: string | null;
    color_primary?: string | null;
    color_secondary?: string | null;
    color_accent?: string | null;
    font_headline?: string | null;
    font_body?: string | null;
  } | null;
  briefing?: {
    company_name?: string | null;
    instagram_handle?: string | null;
    main_differentials?: string | null;
    tone_of_voice?: string | null;
  } | null;
}): { bioLink: BioLinkInsert; blocks: BioLinkBlock[] } => {
  const slug = slugifyBioLink(
    params.briefing?.instagram_handle?.replace("@", "") ||
      params.briefing?.company_name ||
      params.workspaceSlug ||
      params.workspaceName,
  );

  const starterBlocks: BioLinkBlock[] = [
    {
      ...createBioLinkBlock("feature_link", 0),
      config: {
        title: "Oferta principal",
        subtitle: "Leve a audiência para a sua melhor conversão.",
        url: "https://",
        ctaText: "Acessar agora",
        imageUrl: params.brandKit?.logo_url || "",
        overlayColor: "rgba(15,23,42,0.45)",
      },
    },
    {
      ...createBioLinkBlock("social_icons", 1),
      config: {
        title: "Redes",
        iconStyle: "filled",
        iconSize: 18,
        items: [
          { platform: "instagram", label: "Instagram", url: params.briefing?.instagram_handle ? `https://instagram.com/${params.briefing.instagram_handle.replace("@", "")}` : "" },
          { platform: "linkedin", label: "LinkedIn", url: "" },
        ],
      },
    },
    createBioLinkBlock("link_simple", 2),
    createBioLinkBlock("newsletter", 3),
  ];

  const themeTokens = buildDefaultThemeTokens(params.brandKit);

  return {
    bioLink: {
      workspace_id: params.workspaceId,
      slug,
      status: "draft",
      display_name: params.briefing?.company_name || params.workspaceName,
      username: slug,
      bio_text: params.briefing?.main_differentials || "",
      avatar_url: params.brandKit?.logo_url || null,
      header_config: {
        showSocialIcons: true,
        showPrimaryCta: false,
        tone: params.briefing?.tone_of_voice || "",
      } as Json,
      background_config: getBioLinkThemeDefinition("brand-auto").background as Json,
      theme_key: "brand-auto",
      theme_tokens: themeTokens as Json,
      layout_template_key: "creator-standard",
      social_links: starterBlocks[1].config.items as Json,
      cta_enabled: false,
      cta_text: null,
      cta_url: null,
      seo_title: params.briefing?.company_name || params.workspaceName,
      seo_description: params.briefing?.main_differentials || "",
      seo_image_url: params.brandKit?.logo_url || null,
      meta_pixel_id: null,
      ga4_measurement_id: null,
      tiktok_pixel_id: null,
      gtm_id: null,
    },
    blocks: starterBlocks,
  };
};

export const getBioLinkBlockDefinition = (type: BioLinkBlockType) => BIO_LINK_BLOCKS_BY_TYPE[type];
