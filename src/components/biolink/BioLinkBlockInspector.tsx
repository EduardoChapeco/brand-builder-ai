import { type BioLinkBlock, getBioLinkBlockDefinition } from "@/lib/biolink/registry";
import { SwInput, SwButton, SwCard, SwSelect } from "@/components/shared/SwComponents";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette, Link as LinkIcon, Type, Image as ImageIcon, Trash2, Layout } from "lucide-react";
import { MediaUploader } from "@/components/shared/MediaUploader";

interface BioLinkBlockInspectorProps {
  block: BioLinkBlock;
  updateBlock: (id: string, updates: Partial<BioLinkBlock>) => void;
  deleteBlock: (id: string) => void;
}

export function BioLinkBlockInspector({ block, updateBlock, deleteBlock }: BioLinkBlockInspectorProps) {
  const def = getBioLinkBlockDefinition(block.type);

  const updateConfig = (newConfig: any) => {
    updateBlock(block.id, {
      config: { ...block.config, ...newConfig }
    });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#a855f7]/10 text-[#a855f7] rounded-xl">
             {def.icon && <def.icon size={20} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-tight">{def.label}</h4>
            <p className="text-[10px] text-stone-500 font-mono">ID: {block.id.slice(0, 8)}</p>
          </div>
        </div>
        <button onClick={() => deleteBlock(block.id)} className="p-2 text-stone-600 hover:text-red-500 transition-colors">
           <Trash2 size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">Conteúdo do Bloco</label>
        
        {/* Campos dinâmicos baseados no tipo do bloco */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-stone-400 mb-1.5 block">Título / Texto Principal</Label>
            <SwInput 
              value={block.config.title || ''} 
              onChange={(e: any) => updateConfig({ title: e.target.value })}
              placeholder="Digite o título..."
            />
          </div>

          {(block.type === 'link_simple' || block.type === 'link_thumbnail') && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-stone-400 mb-1.5 block">URL de Destino</Label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <SwInput 
                    className="pl-10"
                    value={block.config.url || ''} 
                    onChange={(e: any) => updateConfig({ url: e.target.value })}
                    placeholder="https://sua-marca.com/oferta"
                  />
                </div>
              </div>

              {block.type === 'link_thumbnail' && (
                <div className="space-y-2">
                  <Label className="text-xs text-stone-400">Miniatura (Thumbnail)</Label>
                  <MediaUploader
                    value={block.config.thumbnailUrl || ''}
                    onChange={(url) => updateConfig({ thumbnailUrl: url })}
                    folderPath="biolink"
                    label="Upload Miniatura"
                  />
                </div>
              )}
            </div>
          )}

          {block.type === 'image' && (
            <div className="space-y-2">
              <Label className="text-xs text-stone-400">Conteúdo da Imagem</Label>
              <MediaUploader
                value={block.config.imageUrl || ''}
                onChange={(url) => updateConfig({ imageUrl: url })}
                folderPath="biolink"
                label="Fazer upload de imagem"
              />
            </div>
          )}
        </div>
      </div>

      <div className="w-full h-[1px] bg-white/5" />

      <div className="space-y-4">
        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">Estilo & Layout</label>
        
        <div className="grid grid-cols-2 gap-4">
           <div>
             <Label className="text-[10px] text-stone-500 mb-1.5 block">Arredondamento</Label>
             <SwSelect 
               value={block.config.borderRadius || 'rounded-xl'} 
               onChange={(e: any) => updateConfig({ borderRadius: e.target.value })}
             >
                <option value="rounded-none">Nenhum</option>
                <option value="rounded-lg">Pequeno</option>
                <option value="rounded-2xl">Médio</option>
                <option value="rounded-[30px]">Pílula</option>
             </SwSelect>
           </div>
           <div>
             <Label className="text-[10px] text-stone-500 mb-1.5 block">Animação</Label>
             <SwSelect 
               value={block.config.animation || 'none'} 
               onChange={(e: any) => updateConfig({ animation: e.target.value })}
             >
                <option value="none">Parado</option>
                <option value="pulse">Pulso Suave</option>
                <option value="bounce">Pulo (Atenção)</option>
                <option value="shake">Treme</option>
             </SwSelect>
           </div>
        </div>
      </div>

    </div>
  );
}
