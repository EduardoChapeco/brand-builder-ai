import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Key, Plus, Trash2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type ApiKeyRow = {
  id: string;
  provider: string;
  alias: string | null;
  key_value: string;
  is_active: boolean;
};

const PROVIDERS = [
  { id: 'groq', name: 'Groq (LLaMA 3)', icon: '⚡' },
  { id: 'gemini', name: 'Google Gemini', icon: '🧠' },
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐' },
  { id: 'firecrawl', name: 'Firecrawl (Scraping)', icon: '🕷️' },
  { id: 'steel', name: 'Steel.dev (Browser Sandbox)', icon: '🛡️' },
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
  const [showKey, setShowKey] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('provider', { ascending: true });
        
      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      toast.error('Erro ao carregar chaves: ' + getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      loadKeys();
    }
  }, [workspaceId, loadKeys]);

  const handleAddKey = async () => {
    if (!newKeyValue.trim()) {
      toast.warning('Insira uma chave válida');
      return;
    }
    
    try {
      const { error } = await supabase.from('api_keys').insert({
        workspace_id: workspaceId!,
        provider: newProvider,
        key_value: newKeyValue.trim(),
        alias: newAlias.trim() || null,
        is_active: true
      });
      
      if (error) throw error;
      
      toast.success('Chave adicionada com sucesso!');
      setNewKeyValue('');
      setNewAlias('');
      loadKeys();
    } catch (error) {
      toast.error('Erro ao adicionar chave: ' + getErrorMessage(error));
    }
  };

  const handleRemoveKey = async (id: string) => {
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
      toast.success('Chave removida');
      loadKeys();
    } catch (error) {
      toast.error('Erro ao remover chave: ' + getErrorMessage(error));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto page-transition pb-24" style={{ backgroundColor: 'var(--bg-app)' }}>
      <header className="px-6 py-8 border-b" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>Integrações & APIs</h1>
        <p style={{ color: 'var(--text-3)' }}>
          Configure as chaves do seu esquadrão de agentes de IA e raspagem de dados.
        </p>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* ADD NEW KEY */}
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <Key size={18} style={{ color: 'var(--primary)' }} />
            Adicionar Nova Chave
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Provedor</label>
              <select 
                value={newProvider} 
                onChange={e => setNewProvider(e.target.value)}
                className="w-full text-sm rounded-xl py-2 px-3 border outline-none"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>API Key</label>
              <input 
                type="password" 
                value={newKeyValue} 
                onChange={e => setNewKeyValue(e.target.value)}
                placeholder="sk-..."
                className="w-full text-sm rounded-xl py-2 px-3 border outline-none"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
              />
            </div>

            <button 
              onClick={handleAddKey}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
            * As chaves são armazenadas associadas a este Workspace. Nossos módulos vão tentar usar suas chaves usando estratégia round-robin se houver mais de uma.
          </p>
        </div>

        {/* LIST KEYS */}
        <div>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-2)' }}>Chaves Ativas</h3>
          
          {isLoading ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando...</p>
          ) : keys.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
              <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Nenhuma chave configurada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keys.map(k => {
                const providerInfo = PROVIDERS.find(p => p.id === k.provider) || { name: k.provider, icon: '🔌' };
                const isShowing = showKey === k.id;
                
                return (
                  <div key={k.id} className="p-4 rounded-xl flex flex-col gap-3 border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{providerInfo.icon}</span>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{providerInfo.name}</p>
                          <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--primary)' }}>
                            {k.is_active ? 'ATIVO' : 'INATIVO'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveKey(k.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Remover chave"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-black/5 dark:bg-black/30">
                      <code className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                        {isShowing ? k.key_value : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <button 
                        onClick={() => setShowKey(isShowing ? null : k.id)}
                        className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {isShowing ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
