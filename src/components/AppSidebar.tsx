import { NavLink, useParams } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wand2, Images, Palette, FileText, Settings, Dna } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const navItems = [
  { icon: Wand2,    label: 'Criar Post',       path: 'generator'  },
  { icon: Images,   label: 'Biblioteca',        path: 'library'    },
  { icon: Dna,      label: 'DNA Cloner',        path: 'brand-dna'  },
  { icon: Palette,  label: 'Brand Kit',         path: 'brand-kit'  },
  { icon: FileText, label: 'Briefing',          path: 'briefing'   },
  { icon: Settings, label: 'Config',            path: 'settings'   },
];


const AppSidebar = () => {
  const { workspaceId } = useParams();
  const { workspace, brandKit } = useWorkspace();

  const initials = workspace?.name
    ? workspace.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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
      {/* Logo */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 shrink-0"
        style={{ background: primaryColor }}
      >
        <span className="text-white font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>P</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Tooltip key={path} delayDuration={300}>
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
                style={({ isActive }) => isActive ? { background: primaryColor } : {}}
              >
                <Icon size={18} strokeWidth={1.8} />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="text-xs font-medium">{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Workspace badge */}
      <Tooltip delayDuration={300}>
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
