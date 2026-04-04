// src/lib/ccp.ts
// CCP = Context Control Protocol
// Compila o contexto completo de marca para uso nas IAs
// SDD-1.0 REGRA: Chamar getCCPSnapshot() antes de QUALQUER geração com IA

import { supabase } from "./supabase";
import { logError } from "./error-logger";
import type { CCPSnapshot } from "../types/app.types";

export async function getCCPSnapshot(workspaceId: string): Promise<CCPSnapshot> {
  // Executa queries em paralelo
  const [workspaceResult, brandKitResult, briefingResult, personasResult] =
    await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, slug, plan")
        .eq("id", workspaceId)
        .single(),

      supabase
        .from("brand_kits")
        .select("id, colors, fonts, logos, voice")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),

      supabase
        .from("briefings")
        .select("company, audience, content, completeness_score")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),

      supabase
        .from("agents")
        .select("id, name, config")
        .eq("workspace_id", workspaceId)
        .eq("agent_type", "persona")
        .eq("is_active", true),
    ]);

  if (workspaceResult.error || !workspaceResult.data) {
    const msg = `[CCP_001] Workspace ${workspaceId} não encontrado`;
    await logError({
      code: "CCP_001",
      module: "ccp",
      message: msg,
      detail: { error: workspaceResult.error?.message, workspaceId },
      workspaceId,
    });
    throw new Error(msg);
  }

  const snapshot: CCPSnapshot = {
    workspace: workspaceResult.data,
    brand_kit: brandKitResult.data ?? null,
    briefing: briefingResult.data ?? null,
    active_personas: personasResult.data ?? [],
    completeness: calcCompleteness(briefingResult.data, brandKitResult.data),
  };

  return snapshot;
}

function calcCompleteness(
  briefing: CCPSnapshot["briefing"],
  brandKit: CCPSnapshot["brand_kit"],
): CCPSnapshot["completeness"] {
  if (!briefing && !brandKit) return "vazio";
  const score = briefing?.completeness_score ?? 0;
  if (score >= 80 && brandKit?.colors) return "completo";
  return "parcial";
}

// Converte o snapshot em XML para injetar no system prompt das IAs
export function snapshotToXML(snapshot: CCPSnapshot): string {
  return `<context>
  <workspace name="${snapshot.workspace.name}" plan="${snapshot.workspace.plan}" />
  <brand_kit status="${snapshot.brand_kit ? "configurado" : "não configurado"}" />
  <briefing completeness="${snapshot.briefing?.completeness_score ?? 0}%">
    <company>${JSON.stringify(snapshot.briefing?.company ?? {})}</company>
    <audience>${JSON.stringify(snapshot.briefing?.audience ?? {})}</audience>
    <content>${JSON.stringify(snapshot.briefing?.content ?? {})}</content>
  </briefing>
  <personas count="${snapshot.active_personas.length}">
    ${snapshot.active_personas
      .map((p) => `<persona id="${p.id}" name="${p.name}" />`)
      .join("\n    ")}
  </personas>
</context>`;
}
