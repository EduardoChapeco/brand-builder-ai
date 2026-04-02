import { ArrowLeftRight, ChevronsUpDown, Settings2 } from "lucide-react";
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
    <Sidebar collapsible="icon" className="border-r border-[var(--border)] bg-[var(--sidebar-background)] overflow-hidden">
      <SidebarHeader className="border-b border-[var(--border)] bg-[var(--sidebar-background)] p-3">
        <button
          onClick={() => navigate("/workspaces")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-[var(--surface-2)]",
            collapsed && "justify-center"
          )}
          title={workspace?.name || "Trocar workspace"}
        >
          <div className="flex shrink-0 size-8 items-center justify-center rounded-lg bg-[var(--workspace-brand)] text-xs font-bold text-white shadow-sm">
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
                          "transition-all h-10 w-full justify-start font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
                          isActive && "bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)] font-semibold shadow-sm"
                        )}
                        style={isActive ? { backgroundColor: 'var(--workspace-brand-soft)', color: 'var(--workspace-brand)' } : {}}
                      >
                        <Link to={`/workspace/${workspaceId}/${item.path}`} onClick={(e) => e.currentTarget.blur()}>
                          <item.icon className="shrink-0" />
                          <span>{item.label}</span>
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

      <SidebarFooter className="p-3 border-t border-[var(--border)] bg-[var(--sidebar-background)]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Configuracoes do Workspace"
              className={cn(
                "h-10 transition-colors rounded-lg",
                location.pathname.includes('/settings') && "bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)] font-medium"
              )}
            >
              <Link to={`/workspace/${workspaceId}/settings`}>
                <Settings2 className="shrink-0" />
                <span>Configuracoes do Workspace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

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
