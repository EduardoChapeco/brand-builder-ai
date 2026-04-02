/**
 * cerebro-context — CCP Resource Provider
 *
 * Single endpoint que serve contexto estruturado e canônico para qualquer
 * consumidor interno ou externo (agentes, n8n, Make, etc.).
 *
 * GET /cerebro-context?ws=WORKSPACE_ID&r=brand,signals,personas,policies
 *
 * Resources disponíveis (parâmetro ?r=):
 *   brand     → CCPBrandSnapshot + XML serializado
 *   signals   → top news + viral patterns (comprimidos)
 *   personas  → lista slim de personas ativas
 *   policies  → simlab module policies
 *   all       → todos os recursos em um request
 *
 * Autenticação: JWT obrigatório (verifyJwt: true)
 * Cache: 30s in-memory por workspace
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getCCPPersonasSlim,
  getCCPSignals,
  getCCPSnapshot,
  snapshotToXML,
} from "../_shared/ccp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const err = (message: string, status = 400) => json({ error: message }, status);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("ws")?.trim();
    const resources = (url.searchParams.get("r") || "brand").split(",").map((r) => r.trim());

    if (!workspaceId) {
      return err("Parâmetro 'ws' (workspace_id) é obrigatório.");
    }

    const includeAll = resources.includes("all");
    const result: Record<string, unknown> = { workspace_id: workspaceId };

    // ── brand ──────────────────────────────────────────────
    if (includeAll || resources.includes("brand")) {
      const snap = await getCCPSnapshot(supabase, workspaceId);
      result.brand = {
        snapshot: snap,
        xml: snapshotToXML(snap),
      };
    }

    // ── signals ────────────────────────────────────────────
    if (includeAll || resources.includes("signals")) {
      const signals = await getCCPSignals(supabase, workspaceId);
      result.signals = signals;
    }

    // ── personas ───────────────────────────────────────────
    if (includeAll || resources.includes("personas")) {
      const personas = await getCCPPersonasSlim(supabase, workspaceId);
      result.personas = personas;
    }

    // ── policies ───────────────────────────────────────────
    if (includeAll || resources.includes("policies")) {
      const { data: policyRows } = await supabase
        .from("simlab_module_policies")
        .select("module_type,policy_key,policy_json,is_default")
        .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
        .eq("is_active", true)
        .order("module_type");

      result.policies = (policyRows || []).map((row) => {
        const pj = (row.policy_json as Record<string, unknown>) || {};
        return {
          module_type: row.module_type,
          policy_key: row.policy_key,
          n_personas_min: pj.persona_sample_size_min ?? 2,
          n_personas_max: pj.persona_sample_size_max ?? 4,
          agents_per_persona: pj.agents_per_persona ?? 5,
          is_default: row.is_default,
        };
      });
    }

    result.fetched_at = new Date().toISOString();
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cerebro-context]", message);
    return err(message, 500);
  }
});
