import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { assertWorkspaceAccess, sanitizeLogPayload } from "../_shared/simwork-access.ts";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
type LogKind = "system" | "error";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : null;
    const level = (typeof body.level === "string" ? body.level : "info") as LogLevel;
    const moduleName = typeof body.module === "string" ? body.module : "unknown";
    const message = typeof body.message === "string" ? body.message : "Sem mensagem";
    const kind = (typeof body.kind === "string" ? body.kind : "system") as LogKind;

    const supabase = createServiceClient();

    if (workspaceId) {
      const access = await assertWorkspaceAccess(req, supabase, workspaceId);
      if (!access) {
        return safeJsonResponse({ error: "Acesso negado ao workspace." }, 403);
      }
    }

    const payload = sanitizeLogPayload(body.payload ?? body.metadata ?? {});

    if (kind === "error") {
      const { error } = await supabase.from("sw_error_logs").insert({
        workspace_id: workspaceId,
        module: moduleName,
        function_name: typeof body.function_name === "string" ? body.function_name : null,
        error_code: typeof body.error_code === "string" ? body.error_code : null,
        message,
        payload,
        retry_count: typeof body.retry_count === "number" ? body.retry_count : 0,
      });

      if (error) throw error;
    } else {
      const { error } = await supabase.from("sw_system_logs").insert({
        workspace_id: workspaceId,
        level,
        module: moduleName,
        message,
        metadata: payload,
      });

      if (error) throw error;
    }

    return safeJsonResponse({ success: true });
  } catch (error) {
    console.error("[sw-log]", error);
    return safeJsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha ao persistir log.",
      },
      500,
    );
  }
});
