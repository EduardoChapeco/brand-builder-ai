/**
 * src/pages/admin/AdminFlagsPage.tsx
 * SDD-1.0 — Fase 10: Feature Flags globais por plano/workspace/usuário
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SwCard, SwBadge, SwButton } from '@/components/shared/SwComponents';
import { Flag, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/error-logger';

interface FeatureFlag {
  id: string;
  feature: string;
  scope: 'global' | 'plan' | 'workspace' | 'user';
  scope_value: string | null;
  is_enabled: boolean;
  created_at: string;
}

const SCOPE_COLORS: Record<string, string> = {
  global: 'text-violet-400 border-violet-400/30',
  plan: 'text-amber-400 border-amber-400/30',
  workspace: 'text-sky-400 border-sky-400/30',
  user: 'text-emerald-400 border-emerald-400/30',
};

export default function AdminFlagsPage() {
  const qc = useQueryClient();

  const { data: flags, isLoading } = useQuery({
    queryKey: ['admin_feature_flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, feature, scope, scope_value, is_enabled, created_at')
        .order('scope', { ascending: true })
        .order('feature', { ascending: true });
      if (error) {
        await logError({ code: 'ERR_FLAGS_LOAD_001', module: 'admin', message: 'Falha ao carregar feature flags', detail: { error: error.message } });
        throw error;
      }
      return data as FeatureFlag[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !current })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_feature_flags'] });
      toast.success('Feature flag atualizada.');
    },
    onError: (e: Error) => toast.error('Falha ao atualizar flag: ' + e.message),
  });

  const seedDefaultFlags = async () => {
    const defaults: Omit<FeatureFlag, 'id' | 'created_at'>[] = [
      { feature: 'module_video', scope: 'global', scope_value: null, is_enabled: true },
      { feature: 'module_simlab', scope: 'global', scope_value: null, is_enabled: true },
      { feature: 'module_agents', scope: 'global', scope_value: null, is_enabled: true },
      { feature: 'own_api_keys', scope: 'plan', scope_value: 'business', is_enabled: true },
      { feature: 'own_api_keys', scope: 'plan', scope_value: 'corp', is_enabled: true },
      { feature: 'simlab_advanced', scope: 'plan', scope_value: 'pro', is_enabled: false },
    ];
    const { error } = await supabase.from('feature_flags').upsert(defaults, { onConflict: 'feature,scope,scope_value' });
    if (error) toast.error(error.message);
    else { toast.success('Flags padrão inseridas.'); qc.invalidateQueries({ queryKey: ['admin_feature_flags'] }); }
  };

  const grouped = (flags ?? []).reduce<Record<string, FeatureFlag[]>>((acc, f) => {
    if (!acc[f.scope]) acc[f.scope] = [];
    acc[f.scope].push(f);
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-8 animate-in fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Flag className="text-[#a855f7]" size={28} /> Feature Flags
          </h1>
          <p className="text-stone-400">Controle granular de funcionalidades por escopo.</p>
        </div>
        <SwButton variant="ghost" onClick={seedDefaultFlags} className="text-stone-400 border-stone-800">
          Inserir Padrões
        </SwButton>
      </div>

      {isLoading ? (
        <div className="text-center text-stone-500 py-16">Carregando flags...</div>
      ) : !flags?.length ? (
        <SwCard glass className="p-8 text-center space-y-4">
          <AlertTriangle size={36} className="mx-auto text-stone-700" />
          <p className="text-white font-bold">Nenhuma flag configurada</p>
          <p className="text-stone-500 text-sm">Clique em "Inserir Padrões" para criar as flags iniciais do sistema.</p>
        </SwCard>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([scope, scopeFlags]) => (
            <div key={scope}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${SCOPE_COLORS[scope] ?? 'text-stone-400'}`}>
                Escopo: {scope}
              </h2>
              <SwCard glass className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                    <tr>
                      <th className="p-4">Feature</th>
                      <th className="p-4">Scope Value</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {scopeFlags.map((flag) => (
                      <tr key={flag.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono text-white font-bold">{flag.feature}</td>
                        <td className="p-4 text-stone-400">{flag.scope_value ?? '—'}</td>
                        <td className="p-4">
                          <SwBadge variant={flag.is_enabled ? 'ghost' : 'draft'} className="text-[10px]">
                            {flag.is_enabled ? 'Ativa' : 'Inativa'}
                          </SwBadge>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => toggleMutation.mutate({ id: flag.id, current: flag.is_enabled })}
                            className="text-stone-500 hover:text-white transition-colors"
                          >
                            {flag.is_enabled
                              ? <ToggleRight size={24} className="text-emerald-500" />
                              : <ToggleLeft size={24} />
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SwCard>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
