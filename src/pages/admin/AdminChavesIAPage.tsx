import { useState } from 'react';
import { Key, Plus, Trash2, CheckCircle2, ShieldAlert, Cpu, Eye, EyeOff } from 'lucide-react';
import { SwCard, SwButton, SwInput, SwBadge } from '@/components/shared/SwComponents';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AdminChavesIAPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);
  
  const [newKey, setNewKey] = useState({
    service: 'openai',
    label: '',
    key_encrypted: ''
  });

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['admin_api_keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const addKeyMutation = useMutation({
    mutationFn: async (keyData: typeof newKey) => {
      const { data, error } = await supabase
        .from('admin_api_keys')
        .insert([keyData])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_api_keys'] });
      setIsAdding(false);
      setNewKey({ service: 'openai', label: '', key_encrypted: '' });
      toast.success('Chave adicionada com sucesso no cofre global.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar chave: ' + error.message);
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_api_keys')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_api_keys'] });
      toast.success('Chave removida permanentemente.');
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.label || !newKey.key_encrypted) {
      toast.error('Preencha o rótulo e a chave.');
      return;
    }
    addKeyMutation.mutate(newKey);
  };

  const getServiceIcon = (service: string) => {
    switch(service) {
      case 'openai': return <Cpu size={16} className="text-emerald-400" />;
      case 'anthropic': return <Cpu size={16} className="text-amber-400" />;
      case 'gemini': return <Cpu size={16} className="text-blue-400" />;
      default: return <Key size={16} className="text-stone-400" />;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 font-display flex items-center gap-3">
            <Key className="text-[#a855f7]" size={32} />
            Cofre de IA Global
          </h1>
          <p className="text-stone-400 font-medium">Gestão centralizada de chaves de API para os Agentes e Módulos do Simwork.</p>
        </div>
        <SwButton 
          variant="primary" 
          className="bg-[#a855f7] hover:bg-[#9333ea] text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Cancelar' : <><Plus size={16} /> Adicionar Nova Chave</>}
        </SwButton>
      </div>

      {isAdding && (
        <SwCard glass className="p-6 border-[#a855f7]/30 bg-white/[0.02]">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Provedor</label>
                <select 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]/50 appearance-none"
                  value={newKey.service}
                  onChange={(e) => setNewKey({...newKey, service: e.target.value})}
                >
                  <option value="openai">OpenAI (GPT-4)</option>
                  <option value="anthropic">Anthropic (Claude 3)</option>
                  <option value="gemini">Google (Gemini Pro)</option>
                  <option value="replicate">Replicate (Imagens/Vídeos)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Rótulo / Conta</label>
                <SwInput 
                  placeholder="Ex: Conta Corporativa Principal" 
                  value={newKey.label}
                  onChange={(e) => setNewKey({...newKey, label: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Token / Chave API</label>
                <SwInput 
                  type="password" 
                  placeholder="sk-..." 
                  value={newKey.key_encrypted}
                  onChange={(e) => setNewKey({...newKey, key_encrypted: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <SwButton 
                type="submit" 
                variant="primary" 
                className="bg-white text-black hover:bg-stone-200"
                disabled={addKeyMutation.isPending}
              >
                {addKeyMutation.isPending ? 'Salvando...' : 'Salvar no Cofre'}
              </SwButton>
            </div>
          </form>
        </SwCard>
      )}

      <SwCard glass className="p-0 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="font-bold flex items-center gap-2 text-white">
            <ShieldAlert size={18} className="text-emerald-500" /> 
            Chaves Ativas no Sistema
          </h3>
          <SwBadge variant="accent">{apiKeys?.length || 0} Registradas</SwBadge>
        </div>
        
        <div className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-stone-500">Decriptando cofre...</div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-stone-500 bg-white/[0.01]">
                  <th className="p-4 font-semibold">Provedor</th>
                  <th className="p-4 font-semibold">Rótulo</th>
                  <th className="p-4 font-semibold">Token</th>
                  <th className="p-4 font-semibold">Uso Mensal</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(key.service)}
                        <span className="text-sm font-bold text-white capitalize">{key.service}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-stone-300">{key.label}</td>
                    <td className="p-4 font-mono text-xs text-stone-500 flex items-center gap-2">
                      {showKey === key.id ? key.key_encrypted : '••••••••••••••••••••••••'}
                      <button 
                        onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                        className="text-stone-600 hover:text-white transition-colors ml-2"
                      >
                        {showKey === key.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </td>
                    <td className="p-4 text-sm text-stone-400">
                      {key.current_usage || 0} reqs
                    </td>
                    <td className="p-4">
                      {key.is_active ? (
                        <SwBadge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">ATIVO</SwBadge>
                      ) : (
                        <SwBadge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">INATIVO</SwBadge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <SwButton 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          if (window.confirm(`Remover chave ${key.label}? Isto pode quebrar integrações.`)) {
                            deleteKeyMutation.mutate(key.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </SwButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center">
              <Key size={48} className="mx-auto text-stone-800 mb-4" />
              <p className="text-white font-bold mb-1">Cofre Vazio</p>
              <p className="text-sm text-stone-500 mb-6">Nenhuma chave de IA foi configurada globalmente ainda.</p>
              <SwButton 
                variant="ghost" 
                className="border-stone-800 text-stone-400"
                onClick={() => setIsAdding(true)}
              >
                Cadastrar Primeira Chave
              </SwButton>
            </div>
          )}
        </div>
      </SwCard>
    </div>
  );
}
