/**
 * src/pages/AgentsPage.tsx
 * SDD-1.0 — Fase 7: Módulo de Agentes (Personas SimLab, Influenciadores, Mascotes)
 * Conectado ao schema canônico: tabela agents
 */
import { useEffect, useState } from 'react';
import {
  Bot, Plus, Trash2, Pencil, UserCircle2, Star, Sparkles,
  BrainCircuit, SendHorizontal, ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toast } from 'sonner';
import { SwButton, SwCard, SwBadge, SwInput, SwSpinner } from '@/components/shared/SwComponents';
import EmptyState from '@/components/shared/EmptyState';
import { ErrorBadge } from '@/components/shared/ErrorBadge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgents } from '@/hooks/useAgents';
import type { Agent, AgentType } from '@/types/app.types';

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  persona: 'Persona SimLab',
  influencer: 'Influenciador',
  mascote: 'Mascote',
  squad: 'Squad',
};

const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  persona: 'text-violet-400 bg-violet-400/10',
  influencer: 'text-amber-400 bg-amber-400/10',
  mascote: 'text-emerald-400 bg-emerald-400/10',
  squad: 'text-sky-400 bg-sky-400/10',
};

const AGENT_TABS: Array<{ key: AgentType | 'todos'; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'persona', label: 'Personas' },
  { key: 'influencer', label: 'Influenciadores' },
  { key: 'mascote', label: 'Mascotes' },
  { key: 'squad', label: 'Squads' },
];

function AgentCard({
  agent,
  onEdit,
  onToggle,
  onDelete,
}: {
  agent: Agent;
  onEdit: (a: Agent) => void;
  onToggle: (a: Agent) => void;
  onDelete: (id: string) => void;
}) {
  const typeColor = AGENT_TYPE_COLORS[agent.agent_type] ?? 'text-stone-400 bg-stone-400/10';
  const score = agent.calibration_score;

  return (
    <SwCard glass className="p-5 space-y-4 hover:border-[#a855f7]/30 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={agent.name} className="w-11 h-11 rounded-2xl object-cover" />
          ) : (
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${typeColor}`}>
              <Bot size={22} />
            </div>
          )}
          <div>
            <p className="font-bold text-white text-sm leading-tight">{agent.name}</p>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${typeColor}`}>
              {AGENT_TYPE_LABELS[agent.agent_type]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(agent)}
            className="p-2 rounded-xl text-stone-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onToggle(agent)}
            className="p-2 rounded-xl text-stone-500 hover:text-white hover:bg-white/10 transition-all"
          >
            {agent.is_active ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} />}
          </button>
          <button
            onClick={() => onDelete(agent.id)}
            className="p-2 rounded-xl text-stone-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Score de calibração */}
      {score !== null && score !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-stone-500 uppercase tracking-widest font-bold">Calibração SimLab</span>
            <span className={`font-bold ${score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {score}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {/* Chip de status */}
      <div className="flex items-center justify-between">
        <SwBadge variant={agent.is_active ? 'ghost' : 'draft'} className="text-[10px]">
          {agent.is_active ? 'Ativo' : 'Inativo'}
        </SwBadge>
        <button
          onClick={() => onEdit(agent)}
          className="text-[10px] text-stone-500 hover:text-[#a855f7] flex items-center gap-1 transition-colors font-bold uppercase tracking-widest"
        >
          Configurar <ChevronRight size={12} />
        </button>
      </div>
    </SwCard>
  );
}

function CreateAgentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, type: AgentType) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AgentType>('persona');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <SwCard glass className="w-full max-w-md p-8 space-y-6 animate-in fade-in zoom-in-95">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Novo Agente</h2>
          <p className="text-stone-400 text-sm">Defina o tipo e nome do seu agente inteligente.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Nome do Agente</label>
            <SwInput
              id="agent-name"
              placeholder="Ex: Persona Consumidora Tech B2B"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['persona', 'influencer', 'mascote', 'squad'] as AgentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    type === t
                      ? 'bg-[#a855f7]/20 border-[#a855f7] text-white'
                      : 'bg-white/5 border-white/10 text-stone-400 hover:bg-white/10'
                  }`}
                >
                  {AGENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <SwButton variant="ghost" onClick={onClose}>Cancelar</SwButton>
          <SwButton
            variant="primary"
            disabled={!name.trim()}
            className="bg-[#a855f7] hover:bg-[#9333ea] text-white"
            onClick={() => { onCreate(name.trim(), type); onClose(); }}
          >
            <Plus size={16} /> Criar Agente
          </SwButton>
        </div>
      </SwCard>
    </div>
  );
}

