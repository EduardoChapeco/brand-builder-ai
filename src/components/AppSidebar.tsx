import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
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
  { icon: Grid2x2, label: 'Dashboard', path: 'dashboard' },
  { icon: Wand2, label: 'Post Rápido', path: 'generator' },
  { icon: Layers, label: 'Carousel Builder', path: 'carousel-builder' },
  { icon: Sparkles, label: 'Prompt Studio', path: 'image-prompts' },
  { icon: Activity, label: 'Viral Analyzer', path: 'viral-analyzer' },
  { icon: Images, label: 'Biblioteca', path: 'library' },
];

const secondaryItems = [
  { icon: Aperture, label: 'Product Shots', path: 'product-shots' },
  { icon: UserCircle2, label: 'Brand Character', path: 'brand-character' },
  { icon: Dna, label: 'DNA Cloner', path: 'brand-dna' },
  { icon: Presentation, label: 'Slides', path: 'slides' },
  { icon: Palette, label: 'Brand Kit', path: 'brand-kit' },
  { icon: FileText, label: 'Briefing', path: 'briefing' },
  { icon: Settings, label: 'Configurações', path: 'settings' },
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
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <NavLink
          to={`/workspace/${workspaceId}/${path}`}
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
              isActive
                ? 'text-white'
                : 'text-[color:var(--text-3)] hover:text-[color:var(--text-1)] hover:bg-[color:var(--bg-card)]'
            }`
          }
          style={({ isActive }) => (isActive ? { background: primaryColor } : {})}
        >
          <Icon size={18} strokeWidth={1.8} />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p className="text-xs font-medium">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const AppSidebar = () => {
  const { workspace, brandKit } = useWorkspace();
  const [showSecondary, setShowSecondary] = useState(false);

  const initials = workspace?.name
    ? workspace.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
    : 'P';

  const primaryColor = brandKit?.color_primary || '#7C3AED';

  return (
    <aside
      className="flex flex-col items-center py-4 gap-2 shrink-0"
      style={{
        width: 64,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        zIndex: 50,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 shrink-0"
        style={{ background: primaryColor }}
      >
        <span className="text-white font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>P</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {primaryItems.map((item) => (
          <SidebarLink key={item.path} {...item} primaryColor={primaryColor} />
        ))}

        <Tooltip delayDuration={250}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowSecondary((current) => !current)}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 text-[color:var(--text-3)] hover:text-[color:var(--text-1)] hover:bg-[color:var(--bg-card)]"
            >
              {showSecondary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="text-xs font-medium">{showSecondary ? 'Recolher Ferramentas' : 'Ferramentas Secundárias'}</p>
          </TooltipContent>
        </Tooltip>

        {showSecondary && secondaryItems.map((item) => (
          <SidebarLink key={item.path} {...item} primaryColor={primaryColor} />
        ))}
      </nav>

      <Tooltip delayDuration={250}>
        <TooltipTrigger asChild>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white cursor-default shrink-0"
            style={{ background: primaryColor, opacity: 0.8 }}
          >
            {initials}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p className="text-xs">{workspace?.name}</p>
        </TooltipContent>
      </Tooltip>
    </aside>
  );
};

export default AppSidebar;
