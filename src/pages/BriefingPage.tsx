import { useState } from "react";
import { Plus, ExternalLink, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BriefingPage = () => {
  const [competitors, setCompetitors] = useState([{ name: "", url: "", notes: "" }]);

  return (
    <div className="chat-scrollbar h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-xl font-bold text-foreground">Briefing da Empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure sua marca para que os agentes gerem posts personalizados.</p>

        <Accordion type="multiple" defaultValue={["empresa", "visual"]} className="mt-6">
          {/* Section 1 */}
          <AccordionItem value="empresa">
            <AccordionTrigger className="text-base font-semibold">🏢 Empresa</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input placeholder="Ex: PostGen AI" />
              </div>
              <div className="space-y-2">
                <Label>Segmento / Nicho</Label>
                <Input placeholder="Ex: SaaS de Marketing" />
              </div>
              <div className="space-y-2">
                <Label>Público-alvo</Label>
                <Input placeholder="Ex: Empreendedores e profissionais de marketing" />
              </div>
              <div className="space-y-2">
                <Label>Diferenciais principais</Label>
                <Textarea placeholder="O que torna sua empresa única?" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Tom de voz</Label>
                <Textarea placeholder="Ex: descontraído, jovem, direto ao ponto, sem jargões..." rows={2} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2 */}
          <AccordionItem value="visual">
            <AccordionTrigger className="text-base font-semibold">🎨 Identidade Visual</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor primária</Label>
                  <div className="flex gap-2">
                    <input type="color" defaultValue="#7C3AED" className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-card" />
                    <Input defaultValue="#7C3AED" className="flex-1 font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor secundária</Label>
                  <div className="flex gap-2">
                    <input type="color" defaultValue="#06B6D4" className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-card" />
                    <Input defaultValue="#06B6D4" className="flex-1 font-mono text-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estilo tipográfico</Label>
                <Select defaultValue="moderna">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderna">Moderna e clean (DM Sans, Inter)</SelectItem>
                    <SelectItem value="serifada">Serifada e elegante (Playfair Display)</SelectItem>
                    <SelectItem value="bold">Bold e impactante (Space Grotesk)</SelectItem>
                    <SelectItem value="minimalista">Minimalista (Geist)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estilo visual</Label>
                <Select defaultValue="dark">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark e premium</SelectItem>
                    <SelectItem value="vibrante">Vibrante e colorido</SelectItem>
                    <SelectItem value="clean">Clean e minimalista</SelectItem>
                    <SelectItem value="editorial">Editorial e magazine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3 */}
          <AccordionItem value="concorrentes">
            <AccordionTrigger className="text-base font-semibold">🔍 Concorrentes & Inspirações</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {competitors.map((c, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Nome" value={c.name} onChange={(e) => { const n = [...competitors]; n[i].name = e.target.value; setCompetitors(n); }} />
                    <Input placeholder="URL" value={c.url} onChange={(e) => { const n = [...competitors]; n[i].url = e.target.value; setCompetitors(n); }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-muted-foreground">Não analisado</Badge>
                    <Button size="sm" variant="ghost" className="ml-auto gap-1.5 text-xs">
                      <SearchIcon className="h-3 w-3" /> Analisar
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCompetitors([...competitors, { name: "", url: "", notes: "" }])}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Concorrente
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4 */}
          <AccordionItem value="dna">
            <AccordionTrigger className="text-base font-semibold">🧠 DNA da Marca (IA)</AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">Analise seus concorrentes para gerar o DNA da marca automaticamente.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button className="mt-8 w-full gap-2" size="lg">💾 Salvar Briefing</Button>
      </div>
    </div>
  );
};

export default BriefingPage;
