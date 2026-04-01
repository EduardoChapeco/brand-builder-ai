import type { Json, Tables } from '@/integrations/supabase/types';

export type BioLinkBlockType = 'link' | 'youtube' | 'spotify' | 'map' | 'newsletter' | 'spacer';

export interface BioLinkBlock {
  id: string;
  type: BioLinkBlockType;
  title?: string;
  url?: string;
  label?: string;
  emoji?: string;
  note?: string;
  embedUrl?: string;
  placeholder?: string;
  buttonLabel?: string;
  height?: number;
}

export interface BioLinkThemeDefinition {
  id: string;
  label: string;
  isDark: boolean;
  preview: string;
  rootStyles: {
    background: string;
    surface: string;
    border: string;
    text: string;
    muted: string;
  };
}

export const BIOLINK_THEMES: BioLinkThemeDefinition[] = [
  {
    id: 'glass-dark',
    label: 'Glass Dark',
    isDark: true,
    preview: 'from-slate-950 to-purple-900',
    rootStyles: {
      background: 'linear-gradient(135deg, #09090f 0%, #1e1b4b 100%)',
      surface: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.12)',
      text: '#F8FAFC',
      muted: 'rgba(248,250,252,0.72)',
    },
  },
  {
    id: 'liquid-blur',
    label: 'Liquid Blur',
    isDark: false,
    preview: 'from-white via-sky-50 to-indigo-100',
    rootStyles: {
      background: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 45%, #dbeafe 100%)',
      surface: 'rgba(255,255,255,0.72)',
      border: 'rgba(15,23,42,0.08)',
      text: '#111827',
      muted: 'rgba(17,24,39,0.62)',
    },
  },
  {
    id: 'neon-glow',
    label: 'Neon Glow',
    isDark: true,
    preview: 'from-black via-emerald-950 to-cyan-950',
    rootStyles: {
      background: 'linear-gradient(135deg, #020617 0%, #022c22 52%, #082f49 100%)',
      surface: 'rgba(2,6,23,0.78)',
      border: 'rgba(34,211,238,0.26)',
      text: '#E0F2FE',
      muted: 'rgba(224,242,254,0.7)',
    },
  },
  {
    id: 'minimal-clean',
    label: 'Minimal Clean',
    isDark: false,
    preview: 'from-white to-zinc-100',
    rootStyles: {
      background: '#ffffff',
      surface: '#f8fafc',
      border: 'rgba(15,23,42,0.08)',
      text: '#0F172A',
      muted: 'rgba(15,23,42,0.62)',
    },
  },
  {
    id: 'brutal-corporate',
    label: 'Dark Brutalism',
    isDark: true,
    preview: 'from-zinc-900 to-black',
    rootStyles: {
      background: '#111111',
      surface: '#1a1a1a',
      border: '#ffffff',
      text: '#ffffff',
      muted: 'rgba(255,255,255,0.72)',
    },
  },
];

export type BioLinkRecord = Tables<'bio_links'>;
export type BlogArticleRecord = Tables<'blog_articles'>;
export type NewsItemRecord = Tables<'news_items'>;
export type LandingPageRecord = Tables<'landing_pages'>;
export type ProjectRecord = Tables<'projects'>;

export const BLOG_LAYOUTS = [
  { id: 'medium_clean', name: 'Medium Style', description: 'Leitura confortável, com foco total no texto.' },
  { id: 'magazine_editorial', name: 'Editorial Magazine', description: 'Capa forte, subtítulo e quotes em destaque.' },
  { id: 'minimalist_dark', name: 'Dark Minimalist', description: 'Visual dark para conteúdo tech ou criativo.' },
  { id: 'news_style', name: 'Jornalístico', description: 'Estrutura de notícia com fonte, categorias e leitura rápida.' },
  { id: 'seo_optimized', name: 'SEO First', description: 'Formato orientado a busca com heading hierarchy e FAQ.' },
] as const;

export const VIBECODER_STARTER_FILES: Record<string, string> = {
  '/src/App.tsx': `export default function App() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#09090f', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ maxWidth: 720, padding: 32 }}>
        <p style={{ opacity: 0.7, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 12 }}>VibeCoder</p>
        <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: '12px 0 16px' }}>Seu projeto começa aqui.</h1>
        <p style={{ fontSize: 18, opacity: 0.82 }}>Descreva a página no chat para gerar a primeira versão do app.</p>
      </section>
    </main>
  );
}
`,
  '/src/index.tsx': `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
`,
};

export const parseJsonArray = <T>(value: Json | null, fallback: T[] = []): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

export const parseJsonObject = <T extends Record<string, unknown>>(value: Json | null, fallback: T): T =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as T) : fallback;

export const normalizeBioLinkBlocks = (record: Pick<BioLinkRecord, 'blocks' | 'links'> | null | undefined): BioLinkBlock[] => {
  const blocks = parseJsonArray<BioLinkBlock>(record?.blocks ?? null);
  if (blocks.length > 0) return blocks;

  const legacyLinks = parseJsonArray<{ id?: string; label?: string; url?: string; emoji?: string }>(record?.links ?? null);
  return legacyLinks.map((link, index) => ({
    id: link.id || `legacy-link-${index + 1}`,
    type: 'link',
    title: link.label || `Link ${index + 1}`,
    url: link.url || '',
    emoji: link.emoji || '🔗',
  }));
};

export const getBioLinkTheme = (themeId?: string | null) =>
  BIOLINK_THEMES.find((theme) => theme.id === themeId) || BIOLINK_THEMES[0];

export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export const buildProjectSummary = (files: Record<string, string>) => {
  const entries = Object.entries(files);
  const totalChars = entries.reduce((sum, [, content]) => sum + content.length, 0);
  return {
    fileCount: entries.length,
    totalChars,
    entryFile: files['/src/App.tsx'] ? '/src/App.tsx' : entries[0]?.[0] || '/src/App.tsx',
  };
};
