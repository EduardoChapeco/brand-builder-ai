import { supabase } from '@/integrations/supabase/client';

export type SecureApiKeyRecord = {
  id: string;
  service: string;   // coluna real = 'service' (não 'provider')
  label: string;     // coluna real = 'label' (não 'alias')
  is_active: boolean;
};

type SecureUpsertPayload = {
  workspaceId: string;
  service: string;   // renomeado de 'provider' para 'service'
  label: string;     // renomeado de 'alias' para 'label'
  keyValue: string;
};

type SecureDeletePayload = {
  workspaceId: string;
  keyId: string;
};

export async function createSecureApiKey(payload: SecureUpsertPayload): Promise<SecureApiKeyRecord> {
  const { data, error } = await supabase.functions.invoke('api-key-secure-upsert', {
    body: {
      workspace_id: payload.workspaceId,
      service: payload.service,
      label: payload.label,
      key_value: payload.keyValue,
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
