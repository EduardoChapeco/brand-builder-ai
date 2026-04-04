import { cn } from "@/lib/utils";
import { getBioLinkThemeDefinition, type BioLinkBlock } from "@/lib/biolink/registry";

interface RendererProps {
  profile: any;
  blocks: BioLinkBlock[];
  wrapperClassName?: string;
  isEditor?: boolean;
}

export function BioLinkRenderer({ profile, blocks, wrapperClassName = "", isEditor = false }: RendererProps) {
  const theme = getBioLinkThemeDefinition(profile?.theme_key || "brand-auto");
  
  return (
    <div className={cn("min-h-screen w-full relative flex flex-col items-center", wrapperClassName)} style={{ 
      background: theme.background.value,
      ...theme.cssVars
    }}>
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-12 sm:px-6 z-10">
        
        {/* Header / Profile */}
        <section className="text-center space-y-4 mb-8">
           <div className="w-24 h-24 rounded-full border-4 border-white/10 mx-auto overflow-hidden bg-white/5 backdrop-blur">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-700 bg-stone-900">
                   <span className="text-lg font-bold">SW</span>
                </div>
              )}
           </div>
           <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{profile?.display_name || "Seu Nome"}</h1>
              <p className="text-sm text-stone-400 mt-1">{profile?.bio_text || "Sua biografia aqui..."}</p>
           </div>
        </section>

        {/* Blocks Dynamic Map */}
        <div className="space-y-4 w-full">
          {blocks.map((block) => (
            <div 
              key={block.id} 
              className={cn(
                "w-full p-4 bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all cursor-pointer text-center font-medium",
                block.config.borderRadius || "rounded-2xl",
                block.config.animation === 'pulse' && "animate-pulse"
              )}
              onClick={() => block.config.url && window.open(block.config.url, '_blank')}
            >
              <span className="text-white">{block.config.title}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
