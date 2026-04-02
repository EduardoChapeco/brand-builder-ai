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
  ShieldCheck,
  Settings,
  Sparkles,
  Wand2,
} from "lucide-react";

export type WorkspaceNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  section: "Painel" | "Publicacoes" | "Estrategia" | "Inteligencia" | "Estudio Criativo" | "Gestao" | "Sistema";
  description?: string;
};

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [

  { label: "Dashboard", path: "dashboard", icon: Grid2x2, section: "Painel", description: "Visao geral do workspace" },

  { label: "Bio Link Oficial", path: "biolink", icon: Link2, section: "Publicacoes", description: "Link da bio centralizador (Agregador)" },
  { label: "Site Institucional", path: "site-builder", icon: Globe, section: "Publicacoes", description: "Construtor de sites multiplas paginas" },
  { label: "Blog Manager", path: "blog-manager", icon: BookText, section: "Publicacoes", description: "Artigos e portal de conteudos" },
  { label: "News Portal RSS", path: "news-portal", icon: Newspaper, section: "Publicacoes", description: "Curadoria de noticias para o site" },

  { label: "Briefing", path: "briefing", icon: FileText, section: "Estrategia", description: "Contexto e estrategia da marca" },
  { label: "Brand Kit", path: "brand-kit", icon: Palette, section: "Estrategia", description: "Cores, logo e identidade visual" },
  { label: "DNA Competitivo", path: "brand-dna", icon: Activity, section: "Estrategia", description: "Templates e DNA competitivo" },
  { label: "Personas (Character)", path: "brand-character", icon: Bot, section: "Estrategia", description: "Personagens e consistencia visual" },

  { label: "Viral Analyzer", path: "viral-analyzer", icon: Activity, section: "Inteligencia", description: "Padroes virais e referencias" },
  { label: "SimLab", path: "simlab", icon: ShieldCheck, section: "Inteligencia", description: "Simula como sua audiência reage antes de publicar" },
  { label: "Squad Builder", path: "squads", icon: Bot, section: "Inteligencia", description: "Onboarding e catalogo de squads" },
  { label: "Squad de IA (Chat)", path: "chat", icon: MessageSquare, section: "Inteligencia", description: "Chat de squad e criacao guiada" },

  { label: "Gerador de Posts", path: "generator", icon: Wand2, section: "Estudio Criativo", description: "Gerador principal de posts" },
  { label: "Carousel Builder", path: "carousel-builder", icon: Layers3, section: "Estudio Criativo", description: "Storyboards e carrosseis" },
  { label: "Slides & Decks", path: "slides", icon: Presentation, section: "Estudio Criativo", description: "Apresentacoes prontas" },
  { label: "Image Studio", path: "image-prompts", icon: Sparkles, section: "Estudio Criativo", description: "Prompts e geracao visual" },
  { label: "Product Shots", path: "product-shots", icon: Aperture, section: "Estudio Criativo", description: "Fotos de produto perfeitas" },
  { label: "Web Cloner", path: "web-cloner", icon: MonitorSmartphone, section: "Estudio Criativo", description: "Clonagem magic de landing pages" },
  { label: "VibeCoder", path: "vibe-coder", icon: Bot, section: "Estudio Criativo", description: "Builder multi-file" },

  { label: "Feed Preview", path: "feed-preview", icon: Grid2x2, section: "Gestao", description: "Preview e mockups de feed" },
  { label: "Biblioteca Geral", path: "library", icon: Images, section: "Gestao", description: "Arquivos, imagens e posts gerados" },

  { label: "Configuracoes", path: "settings", icon: Settings, section: "Sistema", description: "APIs e preferencias" },
];

export const WORKSPACE_NAV_GROUPS = [
  { label: "Destaques & Metricas", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Painel") },
  { label: "Portais & Publicacoes", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Publicacoes") },
  { label: "Arquitetura da Marca", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Estrategia") },
  { label: "Pesquisa Externa", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Inteligencia") },
  { label: "Motores Generativos", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Estudio Criativo") },
  { label: "Armazenamento", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Gestao") },
] as const;

export const getWorkspaceRouteMeta = (pathname: string) => {
  const match = pathname.match(/\/workspace\/[^/]+\/([^/?#]+)/);
  const path = match?.[1] || "dashboard";
  return WORKSPACE_NAV_ITEMS.find((item) => item.path === path) || WORKSPACE_NAV_ITEMS[0];
};
