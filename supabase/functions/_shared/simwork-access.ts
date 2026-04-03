import type { User } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createServiceClient } from "./postgen.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;
type SimworkRole = "owner" | "admin" | "editor" | "viewer";

export const resolveRequestUser = async (
  req: Request,
  supabase: ServiceClient,
): Promise<User | null> => {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.warn("[simwork-access] auth.getUser failed:", error.message);
    return null;
  }

  return data.user ?? null;
};

export const assertWorkspaceAccess = async (
  req: Request,
  supabase: ServiceClient,
  workspaceId: string,
): Promise<{ user: User; role: SimworkRole } | null> => {
  const user = await resolveRequestUser(req, supabase);
  if (!user) return null;

  const { data, error } = await supabase
    .from("sw_workspace_members")
    .select("role,status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[simwork-access] membership lookup failed:", error.message);
    return null;
  }

  if (!data?.role || data.status !== "active") return null;
  return { user, role: data.role as SimworkRole };
};

export const assertWorkspaceRole = async (
  req: Request,
  supabase: ServiceClient,
  workspaceId: string,
  allowedRoles: SimworkRole[],
) => {
  const access = await assertWorkspaceAccess(req, supabase, workspaceId);
  if (!access) return null;
  return allowedRoles.includes(access.role) ? access : null;
};

export const sanitizeLogPayload = (payload: unknown): unknown => {
  if (Array.isArray(payload)) {
    return payload.map(sanitizeLogPayload);
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.includes("token") ||
        normalizedKey.includes("secret") ||
        normalizedKey.includes("password") ||
        normalizedKey.includes("authorization") ||
        normalizedKey.includes("key_value")
      ) {
        return [key, "[redacted]"];
      }
      return [key, sanitizeLogPayload(value)];
    }),
  );
};
