import { ChevronRight, PanelLeft, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getWorkspaceRouteMeta } from "@/lib/workspaceNavigation";
import SubtleBadge from "./SubtleBadge";

const WorkspaceTopbar = () => {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const routeMeta = getWorkspaceRouteMeta(location.pathname);

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[rgba(255,255,255,0.82)] px-4 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]">
          <PanelLeft size={16} />
        </SidebarTrigger>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{routeMeta.section}</span>
            <ChevronRight size={12} />
            <span className="truncate">{routeMeta.label}</span>
          </div>
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {routeMeta.description || routeMeta.label}
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-3 md:flex">
        <div className="relative w-[260px] lg:w-[320px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            readOnly
            value=""
            placeholder="Busca global em breve"
            className="h-10 rounded-xl border-[var(--border)] bg-[var(--surface-card)] pl-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <SubtleBadge>{workspace?.name || "Workspace"}</SubtleBadge>
      </div>
    </div>
  );
};

export default WorkspaceTopbar;

