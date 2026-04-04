/**
 * cerebro-context Edge Function — CCP Snapshot para LLMs
 * SW-013: Retorna o contexto completo da marca para Edge Functions de IA
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "ERR_CCP_AUTH_001", message: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verificar usuário
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "ERR_CCP_AUTH_002", message: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obter workspace_id do body ou query
    const url = new URL(req.url);
    let workspaceId = url.searchParams.get("workspace_id");

    if (!workspaceId && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      workspaceId = body.workspace_id;
    }

    if (!workspaceId) {
      // Buscar workspace do usuário automaticamente
      const { data: ws } = await supabaseAdmin
        .from("sw_workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      workspaceId = ws?.id ?? null;
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "ERR_CCP_WORKSPACE_001", message: "Workspace não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados em paralelo
    const [workspaceResult, briefingResult, brandKitResult, agentsResult, simlabResult] =
      await Promise.all([
        supabaseAdmin
          .from("sw_workspaces")
          .select("id, owner_id, name, slug, sector, website, settings")
          .eq("id", workspaceId)
          .single(),
        supabaseAdmin
          .from("sw_briefings")
          .select("*")
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
        supabaseAdmin
          .from("sw_brand_kits")
          .select("*")
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
        supabaseAdmin
          .from("sw_agents")
          .select("id, name, type, status, identity, voice, memory, behavior")
          .eq("workspace_id", workspaceId)
          .in("type", ["persona", "brand", "creator"])
          .eq("status", "active"),
        supabaseAdmin
          .from("sw_simlab_profiles")
          .select("id, name, persona, behaviors, insights")
          .eq("workspace_id", workspaceId),
      ]);

    if (workspaceResult.error || !workspaceResult.data) {
      return new Response(
        JSON.stringify({ error: "ERR_CCP_WORKSPACE_002", message: "Workspace não acessível" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const snapshot = {
      workspace: workspaceResult.data,
      briefing: briefingResult.data ?? null,
      brandKit: brandKitResult.data ?? null,
      personas: agentsResult.data ?? [],
      simlabProfiles: simlabResult.data ?? [],
    };

    // Gerar XML do CCP
    const ccpXML = serializeCCP(snapshot);

    return new Response(
      JSON.stringify({ snapshot, ccpXML, generatedAt: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "ERR_CCP_INTERNAL_001", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function serializeCCP(snapshot: Record<string, unknown>): string {
  const ws = snapshot.workspace as Record<string, string>;
  const brf = snapshot.briefing as Record<string, unknown> | null;
  const bk = snapshot.brandKit as Record<string, unknown> | null;
  const personas = snapshot.personas as Array<Record<string, unknown>>;

  return `<CCPSnapshot>
  <Workspace>
    <Name>${esc(ws?.name ?? "")}</Name>
    <Sector>${esc(ws?.sector ?? "")}</Sector>
  </Workspace>
  <Briefing>
    <CompanyName>${esc(String(brf?.company_name ?? ""))}</CompanyName>
    <ToneOfVoice>${esc(String(brf?.tone_of_voice ?? ""))}</ToneOfVoice>
    <TargetAudience>${esc(String(brf?.target_audience ?? ""))}</TargetAudience>
    <ValueProposition>${esc(String(brf?.value_proposition ?? ""))}</ValueProposition>
    <BrandDNA>${esc(String(brf?.brand_dna ?? ""))}</BrandDNA>
  </Briefing>
  <BrandKit>
    <Archetype>${esc(String(bk?.archetype ?? ""))}</Archetype>
    <Positioning>${esc(String(bk?.positioning ?? ""))}</Positioning>
  </BrandKit>
  <Personas>
    ${personas.map(p => `<Persona><Name>${esc(String(p.name))}</Name><Type>${esc(String(p.type))}</Type></Persona>`).join("\n    ")}
  </Personas>
</CCPSnapshot>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
