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
      <SidebarHeader className="gap-4 px-3 py-4">
        <button
          onClick={() => navigate("/workspaces")}
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] px-3 py-3 text-left transition-colors hover:bg-[var(--surface-2)]",
            collapsed && "justify-center px-0",
          )}
          title={workspace?.name || "Trocar workspace"}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--workspace-brand)] text-sm font-semibold text-white">
            {initials}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{workspace?.name || "Workspace"}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">Trocar workspace</p>
            </div>
          ) : null}
          {!collapsed ? <ChevronsUpDown size={16} className="text-[var(--text-muted)]" /> : null}
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-2 pb-4">
        {WORKSPACE_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="px-1">
            <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={location.pathname === `/workspace/${workspaceId}/${item.path}`}
                      className={cn(
                        "h-11 rounded-xl px-3 text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                        "data-[active=true]:border data-[active=true]:border-[var(--workspace-brand-border)] data-[active=true]:bg-[var(--workspace-brand-soft)] data-[active=true]:text-[var(--workspace-brand)]",
                      )}
                    >
                      <NavLink to={`/workspace/${workspaceId}/${item.path}`} end className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 py-4">
        <NavLink to={`/workspace/${workspaceId}/settings`} end>
          {({ isActive }) => (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] px-3 py-3 transition-colors hover:bg-[var(--surface-2)]",
                collapsed && "justify-center px-0",
                isActive && "border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)]",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                <Settings2 size={16} />
              </div>
              {!collapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Configuracoes</p>
                  <p className="text-xs text-[var(--text-muted)]">API, RSS e preferencias</p>
                </div>
              ) : null}
            </div>
          )}
        </NavLink>

        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-muted)]">
            <ArrowLeftRight size={14} />
            <span>Sidebar recolhivel e responsiva</span>
          </div>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default WorkspaceSidebar;
