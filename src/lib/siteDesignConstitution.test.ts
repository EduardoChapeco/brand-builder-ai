import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_CONSTITUTION,
  scanSourceFilesAgainstConstitution,
  summarizeConstitutionFindings,
} from "@/lib/siteDesignConstitution";

describe("siteDesignConstitution", () => {
  it("flags forbidden visual patterns", () => {
    const findings = scanSourceFilesAgainstConstitution({
      "/src/App.tsx": `
        export default function App() {
          return <main className="bg-black text-white shadow-xl">bad</main>;
        }
      `,
    });

    expect(findings.some((item) => item.pattern === "bg-black")).toBe(true);
    expect(findings.some((item) => item.pattern === "text-white")).toBe(true);
    expect(findings.some((item) => item.pattern === "shadow-")).toBe(true);
  });

  it("accepts token-based surfaces without errors", () => {
    const findings = scanSourceFilesAgainstConstitution({
      "/src/App.tsx": `
        export default function App() {
          return (
            <main className="bg-[var(--surface-card)] text-[var(--text-primary)] border-[var(--border)] shadow-none">
              ok
            </main>
          );
        }
      `,
    }, DEFAULT_SITE_CONSTITUTION);

    expect(findings.filter((item) => item.severity === "error")).toHaveLength(0);
  });

  it("summarizes findings deterministically", () => {
    const summary = summarizeConstitutionFindings([
      { severity: "error", file: "/src/a.tsx", pattern: "bg-black", message: "bad" },
      { severity: "warning", file: "/src/b.tsx", pattern: "semantic-colors", message: "warn" },
    ]);

    expect(summary).toBe("1 erro(s) e 1 aviso(s) encontrados na validacao da constituicao visual.");
  });
});
