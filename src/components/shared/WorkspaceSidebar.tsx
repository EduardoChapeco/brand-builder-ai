import { ArrowLeftRight, ChevronsUpDown, Settings2 } from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
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
  const { workspace } = useWorkspace();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const initials = workspace?.name
    ? workspace.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "PG";

  return (
    <Sidebar collapsible="icon" className="border-r border-[var(--border)] bg-[var(--sidebar-background)]">
      <SidebarHeader className="px-3 py-3 border-b border-[var(--border)] bg-[var(--sidebar-background)]">
        <button
          onClick={() => navigate("/workspaces")}
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]",
            collapsed && "justify-center px-0",
          )}
          title={workspace?.name || "Trocar workspace"}
        >
          <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-lg bg-[var(--workspace-brand)] text-xs font-semibold text-white shadow-sm">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{workspace?.name || "Workspace"}</p>
              <p className="truncate text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Mudar workspace</p>
            </div>
          )}
          {!collapsed && <ChevronsUpDown size={14} className="text-[var(--text-muted)] shrink-0" />}
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-3 px-2 py-3 overflow-y-auto scrollbar-thin">
        {WORKSPACE_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="px-1">
            <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname.includes(`/workspace/${workspaceId}/${item.path}`);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={isActive}
                        className={cn(
                          "transition-all h-9 !px-2.5 font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
                          isActive && "bg-[var(--sidebar-accent)] text-[var(--workspace-brand)] font-semibold shadow-sm",
                        )}
                        style={{
                          ...(isActive ? { backgroundColor: 'var(--workspace-brand-soft)', color: 'var(--workspace-brand)' } : {})
                        }}
                      >
                        <NavLink to={`/workspace/${workspaceId}/${item.path}`} end>
                          <item.icon className="!size-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 py-3 border-t border-[var(--border)] bg-[var(--sidebar-background)]">
        <NavLink to={`/workspace/${workspaceId}/settings`} end>
          {({ isActive }) => (
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--surface-2)]",
                collapsed && "justify-center px-0",
                isActive && "bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)] font-medium",
              )}
            >
              <Settings2 size={16} className="shrink-0" />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[var(--text-primary)]">Configuracoes</p>
                </div>
              )}
            </div>
          )}
        </NavLink>

        {!collapsed && (
          <div className="flex items-center gap-2 px-2 pb-1 text-[11px] text-[var(--text-muted)] opacity-60">
            <ArrowLeftRight size={12} />
            <span>Recolhivel [CTRL + B]</span>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default WorkspaceSidebar;
