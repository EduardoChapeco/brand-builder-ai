import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Save, Monitor, Smartphone, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { LiquidGlassCard } from '@/components/ui/LiquidGlassCard';

type SiteBlockType = 'hero_3d' | 'glass_features' | 'glow_footer';

interface SiteBlock {
  id: string;
  type: SiteBlockType;
  content: Record<string, unknown>;
}

export default function SiteEditorPage() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const [siteName, setSiteName] = useState('Novo Site');
  const [domain, setDomain] = useState('');
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    const fetchSite = async () => {
      if (!siteId || siteId === 'new') {
        setLoading(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('websites')
        .select('name, domain, global_config')
        .eq('id', siteId)
        .single();
        
      if (!error && data) {
        setSiteName(data.name);
        setDomain(data.domain || '');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pagesData } = await (supabase as any)
        .from('website_pages')
        .select('content_blocks')
        .eq('website_id', siteId)
        .eq('is_home', true)
        .single();
        
      if (pagesData?.content_blocks) {
        const parsed = typeof pagesData.content_blocks === 'string' 
          ? JSON.parse(pagesData.content_blocks) 
          : pagesData.content_blocks;
        setBlocks(Array.isArray(parsed) ? parsed : []);
      }
      setLoading(false);
    };
    fetchSite();
  }, [siteId]);

  const addBlock = (type: SiteBlockType) => {
    const id = crypto.randomUUID();
    let defaultContent = {};
    if (type === 'hero_3d') defaultContent = { title: 'Experiencia Imersiva', subtitle: 'A nova dimensao da sua marca.' };
    if (type === 'glass_features') defaultContent = { items: [{title: 'Recurso 1'}, {title: 'Recurso 2'}, {title: 'Recurso 3'}] };
    if (type === 'glow_footer') defaultContent = { copyright: '© 2026 Brand Builder AI' };
    
    setBlocks([...blocks, { id, type, content: defaultContent }]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const saveSite = async () => {
    if (!workspace?.id) return;
    setIsSaving(true);
    try {
      let activeSiteId = siteId;
      
      if (!activeSiteId || activeSiteId === 'new') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).from('websites').insert({
          workspace_id: workspace.id,
          name: siteName,
          domain: domain || null,
        }).select('id').single();
        if (error) throw error;
        activeSiteId = data.id;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('website_pages').insert({
          website_id: activeSiteId,
          title: 'Home',
          slug: '/',
          is_home: true,
          content_blocks: blocks
        });
        
        toast.success('Site criado com sucesso!');
        navigate(`../site-builder/${activeSiteId}`, { replace: true });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('websites').update({
          name: siteName,
          domain: domain || null,
        }).eq('id', activeSiteId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('website_pages').update({
          content_blocks: blocks
        }).eq('website_id', activeSiteId).eq('is_home', true);
        toast.success('Alterações salvas!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar site.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden">
      {/* Sidebar Tooling */}
      <div className="w-80 flex flex-col border-r border-white/5 bg-[#080808] z-20 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-lg tracking-tight">Editor de Blocos</h2>
          <Button variant="ghost" size="icon" className="hover:bg-white/5"><Settings className="w-4 h-4" /></Button>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Identidade</label>
              <Input 
                value={siteName} 
                onChange={(e) => setSiteName(e.target.value)} 
                className="bg-black/50 border-white/10" 
                placeholder="Nome do Site"
              />
              <Input 
                value={domain} 
                onChange={(e) => setDomain(e.target.value)} 
                className="bg-black/50 border-white/10" 
                placeholder="seudominio.com"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Adicionar Bloco</label>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => addBlock('hero_3d')} variant="outline" className="h-20 flex-col gap-2 bg-white/5 border-white/5 hover:bg-white/10 hover:border-indigo-500/50">
                  Hero 3D
                </Button>
                <Button onClick={() => addBlock('glass_features')} variant="outline" className="h-20 flex-col gap-2 bg-white/5 border-white/5 hover:bg-white/10 hover:border-blue-500/50">
                  Glass Grid
                </Button>
                <Button onClick={() => addBlock('glow_footer')} variant="outline" className="h-20 flex-col gap-2 bg-white/5 border-white/5 hover:bg-white/10 hover:border-purple-500/50">
                  Footer Glow
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Estrutura da Página</label>
              {blocks.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">Nenhum bloco ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {blocks.map((block, i) => (
                    <LiquidGlassCard key={block.id} className="p-3 text-sm flex justify-between items-center bg-black/40">
                      <span className="font-medium text-zinc-300">
                        {block.type === 'hero_3d' ? '3D Hero' : block.type === 'glass_features' ? 'Features Grid' : 'Footer'}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => removeBlock(block.id)}>Remover</Button>
                    </LiquidGlassCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-white/5 gap-3 flex">
          <Button onClick={saveSite} disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
            {isSaving ? 'Salvando...' : 'Salvar Site'}
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-[#010101] overflow-hidden relative">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center bg-white/10 backdrop-blur-md rounded-full border border-white/10 p-1">
          <Button onClick={() => setPreviewMode('desktop')} variant="ghost" className={`rounded-full h-8 px-4 ${previewMode === 'desktop' ? 'bg-white/20' : ''}`}><Monitor className="w-4 h-4 mr-2" /> Desktop</Button>
          <Button onClick={() => setPreviewMode('mobile')} variant="ghost" className={`rounded-full h-8 px-4 ${previewMode === 'mobile' ? 'bg-white/20' : ''}`}><Smartphone className="w-4 h-4 mr-2" /> Mobile</Button>
        </div>

        <ScrollArea className="flex-1 w-full relative">
          <div className={`mx-auto transition-all duration-500 pt-24 pb-32 min-h-screen border-x border-white/5 bg-[#030303] shadow-2xl ${previewMode === 'desktop' ? 'w-full max-w-[1440px]' : 'w-[430px] rounded-[3rem] border-y my-12 overflow-hidden shadow-black'}`}>
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
                <Plus className="w-12 h-12 mb-4 opacity-20" />
                <p>Arraste blocos ou adicione pelo menu lateral para compor a página</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {blocks.map(block => (
                  <div key={block.id} className="w-full relative group">
                    {/* Render Block Visuals */}
                    {block.type === 'hero_3d' && (
                      <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden border-b border-white/5">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
                        <div className="z-10 text-center max-w-4xl px-6">
                           <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">{String(block.content?.title || '')}</h1>
                           <p className="text-xl md:text-2xl text-zinc-400 font-light">{String(block.content?.subtitle || '')}</p>
                           <Button className="mt-8 bg-white text-black hover:bg-zinc-200 rounded-full h-14 px-8 text-lg font-medium">Começar Agora</Button>
                        </div>
                      </div>
                    )}
                    
                    {block.type === 'glass_features' && (
                      <div className="py-24 px-6 md:px-12 bg-black/50 border-b border-white/5">
                        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                          {[1,2,3].map(i => (
                            <LiquidGlassCard key={i} delay={i * 0.1} className="p-8 aspect-square flex flex-col justify-end">
                              <div className="w-12 h-12 rounded-full bg-white/10 mb-6" />
                              <h3 className="text-2xl font-semibold mb-2">Pilar Premium {i}</h3>
                              <p className="text-zinc-400">Integração baseada em inteligência artificial e geração procedimental de texturas fluidas.</p>
                            </LiquidGlassCard>
                          ))}
                        </div>
                      </div>
                    )}

                    {block.type === 'glow_footer' && (
                      <div className="relative pt-32 pb-12 px-6 flex flex-col items-center text-center overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
                        <h2 className="text-4xl font-light z-10 mb-8">Pronto para elevar sua marca?</h2>
                        <Button variant="outline" className="z-10 border-white/20 bg-black/50 hover:bg-white/10 backdrop-blur-md rounded-full h-12 px-8">Falar com Consultor</Button>
                        <p className="mt-24 text-sm text-zinc-600 z-10">{String(block.content?.copyright || '')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
