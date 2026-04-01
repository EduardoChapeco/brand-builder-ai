import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  Aperture,
  ChevronDown,
  ChevronUp,
  Dna,
  FileText,
  Globe,
  Grid2x2,
  Images,
  Layers,
  Link2,
  MessageSquare,
  MonitorSmartphone,
  Newspaper,
  Palette,
  Presentation,
  Settings,
  Sparkles,
  UserCircle2,
  Wand2,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const primaryItems = [
  { icon: Grid2x2, label: 'Dashboard', path: 'dashboard' },
  { icon: Wand2, label: 'Post Rapido', path: 'generator' },
  { icon: Layers, label: 'Carousel Builder', path: 'carousel-builder' },
  { icon: Sparkles, label: 'Prompt Studio', path: 'image-prompts' },
  { icon: Activity, label: 'Viral Analyzer', path: 'viral-analyzer' },
  { icon: Newspaper, label: 'News Portal', path: 'news-portal' },
  { icon: Globe, label: 'Web Cloner', path: 'web-cloner' },
  { icon: MonitorSmartphone, label: 'VibeCoder', path: 'vibe-coder' },
  { icon: Images, label: 'Biblioteca', path: 'library' },
] as const;

const secondaryItems = [
  { icon: Aperture, label: 'Product Shots', path: 'product-shots' },
  { icon: UserCircle2, label: 'Brand Character', path: 'brand-character' },
  { icon: Dna, label: 'Brand DNA', path: 'brand-dna' },
  { icon: Link2, label: 'Bio Link', path: 'biolink' },
  { icon: MonitorSmartphone, label: 'Feed Preview', path: 'feed-preview' },
  { icon: Presentation, label: 'Slides', path: 'slides' },
  { icon: FileText, label: 'Blog Manager', path: 'blog-manager' },
  { icon: Palette, label: 'Brand Kit', path: 'brand-kit' },
  { icon: FileText, label: 'Briefing', path: 'briefing' },
  { icon: MessageSquare, label: 'Chat IA', path: 'chat' },
  { icon: Settings, label: 'Configuracoes', path: 'settings' },
] as const;

const SidebarLink = ({
  label,
  path,
  primaryColor,
  icon: Icon,
}: {
  label: string;
  path: string;
  primaryColor: string;
  icon: typeof primaryItems[number]['icon'];
}) => {
  const { workspaceId } = useParams();

  return (
    <NavLink
      to={`/workspace/${workspaceId}/${path}`}
      title={label}
      className={({ isActive }) =>
        `relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 group/link ${
          isActive
            ? 'text-white'
            : 'text-[color:var(--text-3)] hover:text-[color:var(--text-1)]'
        }`
      }
      style={({ isActive }) =>
        isActive
          ? { background: primaryColor, boxShadow: `0 4px 16px ${primaryColor}50` }
          : {}
      }
    >
      {({ isActive }) => (
        <>
          {!isActive && (
            <span
              className="absolute inset-0 rounded-xl opacity-0 group-hover/link:opacity-100 transition-opacity duration-150"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
          )}
          <Icon size={18} strokeWidth={isActive ? 2 : 1.7} />
        </>
      )}
    </NavLink>
  );
};

const AppSidebar = () => {
  const { workspace, brandKit } = useWorkspace();
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [showSecondary, setShowSecondary] = useState(false);

  const initials = workspace?.name
    ? workspace.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
    : 'PG';

  const primaryColor = brandKit?.color_primary || '#7C3AED';

  return (
    <aside
      className="flex flex-col items-center py-4 gap-1 shrink-0 h-full overflow-hidden"
      style={{
        width: 64,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        zIndex: 50,
      }}
    >
      <button
        onClick={() => navigate('/workspaces')}
        title={workspace?.name || 'Trocar Workspace'}
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shrink-0 transition-all hover:opacity-90 hover:scale-105"
        style={{ background: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
      >
        <span className="text-white font-display font-bold text-base">{initials}</span>
      </button>

      <div className="w-8 h-px shrink-0 mb-1" style={{ background: 'var(--border)' }} />

      <nav className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto w-full items-center no-scrollbar pb-2">
        {primaryItems.map((item) => (
          <SidebarLink key={item.path} {...item} primaryColor={primaryColor} />
        ))}

        <div className="my-1 w-8 h-px shrink-0" style={{ background: 'var(--border)' }} />

        <button
          onClick={() => setShowSecondary((current) => !current)}
          title={showSecondary ? 'Recolher' : 'Mais Ferramentas'}
          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-150"
          style={{
            color: showSecondary ? 'var(--primary)' : 'var(--text-3)',
            background: showSecondary ? 'var(--primary-muted)' : 'transparent',
          }}
        >
          {showSecondary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showSecondary && (
          <>
            <div className="my-1 w-8 h-px shrink-0" style={{ background: 'var(--border)' }} />
            {secondaryItems.map((item) => (
              <SidebarLink key={item.path} {...item} primaryColor={primaryColor} />
            ))}
          </>
        )}
      </nav>

      <div className="shrink-0 mt-1">
        <NavLink
          to={`/workspace/${workspaceId}/settings`}
          title={workspace?.name || 'Configuracoes'}
          className={({ isActive }) =>
            `w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[10px] font-bold text-white ${
              isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
            }`
          }
          style={{ background: primaryColor }}
        >
          {initials}
        </NavLink>
      </div>
    </aside>
  );
};

export default AppSidebar;
