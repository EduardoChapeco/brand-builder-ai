import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { HelpCircle, BookOpen, Lightbulb, Zap, AlertCircle } from "lucide-react";
import { SwButton } from "./SwComponents";

interface HelpSection {
  title: string;
  description: string;
  icon: any;
}

interface SwHelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  sections: HelpSection[];
}

export function SwHelpSheet({ isOpen, onClose, moduleName, sections }: SwHelpSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] bg-[#0a0a0f]/95 backdrop-blur-2xl border-white/10 text-white p-0 overflow-y-auto no-scrollbar">
        <div className="p-8 space-y-8">
          <SheetHeader className="space-y-4">
             <div className="flex items-center gap-3 text-[#a855f7] opacity-80">
                <HelpCircle size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Central de Ajuda</span>
             </div>
             <SheetTitle className="text-3xl font-bold font-display text-white">
                Como funciona: <br/><span className="text-[#a855f7]">{moduleName}</span>
             </SheetTitle>
             <SheetDescription className="text-stone-400 text-sm leading-relaxed">
                Aprenda a extrair o potencial máximo deste módulo e os padrões recomendados pela Simwork.
             </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {sections.map((section, i) => (
              <div key={i} className="group p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-start gap-4">
                   <div className="p-3 rounded-2xl bg-white/5 text-[#a855f7] group-hover:scale-110 transition-transform">
                      {section.icon && <section.icon size={20} />}
                   </div>
                   <div className="space-y-1">
                      <h4 className="font-bold text-white tracking-tight">{section.title}</h4>
                      <p className="text-xs text-stone-500 leading-relaxed group-hover:text-stone-400 transition-colors">
                        {section.description}
                      </p>
                   </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8">
             <div className="p-6 rounded-3xl bg-gradient-to-br from-[#a855f7]/20 to-transparent border border-[#a855f7]/20 relative overflow-hidden">
                <Zap className="absolute -right-4 -bottom-4 text-[#a855f7]/10 w-24 h-24 rotate-12" />
                <h4 className="font-bold text-white mb-2 relative z-10 flex items-center gap-2">
                   <Lightbulb size={16} className="text-amber-400" /> Dica de Pro
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed relative z-10">
                   Você pode reabrir este manual a qualquer momento clicando no ícone de interrogação na barra superior.
                </p>
             </div>
          </div>

          <SwButton variant="primary" className="w-full h-12 rounded-2xl bg-white text-black hover:bg-stone-200" onClick={onClose}>
             Entendi, vamos começar
          </SwButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
