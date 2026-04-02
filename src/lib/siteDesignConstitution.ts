export type DesignConstitution = {
  version: string;
  summary: string;
  allowedColorTokens: string[];
  allowedSurfaceClasses: string[];
  requiredStates: string[];
  requiredComponents: string[];
  forbiddenPatterns: string[];
  guidance: string[];
};

export type ConstitutionFindingSeverity = "error" | "warning";

export type ConstitutionFinding = {
  severity: ConstitutionFindingSeverity;
  file: string;
  pattern: string;
  message: string;
};

export const DEFAULT_SITE_CONSTITUTION: DesignConstitution = {
  version: "site-ui-v1",
  summary: "Padrao visual do workspace sem sombras duras, sem preto/branco hardcoded e com composicao baseada em tokens.",
  allowedColorTokens: [
    "var(--surface-1)",
    "var(--surface-2)",
    "var(--surface-card)",
    "var(--text-primary)",
    "var(--text-secondary)",
    "var(--text-muted)",
    "var(--border)",
    "var(--workspace-brand)",
    "var(--workspace-brand-soft)",
    "var(--workspace-brand-border)",
  ],
  allowedSurfaceClasses: [
    "bg-[var(--surface-card)]",
    "bg-[var(--surface-1)]",
    "bg-[var(--surface-2)]",
    "border-[var(--border)]",
    "text-[var(--text-primary)]",
    "text-[var(--text-secondary)]",
    "text-[var(--text-muted)]",
  ],
  requiredStates: ["loading", "empty", "error", "success", "dirty", "blocked"],
  requiredComponents: ["PageHeader", "SectionCard", "EmptyState", "SubtleBadge", "Button"],
  forbiddenPatterns: [
    "bg-black",
    "text-white",
    "shadow-",
    "box-shadow",
    "border-white/",
    "bg-white/",
    "#000",
    "#000000",
    "#fff",
    "#ffffff",
    "bg-zinc-",
    "text-zinc-",
    "border-zinc-",
  ],
  guidance: [
    "Use variaveis CSS e tokens semanticos do app antes de definir qualquer cor.",
    "Se houver fundo escuro, ele deve nascer de tokens ou configuracao de marca, nunca de hardcode.",
    "Nao use shadow utilities ou box-shadow inline em superfícies padrao do modulo.",
    "Estados de carregamento, vazio e erro sao obrigatorios em telas de builder.",
  ],
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const scanSourceFilesAgainstConstitution = (
  files: Record<string, string>,
  constitution: DesignConstitution = DEFAULT_SITE_CONSTITUTION,
): ConstitutionFinding[] => {
  const findings: ConstitutionFinding[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    for (const pattern of constitution.forbiddenPatterns) {
      if (pattern === "shadow-") {
        const matches = content.match(/shadow-[A-Za-z0-9_[\]/:%.-]+/g) || [];
        const invalidMatches = matches.filter((match) => match !== "shadow-none");
        for (const match of invalidMatches) {
          findings.push({
            severity: "error",
            file: filePath,
            pattern,
            message: `O arquivo usa o padrao proibido "${match}".`,
          });
        }
        continue;
      }

      const regex = new RegExp(escapeRegex(pattern), "gi");
      if (regex.test(content)) {
        findings.push({
          severity: "error",
          file: filePath,
          pattern,
          message: `O arquivo usa o padrao proibido "${pattern}".`,
        });
      }
    }

    if (!content.includes("var(--") && (filePath.endsWith(".tsx") || filePath.endsWith(".ts"))) {
      findings.push({
        severity: "warning",
        file: filePath,
        pattern: "semantic-colors",
        message: "O arquivo nao referencia tokens semanticos var(--...), o que aumenta risco de drift visual.",
      });
    }
  }

  return findings;
};

export const summarizeConstitutionFindings = (findings: ConstitutionFinding[]) => {
  if (findings.length === 0) {
    return "Nenhuma violacao da constituicao visual foi encontrada.";
  }

  const errors = findings.filter((item) => item.severity === "error").length;
  const warnings = findings.length - errors;
  return `${errors} erro(s) e ${warnings} aviso(s) encontrados na validacao da constituicao visual.`;
};
