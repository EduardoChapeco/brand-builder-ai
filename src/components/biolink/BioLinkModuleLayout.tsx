import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { BarChart3, History, Layers3, Link2, PaintBucket, Settings2, Users } from "lucide-react";
import { BioLinkWorkspaceProvider } from "@/hooks/useBioLinkWorkspace";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "", label: "Builder", icon: Layers3 },
  { path: "themes", label: "Themes", icon: PaintBucket },
  { path: "crm", label: "CRM", icon: Users },
  { path: "analytics", label: "Analytics", icon: BarChart3 },
  { path: "settings", label: "Settings", icon: Settings2 },
  { path: "versions", label: "Versions", icon: History },
];

const BioLinkModuleLayout = () => {
  const location = useLocation();
  const { workspaceId } = useParams();

  return (
    <BioLinkWorkspaceProvider>
      <div className="page-layout">
        <div className="page-hero">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="page-hero-eyebrow">PublicaÃ§Ãµes â€¢ Bio Link Inteligente</p>
              <h1 className="page-hero-title">Bio Link</h1>
              <p className="page-hero-description">
                Builder visual, tema, CRM, analytics e publicaÃ§Ã£o pÃºblica em um Ãºnico mÃ³dulo.
              </p>
            </div>
            <div
              className="hidden rounded-3xl border px-4 py-3 md:flex md:items-center md:gap-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl"
                style={{ background: "var(--workspace-brand-soft)", color: "var(--workspace-brand)" }}
              >
                <Link2 size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">MÃ³dulo</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Central da marca</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-6 py-3 md:px-10">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const href = `/workspace/${workspaceId}/biolink${tab.path ? `/${tab.path}` : ""}`;
              const active =
                tab.path === ""
                  ? /\/biolink\/?$/.test(location.pathname)
                  : location.pathname.includes(`/biolink/${tab.path}`);

              return (
                <Link
                  key={tab.label}
                  to={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                  style={
                    active
                      ? {
                          background: "var(--workspace-brand-soft)",
                          borderColor: "var(--workspace-brand-border)",
                          color: "var(--workspace-brand)",
                        }
                      : { borderColor: "var(--border)" }
                  }
                >
                  <tab.icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </BioLinkWorkspaceProvider>
  );
};

export default BioLinkModuleLayout;
