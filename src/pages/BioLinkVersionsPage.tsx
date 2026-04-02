import { useMemo, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBioLinkWorkspace } from "@/hooks/useBioLinkWorkspace";
import { safeJsonArray, safeJsonObject } from "@/lib/biolink/registry";
import { restoreBioLinkVersion } from "@/lib/biolink/service";

const BioLinkVersionsPage = () => {
  const { workspace, bioLink, versions, refresh } = useBioLinkWorkspace();
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.version_number - a.version_number),
    [versions],
  );

  if (!workspace || !bioLink) {
    return <div className="page-inner">Carregando versoes...</div>;
  }

  const handleRestore = async (versionId: string) => {
    setRestoringVersionId(versionId);
    try {
      await restoreBioLinkVersion(workspace.id, bioLink.id, versionId);
      toast.success("Versao restaurada.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel restaurar esta versao.");
    } finally {
      setRestoringVersionId(null);
    }
  };

  return (
    <div className="page-inner space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Versionamento</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Snapshots publicados</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Cada publicacao grava um snapshot imutavel. Restaurar uma versao reaplica o estado salvo no builder.
            </p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--workspace-brand-soft)] text-[var(--workspace-brand)]">
            <History size={20} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedVersions.map((version) => {
          const snapshot = safeJsonObject(version.snapshot);
          const blocks = safeJsonArray(snapshot.blocks);
          const publishedAt = version.created_at ? new Date(version.created_at).toLocaleString("pt-BR") : "Agora";
          const isCurrent = bioLink.published_version_id === version.id;

          return (
            <div key={version.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[var(--text-primary)]">Versao {version.version_number}</p>
                    {isCurrent ? (
                      <span className="rounded-full bg-[var(--workspace-brand-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-brand)]">
                        Publicada
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{version.summary || "Snapshot completo do Bio Link."}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                    <span>{publishedAt}</span>
                    <span>{blocks.length} blocos</span>
                    <span>Status: {version.status}</span>
                  </div>
                </div>

                <Button
                  variant={isCurrent ? "secondary" : "default"}
                  disabled={isCurrent || restoringVersionId === version.id}
                  onClick={() => handleRestore(version.id)}
                >
                  <RotateCcw size={16} />
                  Restaurar
                </Button>
              </div>
            </div>
          );
        })}

        {sortedVersions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-card)] px-6 py-12 text-center text-[var(--text-muted)]">
            Nenhuma versao publicada ainda.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BioLinkVersionsPage;
