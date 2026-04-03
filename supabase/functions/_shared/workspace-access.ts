import type { User } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createServiceClient } from "./postgen.ts";

export const resolveRequestUser = async (
  req: Request,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<User | null> => {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.warn("[workspace-access] auth.getUser failed:", error.message);
    return null;
  }

  return data.user ?? null;
};

export const validateWorkspaceAdminAccess = async (
  req: Request,
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
): Promise<User | null> => {
  const user = await resolveRequestUser(req, supabase);
  if (!user) return null;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role,status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[workspace-access] membership lookup failed:", error.message);
    return null;
  }

  const role = data?.role;
  const status = data?.status;
  if (status !== "active") return null;
  if (role !== "owner" && role !== "admin") return null;

  return user;
};
