import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BioLinkRenderer } from "@/components/biolink/BioLinkRenderer";
import { type BioLinkBlock } from "@/lib/biolink/registry";
import { SwSpinner } from "@/components/shared/SwComponents";
import { toast } from "sonner";

export default function BioLinkPublicPage() {
  const { slug } = useParams();
  const [data, setData] = useState<{ profile: any; blocks: BioLinkBlock[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadBioLink() {
      if (!slug) return;
      
      try {
        // @ts-ignore - Usando tabela canônica operations
        const { data: profile, error: pError } = await supabase
          .from("publications")
          .select("id, workspace_id, name, slug, status, config, seo")
          .eq("type", "biolink")
          .eq("slug", slug)
          .single();

        if (pError || !profile) {
          setError(true);
          setLoading(false);
          return;
        }

        // @ts-ignore - Usando tabela canônica operations
        const { data: blocks, error: bError } = await supabase
          .from("publication_blocks")
          .select("id, block_type, is_active, content")
          .eq("publication_id", profile.id)
          .eq("is_active", true);

        setData({
          profile,
          blocks: (blocks || []).map((b: any) => ({
            id: b.id,
            type: b.block_type as any,
            isVisible: b.is_active,
            config: b.content
          }))
        });

        // REGISTRAR VISITA NO ANALYTICS (PULSO DE VIDA)
        await supabase.from('sw_analytics_events').insert([{
          workspace_id: profile.workspace_id,
          entity_type: 'biolink',
          entity_id: profile.id,
          event_type: 'view',
          metadata: { 
            referrer: document.referrer,
            device: window.innerWidth < 768 ? 'mobile' : 'desktop',
            user_agent: navigator.userAgent
          }
        }]);

      } catch (err) {
        console.error("Erro ao carregar biolink pública:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadBioLink();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <SwSpinner className="w-8 h-8 text-[#a855f7]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h1 className="text-4xl font-bold font-display tracking-tightest">404</h1>
        <p className="text-stone-500 uppercase tracking-widest text-[10px] font-bold">Bio Link Not Found</p>
        <a href="/" className="text-[#a855f7] text-xs font-bold uppercase tracking-widest pt-8">Home Simwork</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden relative">
      <BioLinkRenderer profile={data.profile} blocks={data.blocks} />
      
      <div className="fixed bottom-12 left-0 right-0 flex justify-center pointer-events-none z-50">
         <div className="px-5 py-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full flex items-center gap-3 shadow-2xl">
            <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Built with</span>
            <span className="text-[11px] text-white font-black tracking-tighter mix-blend-difference">SIMWORK</span>
         </div>
      </div>
    </div>
  );
}
