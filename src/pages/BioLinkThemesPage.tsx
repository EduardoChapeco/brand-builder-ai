import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBioLinkWorkspace } from "@/hooks/useBioLinkWorkspace";
import { BIO_LINK_THEMES } from "@/lib/biolink/registry";
import { saveWorkspaceBioLink } from "@/lib/biolink/service";

const BioLinkThemesPage = () => {
  const { workspace, bioLink, blocks, refresh } = useBioLinkWorkspace();

  if (!bioLink || !workspace) {
    return <div className="page-inner">Carregando temas…</div>;
  }

  const applyTheme = async (key: string) => {
    const theme = BIO_LINK_THEMES.find((item) => item.key === key);
    if (!theme) return;
    try {
      await saveWorkspaceBioLink({
        bioLinkId: bioLink.id,
        workspaceId: workspace.id,
        bioLink: {
          ...bioLink,
          theme_key: theme.key,
          background_config: theme.background,
        },
        blocks,
      });
      toast.success("Tema aplicado.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível aplicar o tema.");
    }
  };

  return (
    <div className="page-inner">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {BIO_LINK_THEMES.map((theme) => (
          <div key={theme.key} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
            <div className="h-44 rounded-3xl" style={{ background: theme.preview }} />
            <div className="mt-4">
              <p className="text-base font-semibold text-[var(--text-primary)]">{theme.label}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{theme.description}</p>
            </div>
            <Button className="mt-4 w-full" variant={bioLink.theme_key === theme.key ? "secondary" : "default"} onClick={() => applyTheme(theme.key)}>
              {bioLink.theme_key === theme.key ? "Ativo" : "Aplicar tema"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BioLinkThemesPage;
