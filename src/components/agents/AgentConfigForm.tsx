import { useState } from 'react';
import { Agent, PersonaConfig, InfluencerConfig, MascoteConfig } from '@/types/app.types';
import { SwButton, SwInput, SwBadge } from '@/components/shared/SwComponents';
import { Users2, UserCircle2, BrainCircuit, Sparkles, Trash2, Plus } from 'lucide-react';

interface Props {
  agent: Agent;
  onSave: (config: PersonaConfig | InfluencerConfig | MascoteConfig | Record<string, unknown>) => void;
  onCancel: () => void;
}

const DEFAULT_PERSONA: PersonaConfig = {
  demographics: { age_range: '30-40', gender: 'neutro', location: 'Brasil', income_range: '3-10k', education: 'Superior', occupation: 'Profissional Liberal' },
  psychographics: { values: [], lifestyle: 'Urbano/Conectado', pain_points: [], desires: [] },
  sor_model: { stimulus_sensitivity: { price: 0.5, quality: 0.8, social_proof: 0.7 }, organism_filters: [], typical_responses: [] }
};

const DEFAULT_INFLUENCER: InfluencerConfig = {
  handle: '@exemplo',
  platform: 'Instagram',
  audience_size: 10000,
  niche: 'Tecnologia',
  personality: 'Analítico e Direto',
  content_style: 'Educacional/Review'
};

const DEFAULT_MASCOTE: MascoteConfig = {
  visual_description: 'Um robô amigável com cores da marca',
  personality: 'Prestativo e Criativo',
  backstory: 'Criado para facilitar a vida dos usuários do Simwork',
  use_cases: ['Suporte', 'Onboarding', 'Mídias Sociais']
};

