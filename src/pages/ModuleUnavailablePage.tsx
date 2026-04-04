import { AlertTriangle } from "lucide-react";
import { Link, useParams } from "react-router-dom";

type ModuleUnavailablePageProps = {
  moduleName: string;
  reason: string;
};

export default function ModuleUnavailablePage({ moduleName, reason }: ModuleUnavailablePageProps) {
  const { workspaceId } = useParams();

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner py-10">
          <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-8">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={20} />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em]">Módulo em convergência</span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {moduleName} temporariamente fora do shell ativo
            </h1>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {reason}
            </p>

            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              O acesso foi fechado nesta rodada para não expor fluxos que hoje dependem de tabelas ausentes no SWdb live.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={workspaceId ? `/workspace/${workspaceId}/painel` : "/workspaces"}
                className="rounded-2xl bg-[var(--workspace-brand)] px-5 py-3 text-sm font-semibold text-white"
              >
                Voltar ao painel
              </Link>
              <Link
                to={workspaceId ? `/workspace/${workspaceId}/ajuda` : "/workspaces"}
                className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]"
              >
                Abrir ajuda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