export default function AgentsPage() {
  const { workspace } = useWorkspace();
  const { agents, isLoading, error, errorCode, fetch, create, update, remove } = useAgents(
    workspace?.id ?? ''
  );

  const [activeTab, setActiveTab] = useState<AgentType | 'todos'>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    if (workspace?.id) fetch();
  }, [workspace?.id, fetch]);

  const filtered = activeTab === 'todos'
    ? agents
    : agents.filter((a) => a.agent_type === activeTab);

  const handleCreate = async (name: string, type: AgentType) => {
    const result = await create(name, type);
    if (result) {
      toast.success(`Agente "${name}" criado com sucesso.`);
    } else {
      toast.error('Falha ao criar agente. Verifique os logs do sistema.');
    }
  };

  const handleToggle = async (agent: Agent) => {
    const ok = await update(agent.id, { is_active: !agent.is_active });
    if (ok) {
      toast.success(agent.is_active ? `"${agent.name}" desativado.` : `"${agent.name}" ativado.`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este agente permanentemente?')) return;
    const ok = await remove(id);
    if (ok) toast.success('Agente removido.');
    else toast.error('Falha ao remover. Verifique os logs.');
  };

  const stats = {
    total: agents.length,
    ativos: agents.filter((a) => a.is_active).length,
    calibrados: agents.filter((a) => (a.calibration_score ?? 0) >= 70).length,
  };

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-8 py-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SwBadge variant="outline" className="text-[#a855f7] border-[#a855f7]/30">SimLab v2.0</SwBadge>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Inteligência Operacional</span>
              </div>
              <h1 className="text-4xl font-bold font-display text-white tracking-tight">
                Agentes & <span className="text-[#a855f7]">Personas</span>
              </h1>
              <p className="text-stone-400 mt-2 max-w-xl">
                Configure personas sintéticas, influenciadores e mascotes para validação SimLab e geração de conteúdo contextual.
              </p>
            </div>
            <SwButton
              variant="primary"
              className="bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-2xl px-6 h-12 flex items-center gap-2"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={18} /> Novo Agente
            </SwButton>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total de Agentes', value: stats.total, icon: Bot, color: 'text-violet-400' },
              { label: 'Agentes Ativos', value: stats.ativos, icon: ToggleRight, color: 'text-emerald-400' },
              { label: 'Calibrados (+70%)', value: stats.calibrados, icon: Star, color: 'text-amber-400' },
            ].map((m) => (
              <SwCard key={m.label} glass className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white/5 ${m.color}`}>
                  <m.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{m.value}</p>
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">{m.label}</p>
                </div>
              </SwCard>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {AGENT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${
                  activeTab === tab.key
                    ? 'bg-[#a855f7] border-[#a855f7] text-white'
                    : 'bg-white/5 border-white/10 text-stone-400 hover:bg-white/10'
                }`}
              >
                {tab.label}
                {tab.key !== 'todos' && (
                  <span className="ml-2 opacity-60">{agents.filter((a) => a.agent_type === tab.key).length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Error / Loading / List */}
          {error ? (
            <ErrorBadge code={errorCode ?? 'ERR_AGENT_LOAD_001'} message={error} />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-24">
              <SwSpinner className="w-8 h-8 text-[#a855f7]" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={BrainCircuit}
              title="Nenhum agente cadastrado"
              description={activeTab === 'todos'
                ? 'Crie sua primeira persona sintética para começar a validar conteúdo com SimLab.'
                : `Nenhum agente do tipo "${AGENT_TYPE_LABELS[activeTab as AgentType]}" encontrado.`}
              action={{ label: 'Criar Primeiro Agente', onClick: () => setShowCreate(true), icon: Plus }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={setEditingAgent}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Painel info SimLab */}
          <SwCard glass className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 bg-[#a855f7]/10 rounded-2xl text-[#a855f7]">
              <Sparkles size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">O que é o SimLab?</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                SimLab é o sistema de validação de conteúdo do Simwork. Cada persona avalia seu conteúdo (posts, bio links, vídeos) com base em modelos de comportamento S-O-R, garantindo que a mensagem chegue corretamente ao seu público-alvo antes da publicação.
              </p>
            </div>
            <SwButton variant="ghost" className="shrink-0 flex items-center gap-2">
              <SendHorizontal size={16} /> Ver Validações
            </SwButton>
          </SwCard>

        </div>
      </div>

      {/* Modais */}
      {showCreate && (
        <CreateAgentModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {editingAgent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <SwCard glass className="w-full max-w-lg p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Editar Agente</h2>
              <SwButton variant="ghost" onClick={() => setEditingAgent(null)}>✕</SwButton>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Nome</label>
                <SwInput
                  id="edit-agent-name"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">URL do Avatar</label>
                <SwInput
                  id="edit-agent-avatar"
                  placeholder="https://..."
                  value={editingAgent.avatar_url ?? ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, avatar_url: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <SwButton variant="ghost" onClick={() => setEditingAgent(null)}>Cancelar</SwButton>
              <SwButton
                variant="primary"
                className="bg-[#a855f7] hover:bg-[#9333ea] text-white"
                onClick={async () => {
                  const ok = await update(editingAgent.id, {
                    name: editingAgent.name,
                    avatar_url: editingAgent.avatar_url ?? undefined,
                  });
                  if (ok) { toast.success('Agente atualizado.'); setEditingAgent(null); }
                  else toast.error('Falha ao atualizar agente.');
                }}
              >
                <UserCircle2 size={16} /> Salvar
              </SwButton>
            </div>
          </SwCard>
        </div>
      )}
    </div>
  );
}
