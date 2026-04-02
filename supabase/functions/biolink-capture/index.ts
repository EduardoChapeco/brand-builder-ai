import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { findOrCreateContact } from "../_shared/biolink.ts";

const asObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const captureType = typeof body.capture_type === "string" ? body.capture_type.trim() : "";

    if (!slug || !captureType) {
      return safeJsonResponse({ error: "slug e capture_type são obrigatórios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: bioLink, error: bioLinkError } = await supabase
      .from("bio_links")
      .select("id, workspace_id")
      .eq("slug", slug)
      .maybeSingle();

    if (bioLinkError || !bioLink) throw bioLinkError || new Error("Bio Link não encontrado.");

    const payload = asObject(body.payload);
    const { supabase: contactClient, contact } = await findOrCreateContact({
      workspaceId: bioLink.workspace_id,
      sourceRecordId: bioLink.id,
      sourceBlockId: typeof body.block_id === "string" ? body.block_id : null,
      name: typeof payload.name === "string" ? payload.name : null,
      email: typeof payload.email === "string" ? payload.email : null,
      phone: typeof payload.phone === "string" ? payload.phone : null,
      metadata: payload,
    });

    await contactClient.from("crm_interactions").insert({
      workspace_id: bioLink.workspace_id,
      contact_id: contact.id as string,
      source_module: "bio_link",
      source_record_id: bioLink.id,
      source_block_id: typeof body.block_id === "string" ? body.block_id : null,
      interaction_type: captureType,
      payload,
    });

    if (captureType === "contact_form") {
      await contactClient.from("crm_messages").insert({
        workspace_id: bioLink.workspace_id,
        contact_id: contact.id as string,
        source_module: "bio_link",
        source_record_id: bioLink.id,
        source_block_id: typeof body.block_id === "string" ? body.block_id : null,
        subject: typeof payload.subject === "string" ? payload.subject : null,
        body: typeof payload.message === "string" ? payload.message : null,
        fields: payload,
        status: "new",
      });
    }

    if (captureType === "booking") {
      await contactClient.from("crm_bookings").insert({
        workspace_id: bioLink.workspace_id,
        contact_id: contact.id as string,
        source_module: "bio_link",
        source_record_id: bioLink.id,
        source_block_id: typeof body.block_id === "string" ? body.block_id : null,
        service_name: typeof payload.service_name === "string" ? payload.service_name : "Agendamento",
        scheduled_at: typeof payload.scheduled_at === "string" ? payload.scheduled_at : null,
        status: "pending",
        metadata: payload,
      });
    }

    if (captureType === "event_registration") {
      await contactClient.from("crm_event_registrations").insert({
        workspace_id: bioLink.workspace_id,
        contact_id: contact.id as string,
        source_module: "bio_link",
        source_record_id: bioLink.id,
        source_block_id: typeof body.block_id === "string" ? body.block_id : null,
        event_name: typeof payload.event_name === "string" ? payload.event_name : "Evento",
        event_date: typeof payload.event_date === "string" ? payload.event_date : null,
        metadata: payload,
      });
    }

    if (captureType === "download") {
      await contactClient.from("crm_downloads").insert({
        workspace_id: bioLink.workspace_id,
        contact_id: contact.id as string,
        source_module: "bio_link",
        source_record_id: bioLink.id,
        source_block_id: typeof body.block_id === "string" ? body.block_id : null,
        asset_name: typeof payload.asset_name === "string" ? payload.asset_name : "Download",
        asset_url: typeof payload.asset_url === "string" ? payload.asset_url : null,
        metadata: payload,
      });
    }

    return safeJsonResponse({
      ok: true,
      capture_type: captureType,
      contact_id: contact.id,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
