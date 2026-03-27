import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ApiKey = {
  id: string;
  alias: string;
  key: string;
  callsToday: number;
  limit: number;
  active: boolean;
};

const SettingsPage = () => {
  const [groqKeys, setGroqKeys] = useState<ApiKey[]>([]);
  const [orKeys, setOrKeys] = useState<ApiKey[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [newKey, setNewKey] = useState("");

  const addKey = (provider: "groq" | "openrouter") => {
    if (!newAlias || !newKey) return;
    const entry: ApiKey = { id: crypto.randomUUID(), alias: newAlias, key: newKey, callsToday: 0, limit: 100, active: true };
    if (provider === "groq") setGroqKeys((p) => [...p, entry]);
    else setOrKeys((p) => [...p, entry]);
    setNewAlias("");
    setNewKey("");
  };

  const KeySection = ({ title, keys, provider, link, linkText }: { title: string; keys: ApiKey[]; provider: "groq" | "openrouter"; link: string; linkText: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
          {linkText} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {keys.length > 0 && (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">{k.alias}</span>
              <span className="font-mono text-xs text-muted-foreground">···{k.key.slice(-6)}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{k.callsToday}/{k.limit}</span>
              <Switch checked={k.active} />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {keys.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Nenhuma chave cadastrada. Adicione pelo menos uma para gerar posts.
        </div>
      )}

      <div className="flex gap-2">
        <Input placeholder="Alias (nome)" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} className="flex-1" />
        <Input placeholder="API Key" type="password" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="flex-1" />
        <Button size="sm" className="gap-1.5" onClick={() => addKey(provider)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="chat-scrollbar h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie suas chaves de API e preferências.</p>

        <Tabs defaultValue="keys" className="mt-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="keys">Chaves de API</TabsTrigger>
            <TabsTrigger value="prefs">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="mt-4 space-y-8">
            <KeySection title="Groq" keys={groqKeys} provider="groq" link="https://console.groq.com/keys" linkText="Obter chave gratuita" />
            <KeySection title="OpenRouter" keys={orKeys} provider="openrouter" link="https://openrouter.ai/keys" linkText="Obter chave gratuita" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Firecrawl</h3>
                <a href="https://firecrawl.dev" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Criar conta gratuita <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Firecrawl API Key" type="password" className="flex-1" />
                <Button variant="outline" size="sm">Testar Conexão</Button>
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground">Não configurado</Badge>
            </div>
          </TabsContent>

          <TabsContent value="prefs" className="mt-4 space-y-6">
            <div className="space-y-2">
              <Label>Modelo preferido para redação</Label>
              <Select defaultValue="llama">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="llama">llama-3.3-70b-versatile (Groq)</SelectItem>
                  <SelectItem value="mixtral">mixtral-8x7b-32768 (Groq)</SelectItem>
                  <SelectItem value="deepseek">deepseek-chat:free (OpenRouter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Idioma de geração</Label>
              <Select defaultValue="pt">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português (BR)</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full">Salvar Preferências</Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
