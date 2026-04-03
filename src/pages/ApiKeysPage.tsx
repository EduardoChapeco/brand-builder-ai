import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Key, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fromTable } from '@/integrations/supabase/db-custom';
import { archiveSecureApiKey, createSecureApiKey } from '@/lib/apiKeys';

type ApiKeyRow = {
  id: string;
  provider: string;
  alias: string | null;
  key_preview: string | null;
  is_active: boolean;
};

const PROVIDERS = [
  { id: 'groq', name: 'Groq (LLaMA 3)' },
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'firecrawl', name: 'Firecrawl (Scraping)' },
  { id: 'steel', name: 'Steel.dev (Browser Sandbox)' },
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado';

export default function ApiKeysPage() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProvider, setNewProvider] = useState('groq');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newAlias, setNewAlias] = useState('');

  const loadKeys = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      const { data, error } = await fromTable('api_keys')
        .select('id,provider,alias,key_preview,is_active')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('provider', { ascending: true });

      if (error) throw error;
      setKeys((data || []) as ApiKeyRow[]);
    } catch (error) {
      toast.error(`Erro ao carregar chaves: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const handleAddKey = async () => {
    if (!workspaceId) return;
    if (!newKeyValue.trim()) {
      toast.warning('Insira uma chave valida');
      return;
    }

    try {
      await createSecureApiKey({
        workspaceId,
        provider: newProvider,
        alias: newAlias.trim() || null,
        keyValue: newKeyValue.trim(),
        dailyLimit: 200,
      });

      setNewKeyValue('');
      setNewAlias('');
      await loadKeys();
      toast.success('Chave adicionada com sucesso.');
    } catch (error) {
      toast.error(`Erro ao adicionar chave: ${getErrorMessage(error)}`);
    }
  };

  const handleRemoveKey = async (id: string) => {
    if (!workspaceId) return;

    try {
      await archiveSecureApiKey({ workspaceId, keyId: id });
      await loadKeys();
      toast.success('Chave removida.');
    } catch (error) {
      toast.error(`Erro ao remover chave: ${getErrorMessage(error)}`);
    }
  };

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Seguranca"
            title="Chaves e integracoes"
            description="As credenciais do workspace agora seguem write-path seguro com criptografia e preview mascarado."
          />

          <SectionCard className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--workspace-brand)]">
                <Key size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Adicionar nova chave</h2>
                <p className="text-sm text-[var(--text-secondary)]">Somente o preview fica disponivel no cliente.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_1fr_200px]">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Provider</span>
                <select
                  value={newProvider}
                  onChange={(event) => setNewProvider(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]"
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">API key</span>
                <Input
                  type="password"
                  value={newKeyValue}
                  onChange={(event) => setNewKeyValue(event.target.value)}
                  placeholder="sk-..."
                  className="h-11 rounded-xl bg-[var(--surface-2)]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Alias</span>
                <Input
                  value={newAlias}
                  onChange={(event) => setNewAlias(event.target.value)}
                  placeholder="Alias interno"
                  className="h-11 rounded-xl bg-[var(--surface-2)]"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleAddKey} className="rounded-xl px-5 shadow-none">
                <Plus size={14} />
                Adicionar chave
              </Button>
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Chaves ativas</h2>
                <p className="text-sm text-[var(--text-secondary)]">Visualizacao mascarada e sem surfaces hardcoded.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-8 text-sm text-[var(--text-secondary)]">
                Carregando chaves...
              </div>
            ) : keys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-10 text-center">
                <AlertCircle size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">Nenhuma chave configurada ainda.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {keys.map((key) => {
                  const providerInfo = PROVIDERS.find((provider) => provider.id === key.provider) || {
                    name: key.provider,
                  };

                  return (
                    <div
                      key={key.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{providerInfo.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--workspace-brand)]">
                            {key.is_active ? 'Ativa' : 'Pausada'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 shadow-none hover:bg-red-500/10 hover:text-red-600"
                          onClick={() => void handleRemoveKey(key.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2">
                        <code className="block truncate text-xs text-[var(--text-secondary)]">
                          {`••••••••••••${key.key_preview || '----'}`}
                        </code>
                      </div>

                      <p className="text-xs text-[var(--text-muted)]">{key.alias || 'Sem alias definido'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
