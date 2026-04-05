import { ArrowLeftRight, ChevronsUpDown, Bot, Zap, LayoutGrid, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { WORKSPACE_NAV_GROUPS } from "@/lib/workspaceNavigation";

const WorkspaceSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams();
  const { workspace, role } = useWorkspace();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const initials = workspace?.name
    ? workspace.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()
    : "SW";

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#050508] overflow-hidden group">
      {/* Header Premium de Workspace */}
      <SidebarHeader className="p-4 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <button
          onClick={() => navigate("/workspaces")}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl p-2 transition-all hover:bg-white/5 group/ws",
            collapsed && "justify-center p-1"
          )}
        >
          <div className="flex shrink-0 size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-sm font-black text-white shadow-lg shadow-[#a855f7]/20 group-hover/ws:scale-110 transition-transform">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white tracking-tight">{workspace?.name || "Carregando..."}</p>
              <div className="flex items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <p className="truncate text-[9px] text-stone-500 font-bold uppercase tracking-widest">Workspace Ativo</p>
              </div>
            </div>
          )}
          {!collapsed && <ChevronsUpDown size={14} className="text-stone-600 group-hover/ws:text-white transition-colors" />}
        </button>
      </SidebarHeader>

      {/* Conteúdo de Navegação Glassmorphism */}
      <SidebarContent className="gap-6 px-3 py-6 overflow-y-auto no-scrollbar bg-transparent">
        {WORKSPACE_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="px-0">
            {!collapsed && (
              <SidebarGroupLabel className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  if (item.adminOnly && role !== "owner" && role !== "admin") return null;

                  const isActive = location.pathname.includes(`/workspace/${workspaceId}/${item.path}`);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={isActive}
                        className={cn(
                          "transition-all h-11 w-full justify-start font-medium rounded-2xl border border-transparent",
                          "text-stone-400 hover:text-white hover:bg-white/5",
                          isActive && "bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20 font-bold shadow-xl shadow-[#a855f7]/5"
                        )}
                      >
                        <Link
                          to={`/workspace/${workspaceId}/${item.path}`}
                          className="flex items-center gap-3 px-4"
                        >
                          <item.icon className={cn("size-5 transition-transform", isActive && "scale-110")} />
                          {!collapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                          {isActive && !collapsed && <div className="ml-auto w-1 h-1 bg-[#a855f7] rounded-full shadow-[0_0_8px_#a855f7]" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer Minimalista */}
      <SidebarFooter className="p-4 border-t border-white/5 bg-black/20">
        {!collapsed && (
          <div className="flex flex-col gap-4">
             <div className="p-4 rounded-2xl bg-gradient-to-br from-[#a855f7]/10 to-transparent border border-[#a855f7]/10 relative overflow-hidden group/upgrade">
                <Sparkles className="absolute -right-2 -bottom-2 text-[#a855f7]/20 w-12 h-12 rotate-12 group-hover/upgrade:rotate-45 transition-transform" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Upgrade Plan</p>
                <p className="text-[10px] text-stone-500 leading-tight">Libere o SimLab Pro agora.</p>
             </div>
             <div className="flex items-center gap-2 px-2 text-[9px] text-stone-700 font-bold uppercase tracking-widest">
                <ArrowLeftRight size={12} />
                <span>[Ctrl + B] Recolher</span>
             </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default WorkspaceSidebar;
