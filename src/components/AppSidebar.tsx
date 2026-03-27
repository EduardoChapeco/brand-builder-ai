import { NavLink, useLocation } from "react-router-dom";
import { MessageSquare, Images, FileText, Settings, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Images, label: "Biblioteca", path: "/library" },
  { icon: FileText, label: "Briefing", path: "/briefing" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r border-border bg-background py-4">
      {/* Logo */}
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.path}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <item.icon className="h-5 w-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-card text-card-foreground border-border">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Version */}
      <span className="font-mono text-[10px] text-muted-foreground">v1.0</span>
    </aside>
  );
};

export default AppSidebar;
