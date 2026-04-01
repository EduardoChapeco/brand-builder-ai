import { LiquidGlassCard } from "@/components/ui/LiquidGlassCard";
import { Button } from "@/components/ui/button";
import { Globe, Plus, LayoutTemplate, MousePointer2, Layers } from "lucide-react";

export default function SiteBuilderPage() {
  return (
    <div className="flex h-full flex-col p-8 bg-[#030303] text-white">
      <div className="flex w-full max-w-7xl mx-auto flex-col gap-8">
        
        {/* Header Hero */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-light tracking-tighter">
              <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                Site
              </span> Builder
            </h1>
            <p className="text-zinc-400 mt-2 text-lg">
              Crie experiências na web em múltiplas páginas com efeitos glass e conversão premium.
            </p>
          </div>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" />
            Novo Site Institucional
          </Button>
        </div>

        {/* Builder Analytics / Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LiquidGlassCard delay={0.1} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-zinc-400">Sites Publicados</p>
                <h3 className="text-5xl font-bold mt-2">0</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard delay={0.2} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-zinc-400">Páginas Construídas</p>
                <h3 className="text-5xl font-bold mt-2">0</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard delay={0.3} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-zinc-400">Conversões Totais</p>
                <h3 className="text-5xl font-bold mt-2">0</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <MousePointer2 className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Empty State / Site List Space */}
        <LiquidGlassCard delay={0.4} className="flex-1 mt-6 min-h-[400px] flex flex-col items-center justify-center border-dashed border-2 border-white/5">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <LayoutTemplate className="w-10 h-10 text-zinc-500" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Nenhum site encontrado</h2>
          <p className="text-zinc-400 max-w-md text-center mb-8">
            Você ainda não possui nenhum site institucional. Crie seu primeiro projeto para começar a desenhar interfaces imersivas utilizando nosso sistema de Liquid Glass.
          </p>
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2">
            <Plus className="w-4 h-4" /> Importar do Figma ou Criar do Zero
          </Button>
        </LiquidGlassCard>

      </div>
    </div>
  );
}
