import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BioLinkRenderer } from "@/components/biolink/BioLinkRenderer";
import { type BioLinkBlock } from "@/lib/biolink/registry";
import { SwSpinner } from "@/components/shared/SwComponents";
import { trackEvent } from "@/lib/analytics";
import { logError } from "@/lib/error-logger";

interface PublicationProfile {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  status: string;
  config: Record<string, unknown> | null;
  seo: Record<string, unknown> | null;
}

interface RawBlock {
  id: string;
  block_type: string;
  is_active: boolean;
  content: Record<string, unknown>;
}

export default function BioLinkPublicPage() {
  const { slug } = useParams();
  const [data, setData] = useState<{ profile: PublicationProfile; blocks: BioLinkBlock[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadBioLink() {
      if (!slug) return;
      
      try {
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

        const { data: blocks } = await supabase
          .from("publication_blocks")
          .select("id, block_type, is_active, content")
          .eq("publication_id", profile.id)
          .eq("is_active", true);

        setData({
          profile: profile as PublicationProfile,
          blocks: ((blocks as RawBlock[]) || []).map((b) => ({
            id: b.id,
            type: b.block_type as BioLinkBlock["type"],
            isVisible: b.is_active,
            config: b.content,
          })),
        });

        // Rastrear visita (non-blocking)
        try {
          await trackEvent({
            event: "page_view",
            publication_id: profile.id,
            workspace_id: profile.workspace_id,
            metadata: {
              referrer: document.referrer,
              device: window.innerWidth < 768 ? "mobile" : "desktop",
            },
          });
        } catch {
          // analytics não bloqueia a experiência
        }

      } catch (err) {
        await logError({
          code: "ERR_BIOLINK_PUBLIC_001",
          module: "biolink",
          message: "Falha ao carregar Bio Link público",
          detail: { slug, error: String(err) },
        });
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
        <p className="text-stone-500 uppercase tracking-widest text-[10px] font-bold">Bio Link não encontrado</p>
        <a href="/" className="text-[#a855f7] text-xs font-bold uppercase tracking-widest pt-8">Início Simwork</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden relative">
      <BioLinkRenderer profile={data.profile} blocks={data.blocks} />
      
      <div className="fixed bottom-12 left-0 right-0 flex justify-center pointer-events-none z-50">
         <div className="px-5 py-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full flex items-center gap-3 shadow-2xl">
            <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Feito com</span>
            <span className="text-[11px] text-white font-black tracking-tighter mix-blend-difference">SIMWORK</span>
         </div>
      </div>
    </div>
  );
}
