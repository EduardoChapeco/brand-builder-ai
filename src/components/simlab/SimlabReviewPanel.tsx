import { Loader2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimlabInsight, SimlabRun, SimlabVariant, getSimlabVerdictLabel } from "@/lib/simlab";

type Props = {
  title?: string;
  run?: SimlabRun | null;
  insight?: SimlabInsight | null;
  variants?: SimlabVariant[];
  loading?: boolean;
  error?: string | null;
  onValidate?: (() => void) | null;
  onRefresh?: (() => void) | null;
  validateLabel?: string;
  disabled?: boolean;
};

const verdictTone = (verdict?: string | null) => {
  if (verdict === "approved") return "default";
  if (verdict === "blocked") return "destructive";
  return "outline";
};

const extractScore = (insight?: SimlabInsight | null) => {
  const scorecard = insight?.aggregate_scores;
  const interest = typeof scorecard?.interest_score === "number" ? scorecard.interest_score : null;
  const action = typeof scorecard?.action_score === "number" ? scorecard.action_score : null;
  return { interest, action };
};

const SimlabReviewPanel = ({
  title = "SimLab Review",
  run,
  insight,
  variants = [],
  loading = false,
  error = null,
  onValidate,
  onRefresh,
  validateLabel = "Run validation",
  disabled = false,
}: Props) => {
  const summary = insight?.executive_summary || run?.failure_reason || null;
  const { interest, action } = extractScore(insight);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Validacao com consumidores sinteticos</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {run ? <Badge variant={verdictTone(run.verdict)}>{getSimlabVerdictLabel(run.verdict)}</Badge> : null}
          {run?.status ? <Badge variant="outline">{run.status}</Badge> : null}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--workspace-brand)]" />
          O SimLab esta processando o painel de personas e sintetizando o veredito.
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-300/40 bg-rose-50 p-4 text-sm text-rose-700">
          <ShieldAlert className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : run ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Verdict</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{getSimlabVerdictLabel(run.verdict)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Interest</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{interest ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Action</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{action ?? "-"}</p>
            </div>
          </div>

          {summary ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Executive summary</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{summary}</p>
            </div>
          ) : null}

          {Array.isArray(insight?.top_improvements) && insight?.top_improvements.length > 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Top recommendations</p>
              <div className="mt-3 space-y-2">
                {insight.top_improvements.slice(0, 3).map((item, index) => (
                  <p key={index} className="text-sm leading-6 text-[var(--text-secondary)]">
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <Sparkles size={14} />
            {variants.length} variant(s) testada(s)
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-card)] p-4 text-sm text-[var(--text-secondary)]">
          Rode o SimLab para validar aderencia, barreiras e potencial de resposta antes de publicar ou ativar.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onValidate ? (
          <Button onClick={onValidate} disabled={loading || disabled} className="rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {validateLabel}
          </Button>
        ) : null}
        {onRefresh ? (
          <Button variant="outline" onClick={onRefresh} disabled={loading || !run?.id} className="rounded-xl">
            Refresh
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default SimlabReviewPanel;
