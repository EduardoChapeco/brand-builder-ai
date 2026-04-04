import { z } from "zod";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { 
  Link2, 
  Image as ImageIcon, 
  LayoutGrid, 
  Video, 
  Music, 
  Mail, 
  MessageSquare, 
  MapPin, 
  BarChart3, 
  Timer, 
  HelpCircle,
  LucideIcon
} from "lucide-react";

export const BIO_LINK_RESERVED_SLUGS = [
  "api", "app", "auth", "b", "dashboard", "onboarding", "settings", "workspace", "workspaces"
] as const;

export type BioLinkBlockType =
  | "link_simple" | "link_thumbnail" | "link_stack" | "feature_link" | "social_icons"
  | "video_embed" | "spotify_embed" | "image" | "rich_text" | "newsletter"
  | "contact_form" | "whatsapp" | "map" | "stats" | "countdown" | "faq";

export type BioLinkBlockCategory = "links" | "social" | "media" | "contact" | "proof" | "interactive";
export type BioLinkBlockSize = "S" | "M" | "L" | "XL" | "F";
export type BackgroundType = "solid" | "gradient" | "image" | "video" | "pattern" | "mesh";

export interface BioLinkBlockDefinition {
  type: BioLinkBlockType;
  label: string;
  description: string;
  icon?: LucideIcon;
  category: BioLinkBlockCategory;
  defaultSize?: BioLinkBlockSize;
}

export interface BioLinkTheme {
  key: string;
  label: string;
  name: string;
  description: string;
  preview: string;
  background: {
    type: BackgroundType;
    value: string;
    overlay?: number;
  };
  cssVars: Record<string, string>;
}

export interface BioLinkBlock {
  id: string;
  type: BioLinkBlockType;
  isVisible: boolean;
  config: any;
}

export const BIO_LINK_BLOCK_DEFINITIONS: BioLinkBlockDefinition[] = [
  {
    type: "link_simple",
    label: "Link Simples",
    description: "Botão clássico de redirecionamento.",
    icon: Link2,
    category: "links",
    defaultSize: "XL"
  },
  {
    type: "image",
    label: "Imagem",
    description: "Banner ou imagem de destaque.",
    icon: ImageIcon,
    category: "media",
    defaultSize: "L"
  },
  {
    type: "social_icons",
    label: "Redes Sociais",
    description: "Linha de ícones das suas redes.",
    icon: Link2,
    category: "social",
    defaultSize: "XL"
  },
  {
    type: "video_embed",
    label: "Vídeo",
    description: "YouTube ou Vimeo.",
    icon: Video,
    category: "media",
    defaultSize: "XL"
  }
];

export const BIO_LINK_THEMES: Record<string, BioLinkTheme> = {
  "brand-auto": {
    key: "brand-auto",
    label: "Brand Auto",
    name: "Brand Auto",
    description: "Cores do seu Brand Kit.",
    preview: "linear-gradient(135deg, #111827 0%, #312e81 100%)",
    background: { type: "gradient", value: "linear-gradient(135deg, #0f172a 0%, #111 100%)" },
    cssVars: { "--primary": "#3b82f6", "--bg-canvas": "#0f172a" }
  },
  "dark-minimal": {
    key: "dark-minimal",
    label: "Dark Minimal",
    name: "Dark Minimal",
    description: "Preto profundo.",
    preview: "#000",
    background: { type: "solid", value: "#000" },
    cssVars: { "--primary": "#fff", "--bg-canvas": "#000" }
  }
};

export const getBioLinkBlockDefinition = (type: BioLinkBlockType) => 
  BIO_LINK_BLOCK_DEFINITIONS.find(d => d.type === type) || BIO_LINK_BLOCK_DEFINITIONS[0];

export const getBioLinkThemeDefinition = (key: string) => 
  BIO_LINK_THEMES[key] || BIO_LINK_THEMES["brand-auto"];
