import { useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  Aperture,
  ChevronDown,
  ChevronUp,
  Dna,
  FileText,
  Grid2x2,
  Images,
  Layers,
  Link2,
  MessageSquare,
  MonitorSmartphone,
  Palette,
  Presentation,
  Settings,
  Sparkles,
  UserCircle2,
  Wand2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const primaryItems = [
  { icon: Grid2x2,    label: 'Dashboard',       path: 'dashboard',       category: 'core' },
  { icon: Wand2,      label: 'Post Rápido',      path: 'generator',       category: 'core' },
  { icon: Layers,     label: 'Carousel Builder', path: 'carousel-builder',category: 'core' },
  { icon: Sparkles,   label: 'Prompt Studio',   path: 'image-prompts',   category: 'core' },
  { icon: Activity,   label: 'Viral Analyzer',  path: 'viral-analyzer',  category: 'core' },
  { icon: Images,     label: 'Biblioteca',       path: 'library',         category: 'core' },
  { icon: MonitorSmartphone, label: 'Feed Preview', path: 'feed-preview',  category: 'core' },
];

const secondaryItems = [
  { icon: Aperture,   label: 'Product Shots',   path: 'product-shots',  category: 'tools' },
  { icon: UserCircle2,label: 'Brand Character', path: 'brand-character',category: 'tools' },
  { icon: Dna,        label: 'DNA Cloner',       path: 'brand-dna',      category: 'tools' },
  { icon: Link2,      label: 'Bio Link',         path: 'biolink',        category: 'tools' },
  { icon: MessageSquare, label: 'Chat IA',       path: 'chat',           category: 'tools' },
  { icon: Presentation,label: 'Slides',          path: 'slides',         category: 'config' },
  { icon: Palette,    label: 'Brand Kit',        path: 'brand-kit',      category: 'config' },
  { icon: FileText,   label: 'Briefing',         path: 'briefing',       category: 'config' },
  { icon: Settings,   label: 'Configurações',    path: 'settings',       category: 'config' },
];

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
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <NavLink
          to={`/workspace/${workspaceId}/${path}`}
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
                <span className="absolute inset-0 rounded-xl opacity-0 group-hover/link:opacity-100 transition-opacity duration-150"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              )}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.7} />
            </>
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}
        className="text-xs font-semibold px-3 py-1.5 rounded-xl"
        style={{ background: 'rgba(15,15,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

const AppSidebar = () => {
  const { workspace, brandKit } = useWorkspace();
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [showSecondary, setShowSecondary] = useState(false);

  const initials = workspace?.name
    ? workspace.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
    : 'P';

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
      {/* Logo / Workspace Avatar */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/workspaces')}
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shrink-0 transition-all hover:opacity-90 hover:scale-105"
            style={{ background: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
          >
            <span className="text-white font-display font-bold text-base">{initials}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(15,15,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
          {workspace?.name || 'Trocar Workspace'}
        </TooltipContent>
      </Tooltip>

      {/* Divider */}
      <div className="w-8 h-px shrink-0 mb-1" style={{ background: 'var(--border)' }} />

      {/* Primary Nav — scrollable */}
      <nav
        className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto w-full items-center no-scrollbar pb-2"
      >
        {primaryItems.map((item) => (
          <SidebarLink key={item.path} {...item} primaryColor={primaryColor} />
        ))}

        {/* Divider */}
        <div className="my-1 w-8 h-px shrink-0" style={{ background: 'var(--border)' }} />

        {/* Toggle for secondary */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowSecondary((current) => !current)}
              className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-150"
              style={{
                color: showSecondary ? 'var(--primary)' : 'var(--text-3)',
                background: showSecondary ? 'var(--primary-muted)' : 'transparent',
              }}
            >
              {showSecondary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(15,15,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
            {showSecondary ? 'Recolher' : 'Mais Ferramentas'}
          </TooltipContent>
        </Tooltip>

        {showSecondary && (
          <>
            <div className="my-1 w-8 h-px shrink-0" style={{ background: 'var(--border)' }} />
            {secondaryItems.map((item) => (
              <SidebarLink key={item.path} {...item} primaryColor={primaryColor} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom: Settings shortcut */}
      <div className="shrink-0 mt-1">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <NavLink
              to={`/workspace/${workspaceId}/settings`}
              className={({ isActive }) =>
                `w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[10px] font-bold text-white ${
                  isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                }`
              }
              style={{ background: primaryColor }}
            >
              {initials}
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(15,15,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
            {workspace?.name}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};

export default AppSidebar;
