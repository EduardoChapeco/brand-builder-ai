import type { ReactNode } from "react";
import { NavLink, useParams } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

export default function VideoStudioShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { workspaceId } = useParams();
  const basePath = workspaceId ? `/workspace/${workspaceId}/video-studio` : "/workspaces";
  const siteBuilderPath = workspaceId ? `/workspace/${workspaceId}/site-builder` : "/workspaces";

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-[var(--workspace-brand-soft)] text-[var(--text-primary)] border border-[var(--workspace-brand-border)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]",
    ].join(" ");

  return (
    <div className="page-layout">
      <div className="page-content">
        <div className="page-inner flex flex-col gap-6 py-6">
          <PageHeader
            eyebrow="Video Studio"
            title={title}
            description={description}
            action={action}
          />

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-2 shadow-[var(--shadow-card)]">
            <NavLink end to={basePath} className={navClass}>
              Library
            </NavLink>
            <NavLink to={`${basePath}/generate`} className={navClass}>
              Generate
            </NavLink>
            <NavLink to={`${basePath}/motion-studio`} className={navClass}>
              Motion Studio
            </NavLink>
            <NavLink to={`${basePath}/motion`} className={navClass}>
              Site Motion
            </NavLink>
            <div className="ml-auto">
              <Button asChild variant="outline" className="rounded-xl">
                <NavLink to={siteBuilderPath}>Open Site Builder</NavLink>
              </Button>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