export default function AgentConfigForm({ agent, onSave, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState<'geral' | 'especifico' | 'sor'>('geral');
  const [config, setConfig] = useState<any>(() => {
    if (agent.config && Object.keys(agent.config).length > 0) return agent.config;
    if (agent.agent_type === 'persona') return DEFAULT_PERSONA;
    if (agent.agent_type === 'influencer') return DEFAULT_INFLUENCER;
    if (agent.agent_type === 'mascote') return DEFAULT_MASCOTE;
    return {};
  });

  const handleAddField = (path: string, value: string) => {
    const parts = path.split('.');
    const newConfig = { ...config };
    let current = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    const key = parts[parts.length - 1];
    if (!Array.isArray(current[key])) {
        current[key] = [];
    }
    current[key] = [...current[key], value];
    setConfig(newConfig);
  };

  const handleRemoveField = (path: string, index: number) => {
    const parts = path.split('.');
    const newConfig = { ...config };
    let current = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
    }
    const key = parts[parts.length - 1];
    if (Array.isArray(current[key])) {
        current[key] = current[key].filter((_: unknown, i: number) => i !== index);
    }
    setConfig(newConfig);
  };

  const renderPersonaForm = () => {
    const persona = config as PersonaConfig;
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex gap-4 border-b border-white/5 pb-2">
          {(['geral', 'especifico', 'sor'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`text-[10px] font-bold uppercase tracking-widest pb-2 transition-all ${
                activeTab === t ? 'text-[#a855f7] border-b-2 border-[#a855f7]' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {t === 'geral' ? 'Demografia' : t === 'especifico' ? 'Psicografia' : 'Modelo S-O-R'}
            </button>
          ))}
        </div>

        {activeTab === 'geral' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Faixa Etária</label>
              <SwInput 
                value={persona.demographics?.age_range || ''} 
                onChange={(e) => setConfig({
                  ...config, 
                  demographics: { ...persona.demographics, age_range: e.target.value }
                })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Gênero</label>
              <SwInput 
                value={persona.demographics?.gender || ''} 
                onChange={(e) => setConfig({
                  ...config, 
                  demographics: { ...persona.demographics, gender: e.target.value }
                })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Ocupação</label>
              <SwInput 
                value={persona.demographics?.occupation || ''} 
                onChange={(e) => setConfig({
                  ...config, 
                  demographics: { ...persona.demographics, occupation: e.target.value }
                })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Renda</label>
              <SwInput 
                value={persona.demographics?.income_range || ''} 
                onChange={(e) => setConfig({
                  ...config, 
                  demographics: { ...persona.demographics, income_range: e.target.value }
                })}
              />
            </div>
          </div>
        )}

        {activeTab === 'especifico' && (
          <div className="space-y-6">
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Dores (Pain Points)</label>
                 <SwButton variant="ghost" size="sm" onClick={() => handleAddField('psychographics.pain_points', 'Nova dor...')}>
                   <Plus size={12} />
                 </SwButton>
               </div>
               <div className="flex flex-wrap gap-2">
                  {persona.psychographics?.pain_points?.map((pain: string, i: number) => (
                    <SwBadge key={i} variant="outline" className="group flex items-center gap-2">
                      {pain}
                      <button onClick={() => handleRemoveField('psychographics.pain_points', i)} className="opacity-0 group-hover:opacity-100 text-red-500">
                        <Trash2 size={10} />
                      </button>
                    </SwBadge>
                  ))}
               </div>
            </div>
            
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Desejos & Metas</label>
                 <SwButton variant="ghost" size="sm" onClick={() => handleAddField('psychographics.desires', 'Novo desejo...')}>
                   <Plus size={12} />
                 </SwButton>
               </div>
               <div className="flex flex-wrap gap-2">
                  {persona.psychographics?.desires?.map((des: string, i: number) => (
                    <SwBadge key={i} variant="outline" className="group flex items-center gap-2 border-emerald-500/30 text-emerald-400">
                      {des}
                      <button onClick={() => handleRemoveField('psychographics.desires', i)} className="opacity-0 group-hover:opacity-100 text-red-500">
                        <Trash2 size={10} />
                      </button>
                    </SwBadge>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'sor' && (
          <div className="space-y-4">
             <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-[#a855f7] mb-2">
                  <BrainCircuit size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Sensibilidade a Estímulos</span>
                </div>
                {Object.entries(persona.sor_model?.stimulus_sensitivity || { price: 0.5, quality: 0.8 }).map(([key, val]: [string, any]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-stone-400">{key}</span>
                      <span className="text-white">{Math.round(val * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={val} 
                      onChange={(e) => setConfig({
                        ...config,
                        sor_model: {
                          ...persona.sor_model,
                          stimulus_sensitivity: { ...persona.sor_model.stimulus_sensitivity, [key]: parseFloat(e.target.value) }
                        }
                      })}
                      className="w-full accent-[#a855f7]"
                    />
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderInfluencerForm = () => {
    const influencer = config as InfluencerConfig;
    return (
      <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">@ Handle</label>
          <SwInput 
            value={influencer.handle || ''} 
            onChange={(e) => setConfig({ ...config, handle: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Plataforma</label>
          <SwInput 
            value={influencer.platform || ''} 
            onChange={(e) => setConfig({ ...config, platform: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Nicho</label>
          <SwInput 
            value={influencer.niche || ''} 
            onChange={(e) => setConfig({ ...config, niche: e.target.value })}
          />
        </div>
        <div className="space-y-1">
           <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Estilo de Conteúdo</label>
           <SwInput 
            value={influencer.content_style || ''} 
            onChange={(e) => setConfig({ ...config, content_style: e.target.value })}
          />
        </div>
      </div>
    );
  };

  const renderMascoteForm = () => {
    const mascote = config as MascoteConfig;
    return (
      <div className="space-y-4">
         <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Descrição Visual</label>
            <SwInput 
                value={mascote.visual_description || ''} 
                onChange={(e) => setConfig({ ...config, visual_description: e.target.value })}
            />
         </div>
         <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Backstory</label>
            <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] outline-none min-h-[100px]"
                value={mascote.backstory || ''} 
                onChange={(e) => setConfig({ ...config, backstory: e.target.value })}
            />
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#a855f7]/10 rounded-2xl text-[#a855f7]">
          {agent.agent_type === 'persona' ? <Users2 size={24} /> : 
           agent.agent_type === 'influencer' ? <Sparkles size={24} /> : 
           <UserCircle2 size={24} />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white leading-tight">DNA do Agente</h3>
          <p className="text-xs text-stone-500 uppercase tracking-widest font-bold">Configure o comportamento da IA</p>
        </div>
      </div>

      <div className="min-h-[300px]">
        {agent.agent_type === 'persona' && renderPersonaForm()}
        {agent.agent_type === 'influencer' && renderInfluencerForm()}
        {agent.agent_type === 'mascote' && renderMascoteForm()}
      </div>

      <div className="flex gap-3 justify-end pt-6 border-t border-white/5">
        <SwButton variant="ghost" onClick={onCancel}>Cancelar</SwButton>
        <SwButton 
          variant="primary" 
          className="bg-[#a855f7] hover:bg-[#9333ea] text-white px-8 h-12 rounded-2xl"
          onClick={() => onSave(config)}
        >
          Salvar Configurações
        </SwButton>
      </div>
    </div>
  );
}
