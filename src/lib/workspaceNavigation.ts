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

  { label: "Dashboard", path: "dashboard", icon: Grid2x2, section: "Painel", description: "Visão geral e recomendações do workspace" },

  { label: "Bio Link Oficial", path: "biolink", icon: Link2, section: "Publicacoes", description: "Link da bio — hub central da marca" },
  { label: "Site Institucional", path: "site-builder", icon: Globe, section: "Publicacoes", description: "Construtor de sites com scroll 3D" },
  { label: "Blog Manager", path: "blog-manager", icon: BookText, section: "Publicacoes", description: "Artigos SEO conectados ao briefing" },
  { label: "News Portal RSS", path: "news-portal", icon: Newspaper, section: "Publicacoes", description: "Curadoria de notícias em 1 clique" },

  { label: "Briefing", path: "briefing", icon: FileText, section: "Estrategia", description: "Contexto, estratégia e posicionamento" },
  { label: "Brand Kit", path: "brand-kit", icon: Palette, section: "Estrategia", description: "Cores, logo e identidade visual completa" },
  { label: "Cérebro da Marca (DNA)", path: "brand-dna", icon: Activity, section: "Estrategia", description: "Templates competitivos e DNA editorial" },
  { label: "Personagem da Marca", path: "brand-character", icon: Bot, section: "Estrategia", description: "Character visual com consistência por IA" },

  { label: "Viral Analyzer", path: "viral-analyzer", icon: Activity, section: "Inteligencia", description: "Padrões virais mapeados pela IA" },
  { label: "SimLab", path: "simlab", icon: ShieldCheck, section: "Inteligencia", description: "Simula como sua audiência reage antes de publicar" },
  { label: "Squad Builder", path: "squads", icon: Bot, section: "Inteligencia", description: "Agentes de IA configurados por objetivo" },
  { label: "Squad de IA (Chat)", path: "chat", icon: MessageSquare, section: "Inteligencia", description: "Chat com squads especializados" },

  { label: "Gerador de Posts", path: "generator", icon: Wand2, section: "Estudio Criativo", description: "Posts com templates da marca" },
  { label: "Carousel Builder", path: "carousel-builder", icon: Layers3, section: "Estudio Criativo", description: "Carrosséis com storyboard por IA" },
  { label: "Slides & Decks", path: "slides", icon: Presentation, section: "Estudio Criativo", description: "Apresentações e pitch decks" },
  { label: "Image Studio", path: "image-prompts", icon: Sparkles, section: "Estudio Criativo", description: "Geração de imagens com IA" },
  { label: "Product Shots", path: "product-shots", icon: Aperture, section: "Estudio Criativo", description: "Fotos de produto profissionais" },
  { label: "Web Cloner", path: "web-cloner", icon: MonitorSmartphone, section: "Estudio Criativo", description: "Clone e recrie páginas de destino" },
  { label: "VibeCoder", path: "vibe-coder", icon: Bot, section: "Estudio Criativo", description: "Builder de sites multi-arquivo" },

  { label: "Feed Preview", path: "feed-preview", icon: Grid2x2, section: "Gestao", description: "Visualize o grid do feed antes de publicar" },
  { label: "Biblioteca Geral", path: "library", icon: Images, section: "Gestao", description: "Arquivos, imagens e posts gerados" },

  { label: "Configurações", path: "settings", icon: Settings, section: "Sistema", description: "APIs, chaves e preferências" },
];

export const WORKSPACE_NAV_GROUPS = [
  { label: "Início", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Painel") },
  { label: "Publicações & Portais", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Publicacoes") },
  { label: "Identidade da Marca", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Estrategia") },
  { label: "Inteligência & IA", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Inteligencia") },
  { label: "Estúdio Criativo", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Estudio Criativo") },
  { label: "Biblioteca", items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === "Gestao") },
] as const;

export const getWorkspaceRouteMeta = (pathname: string) => {
  const match = pathname.match(/\/workspace\/[^/]+\/([^/?#]+)/);
  const path = match?.[1] || "dashboard";
  return WORKSPACE_NAV_ITEMS.find((item) => item.path === path) || WORKSPACE_NAV_ITEMS[0];
};
