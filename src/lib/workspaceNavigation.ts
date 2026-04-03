import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  FileText,
  FolderKanban,
  Globe,
  HelpCircle,
  LayoutGrid,
  LifeBuoy,
  Link2,
  Newspaper,
  Palette,
  Settings,
  Sparkles,
  Video,
  Wallet,
} from 'lucide-react';

export type WorkspaceNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  section: 'Operação' | 'Criar' | 'Workspace' | 'Suporte';
  description: string;
  adminOnly?: boolean;
  helpTitle?: string;
  helpBody?: string;
};

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    label: 'Painel',
    path: 'painel',
    icon: LayoutGrid,
    section: 'Operação',
    description: 'Visão operacional do workspace, pendências e próximos passos.',
    helpTitle: 'Painel operacional',
    helpBody: 'Acompanhe o estado do workspace, progresso de configuração e acessos rápidos para os módulos críticos.',
  },
  {
    label: 'Hub',
    path: 'hub',
    icon: Sparkles,
    section: 'Operação',
    description: 'Entrada única dos criadores e fluxos ativos do Simwork.',
    helpTitle: 'Hub de criadores',
    helpBody: 'Inicie novos fluxos de Sites, Bio Links, Conteúdo, Vídeo e Agents a partir de um catálogo operacional.',
  },
  {
    label: 'Sites',
    path: 'sites',
    icon: Globe,
    section: 'Criar',
    description: 'Sites e páginas institucionais com editor visual e publicação real.',
  },
  {
    label: 'Bio Links',
    path: 'biolinks',
    icon: Link2,
    section: 'Criar',
    description: 'Links de bio, blocos rastreáveis e operação mobile-first.',
  },
  {
    label: 'Blog',
    path: 'blog',
    icon: FileText,
    section: 'Criar',
    description: 'Conteúdo editorial, SEO e derivação de pautas do workspace.',
  },
  {
    label: 'Notícias',
    path: 'noticias',
    icon: Newspaper,
    section: 'Criar',
    description: 'Curadoria RSS, fila editorial e derivação para outros módulos.',
  },
  {
    label: 'Posts',
    path: 'posts',
    icon: Sparkles,
    section: 'Criar',
    description: 'Posts, carrosséis e agenda social da marca.',
  },
  {
    label: 'Vídeo',
    path: 'video',
    icon: Video,
    section: 'Criar',
    description: 'Projetos de vídeo, timeline, motion e renderização.',
  },
  {
    label: 'Agents',
    path: 'agents',
    icon: Bot,
    section: 'Criar',
    description: 'Agents operacionais, personas e validação SimLab.',
  },
  {
    label: 'CRM',
    path: 'crm',
    icon: BriefcaseBusiness,
    section: 'Operação',
    description: 'Leads, pipeline comercial e formulários de captação.',
  },
  {
    label: 'Analytics',
    path: 'analytics',
    icon: BarChart3,
    section: 'Operação',
    description: 'Eventos, métricas por módulo e exportação.',
  },
  {
    label: 'Brand Kit',
    path: 'brand-kit',
    icon: Palette,
    section: 'Workspace',
    description: 'Identidade visual e ativos centrais da marca.',
  },
  {
    label: 'Briefing',
    path: 'briefing',
    icon: FileText,
    section: 'Workspace',
    description: 'Contexto da marca, público, oferta e direcionamento.',
  },
  {
    label: 'Assets',
    path: 'assets',
    icon: FolderKanban,
    section: 'Workspace',
    description: 'Biblioteca central de arquivos do workspace.',
  },
  {
    label: 'Cobrança',
    path: 'cobranca',
    icon: Wallet,
    section: 'Workspace',
    description: 'Plano, consumo, créditos e histórico financeiro.',
  },
  {
    label: 'Configurações',
    path: 'config',
    icon: Settings,
    section: 'Workspace',
    description: 'Provedores, feeds, preferências e integrações.',
  },
  {
    label: 'Ajuda',
    path: 'ajuda',
    icon: HelpCircle,
    section: 'Suporte',
    description: 'Central de ajuda, onboarding e documentação operacional.',
  },
  {
    label: 'Suporte',
    path: 'suporte',
    icon: LifeBuoy,
    section: 'Suporte',
    description: 'Tickets, status do atendimento e histórico de suporte.',
  },
  {
    label: 'Admin',
    path: '/admin',
    icon: Building2,
    section: 'Suporte',
    description: 'Operação administrativa global do Simwork.',
    adminOnly: true,
  },
];

export const WORKSPACE_NAV_GROUPS = [
  { label: 'Operação', items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === 'Operação') },
  { label: 'Criar', items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === 'Criar') },
  { label: 'Workspace', items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === 'Workspace') },
  { label: 'Suporte', items: WORKSPACE_NAV_ITEMS.filter((item) => item.section === 'Suporte') },
] as const;

export const getWorkspaceRouteMeta = (pathname: string) => {
  const match = pathname.match(/\/workspace\/[^/]+\/([^/?#]+)/);
  const path = match?.[1] || 'painel';
  return WORKSPACE_NAV_ITEMS.find((item) => item.path === path) || WORKSPACE_NAV_ITEMS[0];
};
