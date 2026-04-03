import { supabase } from '@/integrations/supabase/client';

export type SecureApiKeyRecord = {
  id: string;
  provider: string;
  alias: string | null;
  key_preview: string | null;
  calls_today: number | null;
  daily_limit: number | null;
  is_active: boolean | null;
};

type SecureUpsertPayload = {
  workspaceId: string;
  provider: string;
  alias: string | null;
  keyValue: string;
  dailyLimit: number;
  monthlyLimit?: number;
};

type SecureDeletePayload = {
  workspaceId: string;
  keyId: string;
};

export async function createSecureApiKey(payload: SecureUpsertPayload): Promise<SecureApiKeyRecord> {
  const { data, error } = await supabase.functions.invoke('api-key-secure-upsert', {
    body: {
      workspace_id: payload.workspaceId,
      provider: payload.provider,
      alias: payload.alias,
      key_value: payload.keyValue,
      daily_limit: payload.dailyLimit,
      monthly_limit: payload.monthlyLimit ?? 5000,
    },
  });

  if (error) throw error;
  return data as SecureApiKeyRecord;
}

export async function archiveSecureApiKey(payload: SecureDeletePayload): Promise<void> {
  const { error } = await supabase.functions.invoke('api-key-secure-delete', {
    body: {
      workspace_id: payload.workspaceId,
      key_id: payload.keyId,
    },
  });

  if (error) throw error;
}
