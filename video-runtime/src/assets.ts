import { promises as fs } from "node:fs";
import { supabase } from "./supabase.js";

export type PersistVideoAssetInput = {
  workspaceId: string;
  projectId?: string | null;
  assetType: string;
  bucketName: string;
  storagePath: string;
  publicUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  sourceAssetId?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
};

export const persistVideoAsset = async (params: PersistVideoAssetInput) => {
  const { data, error } = await supabase
    .from("video_assets")
    .insert({
      workspace_id: params.workspaceId,
      video_project_id: params.projectId || null,
      asset_type: params.assetType,
      bucket_name: params.bucketName,
      storage_path: params.storagePath,
      public_url: params.publicUrl || null,
      mime_type: params.mimeType || null,
      file_name: params.fileName || null,
      file_size_bytes: params.fileSizeBytes ?? null,
      duration_ms: params.durationMs ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
      source_asset_id: params.sourceAssetId || null,
      status: params.status || "uploaded",
      metadata: params.metadata || {},
      waveform_json: [],
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error || new Error("Failed to persist video asset.");
  }

  return data;
};

export const uploadFileAndPersistVideoAsset = async (params: PersistVideoAssetInput & { filePath: string }) => {
  const bytes = await fs.readFile(params.filePath);
  const { error: uploadError } = await supabase.storage
    .from(params.bucketName)
    .upload(params.storagePath, bytes, {
      contentType: params.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(params.bucketName).getPublicUrl(params.storagePath);
  return persistVideoAsset({
    ...params,
    fileSizeBytes: bytes.byteLength,
    publicUrl: publicUrl.publicUrl || null,
    status: params.status || "uploaded",
  });
};
