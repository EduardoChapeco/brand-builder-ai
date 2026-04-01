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
  section: "Painel" | "Estrategia" | "Inteligencia" | "Estudio Criativo" | "Gestao" | "Sistema";
  description?: string;
};

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  { label: "Dashboard", path: "dashboard", icon: Grid2x2, section: "Painel", description: "Visao geral do workspace" },

  { label: "Briefing", path: "briefing", icon: FileText, section: "Estrategia", description: "Contexto e estrategia da marca" },
  { label: "Brand Kit", path: "brand-kit", icon: Palette, section: "Estrategia", description: "Cores, logo e identidade visual" },
  { label: "DNA Competitivo", path: "brand-dna", icon: Activity, section: "Estrategia", description: "Templates e DNA competitivo" },
  { label: "Personas (Character)", path: "brand-character", icon: Bot, section: "Estrategia", description: "Personagens e consistencia visual" },
  { label: "Bio Link Integrado", path: "biolink", icon: Link2, section: "Estrategia", description: "Pagina publica de links e embeds" },

  { label: "News Portal RSS", path: "news-portal", icon: Newspaper, section: "Inteligencia", description: "Oportunidades editoriais e RSS" },
  { label: "Viral Analyzer", path: "viral-analyzer", icon: Activity, section: "Inteligencia", description: "Padroes virais e referencias" },
  { label: "Squad de IA (Chat)", path: "chat", icon: MessageSquare, section: "Inteligencia", description: "Chat de squad e criacao guiada" },

  { label: "Gerador de Posts", path: "generator", icon: Wand2, section: "Estudio Criativo", description: "Gerador principal de posts" },
  { label: "Carousel Builder", path: "carousel-builder", icon: Layers3, section: "Estudio Criativo", description: "Storyboards e carrosseis" },
  { label: "Slides & Decks", path: "slides", icon: Presentation, section: "Estudio Criativo", description: "Apresentacoes prontas" },
  { label: "Image Studio", path: "image-prompts", icon: Sparkles, section: "Estudio Criativo", description: "Prompts e geracao visual" },
  { label: "Product Shots", path: "product-shots", icon: Aperture, section: "Estudio Criativo", description: "Fotos de produto perfeitas" },
  { label: "Web Cloner", path: "web-cloner", icon: Globe, section: "Estudio Criativo", description: "Clonagem de paginas" },
  { label: "VibeCoder", path: "vibe-coder", icon: Bot, section: "Estudio Criativo", description: "Builder multi-file" },

  { label: "Feed Preview", path: "feed-preview", icon: MonitorSmartphone, section: "Gestao", description: "Preview e mockups de feed" },
  { label: "Blog Manager", path: "blog-manager", icon: BookText, section: "Gestao", description: "Artigos e SEO" },
  { label: "Biblioteca Geral", path: "library", icon: Images, section: "Gestao", description: "Arquivos, imagens e posts gerados" },

  { label: "Configuracoes", path: "settings", icon: Settings, section: "Sistema", description: "APIs e preferencias" },
];

export const WORKSPACE_NAV_GROUPS = [
  { label: "Painel", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Painel") },
  { label: "Estrategia e DNA", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Estrategia") },
  { label: "Inteligencia", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Inteligencia") },
  { label: "Estudio Criativo", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Estudio Criativo") },
  { label: "Recursos e Gestao", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Gestao") },
] as const;

export const getWorkspaceRouteMeta = (pathname: string) => {
  const match = pathname.match(/\/workspace\/[^/]+\/([^/?#]+)/);
  const path = match?.[1] || "dashboard";
  return WORKSPACE_NAV_ITEMS.find((item) => item.path === path) || WORKSPACE_NAV_ITEMS[0];
};

