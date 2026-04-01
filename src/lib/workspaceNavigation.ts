import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Aperture,
  BookText,
  Bot,
  FileText,
  Globe,
  Grid2x2,
  Images,
  Layers3,
  Link2,
  MessageSquare,
  MonitorSmartphone,
  Newspaper,
  Palette,
  Presentation,
  Settings,
  Sparkles,
  Wand2,
} from "lucide-react";

export type WorkspaceNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  section: "Principal" | "Criacao" | "Workspace" | "Sistema";
  description?: string;
};

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  { label: "Dashboard", path: "dashboard", icon: Grid2x2, section: "Principal", description: "Visao geral do workspace" },
  { label: "News Portal", path: "news-portal", icon: Newspaper, section: "Principal", description: "Oportunidades editoriais e RSS" },
  { label: "Blog Manager", path: "blog-manager", icon: BookText, section: "Principal", description: "Rascunhos e artigos do workspace" },
  { label: "Biblioteca", path: "library", icon: Images, section: "Principal", description: "Posts, assets e historico" },

  { label: "Post Rapido", path: "generator", icon: Wand2, section: "Criacao", description: "Gerador principal de posts" },
  { label: "Carousel Builder", path: "carousel-builder", icon: Layers3, section: "Criacao", description: "Storyboards e carrosseis" },
  { label: "Prompt Studio", path: "image-prompts", icon: Sparkles, section: "Criacao", description: "Prompts e geracao visual" },
  { label: "Product Shots", path: "product-shots", icon: Aperture, section: "Criacao", description: "Fotos e composicoes de produto" },
  { label: "Feed Preview", path: "feed-preview", icon: MonitorSmartphone, section: "Criacao", description: "Preview de feed e posts" },
  { label: "Slides", path: "slides", icon: Presentation, section: "Criacao", description: "Apresentacoes e decks" },
  { label: "Web Cloner", path: "web-cloner", icon: Globe, section: "Criacao", description: "Clonagem visual e estrutura de paginas" },
  { label: "VibeCoder", path: "vibe-coder", icon: Bot, section: "Criacao", description: "Builder multi-file com preview live" },

  { label: "Briefing", path: "briefing", icon: FileText, section: "Workspace", description: "Contexto e estrategia da marca" },
  { label: "Brand Kit", path: "brand-kit", icon: Palette, section: "Workspace", description: "Cores, logo e identidade visual" },
  { label: "Brand DNA", path: "brand-dna", icon: Activity, section: "Workspace", description: "Templates e DNA competitivo" },
  { label: "Brand Character", path: "brand-character", icon: Bot, section: "Workspace", description: "Personagens e consistencia visual" },
  { label: "Bio Link", path: "biolink", icon: Link2, section: "Workspace", description: "Pagina publica de links e embeds" },
  { label: "Viral Analyzer", path: "viral-analyzer", icon: Activity, section: "Workspace", description: "Padroes virais e referencias" },

  { label: "Chat IA", path: "chat", icon: MessageSquare, section: "Sistema", description: "Chat de squad e criacao guiada" },
  { label: "Configuracoes", path: "settings", icon: Settings, section: "Sistema", description: "APIs, RSS e preferencias" },
];

export const WORKSPACE_NAV_GROUPS = [
  { label: "Principal", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Principal") },
  { label: "Criacao", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Criacao") },
  { label: "Workspace", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Workspace") },
  { label: "Sistema", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Sistema") },
] as const;

export const getWorkspaceRouteMeta = (pathname: string) => {
  const match = pathname.match(/\/workspace\/[^/]+\/([^/?#]+)/);
  const path = match?.[1] || "dashboard";
  return WORKSPACE_NAV_ITEMS.find((item) => item.path === path) || WORKSPACE_NAV_ITEMS[0];
};

