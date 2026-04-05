import { cn } from "@/lib/utils";
import { getBioLinkThemeDefinition, type BioLinkBlock } from "@/lib/biolink/registry";
import { 
  ExternalLink, 
  Instagram, 
  Twitter, 
  Youtube, 
  Linkedin, 
  Facebook, 
  Github, 
  Globe,
  MessageCircle,
  Play
} from "lucide-react";

interface RendererProps {
  profile: any;
  blocks: BioLinkBlock[];
  wrapperClassName?: string;
  isEditor?: boolean;
}

const SOCIAL_ICONS: Record<string, any> = {
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  facebook: Facebook,
  github: Github,
  website: Globe,
  whatsapp: MessageCircle,
};

export function BioLinkRenderer({ profile, blocks, wrapperClassName = "", isEditor = false }: RendererProps) {
  // Map theme_id or theme_key
  const themeKey = profile?.theme_id || profile?.theme_key || "brand-auto";
  const theme = getBioLinkThemeDefinition(themeKey);
  
  return (
    <div className={cn("min-h-screen w-full relative flex flex-col items-center", wrapperClassName)} style={{ 
      background: theme.background.value,
      ...theme.cssVars
    }}>
      {/* Background Overlay if needed */}
      {theme.background.overlay && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none" style={{ opacity: theme.background.overlay / 100 }} />
      )}

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 py-16 z-10">
        
        {/* Header / Profile */}
        <section className="text-center space-y-6 mb-4 animate-in fade-in slide-in-from-top-4 duration-1000">
           <div className="relative inline-block">
              <div className="w-28 h-28 rounded-full border-4 border-white/10 mx-auto overflow-hidden bg-white/5 backdrop-blur-xl shadow-2xl relative z-10">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-700 bg-stone-900">
                    <span className="text-2xl font-black tracking-tighter">SW</span>
                  </div>
                )}
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-[var(--primary)] blur-3xl opacity-20 rounded-full scale-150" />
           </div>
           
           <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tightest">
                {profile?.display_name || "Seu Nome"}
              </h1>
              <p className="text-sm text-stone-400 max-w-sm mx-auto leading-relaxed font-medium">
                {profile?.bio_text || "Sua biografia estratégica aqui..."}
              </p>
           </div>
        </section>

        {/* Blocks Dynamic Map */}
        <div className="space-y-4 w-full">
          {blocks.map((block) => {
            const config = block.config || {};
            
            // 1. LINK SIMPLE / THUMBNAIL
            if (block.type === 'link_simple' || block.type === 'link_thumbnail') {
              return (
                <button 
                  key={block.id} 
                  className={cn(
                    "group w-full p-4 flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] relative overflow-hidden",
                    config.borderRadius || "rounded-[24px]",
                    config.animation === 'pulse' && "animate-pulse"
                  )}
                  onClick={() => config.url && window.open(config.url, '_blank')}
                >
                  {config.thumbnail_url && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img src={config.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 text-center">
                    <span className="text-white font-bold tracking-tight">{config.title || "Link sem título"}</span>
                  </div>
                  <ExternalLink size={14} className="text-white/20 group-hover:text-white transition-colors" />
                </button>
              );
            }

            // 2. SOCIAL ICONS
            if (block.type === 'social_icons') {
              const links = config.links || [];
              if (links.length === 0) return isEditor ? <p className="text-center text-[10px] text-stone-600">Configure seus ícones sociais</p> : null;
              
              return (
                <div key={block.id} className="flex flex-wrap justify-center gap-4 py-4">
                  {links.map((link: any, i: number) => {
                    const Icon = SOCIAL_ICONS[link.platform?.toLowerCase()] || Globe;
                    return (
                      <button 
                        key={i} 
                        onClick={() => link.url && window.open(link.url, '_blank')}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all hover:scale-110 active:scale-95 text-white/70 hover:text-white"
                        title={link.platform}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              );
            }

            // 3. IMAGE
            if (block.type === 'image') {
              if (!config.imageUrl) return isEditor ? <div className="aspect-video bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-xs text-stone-600">Placeholder de Imagem</div> : null;
              return (
                <div key={block.id} className="w-full overflow-hidden rounded-[24px] border border-white/10 shadow-2xl">
                  <img src={config.imageUrl} alt="" className="w-full h-auto object-cover" />
                </div>
              );
            }

            // 4. VIDEO
            if (block.type === 'video_embed') {
              return (
                <div key={block.id} className="w-full aspect-video rounded-[24px] overflow-hidden border border-white/10 bg-black relative group shadow-2xl">
                  <div className="p-2 absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Play size={48} className="text-white fill-white" />
                  </div>
                  <iframe 
                    src={config.videoUrl?.replace('watch?v=', 'embed/')} 
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
        
        {/* Branding Footer */}
        {!isEditor && (
          <div className="pt-20 pb-12 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity">
             <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Criado com</span>
                <span className="text-xs text-white font-black tracking-tighter">SIMWORK</span>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
